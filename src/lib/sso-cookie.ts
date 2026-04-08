import type { NextApiRequest } from 'next';
import { verifyHubUpSessionCookie } from '@src/lib/hub-up-jwt';

export const HUBUP_SESSION_COOKIE = 'hubup_session';

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

/** API 라우트에서 SSO로 식별된 사용자 ID (없으면 null) */
export function getSsoUserIdFromRequest(req: NextApiRequest): string | null {
  const raw = parseCookies(req.headers.cookie)[HUBUP_SESSION_COOKIE];
  if (!raw) return null;
  try {
    return verifyHubUpSessionCookie(raw).sub;
  } catch {
    return null;
  }
}

export function buildSessionCookieHeader(token: string, maxAgeSec: number): string {
  const secure = process.env.NODE_ENV === 'production';
  const parts = [
    `${HUBUP_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearSessionCookieHeader(): string {
  const secure = process.env.NODE_ENV === 'production';
  const parts = [`${HUBUP_SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
