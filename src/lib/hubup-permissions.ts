/**
 * hub_web roles.name + admin_roles. HUBUP /admin requires a hub-up role (see sql 011/012/013).
 * profiles.status alone (org admin) does not grant HUBUP admin access.
 */
import { HUBUP_INQUIRIES_ENABLED } from '@src/lib/hubup-inquiries-feature';

/** Parent hub-up role (011_hub_web_hub_up_menu_reference.sql) */
export const HUBUP_ROLE_HUB_ROOT = 'hub-up';
export const HUBUP_ROLE_INQUIRIES = 'hubup_qna_inquiries';
export const HUBUP_ROLE_BUS = 'hub-up/bus';
export const HUBUP_ROLE_BUS_LEGACY = 'hubup_qna_bus';

function hubUpUserHasRootRole(roles: string[] | undefined): boolean {
  return roles?.includes(HUBUP_ROLE_HUB_ROOT) ?? false;
}

export function hubUpHasInquiriesAccess(
  roles: string[] | undefined,
  _profileStatus: string | null | undefined
): boolean {
  if (!HUBUP_INQUIRIES_ENABLED) return false;
  if (hubUpUserHasRootRole(roles)) return true;
  return roles?.includes(HUBUP_ROLE_INQUIRIES) ?? false;
}

function hubUpUserHasBusRole(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  return roles.includes(HUBUP_ROLE_BUS) || roles.includes(HUBUP_ROLE_BUS_LEGACY);
}

export function hubUpHasBusAccess(
  roles: string[] | undefined,
  _profileStatus: string | null | undefined
): boolean {
  if (hubUpUserHasRootRole(roles)) return true;
  return hubUpUserHasBusRole(roles);
}

/** /admin: hub-up root or bus/inquiries role */
export function hubUpHasAdminAreaAccess(
  roles: string[] | undefined,
  _profileStatus: string | null | undefined
): boolean {
  if (hubUpUserHasRootRole(roles)) return true;
  if (!roles?.length) return false;
  const hasInq = HUBUP_INQUIRIES_ENABLED && roles.includes(HUBUP_ROLE_INQUIRIES);
  return hasInq || hubUpUserHasBusRole(roles);
}

/** hub_web bulk user/roles UI — profiles.status === '관리자' only */
export function hubUpHasOrgWideAdmin(profileStatus: string | null | undefined): boolean {
  return profileStatus === '관리자';
}
