import type { NextApiRequest, NextApiResponse } from 'next';
import { getSsoUserIdFromRequest } from '@src/lib/sso-cookie';

/** SSO 세션 쿠키 기준 현재 사용자 ID */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const userId = getSsoUserIdFromRequest(req);
  return res.status(200).json({ userId });
}
