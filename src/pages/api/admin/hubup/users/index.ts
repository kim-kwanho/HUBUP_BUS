/**
 * hub_web `/api/admin/users` GET 과 동일한 조회 (페이지네이션·필터)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@src/lib/supabase';
import { requireOrgWideAdminApi } from '@src/lib/hubup-auth-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const gate = await requireOrgWideAdminApi(req, res);
  if (!gate.ok) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const page = typeof req.query.page === 'string' ? req.query.page : '1';
    const limit = typeof req.query.limit === 'string' ? req.query.limit : '20';
    const community = typeof req.query.community === 'string' ? req.query.community : undefined;
    const group_id = typeof req.query.group_id === 'string' ? req.query.group_id : undefined;
    const cell_id = typeof req.query.cell_id === 'string' ? req.query.cell_id : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    let countQuery = supabaseAdmin.from('profiles').select('user_id', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (community) countQuery = countQuery.eq('community', community);
    if (group_id) countQuery = countQuery.eq('group_id', parseInt(group_id, 10));
    if (cell_id) countQuery = countQuery.eq('cell_id', parseInt(cell_id, 10));
    if (status) {
      if (status === 'null') countQuery = countQuery.is('status', null);
      else countQuery = countQuery.eq('status', status);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error('[hubup users count]', countError);
      return res.status(500).json({ success: false, message: '사용자 수를 가져오는 데 실패했습니다.' });
    }

    let query = supabaseAdmin
      .from('profiles')
      .select(
        `
        user_id,
        email,
        name,
        birth_date,
        community,
        group_id,
        cell_id,
        status,
        created_at,
        hub_groups:group_id(id, name),
        hub_cells:cell_id(id, name),
        admin_roles(roles(name))
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (community) query = query.eq('community', community);
    if (group_id) query = query.eq('group_id', parseInt(group_id, 10));
    if (cell_id) query = query.eq('cell_id', parseInt(cell_id, 10));
    if (status) {
      if (status === 'null') query = query.is('status', null);
      else query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[hubup users]', error);
      return res.status(500).json({ success: false, message: '사용자 목록을 가져오는 데 실패했습니다.' });
    }

    const users = (data ?? []).map((user: Record<string, unknown>) => {
      const ar = user.admin_roles as { roles?: { name?: string } }[] | undefined;
      const roleNames =
        ar && Array.isArray(ar)
          ? ar.map((roleEntry) => roleEntry?.roles?.name).filter(Boolean)
          : [];

      const hg = user.hub_groups as { name?: string } | null;
      const hc = user.hub_cells as { name?: string } | null;
      const group_name = hg?.name ?? null;
      const cell_name = hc?.name ?? null;

      const { admin_roles: _a, hub_groups: _g, hub_cells: _c, ...rest } = user;

      return {
        ...rest,
        group_name,
        cell_name,
        group: user.hub_groups,
        cell: user.hub_cells,
        roles: roleNames
      };
    });

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (e) {
    console.error('api/admin/hubup/users:', e);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
}
