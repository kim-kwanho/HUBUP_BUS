import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styled from '@emotion/styled';
import { useSession } from 'next-auth/react';
import {
  hubUpHasBusAccess,
  hubUpHasInquiriesAccess,
  hubUpHasOrgWideAdmin
} from '@src/lib/hubup-permissions';

const SIDEBAR_W = 260;

const Layout = styled.div`
  display: flex;
  min-height: 100vh;
  background: #0b1020;
`;

const Sidebar = styled.aside`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 40;
  width: ${SIDEBAR_W}px;
  height: 100vh;
  background: rgba(15, 23, 42, 0.96);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  padding: 20px 0 16px;
  box-sizing: border-box;

  @media (max-width: 900px) {
    position: relative;
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
`;

const LogoBlock = styled.div`
  padding: 0 18px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const LogoMark = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #22c55e, #15803d);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-bottom: 10px;
`;

const LogoTitle = styled.div`
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #f8fafc;
`;

const LogoSub = styled.div`
  font-size: 11px;
  color: rgba(148, 163, 184, 0.95);
  margin-top: 4px;
  font-weight: 500;
`;

const Nav = styled.nav`
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const NavLink = styled.a<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#ecfdf5' : 'rgba(226, 232, 240, 0.88)')};
  background: ${({ $active }) =>
    $active ? 'rgba(34, 197, 94, 0.22)' : 'transparent'};
  border: 1px solid
    ${({ $active }) => ($active ? 'rgba(34, 197, 94, 0.35)' : 'transparent')};
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: ${({ $active }) =>
      $active ? 'rgba(34, 197, 94, 0.26)' : 'rgba(255, 255, 255, 0.06)'};
  }
`;

const NavIcon = styled.span`
  font-size: 18px;
  line-height: 1;
`;

const UserBox = styled.div`
  padding: 12px 16px 0;
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  color: rgba(148, 163, 184, 0.95);
  line-height: 1.45;
`;

const Main = styled.main`
  flex: 1;
  margin-left: ${SIDEBAR_W}px;
  min-width: 0;
  padding: 24px 20px 64px;

  @media (max-width: 900px) {
    margin-left: 0;
  }
`;

const MainTop = styled.div<{ $dashboard?: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: ${({ $dashboard }) => ($dashboard ? 'flex-end' : 'space-between')};
  gap: 16px;
  margin-bottom: ${({ $dashboard }) => ($dashboard ? '12px' : '20px')};
  flex-wrap: wrap;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #f1f5f9;
`;

const TopLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(148, 163, 184, 0.95);

  a:hover {
    color: #e2e8f0;
  }
`;

export const ADMIN_NAV = [
  { href: '/admin', label: '대시보드', icon: '📊', perm: 'all' as const },
  {
    href: '/admin/bus-requests',
    label: '버스 변경 요청',
    icon: '🚌',
    perm: 'bus' as const
  },
  { href: '/admin/inquiries', label: '문의사항', icon: '✉️', perm: 'inquiries' as const },
  {
    href: '/admin/access',
    label: '허브업 접근 권한',
    icon: '🔐',
    perm: 'org' as const
  },
  {
    href: '/admin/users',
    label: '회원·권한',
    icon: '👥',
    perm: 'org' as const
  }
] as const;

type Props = {
  title: string;
  children: ReactNode;
  /** 대시보드: 상단 페이지 제목 숨김(환영 배너에서 제목 역할) */
  variant?: 'default' | 'dashboard';
};

export default function AdminShell({ title, children, variant = 'default' }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const path = router.pathname;
  const roles = session?.user?.roles ?? [];
  const profileStatus = session?.user?.profileStatus ?? undefined;
  const hubupArea = session?.user?.hubupArea;
  const isOrgAdmin = profileStatus === '관리자';

  const navItems = ADMIN_NAV.filter((item) => {
    if (item.perm === 'all') return true;
    if (item.perm === 'org') return hubUpHasOrgWideAdmin(profileStatus);
    if (item.perm === 'inquiries') return hubUpHasInquiriesAccess(roles, profileStatus, hubupArea);
    if (item.perm === 'bus') return hubUpHasBusAccess(roles, profileStatus, hubupArea);
    return false;
  });

  return (
    <Layout>
      <Sidebar>
        <LogoBlock>
          <LogoMark aria-hidden>⚡</LogoMark>
          <LogoTitle>HUBUP Admin</LogoTitle>
          <LogoSub>허브업 Q&amp;A · 운영</LogoSub>
        </LogoBlock>
        <Nav aria-label="관리자 메뉴">
          {navItems.map((item) => {
            const active =
              item.href === '/admin'
                ? path === '/admin'
                : path === item.href || path.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} passHref legacyBehavior>
                <NavLink $active={active}>
                  <NavIcon aria-hidden>{item.icon}</NavIcon>
                  {item.label}
                </NavLink>
              </Link>
            );
          })}
        </Nav>
        <UserBox>
          {session?.user?.name || session?.user?.email || '관리자'}
          {isOrgAdmin ? <span> · 기관 관리자</span> : null}
          {roles.length > 0 ? <span> · 역할: {roles.join(', ')}</span> : null}
        </UserBox>
      </Sidebar>
      <Main>
        <MainTop $dashboard={variant === 'dashboard'}>
          {variant !== 'dashboard' ? <PageTitle>{title}</PageTitle> : null}
          <TopLinks>
            <Link href="/">사용자 메인</Link>
          </TopLinks>
        </MainTop>
        {children}
      </Main>
    </Layout>
  );
}
