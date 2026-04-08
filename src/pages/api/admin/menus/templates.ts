import type { NextApiRequest, NextApiResponse } from 'next';
import { requireOrgWideAdminApi } from '@src/lib/hubup-auth-server';

/** hub_web `/api/admin/menus/templates`와 같이, 허브업 관리 라우트를 템플릿으로 노출 */
const HUBUP_ADMIN_MENU_TEMPLATES = [
  {
    menu_id: 'dashboard',
    title: '대시보드',
    icon: '📊',
    path: '/admin',
    description: '관리자 홈',
    category: 'core'
  },
  {
    menu_id: 'bus-requests',
    title: '버스 변경 요청',
    icon: '🚌',
    path: '/admin/bus-requests',
    description: '버스 시간 변경 요청',
    category: 'core'
  },
  {
    menu_id: 'inquiries',
    title: '문의사항',
    icon: '✉️',
    path: '/admin/inquiries',
    description: '문의 접수·처리',
    category: 'core'
  },
  {
    menu_id: 'users',
    title: '회원·권한',
    icon: '👥',
    path: '/admin/users',
    description: '회원·역할 관리',
    category: 'core'
  }
] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const gate = await requireOrgWideAdminApi(req, res);
  if (!gate.ok) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  return res.status(200).json([...HUBUP_ADMIN_MENU_TEMPLATES]);
}
