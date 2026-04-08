/**
 * 관리자 전용: `hub_up_bus_change_requests` 목록·상태 변경
 * (hub_web과 동일 Supabase, next-auth 관리자 세션)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireHubUpBusApi } from '@src/lib/hubup-auth-server';
import { supabaseAdmin } from '@src/lib/supabase';
import { getKoreanTimestamp } from '@src/lib/utils/date';

const ALLOWED_STATUS = ['pending', 'approved', 'rejected', 'completed'] as const;
type RowStatus = (typeof ALLOWED_STATUS)[number];

function supabaseEnvOk(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  return Boolean(url && key);
}

function labelFor(
  value: string | null | undefined,
  slots: { value: string; label: string }[]
): string {
  if (value == null || value === '') return '—';
  return slots.find((s) => s.value === value)?.label ?? value;
}

/**
 * PostgREST는 select 목록에 없는 컬럼명을 넣으면 schema cache 오류가 납니다.
 * 존재하는 컬럼만 반환하도록 `*` 만 사용합니다.
 * `created_at` 정렬이 실패하면(컬럼 없음 등) `id` 내림차순으로 한 번 더 시도합니다.
 */
async function fetchBusChangeRequestRows(): Promise<{
  rows: Record<string, unknown>[];
  error: { message: string } | null;
}> {
  const ordered = { ascending: false as const };
  const first = await supabaseAdmin
    .from('hub_up_bus_change_requests')
    .select('*')
    .order('created_at', ordered);

  if (!first.error && Array.isArray(first.data)) {
    return { rows: first.data as Record<string, unknown>[], error: null };
  }

  if (first.error) {
    console.warn('[admin bus-change-requests] order(created_at) failed, retry id:', first.error.message);
    const second = await supabaseAdmin.from('hub_up_bus_change_requests').select('*').order('id', ordered);
    if (!second.error && Array.isArray(second.data)) {
      return { rows: second.data as Record<string, unknown>[], error: null };
    }
    return {
      rows: [],
      error: { message: (second.error ?? first.error)?.message ?? 'hub_up_bus_change_requests 조회 실패' }
    };
  }

  return {
    rows: [],
    error: { message: 'hub_up_bus_change_requests 조회 실패' }
  };
}

/** res.json() 직전 BigInt 등으로 직렬화 실패 방지 (버스 관리 API 전용) */
function jsonSafeForResponse<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))
  ) as T;
}

/** 슬롯 테이블이 없거나 스키마가 달라도 버스 요청 목록은 보이게 함 */
async function fetchSlotLabels(
  table: 'hub_up_departure_slots' | 'hub_up_return_slots'
): Promise<{ value: string; label: string }[]> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select('value, label')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.warn(`[admin bus-change-requests] ${table} (optional):`, error.message);
    return [];
  }
  return (data || []) as { value: string; label: string }[];
}

function columnMissingInError(err: unknown, columnName: string): boolean {
  const m = String((err as { message?: string })?.message ?? '').toLowerCase();
  const n = columnName.toLowerCase();
  if (!m.includes(n)) return false;
  return (
    m.includes('column') ||
    m.includes('schema') ||
    m.includes('could not find') ||
    m.includes('does not exist')
  );
}

function normalizeBusRowForClient(r: Record<string, unknown>): Record<string, unknown> {
  return {
    ...r,
    reason: typeof r.reason === 'string' ? r.reason : '—',
    name: typeof r.name === 'string' ? r.name : '-',
    phone: typeof r.phone === 'string' ? r.phone : '-',
    email: typeof r.email === 'string' ? r.email : '-',
    group_name: typeof r.group_name === 'string' ? r.group_name : '-',
    status:
      typeof r.status === 'string'
        ? r.status.trim().toLowerCase() || 'pending'
        : 'pending',
    requested_departure_slot:
      r.requested_departure_slot === null || r.requested_departure_slot === undefined
        ? null
        : String(r.requested_departure_slot),
    requested_return_slot:
      r.requested_return_slot === null || r.requested_return_slot === undefined
        ? null
        : String(r.requested_return_slot),
    current_departure_slot:
      r.current_departure_slot === null || r.current_departure_slot === undefined
        ? null
        : String(r.current_departure_slot),
    current_return_slot:
      r.current_return_slot === null || r.current_return_slot === undefined
        ? null
        : String(r.current_return_slot),
    processed_at:
      r.processed_at === null || r.processed_at === undefined ? null : String(r.processed_at),
    processed_note:
      r.processed_note === null || r.processed_note === undefined
        ? null
        : typeof r.processed_note === 'string'
          ? r.processed_note
          : String(r.processed_note)
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const gate = await requireHubUpBusApi(req, res);
  if (!gate.ok) return;

  if (!supabaseEnvOk()) {
    return res.status(503).json({
      success: false,
      message: 'Supabase 환경 변수가 설정되지 않았습니다.'
    });
  }

  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

      const { rows, error: rowErr } = await fetchBusChangeRequestRows();
      if (rowErr) {
        console.error('[admin bus-change-requests GET] hub_up_bus_change_requests:', rowErr.message);
        return res.status(500).json({
          success: false,
          message: '버스 변경 요청 목록을 불러오지 못했습니다.',
          detail: process.env.NODE_ENV === 'development' ? rowErr.message : undefined
        });
      }

      const [depList, retList] = await Promise.all([
        fetchSlotLabels('hub_up_departure_slots'),
        fetchSlotLabels('hub_up_return_slots')
      ]);

      const warnings: string[] = [];
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
        warnings.push(
          'SUPABASE_SERVICE_ROLE_KEY가 비어 있어 anon 키로 조회 중입니다. 목록이 비어 있으면 RLS 정책 또는 .env의 Supabase 프로젝트 URL을 확인하세요.'
        );
      }

      const enriched = rows.map((r) => {
        const n = normalizeBusRowForClient(r);
        return {
          ...n,
          requested_departure_label: labelFor(n.requested_departure_slot as string | null, depList),
          requested_return_label: labelFor(n.requested_return_slot as string | null, retList),
          current_departure_label: labelFor(n.current_departure_slot as string | null, depList),
          current_return_label: labelFor(n.current_return_slot as string | null, retList)
        };
      });

      return res.status(200).json({
        success: true,
        data: jsonSafeForResponse(enriched),
        ...(warnings.length ? { warnings } : {})
      });
    }

    if (req.method === 'PUT') {
      const body = (req.body || {}) as Record<string, unknown>;
      const { id, status } = body;
      const processedNoteRaw = body.processedNote ?? body.processed_note;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, message: 'id(uuid)가 필요합니다.' });
      }
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ success: false, message: 'status가 필요합니다.' });
      }
      if (!ALLOWED_STATUS.includes(status as RowStatus)) {
        return res.status(400).json({
          success: false,
          message: `status는 ${ALLOWED_STATUS.join(', ')} 중 하나여야 합니다.`
        });
      }

      const isProcessedStatus =
        status === 'approved' || status === 'rejected' || status === 'completed';
      let processed_note_val: string | null = null;
      if (isProcessedStatus && typeof processedNoteRaw === 'string') {
        const t = processedNoteRaw.trim();
        processed_note_val = t.length ? t : null;
      }

      const now = getKoreanTimestamp();
      const updatePayload: Record<string, unknown> = {
        status,
        updated_at: now,
        ...(isProcessedStatus
          ? { processed_at: now, processed_note: processed_note_val }
          : { processed_at: null, processed_note: null })
      };

      let { data: updated, error } = await supabaseAdmin
        .from('hub_up_bus_change_requests')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (
        error &&
        (columnMissingInError(error, 'processed_at') || columnMissingInError(error, 'processed_note'))
      ) {
        const { processed_at: _a, processed_note: _n, ...rest } = updatePayload;
        const second = await supabaseAdmin
          .from('hub_up_bus_change_requests')
          .update(rest)
          .eq('id', id)
          .select()
          .single();
        updated = second.data;
        error = second.error;
      }

      if (error) {
        console.error('[admin bus-change-requests PUT]', error);
        return res.status(500).json({ success: false, message: '상태를 변경하지 못했습니다.' });
      }
      return res.status(200).json({ success: true, data: jsonSafeForResponse(updated) });
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  } catch (e) {
    console.error('admin hub-up/bus-change-requests:', e);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
}
