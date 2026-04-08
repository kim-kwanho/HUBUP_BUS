/**
 * hub_web `roles.name` + `admin_roles`와 연동.
 * - `profiles.status === '관리자'` → HUBUP 관리 화면 전체
 * - 그 외에는 전용 역할만 해당 메뉴 (다른 앱 역할만으로는 HUBUP admin 접근 안 함)
 *
 * Supabase `roles`에 아래 name 행을 추가한 뒤, hub_web 역할 관리에서 사용자에게 부여합니다.
 */
import { HUBUP_INQUIRIES_ENABLED } from '@src/lib/hubup-inquiries-feature';

export const HUBUP_ROLE_INQUIRIES = 'hubup_qna_inquiries';
/** 허브업 버스 관리 하위 권한 (`hub-up` 아래) */
export const HUBUP_ROLE_BUS = 'hub-up/bus';
export const HUBUP_ROLE_BUS_LEGACY = 'hubup_qna_bus';

/** JWT/세션에 실리는 DB 기반 접근 플래그 (`admin_menu_roles` — HUBUP 메뉴 id 2개만) */
export type HubUpAreaFlags = { bus?: boolean; inquiries?: boolean };

function isOrgWideAdmin(profileStatus: string | null | undefined): boolean {
  return profileStatus === '관리자';
}

export function hubUpHasInquiriesAccess(
  roles: string[] | undefined,
  profileStatus: string | null | undefined,
  hubupArea?: HubUpAreaFlags | null
): boolean {
  if (!HUBUP_INQUIRIES_ENABLED) return false;
  if (isOrgWideAdmin(profileStatus)) return true;
  if (hubupArea?.inquiries) return true;
  return roles?.includes(HUBUP_ROLE_INQUIRIES) ?? false;
}

function hubUpUserHasBusRole(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  return roles.includes(HUBUP_ROLE_BUS) || roles.includes(HUBUP_ROLE_BUS_LEGACY);
}

export function hubUpHasBusAccess(
  roles: string[] | undefined,
  profileStatus: string | null | undefined,
  hubupArea?: HubUpAreaFlags | null
): boolean {
  if (isOrgWideAdmin(profileStatus)) return true;
  if (hubupArea?.bus) return true;
  return hubUpUserHasBusRole(roles);
}

/** /admin 진입: 기관 관리자 또는 HUBUP 전용 역할·매핑 중 하나 */
export function hubUpHasAdminAreaAccess(
  roles: string[] | undefined,
  profileStatus: string | null | undefined,
  hubupArea?: HubUpAreaFlags | null
): boolean {
  if (isOrgWideAdmin(profileStatus)) return true;
  const inquiriesOk = HUBUP_INQUIRIES_ENABLED && (hubupArea?.inquiries || false);
  if (hubupArea?.bus || inquiriesOk) return true;
  if (!roles?.length) return false;
  const hasInq = HUBUP_INQUIRIES_ENABLED && roles.includes(HUBUP_ROLE_INQUIRIES);
  return hasInq || hubUpUserHasBusRole(roles);
}

/** hub_web 회원관리·권한 일괄 수정 — `profiles.status === '관리자'` 만 */
export function hubUpHasOrgWideAdmin(profileStatus: string | null | undefined): boolean {
  return profileStatus === '관리자';
}
