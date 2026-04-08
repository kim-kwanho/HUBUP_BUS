/** hub_web `/api/admin/users/update` PUT 과 동일 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@src/lib/supabase';
import { requireOrgWideAdminApi } from '@src/lib/hubup-auth-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const gate = await requireOrgWideAdminApi(req, res);
  if (!gate.ok) return;

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { userId, community, group_id, cell_id, status } = req.body || {};
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
    }

    const updateData: Record<string, unknown> = {};
    if (community !== undefined) updateData.community = community || null;
    if (group_id !== undefined) updateData.group_id = group_id || null;
    if (cell_id !== undefined) updateData.cell_id = cell_id || null;
    if (status !== undefined) updateData.status = status || null;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: '수정할 필드가 없습니다.' });
    }

    const { error: updateError } = await supabaseAdmin.from('profiles').update(updateData).eq('user_id', userId);

    if (updateError) {
      console.error('[hubup users/update]', updateError);
      return res.status(500).json({ success: false, message: '사용자 정보 수정에 실패했습니다.' });
    }

    return res.status(200).json({ success: true, message: '사용자 정보가 수정되었습니다.' });
  } catch (e) {
    console.error('api/admin/hubup/users/update:', e);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
}
