/**
 * hub_web `hub_up_bus_change_requests` INSERT — 신청 시점 스냅샷을 `hub_up_registrations`에서 승계합니다.
 * DB에 NOT NULL인 컬럼은 여기서 모두 채웁니다(없으면 '-').
 * 스냅샷 컬럼이 DB에 없으면 bus-change API insert가 해당 키를 제외하고 재시도합니다.
 * Supabase에는 supabase/sql/008_hub_up_bus_change_requests_columns.sql 로 컬럼을 맞추는 것을 권장합니다.
 */

const PLACEHOLDER = '-';

function pickString(reg: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const v = reg[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return PLACEHOLDER;
}

function pickPhone(reg: Record<string, unknown>): string {
  const keys = ['phone', 'mobile', 'phone_number', 'tel', 'cellphone', 'mobile_phone'] as const;
  for (const key of keys) {
    const v = reg[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return PLACEHOLDER;
}

export type HubUpBusChangeInsertParams = {
  userId: string;
  /** 변경 요청 직전 `hub_up_registrations`의 출발/복귀 (hub_web NOT NULL: current_departure_slot / current_return_slot) */
  currentDepartureSlot: string | null;
  currentReturnSlot: string | null;
  requestedDepartureSlot: string | null;
  requestedReturnSlot: string | null;
  reason: string;
};

/**
 * hub_web 테이블과 동일한 스냅샷 필드.
 * 컬럼이 실제 DB에 없으면 PostgREST가 거절하므로, 레포 SQL(002)과 hub_web 스키마를 맞춥니다.
 */
export function buildHubUpBusChangeInsertRow(
  reg: Record<string, unknown>,
  params: HubUpBusChangeInsertParams
): Record<string, unknown> {
  const slotOrDash = (v: string | null) => (v != null && String(v).trim() !== '' ? String(v).trim() : '-');

  return {
    user_id: params.userId,
    name: pickString(reg, ['name', 'full_name', 'participant_name', 'user_name']),
    phone: pickPhone(reg),
    email: pickString(reg, ['email', 'email_address', 'user_email', 'mail']),
    group_name: pickString(reg, [
      'group_name',
      'group',
      'team_name',
      'team',
      'camp_name',
      'cohort',
      'small_group',
      'cell_group'
    ]),
    current_departure_slot: slotOrDash(params.currentDepartureSlot),
    current_return_slot: slotOrDash(params.currentReturnSlot),
    requested_departure_slot: params.requestedDepartureSlot,
    requested_return_slot: params.requestedReturnSlot,
    reason: params.reason,
    status: 'pending'
  };
}
