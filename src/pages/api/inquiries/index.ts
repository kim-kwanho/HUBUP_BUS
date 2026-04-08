import type { NextApiRequest, NextApiResponse } from 'next';
import { requireHubUpInquiriesApi } from '@src/lib/hubup-auth-server';
import { HUBUP_INQUIRIES_ENABLED } from '@src/lib/hubup-inquiries-feature';
import {
  supabaseAdmin,
  HUB_UP_INQUIRIES_TABLE,
  HUB_UP_INQUIRIES_ID_COLUMN,
  InquiryTable,
  HUB_UP_INQUIRIES_MESSAGE_COLUMN,
  HUB_UP_INQUIRIES_INITIAL_STATUS,
  HUB_UP_INQUIRIES_ORDER_COLUMN,
  normalizeInquiryRow,
  parseInquiryIdFromBody,
  isInvalidInquiryIdForApi
} from '@src/lib/supabase';
import { getKoreanTimestamp } from '@src/lib/utils/date';
import { getSsoUserIdFromRequest } from '@src/lib/sso-cookie';
import { getClientIp } from '@src/lib/request-meta';

type Inquiry = InquiryTable;

function getSupabaseErrorText(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

/** insert 실패 시 사용자/개발자가 원인을 알 수 있게 메시지 정리 */
function formatInquiryInsertError(error: unknown): string {
  const raw = getSupabaseErrorText(error);
  const lower = raw.toLowerCase();
  const dev = process.env.NODE_ENV === 'development';

  if (
    lower.includes('row-level security') ||
    lower.includes('permission denied for') ||
    lower.includes('new row violates row-level security')
  ) {
    return dev
      ? `${raw} — 서버에서 insert하려면 .env.local의 SUPABASE_SERVICE_ROLE_KEY(서비스 롤 키)가 필요합니다. anon 키만 있으면 RLS에 막힐 수 있습니다.`
      : '저장이 거절되었습니다. 서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있는지 확인해 주세요.';
  }

  if (lower.includes('relation') && lower.includes('does not exist')) {
    return dev ? raw : 'hub_up_inquires 테이블을 찾을 수 없습니다. Supabase 프로젝트를 확인해 주세요.';
  }

  if (
    (lower.includes('hub_up_inquires') || lower.includes('hub_up_inquiries')) &&
    (lower.includes('schema cache') || lower.includes('could not find'))
  ) {
    return dev
      ? `${raw} — 테이블명이 hub_up_inquires(기본)이 아니라 hub_up_inquiries 등이면 .env에 HUB_UP_INQUIRIES_TABLE=hub_up_inquiries 를 넣으세요. 본문 컬럼이 question이면 HUB_UP_INQUIRIES_MESSAGE_COLUMN=question, 정렬이 id면 HUB_UP_INQUIRIES_ORDER_COLUMN=id 도 설정하세요.`
      : '문의 테이블을 찾을 수 없습니다. .env의 테이블명·Supabase 프로젝트 URL을 확인해 주세요.';
  }

  if (lower.includes('schema cache') || lower.includes('could not find')) {
    return dev
      ? `${raw} — 컬럼을 방금 추가했다면 스키마 반영까지 잠시 걸릴 수 있습니다. 잠시 후 다시 시도하세요.`
      : 'DB 스키마를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (lower.includes('invalid input value') || lower.includes('violates check constraint')) {
    return dev ? raw : '저장 값이 DB 제약 조건과 맞지 않습니다. status·subject 등을 확인해 주세요.';
  }

  if (dev && raw.trim()) return raw;
  return '제출 중 오류가 발생했습니다. 다시 시도해주세요.';
}

/** 질문하기 탭 카테고리 — `subject` 컬럼에 저장 */
const INQUIRY_CATEGORY_VALUES = ['접수', '숙소', '차량', '티셔츠', '기타'] as const;

/** DB에 해당 컬럼이 아직 없을 때 PostgREST 오류 메시지로 감지 (컬럼 추가 후에는 재시도 없이 그대로 저장됨) */
function normalizeInquiryPageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t || t.length > 2048) return null;
  return t;
}

function isInquiryTableMissingError(error: { message?: string } | null | undefined): boolean {
  const m = (error?.message ?? '').toLowerCase();
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('could not find the table') ||
    m.includes('could not find the relation')
  );
}

function isMissingColumnError(error: { message?: string } | null | undefined, column: string): boolean {
  const m = (error?.message ?? '').toLowerCase();
  const col = column.toLowerCase();
  if (!m.includes(col)) return false;
  return (
    m.includes('could not find') ||
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('unknown column')
  );
}

async function queryInquiriesTable(table: string): Promise<{
  rows: Inquiry[];
  error: { message: string } | null;
}> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select('*')
    .order(HUB_UP_INQUIRIES_ORDER_COLUMN, { ascending: false });

  if (error) {
    return { rows: [], error: { message: error.message } };
  }
  return {
    rows: (data || []).map((row) => normalizeInquiryRow(row as Record<string, unknown>)),
    error: null
  };
}

/**
 * 관리자 GET — 테이블명 오타(hub_up_inquires vs hub_up_inquiries) 시 한 번 폴백.
 * 조회 실패 시 빈 배열로 숨기지 않고 호출부에서 500 처리.
 */
async function getInquiriesForAdmin(): Promise<{
  rows: Inquiry[];
  error: string | null;
  meta?: { usedTable: string; fallbackFrom: string };
}> {
  const primary = HUB_UP_INQUIRIES_TABLE;
  const alternate = primary === 'hub_up_inquires' ? 'hub_up_inquiries' : 'hub_up_inquires';

  const first = await queryInquiriesTable(primary);
  if (!first.error) {
    return { rows: first.rows, error: null };
  }

  console.error('문의사항 조회 에러:', primary, first.error.message);

  if (isInquiryTableMissingError({ message: first.error.message })) {
    const second = await queryInquiriesTable(alternate);
    if (!second.error) {
      console.warn(`[inquiries GET] ${primary} 없음 → ${alternate} 로 조회했습니다. .env의 HUB_UP_INQUIRIES_TABLE 을 실제 테이블명에 맞추세요.`);
      return {
        rows: second.rows,
        error: null,
        meta: { usedTable: alternate, fallbackFrom: primary }
      };
    }
    return { rows: [], error: second.error.message };
  }

  return { rows: [], error: first.error.message };
}

async function createInquiry(data: {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message: string;
  userId?: string | null;
  pageUrl?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<Inquiry> {
  const msgCol = HUB_UP_INQUIRIES_MESSAGE_COLUMN;
  /** DB에 NOT NULL 제약이 있어도 되도록 빈 값은 null 대신 placeholder */
  const nz = (v: string | undefined) => (typeof v === 'string' && v.trim() ? v.trim() : '-');
  const row: Record<string, unknown> = {
    name: nz(data.name),
    email: nz(data.email),
    phone: nz(data.phone),
    [msgCol]: data.message,
    status: HUB_UP_INQUIRIES_INITIAL_STATUS
  };
  if (data.subject) row.subject = data.subject;
  if (data.userId) row.user_id = data.userId;
  if (data.pageUrl) row.page_url = data.pageUrl;
  if (data.ipAddress) row.ip_address = data.ipAddress;
  if (data.userAgent) row.user_agent = data.userAgent;

  let current = row;
  for (let attempt = 0; attempt < 12; attempt++) {
    const { data: newInquiry, error } = await supabaseAdmin
      .from(HUB_UP_INQUIRIES_TABLE)
      .insert(current)
      .select()
      .single();

    if (!error && newInquiry) return normalizeInquiryRow(newInquiry as Record<string, unknown>);

    if (!error) break;

    if (isMissingColumnError(error, 'name') && 'name' in current) {
      const { name: _n, ...rest } = current;
      current = rest;
      continue;
    }
    if (isMissingColumnError(error, 'email') && 'email' in current) {
      const { email: _e, ...rest } = current;
      current = rest;
      continue;
    }
    if (isMissingColumnError(error, 'phone') && 'phone' in current) {
      const { phone: _p, ...rest } = current;
      current = rest;
      continue;
    }
    if (isMissingColumnError(error, 'subject') && 'subject' in current) {
      const { subject: _s, ...rest } = current;
      current = rest;
      continue;
    }
    if (isMissingColumnError(error, 'user_id') && 'user_id' in current) {
      const { user_id: _u, ...rest } = current;
      current = rest;
      continue;
    }
    if (isMissingColumnError(error, 'page_url') && 'page_url' in current) {
      const { page_url: _p, ...rest } = current;
      current = rest;
      continue;
    }
    if (isMissingColumnError(error, 'ip_address') && 'ip_address' in current) {
      const { ip_address: _i, ...rest } = current;
      current = rest;
      continue;
    }
    if (isMissingColumnError(error, 'user_agent') && 'user_agent' in current) {
      const { user_agent: _a, ...rest } = current;
      current = rest;
      continue;
    }
    throw error;
  }
  throw new Error('문의 등록 재시도 한도 초과');
}

async function updateInquiryStatus(id: number | string, status: string): Promise<Inquiry> {
  if (!['pending', 'answered'].includes(status)) {
    throw new Error('유효하지 않은 상태입니다.');
  }
  let current: Record<string, unknown> = {
    status,
    updated_at: getKoreanTimestamp()
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: updatedInquiry, error } = await supabaseAdmin
      .from(HUB_UP_INQUIRIES_TABLE)
      .update(current)
      .eq(HUB_UP_INQUIRIES_ID_COLUMN, id)
      .select()
      .single();

    if (!error && updatedInquiry) {
      return normalizeInquiryRow(updatedInquiry as Record<string, unknown>);
    }

    if (error && isMissingColumnError(error, 'updated_at') && 'updated_at' in current) {
      const { updated_at: _u, ...rest } = current;
      current = rest;
      continue;
    }
    throw error;
  }
  throw new Error('상태 수정 재시도 한도 초과');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!HUBUP_INQUIRIES_ENABLED) {
      return res.status(503).json({
        success: false,
        message: '문의 기능은 현재 사용하지 않습니다.'
      });
    }

    if (req.method === 'POST') {
      const { message, name, email, phone, subject, pageUrl } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'message는 필수입니다.',
          message: 'message는 필수입니다.'
        });
      }

      let subjectNorm: string | undefined;
      if (subject != null && subject !== '') {
        const s = typeof subject === 'string' ? subject.trim() : '';
        if (s && !INQUIRY_CATEGORY_VALUES.includes(s as (typeof INQUIRY_CATEGORY_VALUES)[number])) {
          return res.status(400).json({
            success: false,
            error: '유효하지 않은 카테고리입니다.',
            message: '유효하지 않은 카테고리입니다.'
          });
        }
        subjectNorm = s || undefined;
      }

      const ssoUserId = getSsoUserIdFromRequest(req);
      const ua = req.headers['user-agent'];
      const userAgent = typeof ua === 'string' && ua.trim() ? ua : null;
      const newInquiry = await createInquiry({
        message,
        name,
        email,
        phone,
        subject: subjectNorm,
        userId: ssoUserId,
        pageUrl: normalizeInquiryPageUrl(pageUrl),
        ipAddress: getClientIp(req),
        userAgent
      });
      return res.status(201).json({
        success: true,
        data: newInquiry,
        message: '문의사항이 성공적으로 등록되었습니다.'
      });
    }

    // GET/PUT은 문의 관리 권한(전체 관리자 또는 hubup_qna_inquiries 역할)
    const gate = await requireHubUpInquiriesApi(req, res);
    if (!gate.ok) return;

    if (req.method === 'GET') {
      /** 브라우저·프록시가 목록을 캐시하면 PATCH 직후 refetch가 옛 status를 가져와 UI가 되돌아가는 문제 방지 */
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      const result = await getInquiriesForAdmin();
      if (result.error) {
        return res.status(500).json({
          success: false,
          message: '문의사항을 불러오지 못했습니다.',
          detail: process.env.NODE_ENV === 'development' ? result.error : undefined
        });
      }

      const warnings: string[] = [];
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
        warnings.push(
          'SUPABASE_SERVICE_ROLE_KEY가 비어 있어 anon 키로 조회 중입니다. 목록이 비어 있으면 RLS 정책을 확인하거나, Supabase 대시보드에서 발급한 서비스 롤 키를 .env.local에 넣으세요. (버스 변경 요청 관리 화면과 동일한 설정이면 둘 다 정상 조회됩니다.)'
        );
      }
      if (result.meta) {
        warnings.push(
          `문의 테이블을 '${result.meta.fallbackFrom}' 대신 '${result.meta.usedTable}' 에서 읽었습니다. .env에 HUB_UP_INQUIRIES_TABLE=${result.meta.usedTable} 를 지정해 주세요.`
        );
      }

      return res.status(200).json({
        success: true,
        data: result.rows,
        ...(warnings.length ? { warnings } : {})
      });
    }

    if (req.method === 'PUT') {
      const { id, status } = req.body || {};
      const parsedId = parseInquiryIdFromBody(id);
      if (parsedId == null || isInvalidInquiryIdForApi(parsedId) || !status) {
        return res.status(400).json({
          success: false,
          error: 'id와 status가 필요합니다.',
          message: 'id와 status가 필요합니다.'
        });
      }
      const st = String(status);
      if (!['pending', 'answered'].includes(st)) {
        return res.status(400).json({
          success: false,
          message: '유효하지 않은 상태입니다. (pending, answered)'
        });
      }
      const updatedInquiry = await updateInquiryStatus(parsedId, st);
      return res.status(200).json({ success: true, data: updatedInquiry });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Method not allowed'
    });
  } catch (error) {
    console.error('Inquiries API error:', error);
    const msg = formatInquiryInsertError(error);
    return res.status(500).json({ success: false, error: msg, message: msg });
  }
}

