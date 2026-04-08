/** hub_web `/api/admin/menus/[id]` — PUT, DELETE */
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@src/lib/supabase';
import { requireOrgWideAdminApi } from '@src/lib/hubup-auth-server';
import { getKoreanTimestamp } from '@src/lib/utils/date';

function parseId(raw: string | string[] | undefined): number | null {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(String(s ?? ''), 10);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const gate = await requireOrgWideAdminApi(req, res);
  if (!gate.ok) return;

  const id = parseId(req.query.id);
  if (id == null) {
    return res.status(400).json({ success: false, message: '유효하지 않은 메뉴 ID입니다.' });
  }

  if (req.method === 'PUT') {
    const body = (req.body || {}) as Record<string, unknown>;
    const title = body.title != null ? String(body.title) : undefined;
    const icon = body.icon != null ? String(body.icon) : undefined;
    const pathVal = body.path != null ? String(body.path) : undefined;
    const description = body.description != null ? String(body.description) : undefined;
    const order_index = body.order_index;
    const parent_id = body.parent_id;
    const is_active = body.is_active;
    const roles = body.roles;

    const updatePayload: Record<string, unknown> = {
      updated_at: getKoreanTimestamp()
    };

    if (title !== undefined) updatePayload.title = title;
    if (icon !== undefined) updatePayload.icon = icon;
    if (pathVal !== undefined) updatePayload.path = pathVal;
    if (description !== undefined) updatePayload.description = description;
    if (typeof order_index === 'number') updatePayload.order_index = order_index;
    if (parent_id === null || parent_id === '') {
      updatePayload.parent_id = null;
    } else if (parent_id !== undefined && parent_id !== null) {
      const p = Number(parent_id);
      if (Number.isFinite(p)) updatePayload.parent_id = p;
    }
    if (typeof is_active === 'boolean') updatePayload.is_active = is_active;

    try {
      const { error: updateError } = await supabaseAdmin.from('admin_menus').update(updatePayload).eq('id', id);

      if (updateError) {
        console.error('[admin_menus PUT]', updateError);
        return res.status(500).json({ success: false, message: '메뉴 수정에 실패했습니다.' });
      }

      if (roles !== undefined) {
        await supabaseAdmin.from('admin_menu_roles').delete().eq('menu_id', id);
        if (Array.isArray(roles) && roles.length > 0) {
          const { data: roleData } = await supabaseAdmin.from('roles').select('id, name').in('name', roles);
          if (roleData?.length) {
            const rows = roleData.map((role: { id: number }) => ({ menu_id: id, role_id: role.id }));
            await supabaseAdmin.from('admin_menu_roles').insert(rows);
          }
        }
      }

      return res.status(200).json({ success: true, message: '메뉴가 수정되었습니다.' });
    } catch (e) {
      console.error('admin_menus PUT', e);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { data: childMenus } = await supabaseAdmin.from('admin_menus').select('id').eq('parent_id', id);

      if (childMenus && childMenus.length > 0) {
        return res.status(400).json({ success: false, message: '하위 메뉴가 있는 메뉴는 삭제할 수 없습니다.' });
      }

      const { error: deleteError } = await supabaseAdmin.from('admin_menus').delete().eq('id', id);

      if (deleteError) {
        console.error('[admin_menus DELETE]', deleteError);
        return res.status(500).json({ success: false, message: '메뉴 삭제에 실패했습니다.' });
      }

      return res.status(200).json({ success: true, message: '메뉴가 삭제되었습니다.' });
    } catch (e) {
      console.error('admin_menus DELETE', e);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
}
