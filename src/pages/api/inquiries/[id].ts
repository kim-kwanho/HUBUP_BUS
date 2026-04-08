import type { NextApiRequest, NextApiResponse } from 'next';
import { requireHubUpInquiriesApi } from '@src/lib/hubup-auth-server';
import { HUBUP_INQUIRIES_ENABLED } from '@src/lib/hubup-inquiries-feature';
import {
  supabaseAdmin,
  HUB_UP_INQUIRIES_TABLE,
  HUB_UP_INQUIRIES_ID_COLUMN,
  InquiryTable,
  normalizeInquiryRow,
  parseInquiryIdParam,
  isInvalidInquiryIdForApi
} from '@src/lib/supabase';
import { getKoreanTimestamp } from '@src/lib/utils/date';

const CATEGORY_VALUES = ['접수', '숙소', '차량', '티셔츠', '기타'] as const;

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!HUBUP_INQUIRIES_ENABLED) {
    return res.status(503).json({
      success: false,
      message: '문의 기능은 현재 사용하지 않습니다.'
    });
  }

  const id = parseInquiryIdParam(req.query.id);
  if (id == null || isInvalidInquiryIdForApi(id)) {
    return res.status(400).json({ success: false, message: '유효하지 않은 ID입니다.' });
  }

  const gate = await requireHubUpInquiriesApi(req, res);
  if (!gate.ok) return;

  if (req.method === 'PATCH') {
    const body = (req.body || {}) as Record<string, unknown>;
    const statusRaw = body.status != null ? String(body.status) : undefined;
    const subjectRaw = body.subject;
    const adminNote = body.adminNote;
    const adminResponse = body.adminResponse;

    const updateData: Record<string, unknown> = {
      updated_at: getKoreanTimestamp()
    };

    /** hub_up_inquiries: status 는 `pending` | `answered` */
    if (statusRaw !== undefined) {
      if (!['pending', 'answered'].includes(statusRaw)) {
        return res.status(400).json({
          success: false,
          message: '유효하지 않은 상태입니다. (pending, answered)'
        });
      }
      updateData.status = statusRaw;
    }

    if (subjectRaw !== undefined) {
      const s = typeof subjectRaw === 'string' ? subjectRaw.trim() : '';
      if (s && !CATEGORY_VALUES.includes(s as (typeof CATEGORY_VALUES)[number])) {
        return res.status(400).json({ success: false, message: '유효하지 않은 카테고리입니다.' });
      }
      updateData.subject = s || null;
    }

    if (adminNote !== undefined) {
      updateData.admin_note = adminNote === null || adminNote === '' ? null : String(adminNote);
    }

    if (adminResponse !== undefined) {
      const ar = String(adminResponse ?? '').trim();
      if (ar.length > 5000) {
        return res.status(400).json({ success: false, message: '답변은 5000자를 초과할 수 없습니다.' });
      }
      /** DB 컬럼 `answer` / `answered_at` (구 스키마는 admin_response / response_at) */
      updateData.answer = ar || null;
      updateData.answered_at = ar ? getKoreanTimestamp() : null;
      if (ar) updateData.status = 'answered';
    }

    const keys = Object.keys(updateData).filter((k) => k !== 'updated_at');
    if (keys.length === 0) {
      return res.status(400).json({ success: false, message: '업데이트할 내용이 없습니다.' });
    }

    let current = { ...updateData };
    for (let attempt = 0; attempt < 10; attempt++) {
      const { data, error } = await supabaseAdmin
        .from(HUB_UP_INQUIRIES_TABLE)
        .update(current)
        .eq(HUB_UP_INQUIRIES_ID_COLUMN, id)
        .select()
        .single();

      if (!error && data) {
        res.setHeader('Cache-Control', 'no-store, private');
        return res.status(200).json({
          success: true,
          data: normalizeInquiryRow(data as Record<string, unknown>)
        });
      }

      if (error && isMissingColumnError(error, 'admin_note')) {
        const { admin_note: _a, ...rest } = current;
        current = rest;
        continue;
      }
      if (error && isMissingColumnError(error, 'subject')) {
        const { subject: _s, ...rest } = current;
        current = rest;
        continue;
      }
      if (error && isMissingColumnError(error, 'updated_at')) {
        const { updated_at: _u, ...rest } = current;
        current = rest;
        continue;
      }
      /** `answer` 없으면 구 컬럼명으로 재시도 */
      if (error && isMissingColumnError(error, 'answer')) {
        const ar = String(adminResponse ?? '').trim();
        const { answer: _a, answered_at: _at, ...rest } = current;
        current = {
          ...rest,
          admin_response: ar || null,
          response_at: ar ? getKoreanTimestamp() : null
        };
        if (ar) current.status = 'answered';
        continue;
      }
      if (error && isMissingColumnError(error, 'answered_at')) {
        const { answered_at: _t, ...rest } = current;
        current = rest;
        continue;
      }
      if (error && isMissingColumnError(error, 'admin_response')) {
        const { admin_response: _r, response_at: _t, ...rest } = current;
        current = rest;
        continue;
      }
      if (error && isMissingColumnError(error, 'response_at')) {
        const { response_at: _t, ...rest } = current;
        current = rest;
        continue;
      }
      if (error && isMissingColumnError(error, 'resolved_at')) {
        const { resolved_at: _v, ...rest } = current;
        current = rest;
        continue;
      }

      console.error('[inquiries PATCH]', error);
      return res.status(500).json({ success: false, message: '문의사항 수정에 실패했습니다.' });
    }

    return res.status(500).json({ success: false, message: '문의사항 수정 재시도 한도 초과' });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin
      .from(HUB_UP_INQUIRIES_TABLE)
      .delete()
      .eq(HUB_UP_INQUIRIES_ID_COLUMN, id);
    if (error) {
      console.error('[inquiries DELETE]', error);
      return res.status(500).json({ success: false, message: '문의사항 삭제에 실패했습니다.' });
    }
    return res.status(200).json({ success: true, message: '문의사항이 삭제되었습니다.' });
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
