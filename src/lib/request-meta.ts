import type { NextApiRequest } from 'next';

/** 프록시 뒤에서는 X-Forwarded-For / X-Real-Ip 우선 */
export function getClientIp(req: NextApiRequest): string | null {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0].trim();
  if (Array.isArray(xf) && xf[0]?.trim()) return xf[0].split(',')[0].trim();
  const rip = req.headers['x-real-ip'];
  if (typeof rip === 'string' && rip.trim()) return rip.trim();
  const addr = req.socket?.remoteAddress;
  if (typeof addr === 'string' && addr) {
    if (addr.startsWith('::ffff:')) return addr.slice(7);
    return addr;
  }
  return null;
}
