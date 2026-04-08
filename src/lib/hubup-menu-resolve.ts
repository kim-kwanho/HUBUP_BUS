import { supabaseAdmin } from '@src/lib/supabase';
import {
  HUBUP_ADMIN_MENU_ID_BUS,
  HUBUP_ADMIN_MENU_ID_INQUIRIES,
  HUBUP_BUS_MENU_IDS
} from '@src/lib/hubup-admin-menu-constants';

export type ResolvedHubUpMenus = {
  /** 버스(레거시+신규) 메뉴 행 — 플래그 조회 시 합산 */
  busMenuIds: number[];
  /** 저장(PUT) 시 사용할 단일 버스 메뉴 id — `hub-up/bus` 우선 */
  canonicalBusMenuId: number;
  inquiriesMenuId: number;
};

/**
 * HUBUP 버스·문의 admin_menus 행 id를 해석한다.
 * 버스는 `hub-up/bus` 우선, 없으면 `hubup_qna_bus`만 있어도 동작.
 */
export async function resolveHubUpAdminMenuIds(): Promise<ResolvedHubUpMenus | null> {
  const menuIds = [...HUBUP_BUS_MENU_IDS, HUBUP_ADMIN_MENU_ID_INQUIRIES];
  const { data: menus, error } = await supabaseAdmin
    .from('admin_menus')
    .select('id, menu_id')
    .in('menu_id', menuIds);

  if (error || !menus?.length) return null;

  const busRows = menus.filter((m) =>
    (HUBUP_BUS_MENU_IDS as readonly string[]).includes(m.menu_id)
  );
  const inqRow = menus.find((m) => m.menu_id === HUBUP_ADMIN_MENU_ID_INQUIRIES);

  if (!busRows.length || inqRow == null) return null;

  const busMenuIds = busRows.map((r) => r.id).filter((id): id is number => typeof id === 'number');
  const preferred = busRows.find((r) => r.menu_id === HUBUP_ADMIN_MENU_ID_BUS);
  const canonicalBusMenuId = preferred?.id ?? busRows[0].id;

  return {
    busMenuIds,
    canonicalBusMenuId,
    inquiriesMenuId: inqRow.id
  };
}
