/**
 * 버스 변경 API가 reason 끝에 붙이는 `[자차 변경] …` 블록 파싱.
 * (DB에 자차 스냅샷 컬럼이 없을 때·과거 데이터 대비)
 */
export type ParsedCarChangeItem = { label: string; before: string; after: string };

export function parseCarChangeBracketLine(reason: string | null | undefined): ParsedCarChangeItem[] {
  if (typeof reason !== 'string' || !reason.includes('[자차 변경]')) return [];
  const idx = reason.indexOf('[자차 변경]');
  const tail = reason.slice(idx + '[자차 변경]'.length).trim();
  if (!tail) return [];

  const parts = tail.split(/\s*,\s*/).filter(Boolean);
  const out: ParsedCarChangeItem[] = [];
  for (const p of parts) {
    const colon = p.indexOf(':');
    if (colon < 0) continue;
    const label = p.slice(0, colon).trim();
    const rest = p.slice(colon + 1).trim();
    const arrow = rest.indexOf('→');
    if (arrow < 0) continue;
    const before = rest.slice(0, arrow).trim();
    const after = rest.slice(arrow + 1).trim();
    if (label && (before || after)) out.push({ label, before, after });
  }
  return out;
}

/** 사용자·관리자 UI용 한 줄 요약 (쉼표 연결) */
export function formatParsedCarChangesLine(items: ParsedCarChangeItem[]): string {
  if (!items.length) return '';
  return items.map((i) => `${i.label} ${i.before} → ${i.after}`).join(', ');
}

type RegCarSnap = {
  car_arrival_time?: string | null;
  car_departure_time?: string | null;
  car_role?: string | null;
  car_plate_number?: string | null;
  car_passenger_count?: string | number | null;
  car_passenger_names?: string | null;
};

/** 처리 대기 요청: 등록(현재) 값과 요청 row의 자차 스냅샷을 비교해 화살표 요약. DB 컬럼이 없으면 reason 파싱. */
export function buildCarChangeSummaryComparedToRegistration(
  pending: Partial<RegCarSnap> & { reason?: string | null },
  reg: RegCarSnap
): string {
  const lines: string[] = [];
  const pa =
    pending.car_arrival_time != null && String(pending.car_arrival_time).trim() !== ''
      ? String(pending.car_arrival_time).trim()
      : '';
  const ra = reg.car_arrival_time != null ? String(reg.car_arrival_time).trim() : '';
  if (pa && pa !== ra) lines.push(`입소 시간: ${ra || '—'} → ${pa}`);

  const pd =
    pending.car_departure_time != null && String(pending.car_departure_time).trim() !== ''
      ? String(pending.car_departure_time).trim()
      : '';
  const rd = reg.car_departure_time != null ? String(reg.car_departure_time).trim() : '';
  if (pd && pd !== rd) lines.push(`퇴소 시간: ${rd || '—'} → ${pd}`);

  const pr = pending.car_role != null ? String(pending.car_role).trim() : '';
  const rr = reg.car_role != null ? String(reg.car_role).trim() : '';
  if (pr && pr !== rr) lines.push(`자차 역할: ${rr || '—'} → ${pr}`);

  const pp =
    pending.car_plate_number != null && String(pending.car_plate_number).trim() !== ''
      ? String(pending.car_plate_number).trim()
      : '';
  const rp = reg.car_plate_number != null ? String(reg.car_plate_number).trim() : '';
  if (pp && pp !== rp) lines.push(`차량 번호: ${rp || '—'} → ${pp}`);

  const pc =
    pending.car_passenger_count != null && String(pending.car_passenger_count).trim() !== ''
      ? String(pending.car_passenger_count).trim()
      : '';
  const rc = reg.car_passenger_count != null ? String(reg.car_passenger_count).trim() : '';
  if (pc && pc !== rc) lines.push(`탑승 인원: ${rc || '—'} → ${pc}명`);

  const pn =
    pending.car_passenger_names != null && String(pending.car_passenger_names).trim() !== ''
      ? String(pending.car_passenger_names).trim()
      : '';
  const rn = reg.car_passenger_names != null ? String(reg.car_passenger_names).trim() : '';
  if (pn && pn !== rn) lines.push(`동승자: ${rn || '—'} → ${pn}`);

  if (lines.length) return lines.join(', ');
  return formatParsedCarChangesLine(parseCarChangeBracketLine(pending.reason));
}

/** 승인·반려 등 처리된 요청: 등록이 이미 갱신된 뒤이므로 reason의 [자차 변경] 블록만 사용 */
export function buildCarChangeSummaryFromReasonOnly(reason: string | null | undefined): string {
  return formatParsedCarChangesLine(parseCarChangeBracketLine(reason));
}
