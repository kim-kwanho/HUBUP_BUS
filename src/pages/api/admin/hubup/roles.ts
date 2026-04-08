/** hub_web `/api/admin/roles` GET — 역할 목록 */
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
    const { data: roles, error } = await supabaseAdmin
      .from('roles')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('[hubup roles]', error);
      return res.status(500).json({ success: false, message: '권한 목록을 가져오는 데 실패했습니다.' });
    }

    return res.status(200).json(roles ?? []);
  } catch (e) {
    console.error('api/admin/hubup/roles:', e);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
}
