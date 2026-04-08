/**
 * HUBUP 전용: `admin_menus`(버스: `hub-up/bus` + 레거시, 문의: `hubup_qna_inquiries`) + `admin_menu_roles` 만 읽기/쓰기
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@src/lib/supabase';
import { requireOrgWideAdminApi } from '@src/lib/hubup-auth-server';
import { getKoreanTimestamp } from '@src/lib/utils/date';
import { resolveHubUpAdminMenuIds } from '@src/lib/hubup-menu-resolve';

type RoleRow = { id: number; name: string; description: string | null };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const gate = await requireOrgWideAdminApi(req, res);
  if (!gate.ok) return;

  const resolved = await resolveHubUpAdminMenuIds();
  if (!resolved) {
    return res.status(500).json({
      success: false,
      message:
        'HUBUP용 admin_menus 행이 없습니다. supabase/sql/012_hubup_bus_admin.sql(허브업/버스/admin 전용) 및 013_hubup_bus_page.sql(허브업/버스/페이지 추가) 을 실행해 주세요.'
    });
  }
  const { busMenuIds, canonicalBusMenuId, inquiriesMenuId } = resolved;

  if (req.method === 'GET') {
    try {
      const { data: roles, error: rolesErr } = await supabaseAdmin
        .from('roles')
        .select('id, name, description')
        .order('id', { ascending: true });

      if (rolesErr) {
        console.error('[access-areas GET] roles', rolesErr);
        return res.status(500).json({ success: false, message: '역할 목록을 불러오지 못했습니다.' });
      }

      const { data: links, error: linkErr } = await supabaseAdmin
        .from('admin_menu_roles')
        .select('menu_id, role_id')
        .in('menu_id', [...busMenuIds, inquiriesMenuId]);

      if (linkErr) {
        console.error('[access-areas GET] admin_menu_roles', linkErr);
        return res.status(500).json({ success: false, message: '메뉴·역할 연결을 불러오지 못했습니다.' });
      }

      const busIdSet = new Set(busMenuIds);
      const busRoleIdSet = new Set(
        (links ?? []).filter((r) => busIdSet.has(r.menu_id)).map((r) => r.role_id as number)
      );
      const inqIds = new Set(
        (links ?? []).filter((r) => r.menu_id === inquiriesMenuId).map((r) => r.role_id as number)
      );

      const rows = (roles ?? []).map((r: RoleRow) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        bus: busRoleIdSet.has(r.id),
        inquiries: inqIds.has(r.id)
      }));

      return res.status(200).json({ success: true, data: rows });
    } catch (e) {
      console.error('access-areas GET', e);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'PUT') {
    const body = (req.body || {}) as {
      matrix?: { roleId: number; bus: boolean; inquiries: boolean }[];
    };
    const matrix = body.matrix;
    if (!Array.isArray(matrix)) {
      return res.status(400).json({ success: false, message: 'matrix 배열이 필요합니다.' });
    }

    try {
      const { error: delErr } = await supabaseAdmin
        .from('admin_menu_roles')
        .delete()
        .in('menu_id', [...busMenuIds, inquiriesMenuId]);

      if (delErr) {
        console.error('[access-areas PUT] delete', delErr);
        return res.status(500).json({ success: false, message: '기존 HUBUP 메뉴 연결을 지우지 못했습니다.' });
      }

      const inserts: { menu_id: number; role_id: number }[] = [];
      for (const row of matrix) {
        const id = Number(row.roleId);
        if (!Number.isFinite(id)) continue;
        if (row.bus) inserts.push({ menu_id: canonicalBusMenuId, role_id: id });
        if (row.inquiries) inserts.push({ menu_id: inquiriesMenuId, role_id: id });
      }

      if (inserts.length > 0) {
        const { error: insErr } = await supabaseAdmin.from('admin_menu_roles').insert(inserts);
        if (insErr) {
          console.error('[access-areas PUT] insert', insErr);
          return res.status(500).json({ success: false, message: '저장에 실패했습니다.' });
        }
      }

      return res.status(200).json({
        success: true,
        message: '저장되었습니다. 변경을 반영하려면 각 사용자가 다시 로그인하거나 세션을 새로고침해야 할 수 있습니다.',
        updated_at: getKoreanTimestamp()
      });
    } catch (e) {
      console.error('access-areas PUT', e);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
}
