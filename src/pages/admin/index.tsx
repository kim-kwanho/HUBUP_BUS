import Link from 'next/link';
import styled from '@emotion/styled';
import { useSession } from 'next-auth/react';
import AdminShell, { ADMIN_NAV } from '@src/components/admin/AdminShell';
import { hubUpHasBusAccess, hubUpHasInquiriesAccess, hubUpHasOrgWideAdmin } from '@src/lib/hubup-permissions';

/** 사이드바 로고(LogoMark)와 동일한 허브업 초록 */
const HUBUP_GREEN = '#22c55e';
const HUBUP_GREEN_DEEP = '#15803d';

const Hero = styled.section`
  border-radius: 20px;
  padding: 28px 28px 26px;
  background: linear-gradient(135deg, ${HUBUP_GREEN} 0%, ${HUBUP_GREEN_DEEP} 100%);
  box-shadow: 0 10px 36px rgba(34, 197, 94, 0.28);
  margin-bottom: 28px;
`;

const HeroTitle = styled.h1`
  margin: 0 0 10px;
  font-size: clamp(1.35rem, 2.5vw, 1.75rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #ffffff;
  line-height: 1.35;
`;

const HeroSub = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.88);
  max-width: 520px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 800;
  color: #e2e8f0;
  letter-spacing: -0.02em;
`;

const MenuGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  align-items: stretch;
`;

const GridItem = styled.div`
  display: flex;
  min-height: 0;

  & > * {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 152px;
  }
`;

const MenuCard = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 20px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(34, 197, 94, 0.35);
    transform: translateY(-1px);
  }
`;

const MenuCardLink = styled.a`
  cursor: pointer;
  color: inherit;
`;

const MenuIcon = styled.div`
  font-size: 28px;
  margin-bottom: 12px;
  line-height: 1;
`;

const MenuTitle = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: #f1f5f9;
  margin-bottom: 8px;
`;

const MenuDesc = styled.div`
  font-size: 12px;
  line-height: 1.5;
  color: rgba(148, 163, 184, 0.95);
  flex: 1;
`;

const DASHBOARD_CARDS = ADMIN_NAV.filter((n) => n.href !== '/admin').map((n) => ({
  ...n,
  description:
    n.href === '/admin/users'
      ? '회원·역할(admin_roles) 관리'
      : n.href === '/admin/inquiries'
        ? '문의 접수·상태·답변'
        : n.href === '/admin/access'
          ? '버스·문의 admin 접근 역할 (HUBUP 전용)'
          : '버스 변경 요청 검토·처리'
}));

export default function AdminHomePage() {
  const { data: session } = useSession();
  const roles = session?.user?.roles ?? [];
  const profileStatus = session?.user?.profileStatus ?? undefined;
  const hubupArea = session?.user?.hubupArea;
  const displayName = session?.user?.name || session?.user?.email || '관리자';

  const visibleCards = DASHBOARD_CARDS.filter((item) => {
    if (item.href === '/admin/users' || item.href === '/admin/access') {
      return hubUpHasOrgWideAdmin(profileStatus);
    }
    if (item.href === '/admin/inquiries') return hubUpHasInquiriesAccess(roles, profileStatus, hubupArea);
    if (item.href === '/admin/bus-requests') return hubUpHasBusAccess(roles, profileStatus, hubupArea);
    return false;
  });

  return (
    <AdminShell title="대시보드" variant="dashboard">
      <Hero>
        <HeroTitle>
          환영합니다, {displayName}님! 👋
        </HeroTitle>
        <HeroSub>허브업 관리자 대시보드에서 시스템을 관리할 수 있습니다.</HeroSub>
      </Hero>

      <SectionTitle>📋 빠른 액세스</SectionTitle>
      <MenuGrid>
        {visibleCards.map((item) => (
          <GridItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <MenuCardLink>
                <MenuCard>
                  <MenuIcon aria-hidden>{item.icon}</MenuIcon>
                  <MenuTitle>{item.label}</MenuTitle>
                  <MenuDesc>{item.description}</MenuDesc>
                </MenuCard>
              </MenuCardLink>
            </Link>
          </GridItem>
        ))}
      </MenuGrid>
    </AdminShell>
  );
}
