import type { NextApiRequest, NextApiResponse } from 'next';
import { requireOrgWideAdminApi } from '@src/lib/hubup-auth-server';
import { supabaseAdmin } from '@src/lib/supabase';
import { getKoreanTimestamp } from '@src/lib/utils/date';

function formatMenus(menus: unknown[]) {
  return (menus || []).map((menu: any) => ({
    ...menu,
    roles:
      menu.admin_menu_roles?.map((mr: { roles?: { name?: string } }) => mr.roles?.name).filter(Boolean) ||
      [],
    admin_menu_roles: undefined
  }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const gate = await requireOrgWideAdminApi(req, res);
  if (!gate.ok) return;

  if (req.method === 'GET') {
    try {
      const { data: menus, error } = await supabaseAdmin
        .from('admin_menus')
        .select(
          `
          *,
          parent:parent_id(menu_id, title),
          admin_menu_roles(
            role_id,
            roles(id, name)
          )
        `
        )
        .order('order_index', { ascending: true });

      if (error) {
        console.error('[admin/menus GET]', error);
        return res.status(500).json({ success: false, message: '메뉴 목록을 가져오는 데 실패했습니다.' });
      }

      return res.status(200).json(formatMenus(menus || []));
    } catch (e) {
      console.error('api/admin/menus GET:', e);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const {
        menu_id,
        title,
        icon,
        path,
        parent_id,
        order_index,
        description,
        is_active,
        roles
      } = body as Record<string, unknown>;

      if (!menu_id || !title || !path) {
        return res.status(400).json({ success: false, message: 'menu_id, title, path는 필수입니다.' });
      }

      const { data: newMenu, error: insertError } = await supabaseAdmin
        .from('admin_menus')
        .insert({
          menu_id: String(menu_id).trim(),
          title: String(title).trim(),
          icon: icon != null ? String(icon) : null,
          path: String(path).trim(),
          parent_id: parent_id != null && parent_id !== '' ? Number(parent_id) : null,
          order_index: order_index != null ? Number(order_index) : 0,
          description: description != null ? String(description) : null,
          is_active: is_active !== false,
          updated_at: getKoreanTimestamp()
        })
        .select()
        .single();

      if (insertError || !newMenu) {
        console.error('[admin/menus POST]', insertError);
        return res.status(500).json({ success: false, message: '메뉴 생성에 실패했습니다.' });
      }

      const menuPk = (newMenu as { id: number }).id;

      if (Array.isArray(roles) && roles.length > 0) {
        const { data: roleData } = await supabaseAdmin.from('roles').select('id, name').in('name', roles);

        if (roleData && roleData.length > 0) {
          const menuRoles = roleData.map((role: { id: number }) => ({
            menu_id: menuPk,
            role_id: role.id
          }));
          const { error: mrErr } = await supabaseAdmin.from('admin_menu_roles').insert(menuRoles);
          if (mrErr) console.error('[admin/menus POST roles]', mrErr);
        }
      }

      return res.status(201).json(newMenu);
    } catch (e) {
      console.error('api/admin/menus POST:', e);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
}
