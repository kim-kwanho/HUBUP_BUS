import { supabaseAdmin } from '@src/lib/supabase';
import type { HubUpAreaFlags } from '@src/lib/hubup-permissions';
import {
  HUBUP_ADMIN_MENU_ID_INQUIRIES,
  HUBUP_BUS_MENU_IDS
} from '@src/lib/hubup-admin-menu-constants';

/**
 * 사용자 역할 name 목록으로 버스·문의 접근 가능 여부.
 * hub_web `admin_menus`(HUBUP 버스: `hub-up/bus` 및 레거시 `hubup_qna_bus`) + `admin_menu_roles` 만 사용.
 */
export async function fetchHubUpAreaFlags(roleNames: string[]): Promise<Required<HubUpAreaFlags>> {
  const empty = { bus: false, inquiries: false };
  if (!roleNames.length) return empty;

  const { data: roleRows, error: roleErr } = await supabaseAdmin
    .from('roles')
    .select('id, name')
    .in('name', roleNames);

  if (roleErr || !roleRows?.length) return empty;

  const roleIds = roleRows.map((r) => r.id);

  const { data: menuRows, error: menuErr } = await supabaseAdmin
    .from('admin_menus')
    .select('id, menu_id')
    .in('menu_id', [...HUBUP_BUS_MENU_IDS, HUBUP_ADMIN_MENU_ID_INQUIRIES]);

  if (menuErr || !menuRows?.length) return empty;

  const busMenuRows = menuRows.filter((m) =>
    (HUBUP_BUS_MENU_IDS as readonly string[]).includes(m.menu_id)
  );
  const inqMenuId = menuRows.find((m) => m.menu_id === HUBUP_ADMIN_MENU_ID_INQUIRIES)?.id;

  if (!busMenuRows.length || inqMenuId == null) return empty;

  const busMenuIds = busMenuRows.map((m) => m.id);
  const numericMenuIds = [...busMenuIds, inqMenuId];

  const { data: links, error: linkErr } = await supabaseAdmin
    .from('admin_menu_roles')
    .select('menu_id, role_id')
    .in('role_id', roleIds)
    .in('menu_id', numericMenuIds);

  if (linkErr || !links?.length) return empty;

  let bus = false;
  let inquiries = false;
  const busIdSet = new Set(busMenuIds);
  for (const l of links) {
    if (busIdSet.has(l.menu_id)) bus = true;
    if (l.menu_id === inqMenuId) inquiries = true;
  }
  return { bus, inquiries };
}
