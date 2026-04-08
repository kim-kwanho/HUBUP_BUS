/**
 * HUBUP 전용: 버스 / 문의 admin 접근 허용 역할 (hub_web 전체 메뉴 API와 무관)
 */
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from '@emotion/styled';
import AdminShell from '@src/components/admin/AdminShell';
import { HUBUP_INQUIRIES_ENABLED } from '@src/lib/hubup-inquiries-feature';
import { hubUpHasOrgWideAdmin } from '@src/lib/hubup-permissions';

type MatrixRow = {
  id: number;
  name: string;
  description: string | null;
  bus: boolean;
  inquiries: boolean;
};

const HeaderBlock = styled.div`
  margin-bottom: 18px;
`;

const Title = styled.h2`
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 800;
  color: #e2e8f0;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 13px;
  color: rgba(148, 163, 184, 0.95);
  line-height: 1.55;
`;

const Card = styled.section`
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  font-size: 12px;
  opacity: 0.9;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
`;

const Td = styled.td`
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 13px;
  vertical-align: middle;
`;

const RoleName = styled.div`
  font-weight: 700;
  color: #f1f5f9;
`;

const RoleDesc = styled.div`
  font-size: 11px;
  color: rgba(148, 163, 184, 0.9);
  margin-top: 4px;
`;

const ToggleWrap = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  color: rgba(226, 232, 240, 0.95);
  font-size: 12px;
  font-weight: 600;
`;

const ToggleInput = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #22c55e;
  cursor: pointer;
`;

const BtnRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  padding: 14px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.15);
`;

const Btn = styled.button<{ $primary?: boolean }>`
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid
    ${({ $primary }) => ($primary ? 'rgba(34, 197, 94, 0.45)' : 'rgba(255, 255, 255, 0.14)')};
  background: ${({ $primary }) => ($primary ? 'rgba(34, 197, 94, 0.2)' : 'transparent')};
  color: ${({ $primary }) => ($primary ? '#ecfdf5' : 'rgba(226, 232, 240, 0.9)')};
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;

  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px;
  color: rgba(148, 163, 184, 0.95);
  line-height: 1.5;
`;

export default function HubUpAccessPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileStatus = session?.user?.profileStatus ?? undefined;
  const canOrg = hubUpHasOrgWideAdmin(profileStatus);
  const tableColSpan = HUBUP_INQUIRIES_ENABLED ? 3 : 2;

  const [draft, setDraft] = useState<MatrixRow[]>([]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['hubup-access-areas'],
    queryFn: async () => {
      const res = await fetch('/api/admin/hubup/access-areas', { credentials: 'same-origin' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || '불러오지 못했습니다.');
      if (!json.success) throw new Error(json?.message || '불러오지 못했습니다.');
      return json.data as MatrixRow[];
    },
    enabled: status === 'authenticated' && canOrg,
    staleTime: 0
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/api/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (Array.isArray(data)) {
      setDraft(data.map((r) => ({ ...r })));
    }
  }, [data]);

  const dirty = useMemo(() => {
    if (!data || !draft.length) return false;
    return JSON.stringify(data) !== JSON.stringify(draft);
  }, [data, draft]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/hubup/access-areas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          matrix: draft.map((r) => ({
            roleId: r.id,
            bus: r.bus,
            inquiries: r.inquiries
          }))
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || '저장에 실패했습니다.');
      return json;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hubup-access-areas'] });
      await queryClient.invalidateQueries({ queryKey: ['hubup-admin-bus-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['hubup-admin-inquiries'] });
      alert('저장되었습니다. 일부 사용자는 다시 로그인해야 반영될 수 있습니다.');
    },
    onError: (e: Error) => alert(e.message)
  });

  useEffect(() => {
    if (status === 'authenticated' && !canOrg) {
      router.replace('/admin');
    }
  }, [status, canOrg, router]);

  const setCell = (id: number, key: 'bus' | 'inquiries', value: boolean) => {
    setDraft((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  if (status === 'loading' || (status === 'authenticated' && !canOrg)) {
    return (
      <AdminShell title="허브업 접근 권한">
        <Subtitle>로딩 중…</Subtitle>
      </AdminShell>
    );
  }

  if (isError) {
    return (
      <AdminShell title="허브업 접근 권한">
        <Subtitle style={{ color: '#fca5a5', whiteSpace: 'pre-wrap' }}>
          {error instanceof Error ? error.message : '오류가 발생했습니다.'}
        </Subtitle>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="허브업 접근 권한">
      <HeaderBlock>
        <Title>허브업 접근 권한</Title>
        <Subtitle>
          hub_web과 동일한 <code>admin_menus</code> · <code>admin_menu_roles</code> 테이블을 쓰되, 버스는 상위{' '}
          <code>hub-up</code> 아래 <code>hub-up/bus</code> 메뉴(레거시 <code>hubup_qna_bus</code> 행이 있어도
          함께 인식)와 연동합니다.
          {HUBUP_INQUIRIES_ENABLED ? (
            <> 문의는 <code>hubup_qna_inquiries</code> 행과 연동합니다.</>
          ) : (
            <> 문의 기능이 꺼져 있으면 문의 메뉴는 제외됩니다.</>
          )}{' '}
          기관 관리자(<code>profiles.status=관리자</code>)는 항상 전체 접근 가능합니다. 사용자에게는 역할{' '}
          <code>hub-up/bus</code>(또는 레거시 <code>hubup_qna_bus</code>)를 hub_web에서 부여한 뒤, 여기서 메뉴
          접근을 켜 주세요.
        </Subtitle>
      </HeaderBlock>

      <LegendRow>
        <span>
          <strong style={{ color: '#fbbf24' }}>버스</strong> → <code>menu_id hub-up/bus</code>,{' '}
          <code>/admin/bus-requests</code>
        </span>
        {HUBUP_INQUIRIES_ENABLED ? (
          <span>
            <strong style={{ color: '#34d399' }}>문의</strong> → <code>/admin/inquiries</code>
          </span>
        ) : null}
        <span>
          사용자에게는 hub_web <strong>역할</strong>을 부여한 뒤, 여기서 해당 역할의 접근을 켭니다.
        </span>
      </LegendRow>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>역할 (roles.name)</Th>
              <Th style={{ width: 120 }}>버스</Th>
              {HUBUP_INQUIRIES_ENABLED ? <Th style={{ width: 120 }}>문의</Th> : null}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <Td colSpan={tableColSpan}>
                  로딩 중…
                </Td>
              </tr>
            ) : draft.length === 0 ? (
              <tr>
                <Td colSpan={tableColSpan}>
                  역할이 없거나 HUBUP용 메뉴 행이 없습니다. <code>012_hubup_bus_admin.sql</code>(허브업/버스/admin
                  전용) 및 <code>013_hubup_bus_page.sql</code>(허브업/버스/페이지 추가) 적용 여부를 확인하세요.
                </Td>
              </tr>
            ) : (
              draft.map((row) => (
                <tr key={row.id}>
                  <Td>
                    <RoleName>{row.name}</RoleName>
                    {row.description ? <RoleDesc>{row.description}</RoleDesc> : null}
                  </Td>
                  <Td>
                    <ToggleWrap>
                      <ToggleInput
                        type="checkbox"
                        checked={row.bus}
                        onChange={(e) => setCell(row.id, 'bus', e.target.checked)}
                        disabled={saveMutation.isPending}
                      />
                      허용
                    </ToggleWrap>
                  </Td>
                  {HUBUP_INQUIRIES_ENABLED ? (
                    <Td>
                      <ToggleWrap>
                        <ToggleInput
                          type="checkbox"
                          checked={row.inquiries}
                          onChange={(e) => setCell(row.id, 'inquiries', e.target.checked)}
                          disabled={saveMutation.isPending}
                        />
                        허용
                      </ToggleWrap>
                    </Td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </Table>
        <BtnRow>
          <Btn type="button" disabled={!dirty || saveMutation.isPending} onClick={() => setDraft(data ?? [])}>
            되돌리기
          </Btn>
          <Btn
            type="button"
            $primary
            disabled={!dirty || saveMutation.isPending} 
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? '저장 중…' : '저장'}
          </Btn>
        </BtnRow>
      </Card>

      <Subtitle style={{ marginTop: 16 }}>
        시드 스크립트가 <code>admin_menu_roles</code>에 위 역할과 HUBUP 메뉴를 연결합니다. 다른 역할(예:
        테크팀)을 켜면 해당 역할을 가진 사용자도 동일하게 접근할 수 있습니다.
      </Subtitle>
    </AdminShell>
  );
}
