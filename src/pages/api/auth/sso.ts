import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyHubUpEntryToken, signHubUpSessionCookie } from '@src/lib/hub-up-jwt';
import { buildSessionCookieHeader } from '@src/lib/sso-cookie';

/**
 * hub_web에서 발급한 ?token= JWT를 검증한 뒤, 이 도메인용 세션 쿠키를 발급하고 리다이렉트합니다.
 * GET /api/auth/sso?token=...&next=/qa
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const token = typeof req.query.token === 'string' ? req.query.token : null;
  const nextRaw = typeof req.query.next === 'string' ? req.query.next : '/';
  const nextPath = nextRaw.startsWith('/') ? nextRaw : '/';

  if (!token) {
    return res.status(400).send('token query is required');
  }

  try {
    const { sub } = verifyHubUpEntryToken(token);
    const sessionJwt = signHubUpSessionCookie(sub);
    res.setHeader('Set-Cookie', buildSessionCookieHeader(sessionJwt, 7 * 24 * 60 * 60));
    return res.redirect(302, nextPath);
  } catch (e) {
    console.error('[api/auth/sso]', e);
    return res.status(401).send('Invalid or expired token');
  }
}
