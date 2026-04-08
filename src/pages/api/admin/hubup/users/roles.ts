/**
 * hub_web `/api/admin/users/roles` PUT 과 동일 — admin_roles 전체 교체 + profiles.status
 */
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
    const { userId, roles } = req.body || {};
    if (!userId || typeof userId !== 'string' || !Array.isArray(roles)) {
      return res.status(400).json({ success: false, message: '유효하지 않은 요청입니다.' });
    }

    const roleNames = roles as string[];
    let roleData: { id: number; name: string }[] | null = [];

    if (roleNames.length > 0) {
      const { data, error: roleError } = await supabaseAdmin
        .from('roles')
        .select('id, name')
        .in('name', roleNames);

      if (roleError) {
        console.error('[hubup users/roles] roles', roleError);
        return res.status(500).json({ success: false, message: '역할 조회에 실패했습니다.' });
      }
      roleData = data ?? [];
    }

    const { error: deleteError } = await supabaseAdmin.from('admin_roles').delete().eq('user_id', userId);

    if (deleteError) {
      console.error('[hubup users/roles] delete', deleteError);
      return res.status(500).json({ success: false, message: '기존 권한 삭제에 실패했습니다.' });
    }

    if (roleData && roleData.length > 0) {
      const adminRoles = roleData.map((role: { id: number }) => ({
        user_id: userId,
        role_id: role.id
      }));

      const { error: insertError } = await supabaseAdmin.from('admin_roles').insert(adminRoles);

      if (insertError) {
        console.error('[hubup users/roles] insert', insertError);
        return res.status(500).json({ success: false, message: '권한 추가에 실패했습니다.' });
      }
    }

    const newStatus = roleData && roleData.length > 0 ? '관리자' : '활성';
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ status: newStatus })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[hubup users/roles] profile status', updateError);
    }

    return res.status(200).json({ success: true, message: '권한이 수정되었습니다.' });
  } catch (e) {
    console.error('api/admin/hubup/users/roles:', e);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
}
