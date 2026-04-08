import jwt from 'jsonwebtoken';

/** hub_web 발급 JWT와 동일한 purpose */
export const HUB_UP_JWT_PURPOSE = 'hub_up_bus_change';

const SESSION_TYP = 'hubup_sso_session';

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not set');
  }
  return secret;
}

/**
 * hub_web → 외부 사이트로 넘긴 entry JWT 검증
 * (서명, 만료, purpose, sub)
 */
export function verifyHubUpEntryToken(token: string): { sub: string } {
  const secret = getSecret();
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

  if (decoded.purpose !== HUB_UP_JWT_PURPOSE) {
    throw new Error('INVALID_PURPOSE');
  }
  if (!decoded.sub || typeof decoded.sub !== 'string') {
    throw new Error('INVALID_SUB');
  }

  return { sub: decoded.sub };
}

/** 브라우저 쿠키에 저장하는 연장 세션 JWT */
export function signHubUpSessionCookie(userId: string): string {
  const secret = getSecret();
  return jwt.sign({ sub: userId, typ: SESSION_TYP }, secret, {
    algorithm: 'HS256',
    expiresIn: '7d'
  });
}

export function verifyHubUpSessionCookie(token: string): { sub: string } {
  const secret = getSecret();
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
  if (decoded.typ !== SESSION_TYP) {
    throw new Error('INVALID_SESSION_TYPE');
  }
  if (!decoded.sub || typeof decoded.sub !== 'string') {
    throw new Error('INVALID_SUB');
  }
  return { sub: decoded.sub };
}
