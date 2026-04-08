/**
 * 버스 시간 변경 API
 *
 * - 읽기(GET): `hub_up_registrations` 의 `departure_slot` / `return_slot`(허브업 신청 시 저장된 값)을 기준으로
 *   현재 버스를 표시하고, 라벨은 `hub_up_departure_slots` · `hub_up_return_slots` 로 맵핑합니다.
 *   처리 대기 중인 변경은 `hub_up_bus_change_requests` 에서 조회합니다.
 * - 쓰기(POST): 변경 요청 한 건을 `hub_up_bus_change_requests` 에 insert 합니다(SSO user_id 기준).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@src/lib/supabase';
import { getSsoUserIdFromRequest } from '@src/lib/sso-cookie';
import { buildHubUpBusChangeInsertRow } from '@src/lib/hub-up-bus-change-insert';

const NO_CHANGE = '';

function labelForValue(value: string | null | undefined, slots: { value: string; label: string }[]): string {
  if (value == null || value === '') return '—';
  return slots.find((s) => s.value === value)?.label ?? value;
}

function normalizeChoice(
  raw: unknown,
  current: string | null | undefined
): string | null {
  if (raw == null || raw === NO_CHANGE || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === NO_CHANGE) return null;
  if (current != null && trimmed === current) return null;
  return trimmed;
}

function supabaseEnvOk(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  return Boolean(url && key);
}

function isBusInsertMissingColumnError(error: { message?: string } | null | undefined, column: string): boolean {
  const m = (error?.message ?? '').toLowerCase();
  const col = column.toLowerCase();
  if (!m.includes(col)) return false;
  return (
    m.includes('could not find') ||
    m.includes('schema cache') ||
    m.includes('does not exist') ||
    m.includes('unknown column')
  );
}

/** PostgREST/Postgres insert 오류를 사용자·개발자가 원인을 알 수 있게 정리 */
function formatBusChangeInsertError(error: { message?: string; code?: string } | null | undefined): string {
  const raw = (error?.message ?? '').trim();
  const msg = raw.toLowerCase();
  const code = error?.code ?? '';

  if (
    code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('violates row-level security') ||
    (msg.includes('permission denied') && msg.includes('policy'))
  ) {
    return '버스 변경 요청 저장이 거절되었습니다. 서버에 SUPABASE_SERVICE_ROLE_KEY(서비스 롤 키)가 설정되어 있는지 확인해 주세요. anon 키만 쓰면 RLS 때문에 INSERT가 막힐 수 있습니다.';
  }

  /** 컬럼 누락(schema cache)은 테이블 없음과 구분 — 먼저 검사 */
  if (
    (msg.includes('column') && (msg.includes('could not find') || msg.includes('schema cache'))) ||
    (msg.includes('could not find') && msg.includes('column'))
  ) {
    return 'INSERT에 포함된 컬럼이 hub_up_bus_change_requests에 없습니다. Supabase SQL Editor에서 supabase/sql/008_hub_up_bus_change_requests_columns.sql(또는 002)을 실행해 컬럼을 추가하세요.';
  }

  if (msg.includes('violates check constraint') || msg.includes('invalid input')) {
    return '저장 값이 DB 제약 조건과 맞지 않습니다. 출발/복귀 슬롯 값이 Supabase에 등록된 값과 같은지 확인해 주세요.';
  }

  if (
    code === 'PGRST205' ||
    code === '42P01' ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    (msg.includes('could not find the table') && !msg.includes('column')) ||
    (msg.includes('schema cache') && msg.includes('table') && !msg.includes('column'))
  ) {
    return 'hub_up_bus_change_requests 테이블을 찾을 수 없습니다. Supabase에서 supabase/sql/002_hub_up_bus_change_requests.sql 을 실행했는지 확인해 주세요.';
  }
  if (msg.includes('null value in column') && msg.includes('violates not-null constraint')) {
    const m = raw.match(/column "([^"]+)"/);
    const col = m?.[1];
    return col
      ? `DB 필수 컬럼 "${col}" 값이 비어 있습니다. hub_web의 hub_up_bus_change_requests 정의에 맞게 API insert를 채워야 합니다. Supabase에서 해당 테이블의 컬럼 목록(NOT NULL)을 확인해 주세요.`
      : 'DB NOT NULL 제약에 걸렸습니다. hub_web 테이블 정의를 확인해 주세요.';
  }
  return '저장 중 오류가 발생했습니다.';
}

/** DB에 스냅샷 컬럼이 없을 때 email → group_name → name → phone 순으로 제외 후 재시도 */
async function insertBusChangeRequestRow(row: Record<string, unknown>): Promise<{
  data: Record<string, unknown> | null;
  error: { message: string; code?: string } | null;
}> {
  const STRIP_KEYS = ['email', 'group_name', 'name', 'phone', 'current_departure_slot', 'current_return_slot'] as const;
  let current: Record<string, unknown> = { ...row };

  for (let attempt = 0; attempt < 16; attempt++) {
    const { data, error } = await supabaseAdmin
      .from('hub_up_bus_change_requests')
      .insert(current)
      .select()
      .single();

    if (!error && data) {
      return { data: data as Record<string, unknown>, error: null };
    }
    if (!error) break;

    let stripped = false;
    for (const key of STRIP_KEYS) {
      if (isBusInsertMissingColumnError(error, key) && key in current) {
        const { [key]: _removed, ...rest } = current;
        current = rest;
        stripped = true;
        console.warn(`[bus-change] insert: '${key}' 컬럼 없음 → 제외 후 재시도`);
        break;
      }
    }
    if (!stripped) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
  }

  return { data: null, error: { message: '버스 변경 요청 등록 재시도 한도 초과' } };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userId = getSsoUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: '허브워십 로그인(SSO)이 필요합니다. 토큰으로 다시 들어와 주세요.' });
    }

    if (!supabaseEnvOk()) {
      return res.status(503).json({
        success: false,
        message:
          'Supabase 환경 변수가 비어 있습니다. hubup_quest `.env.local`에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY를 hub_web과 동일하게 채운 뒤 서버를 재시작하세요.'
      });
    }

    if (req.method === 'GET') {
      const [
        { data: reg, error: regErr },
        { data: depSlots, error: depErr },
        { data: retSlots, error: retErr }
      ] = await Promise.all([
        supabaseAdmin
          .from('hub_up_registrations')
          .select('departure_slot, return_slot')
          .eq('user_id', userId)
          .maybeSingle(),
        supabaseAdmin
          .from('hub_up_departure_slots')
          .select('value, label')
          .eq('is_active', true)
          .order('sort_order'),
        supabaseAdmin
          .from('hub_up_return_slots')
          .select('value, label')
          .eq('is_active', true)
          .order('sort_order')
      ]);

      const coreErr = regErr || depErr || retErr;
      if (coreErr) {
        console.error('[bus-change GET core]', coreErr);
        const hint =
          coreErr.code === 'PGRST205' || /does not exist|schema cache/i.test(coreErr.message || '')
            ? ' hub_web과 동일한 Supabase 프로젝트인지, hub_up_* 테이블이 있는지 확인하세요.'
            : '';
        return res.status(500).json({
          success: false,
          message: `데이터를 불러오지 못했습니다.${hint}`,
          detail: process.env.NODE_ENV === 'development' ? coreErr.message : undefined
        });
      }

      let pending: {
        id: string;
        requested_departure_slot: string | null;
        requested_return_slot: string | null;
        reason: string;
        status: string;
        created_at: string;
      } | null = null;
      let pendingWarning: string | undefined;

      const pendingRes = await supabaseAdmin
        .from('hub_up_bus_change_requests')
        .select('id, requested_departure_slot, requested_return_slot, reason, status, created_at')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (pendingRes.error) {
        console.error('[bus-change GET pending]', pendingRes.error);
        pendingWarning =
          'hub_up_bus_change_requests 테이블을 조회하지 못했습니다. supabase/sql/002 스크립트 실행 여부를 확인하세요.';
      } else {
        pending = pendingRes.data ?? null;
      }

      const depList = (depSlots || []) as { value: string; label: string }[];
      const retList = (retSlots || []) as { value: string; label: string }[];

      const departureSlot = reg?.departure_slot ?? null;
      const returnSlot = reg?.return_slot ?? null;

      return res.status(200).json({
        success: true,
        data: {
          hasRegistration: Boolean(reg),
          currentDeparture: departureSlot
            ? { value: departureSlot, label: labelForValue(departureSlot, depList) }
            : null,
          currentReturn: returnSlot ? { value: returnSlot, label: labelForValue(returnSlot, retList) } : null,
          departureOptions: depList,
          returnOptions: retList,
          pendingRequest: pending,
          ...(pendingWarning ? { meta: { warning: pendingWarning } } : {})
        }
      });
    }

    if (req.method === 'POST') {
      const { requestedDepartureSlot, requestedReturnSlot, reason } = req.body || {};

      if (typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({ success: false, message: '변경 사유를 입력해 주세요.' });
      }

      const { data: reg, error: regError } = await supabaseAdmin
        .from('hub_up_registrations')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (regError) {
        console.error('hub_up_registrations:', regError);
        return res.status(500).json({ success: false, message: '신청 정보를 불러오지 못했습니다.' });
      }
      if (!reg) {
        return res.status(400).json({
          success: false,
          message: '허브업 버스 신청 정보가 없습니다. 허브워십에서 먼저 신청해 주세요.'
        });
      }

      const currentDep = reg.departure_slot ?? null;
      const currentRet = reg.return_slot ?? null;

      const reqDep = normalizeChoice(requestedDepartureSlot, currentDep);
      const reqRet = normalizeChoice(requestedReturnSlot, currentRet);

      if (reqDep == null && reqRet == null) {
        return res.status(400).json({
          success: false,
          message: '출발 또는 복귀 중 최소 한쪽은 현재와 다른 시간을 선택해 주세요.'
        });
      }

      const { data: existingPending } = await supabaseAdmin
        .from('hub_up_bus_change_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingPending) {
        return res.status(409).json({
          success: false,
          message: '이미 처리 대기 중인 변경 요청이 있습니다. 담당자 처리 후 다시 신청해 주세요.'
        });
      }

      const insertRow = buildHubUpBusChangeInsertRow(reg as Record<string, unknown>, {
        userId,
        currentDepartureSlot: currentDep,
        currentReturnSlot: currentRet,
        requestedDepartureSlot: reqDep,
        requestedReturnSlot: reqRet,
        reason: reason.trim()
      });

      const { data: inserted, error: insertError } = await insertBusChangeRequestRow(insertRow);

      if (insertError) {
        if (insertError.code === '23505') {
          return res.status(409).json({
            success: false,
            message: '이미 처리 대기 중인 변경 요청이 있습니다.'
          });
        }
        console.error('hub_up_bus_change_requests insert:', insertError);
        const userMsg = formatBusChangeInsertError(insertError);
        const dev = process.env.NODE_ENV === 'development';
        return res.status(500).json({
          success: false,
          message: userMsg,
          ...(dev ? { detail: insertError.message } : {})
        });
      }

      return res.status(201).json({ success: true, data: inserted, message: '변경 문의가 접수되었습니다.' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  } catch (e) {
    console.error('api/hub-up/bus-change:', e);
    const detail = e instanceof Error ? e.message : String(e);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      detail: process.env.NODE_ENV === 'development' ? detail : undefined
    });
  }
}
