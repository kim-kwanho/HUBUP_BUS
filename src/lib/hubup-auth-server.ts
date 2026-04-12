import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@src/lib/auth';
import { hubUpHasInquiriesAccess, hubUpHasOrgWideAdmin } from '@src/lib/hubup-permissions';

export async function requireHubUpInquiriesApi(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ ok: true; session: NonNullable<Awaited<ReturnType<typeof getServerSession>>> } | { ok: false }> {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    return { ok: false };
  }
  const roles = session.user.roles ?? [];
  const profileStatus = session.user.profileStatus ?? undefined;
  if (!hubUpHasInquiriesAccess(roles, profileStatus)) {
    res.status(403).json({ success: false, message: '문의 관리 권한이 없습니다.' });
    return { ok: false };
  }
  return { ok: true, session };
}

export async function requireHubUpBusApi(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ ok: true; session: NonNullable<Awaited<ReturnType<typeof getServerSession>>> } | { ok: false }> {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    return { ok: false };
  }
  return { ok: true, session };
}

/** hub_web과 동일한 사용자·역할(admin_roles) 일괄 수정 — 기관 관리자만 */
export async function requireOrgWideAdminApi(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ ok: true; session: NonNullable<Awaited<ReturnType<typeof getServerSession>>> } | { ok: false }> {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    return { ok: false };
  }
  const profileStatus = session.user.profileStatus ?? undefined;
  if (!hubUpHasOrgWideAdmin(profileStatus)) {
    res.status(403).json({
      success: false,
      message: '기관 관리자(profiles.status=관리자)만 접근할 수 있습니다.'
    });
    return { ok: false };
  }
  return { ok: true, session };
}
