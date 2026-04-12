import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styled from '@emotion/styled';
import { useSession } from 'next-auth/react';

const SIDEBAR_W = 260;
const HUBUP_NAVY = '#0f172d';
const HUBUP_NAVY_SOFT = '#16213d';
const HUBUP_NAVY_DEEP = '#0a1020';
const HUBUP_BLUE = '#35548b';
const HUBUP_BLUE_SOFT = 'rgba(53, 84, 139, 0.22)';

const Layout = styled.div`
  display: flex;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(53, 84, 139, 0.1), transparent 28%),
    linear-gradient(180deg, ${HUBUP_NAVY} 0%, ${HUBUP_NAVY_DEEP} 100%);
`;

const Sidebar = styled.aside`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 40;
  width: ${SIDEBAR_W}px;
  height: 100vh;
  background: rgba(10, 16, 32, 0.96);
  border-right: 1px solid rgba(148, 163, 184, 0.12);
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
  background: linear-gradient(135deg, ${HUBUP_BLUE} 0%, #243f74 100%);
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
  color: ${({ $active }) => ($active ? '#f3fbf7' : 'rgba(226, 232, 240, 0.88)')};
  background: ${({ $active }) =>
    $active ? HUBUP_BLUE_SOFT : 'transparent'};
  border: 1px solid
    ${({ $active }) => ($active ? 'rgba(53, 84, 139, 0.34)' : 'transparent')};
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: ${({ $active }) =>
      $active ? 'rgba(53, 84, 139, 0.28)' : 'rgba(255, 255, 255, 0.06)'};
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
  background:
    linear-gradient(180deg, rgba(22, 33, 61, 0.2), transparent 120px),
    transparent;

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
    color: #f8fafc;
  }
`;

export const ADMIN_NAV = [
  {
    href: '/admin/bus-requests',
    label: '버스 변경 요청',
    icon: '🚌'
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
  const navItems = ADMIN_NAV;

  return (
    <Layout>
      <Sidebar>
        <LogoBlock>
          <LogoMark aria-hidden>⚡</LogoMark>
          <LogoTitle>HUBUP Admin</LogoTitle>
          <LogoSub>허브업 버스 운영</LogoSub>
        </LogoBlock>
        <Nav aria-label="관리자 메뉴">
          {navItems.map((item) => {
            const active = path === item.href || path.startsWith(`${item.href}/`);
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
