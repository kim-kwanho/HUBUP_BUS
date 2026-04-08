/** hub_web `/api/admin/menus` — GET 목록, POST 생성 (기관 관리자) */
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@src/lib/supabase';
import { requireOrgWideAdminApi } from '@src/lib/hubup-auth-server';
import { getKoreanTimestamp } from '@src/lib/utils/date';

function formatRows(menus: unknown[] | null) {
  return (menus || []).map((menu: unknown) => {
    const row = menu as Record<string, unknown>;
    const raw = row.admin_menu_roles as { roles?: { name?: string } }[] | undefined;
    const roles =
      raw?.map((mr) => mr.roles?.name).filter((n): n is string => Boolean(n)) ?? [];
    const { admin_menu_roles: _a, ...rest } = row;
    return { ...rest, roles };
  });
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
          admin_menu_roles(
            role_id,
            roles(id, name)
          )
        `
        )
        .order('order_index', { ascending: true });

      if (error) {
        console.error('[admin_menus GET]', error);
        return res.status(500).json({ success: false, message: '메뉴 목록을 가져오는 데 실패했습니다.' });
      }

      return res.status(200).json({ success: true, data: formatRows(menus) });
    } catch (e) {
      console.error('admin_menus GET', e);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'POST') {
    const body = (req.body || {}) as Record<string, unknown>;
    const menu_id = body.menu_id != null ? String(body.menu_id).trim() : '';
    const title = body.title != null ? String(body.title).trim() : '';
    const path = body.path != null ? String(body.path).trim() : '';
    const icon = body.icon != null ? String(body.icon) : '';
    const description = body.description != null ? String(body.description) : '';
    const order_index = typeof body.order_index === 'number' ? body.order_index : 0;
    const parent_id =
      body.parent_id === null || body.parent_id === undefined || body.parent_id === ''
        ? null
        : Number(body.parent_id);
    const roles = Array.isArray(body.roles) ? (body.roles as string[]) : [];

    if (!menu_id || !title || !path) {
      return res.status(400).json({ success: false, message: 'menu_id, title, path는 필수입니다.' });
    }

    try {
      const { data: newMenu, error: insertError } = await supabaseAdmin
        .from('admin_menus')
        .insert({
          menu_id,
          title,
          icon: icon || null,
          path,
          parent_id: parent_id != null && Number.isFinite(parent_id) ? parent_id : null,
          order_index,
          description: description || null,
          updated_at: getKoreanTimestamp()
        })
        .select()
        .single();

      if (insertError || !newMenu) {
        console.error('[admin_menus POST]', insertError);
        return res.status(500).json({ success: false, message: '메뉴 생성에 실패했습니다.' });
      }

      const mid = (newMenu as { id: number }).id;
      if (roles.length > 0) {
        const { data: roleData } = await supabaseAdmin.from('roles').select('id, name').in('name', roles);
        if (roleData?.length) {
          const rows = roleData.map((role: { id: number }) => ({
            menu_id: mid,
            role_id: role.id
          }));
          await supabaseAdmin.from('admin_menu_roles').insert(rows);
        }
      }

      return res.status(201).json({ success: true, data: newMenu });
    } catch (e) {
      console.error('admin_menus POST', e);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
}
