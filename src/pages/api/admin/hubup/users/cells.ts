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
    const group_id = typeof req.query.group_id === 'string' ? req.query.group_id : undefined;

    let query = supabaseAdmin
      .from('hub_cells')
      .select('id, name, group_id, is_active')
      .order('name', { ascending: true });

    if (group_id) {
      query = query.eq('group_id', parseInt(group_id, 10));
    }

    const { data: cells, error } = await query;
    if (error) {
      console.error('[hubup cells]', error);
      return res.status(500).json({ success: false, message: '다락방 목록을 가져오는 데 실패했습니다.' });
    }

    return res.status(200).json(cells ?? []);
  } catch (e) {
    console.error('api/admin/hubup/users/cells:', e);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
}
