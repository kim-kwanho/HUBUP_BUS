import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { HUBUP_INQUIRIES_ENABLED } from '@src/lib/hubup-inquiries-feature';

function getDefaultNextPath(pathname: string) {
  const homeHash = HUBUP_INQUIRIES_ENABLED ? '/#qa' : '/#faq';
  if (pathname === '/faq') return '/#faq';
  if (pathname === '/bus') return '/#bus';
  if (pathname === '/qa') return homeHash;
  if (pathname === '/') return homeHash;
  return pathname || '/';
}

/**
 * URL에 hub_web에서 넘긴 token이 있으면 /api/auth/sso 로 넘겨 쿠키를 세팅하고 token을 주소창에서 제거합니다.
 */
export default function TokenBootstrap() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    const token = router.query.token;
    if (typeof token !== 'string' || !token) return;

    const next =
      typeof router.query.next === 'string' && router.query.next.startsWith('/')
        ? router.query.next
        : getDefaultNextPath(router.pathname);

    const url = `/api/auth/sso?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`;
    window.location.replace(url);
  }, [router.isReady, router.query.token, router.query.next, router.pathname, router.asPath]);

  return null;
}
