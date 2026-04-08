import type { NextApiRequest, NextApiResponse } from 'next';
import { requireOrgWideAdminApi } from '@src/lib/hubup-auth-server';
import { supabaseAdmin } from '@src/lib/supabase';
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
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const { title, icon, path, parent_id, order_index, description, is_active, roles } = body;

      const { error: updateError } = await supabaseAdmin
        .from('admin_menus')
        .update({
          title,
          icon,
          path,
          parent_id: parent_id === null || parent_id === '' ? null : Number(parent_id),
          order_index: order_index != null ? Number(order_index) : undefined,
          description,
          is_active,
          updated_at: getKoreanTimestamp()
        })
        .eq('id', id);

      if (updateError) {
        console.error('[admin/menus PUT]', updateError);
        return res.status(500).json({ success: false, message: '메뉴 수정에 실패했습니다.' });
      }

      if (roles !== undefined) {
        await supabaseAdmin.from('admin_menu_roles').delete().eq('menu_id', id);

        if (Array.isArray(roles) && roles.length > 0) {
          const { data: roleData } = await supabaseAdmin.from('roles').select('id, name').in('name', roles);

          if (roleData && roleData.length > 0) {
            const menuRoleRows = roleData.map((role: { id: number }) => ({
              menu_id: id,
              role_id: role.id
            }));
            const { error: insErr } = await supabaseAdmin.from('admin_menu_roles').insert(menuRoleRows);
            if (insErr) console.error('[admin/menus PUT roles]', insErr);
          }
        }
      }

      return res.status(200).json({ success: true, message: '메뉴가 수정되었습니다.' });
    } catch (e) {
      console.error('api/admin/menus PUT:', e);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { data: childMenus } = await supabaseAdmin.from('admin_menus').select('id').eq('parent_id', id);

      if (childMenus && childMenus.length > 0) {
        return res.status(400).json({
          success: false,
          error: '하위 메뉴가 있는 메뉴는 삭제할 수 없습니다.',
          message: '하위 메뉴가 있는 메뉴는 삭제할 수 없습니다.'
        });
      }

      const { error: deleteError } = await supabaseAdmin.from('admin_menus').delete().eq('id', id);

      if (deleteError) {
        console.error('[admin/menus DELETE]', deleteError);
        return res.status(500).json({ success: false, message: '메뉴 삭제에 실패했습니다.' });
      }

      return res.status(200).json({ success: true, message: '메뉴가 삭제되었습니다.' });
    } catch (e) {
      console.error('api/admin/menus DELETE:', e);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
}
