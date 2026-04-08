import { useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import styled from '@emotion/styled';

const Wrap = styled.main`
  min-height: 100vh;
  padding: 48px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Card = styled.section`
  width: 100%;
  max-width: 520px;
  padding: 18px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const Title = styled.h1`
  margin: 0 0 8px;
  font-size: 18px;
`;

const Desc = styled.p`
  margin: 0;
  opacity: 0.85;
  line-height: 1.5;
  font-size: 13px;
`;

/**
 * (선택) Google OAuth로 직접 로컬/개발 로그인할 때 쓰는 진입점.
 * 운영 연동은 허브워십에서 발급한 `?token=` JWT를 이 앱이 받는 흐름을 사용합니다.
 *
 * 사용 예:
 * - /start?redirect=/qa
 */
export default function StartPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const redirect =
      typeof router.query.redirect === 'string' && router.query.redirect.startsWith('/')
        ? router.query.redirect
        : '/';

    if (status === 'authenticated') {
      router.replace(redirect);
      return;
    }

    if (status === 'unauthenticated') {
      // hub_web과 동일하게 GoogleProvider를 사용하므로 providerId는 'google'
      signIn('google', { callbackUrl: redirect });
    }
  }, [router.isReady, router.query.redirect, router, status]);

  return (
    <Wrap>
      <Card>
        <Title>Google 로그인으로 이동 중…</Title>
        <Desc>SSO(token) 연동이 아닌 경우에만 사용하세요. 운영에서는 허브워십 배너 → token 발급 링크를 씁니다.</Desc>
      </Card>
    </Wrap>
  );
}

