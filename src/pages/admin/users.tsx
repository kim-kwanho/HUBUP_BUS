/**
 * hub_web 회원관리(계정·권한 탭, 검색·필터, 역할 체크박스)와 동일한 흐름
 * — 접근: profiles.status === '관리자' 만 (미들웨어 + API)
 */
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from '@emotion/styled';
import AdminShell from '@src/components/admin/AdminShell';
import { hubUpHasOrgWideAdmin } from '@src/lib/hubup-permissions';

type UserRow = {
  user_id: string;
  email: string;
  name: string;
  birth_date?: string;
  community?: string;
  group_id?: number;
  cell_id?: number;
  group_name?: string | null;
  cell_name?: string | null;
  status?: string;
  created_at: string;
  roles?: string[];
};

type RoleRow = { id: number; name: string; description: string | null };

type Paginated = {
  success?: boolean;
  data: UserRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const COMMUNITIES = ['허브', '타공동체'];
const STATUS_OPTIONS = ['활성', '차단', '휴면', '새신자', '관리자'];

const Header = styled.div`
  margin-bottom: 20px;
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
`;

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? 'rgba(34, 197, 94, 0.45)' : 'rgba(255, 255, 255, 0.12)')};
  background: ${({ $active }) => ($active ? 'rgba(34, 197, 94, 0.18)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#ecfdf5' : 'rgba(226, 232, 240, 0.88)')};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`;

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  margin-bottom: 18px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: rgba(148, 163, 184, 0.95);
`;

const Select = styled.select`
  min-width: 120px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(5, 10, 25, 0.45);
  color: #f1f5f9;
  font-size: 13px;
`;

const SearchInput = styled.input`
  min-width: 200px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(5, 10, 25, 0.45);
  color: #f1f5f9;
  font-size: 13px;
`;

const BtnPrimary = styled.button`
  padding: 9px 16px;
  border-radius: 8px;
  border: none;
  background: #3b82f6;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`;

const BtnGhost = styled.button`
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
  color: rgba(226, 232, 240, 0.88);
  font-size: 13px;
  cursor: pointer;
`;

const TableWrap = styled.div`
  overflow: auto;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Th = styled.th`
  text-align: left;
  padding: 12px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(148, 163, 184, 0.95);
  font-weight: 700;
`;

const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  vertical-align: middle;
  color: #e2e8f0;
`;

const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 14px;
  color: #bbf7d0;
`;

const Badge = styled.span`
  display: inline-block;
  margin: 2px 4px 2px 0;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  background: rgba(59, 130, 246, 0.2);
  color: #bfdbfe;
`;

const ActionBtn = styled.button`
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
`;

const PageBtn = styled.button<{ $active?: boolean }>`
  min-width: 36px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: ${({ $active }) => ($active ? 'rgba(34, 197, 94, 0.25)' : 'transparent')};
  color: #e2e8f0;
  cursor: pointer;
`;

const Modal = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const ModalCard = styled.div`
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow: auto;
  border-radius: 16px;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 20px;
`;

const ModalTitle = styled.h3`
  margin: 0 0 16px;
  font-size: 17px;
  font-weight: 800;
  color: #f1f5f9;
`;

const FormGroup = styled.div`
  margin-bottom: 14px;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: rgba(148, 163, 184, 0.95);
  margin-bottom: 6px;
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #e2e8f0;
  cursor: pointer;

  input {
    margin-top: 3px;
  }
`;

const BtnRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
`;

const Hint = styled.p`
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(251, 191, 36, 0.95);
  padding: 10px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.08);
`;

const ListInfo = styled.div`
  font-size: 13px;
  color: rgba(148, 163, 184, 0.95);
  margin-bottom: 10px;
`;

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileStatus = session?.user?.profileStatus ?? undefined;
  const canAccess = hubUpHasOrgWideAdmin(profileStatus);

  const [activeTab, setActiveTab] = useState<'accounts' | 'permissions'>('accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterCommunity, setFilterCommunity] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');
  const [filterCellId, setFilterCellId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [appliedCommunity, setAppliedCommunity] = useState('');
  const [appliedGroupId, setAppliedGroupId] = useState('');
  const [appliedCellId, setAppliedCellId] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [editFormData, setEditFormData] = useState({
    community: '',
    group_id: '',
    cell_id: '',
    status: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/api/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && !canAccess) router.replace('/admin');
  }, [status, canAccess, router]);

  const { data: availableRoles } = useQuery<RoleRow[]>({
    queryKey: ['hubup-admin-roles'],
    queryFn: async () => {
      const res = await fetch('/api/admin/hubup/roles');
      if (!res.ok) throw new Error('권한 목록 실패');
      return res.json();
    },
    enabled: status === 'authenticated' && canAccess
  });

  const { data: groups } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['hubup-admin-groups'],
    queryFn: async () => {
      const res = await fetch('/api/admin/hubup/users/groups');
      if (!res.ok) throw new Error('그룹 목록 실패');
      return res.json();
    },
    enabled: status === 'authenticated' && canAccess
  });

  const { data: filterCells } = useQuery<{ id: number; name: string; group_id?: number }[]>({
    queryKey: ['hubup-admin-cells', filterGroupId],
    queryFn: async () => {
      const gid = filterGroupId;
      const q = gid ? `?group_id=${encodeURIComponent(gid)}` : '';
      const res = await fetch(`/api/admin/hubup/users/cells${q}`);
      if (!res.ok) throw new Error('다락방 목록 실패');
      return res.json();
    },
    enabled: status === 'authenticated' && canAccess
  });

  const { data: editCells } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['hubup-edit-cells', editFormData.group_id],
    queryFn: async () => {
      const gid = editFormData.group_id;
      const q = gid ? `?group_id=${encodeURIComponent(gid)}` : '';
      const res = await fetch(`/api/admin/hubup/users/cells${q}`);
      if (!res.ok) throw new Error('다락방 목록 실패');
      return res.json();
    },
    enabled: status === 'authenticated' && canAccess && editFormData.community === '허브'
  });

  const { data: usersData, isLoading } = useQuery<Paginated>({
    queryKey: [
      'hubup-admin-users',
      appliedSearch,
      currentPage,
      limit,
      appliedCommunity,
      appliedGroupId,
      appliedCellId,
      appliedStatus
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: appliedSearch,
        page: String(currentPage),
        limit: String(limit)
      });
      if (appliedCommunity) params.append('community', appliedCommunity);
      if (appliedGroupId) params.append('group_id', appliedGroupId);
      if (appliedCellId) params.append('cell_id', appliedCellId);
      if (appliedStatus) params.append('status', appliedStatus);
      const res = await fetch(`/api/admin/hubup/users?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || '목록 실패');
      return json as Paginated;
    },
    enabled: status === 'authenticated' && canAccess
  });

  const updateRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: string[] }) => {
      const res = await fetch('/api/admin/hubup/users/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roles })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || '권한 수정 실패');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubup-admin-users'] });
      setIsModalOpen(false);
      setSelectedUser(null);
      alert('권한이 수정되었습니다.');
    },
    onError: (e: Error) => alert(e.message)
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Record<string, unknown> }) => {
      const res = await fetch('/api/admin/hubup/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || '수정 실패');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubup-admin-users'] });
      setIsModalOpen(false);
      setSelectedUser(null);
      alert('사용자 정보가 수정되었습니다.');
    },
    onError: (e: Error) => alert(e.message)
  });

  const handleSearch = () => {
    setAppliedSearch(searchQuery);
    setAppliedCommunity(filterCommunity);
    setAppliedGroupId(filterGroupId);
    setAppliedCellId(filterCellId);
    setAppliedStatus(filterStatus);
    setCurrentPage(1);
    queryClient.invalidateQueries({ queryKey: ['hubup-admin-users'] });
  };

  const handleReset = () => {
    setSearchQuery('');
    setAppliedSearch('');
    setFilterCommunity('');
    setFilterGroupId('');
    setFilterCellId('');
    setFilterStatus('');
    setAppliedCommunity('');
    setAppliedGroupId('');
    setAppliedCellId('');
    setAppliedStatus('');
    setCurrentPage(1);
  };

  const openModal = (user: UserRow) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles || []);
    setEditFormData({
      community: user.community || '',
      group_id: user.group_id ? String(user.group_id) : '',
      cell_id: user.cell_id ? String(user.cell_id) : '',
      status: user.status || ''
    });
    setIsModalOpen(true);
  };

  const toggleRole = (name: string) => {
    setSelectedRoles((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    );
  };

  const saveRoles = () => {
    if (!selectedUser) return;
    updateRolesMutation.mutate({ userId: selectedUser.user_id, roles: selectedRoles });
  };

  const saveUser = () => {
    if (!selectedUser) return;
    const submitData = {
      community: editFormData.community || null,
      group_id:
        editFormData.community === '타공동체'
          ? null
          : editFormData.group_id
            ? parseInt(editFormData.group_id, 10)
            : null,
      cell_id:
        editFormData.community === '타공동체'
          ? null
          : editFormData.cell_id
            ? parseInt(editFormData.cell_id, 10)
            : null,
      status: editFormData.status || null
    };
    updateUserMutation.mutate({ userId: selectedUser.user_id, data: submitData });
  };

  const users = usersData?.data ?? [];
  const pagination = usersData?.pagination;

  if (status === 'loading' || (status === 'authenticated' && !canAccess)) {
    return (
      <AdminShell title="회원 관리">
        <p style={{ color: 'rgba(148,163,184,0.9)' }}>Loading…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="회원 관리">
      <Header>
        <Title>👥 회원관리</Title>
        <Subtitle>hub_web과 동일하게 사용자 계정 및 권한(admin_roles)을 관리합니다.</Subtitle>
      </Header>

      <Tabs>
        <Tab type="button" $active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')}>
          계정관리
        </Tab>
        <Tab type="button" $active={activeTab === 'permissions'} onClick={() => setActiveTab('permissions')}>
          권한관리
        </Tab>
      </Tabs>

      <FilterBar>
        <Field>
          <Label>공동체</Label>
          <Select
            value={filterCommunity}
            onChange={(e) => {
              setFilterCommunity(e.target.value);
              setFilterGroupId('');
              setFilterCellId('');
            }}
          >
            <option value="">전체</option>
            {COMMUNITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label>그룹</Label>
          <Select
            value={filterGroupId}
            onChange={(e) => {
              setFilterGroupId(e.target.value);
              setFilterCellId('');
            }}
          >
            <option value="">전체</option>
            {(groups ?? []).map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label>다락방</Label>
          <Select value={filterCellId} onChange={(e) => setFilterCellId(e.target.value)}>
            <option value="">전체</option>
            {(filterCells ?? []).map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label>상태</Label>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">전체</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="null">(없음)</option>
          </Select>
        </Field>
        <Field style={{ flex: 1, minWidth: 200 }}>
          <Label>검색</Label>
          <SearchInput
            placeholder="이름, 이메일"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </Field>
        <BtnPrimary type="button" onClick={handleSearch}>
          조회하기
        </BtnPrimary>
        <BtnGhost type="button" onClick={handleReset}>
          초기화
        </BtnGhost>
        <Field>
          <Label>페이지당</Label>
          <Select value={String(limit)} onChange={(e) => { setLimit(Number(e.target.value)); setCurrentPage(1); }}>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </Select>
        </Field>
      </FilterBar>

      {isLoading ? (
        <p style={{ color: 'rgba(148,163,184,0.9)' }}>불러오는 중…</p>
      ) : users.length === 0 ? (
        <p style={{ color: 'rgba(148,163,184,0.9)' }}>등록된 사용자가 없습니다.</p>
      ) : (
        <>
          <ListInfo>
            검색 결과: <strong style={{ color: '#e2e8f0' }}>{pagination?.total ?? 0}</strong>건
            {appliedSearch ? ` (검색: "${appliedSearch}")` : ''}
          </ListInfo>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>사용자</Th>
                  <Th>공동체</Th>
                  <Th>그룹/다락방</Th>
                  {activeTab === 'permissions' && <Th>권한</Th>}
                  <Th>작업</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <Td>
                      <UserCell>
                        <Avatar>{user.name?.charAt(0) || 'U'}</Avatar>
                        <div>
                          <div style={{ fontWeight: 700 }}>{user.name}</div>
                          <div style={{ fontSize: 12, opacity: 0.85 }}>{user.email}</div>
                        </div>
                      </UserCell>
                    </Td>
                    <Td>{user.community || '—'}</Td>
                    <Td>
                      {user.group_name && user.cell_name
                        ? `${user.group_name} / ${user.cell_name}`
                        : user.group_name || user.cell_name || '—'}
                    </Td>
                    {activeTab === 'permissions' && (
                      <Td>
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((r) => <Badge key={r}>{r}</Badge>)
                        ) : (
                          <span style={{ color: '#f87171', fontSize: 12 }}>권한 없음</span>
                        )}
                      </Td>
                    )}
                    <Td>
                      <ActionBtn type="button" onClick={() => openModal(user)}>
                        {activeTab === 'accounts' ? '정보수정' : user.roles?.length ? '권한수정' : '권한추가'}
                      </ActionBtn>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>

          {pagination && pagination.totalPages > 1 && (
            <Pagination>
              <PageBtn type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                ≪
              </PageBtn>
              <PageBtn
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ＜
              </PageBtn>
              <span style={{ color: 'rgba(148,163,184,0.95)', fontSize: 13 }}>
                {currentPage} / {pagination.totalPages}
              </span>
              <PageBtn
                type="button"
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                ＞
              </PageBtn>
              <PageBtn
                type="button"
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage(pagination.totalPages)}
              >
                ≫
              </PageBtn>
            </Pagination>
          )}
        </>
      )}

      {isModalOpen && selectedUser && (
        <Modal
          role="dialog"
          aria-modal
          onClick={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
          }}
        >
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>
              {activeTab === 'accounts'
                ? '회원 정보 수정'
                : selectedUser.roles?.length
                  ? '권한 수정'
                  : '권한 추가'}
            </ModalTitle>

            {activeTab === 'accounts' ? (
              <>
                <FormGroup>
                  <FormLabel>이름</FormLabel>
                  <SearchInput value={selectedUser.name} disabled style={{ opacity: 0.7 }} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>이메일</FormLabel>
                  <SearchInput value={selectedUser.email} disabled style={{ opacity: 0.7 }} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>공동체</FormLabel>
                  <Select
                    value={editFormData.community}
                    onChange={(e) =>
                      setEditFormData((p) => ({
                        ...p,
                        community: e.target.value,
                        group_id: '',
                        cell_id: ''
                      }))
                    }
                  >
                    <option value="">선택</option>
                    {COMMUNITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </FormGroup>
                {editFormData.community === '허브' && (
                  <>
                    <FormGroup>
                      <FormLabel>그룹</FormLabel>
                      <Select
                        value={editFormData.group_id}
                        onChange={(e) =>
                          setEditFormData((p) => ({ ...p, group_id: e.target.value, cell_id: '' }))
                        }
                      >
                        <option value="">선택</option>
                        {(groups ?? []).map((g) => (
                          <option key={g.id} value={String(g.id)}>
                            {g.name}
                          </option>
                        ))}
                      </Select>
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>다락방</FormLabel>
                      <Select
                        value={editFormData.cell_id}
                        onChange={(e) => setEditFormData((p) => ({ ...p, cell_id: e.target.value }))}
                      >
                        <option value="">선택</option>
                        {(editCells ?? []).map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </FormGroup>
                  </>
                )}
                <FormGroup>
                  <FormLabel>상태</FormLabel>
                  <Select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="">선택</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </FormGroup>
                <BtnRow>
                  <BtnGhost type="button" onClick={() => { setIsModalOpen(false); setSelectedUser(null); }}>
                    취소
                  </BtnGhost>
                  <BtnPrimary type="button" onClick={saveUser} disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? '저장 중…' : '저장'}
                  </BtnPrimary>
                </BtnRow>
              </>
            ) : (
              <>
                <FormGroup>
                  <FormLabel>
                    사용자: {selectedUser.name} ({selectedUser.email})
                  </FormLabel>
                  {(!selectedUser.roles || selectedUser.roles.length === 0) && (
                    <Hint>현재 관리자 권한이 없습니다. 필요한 역할을 선택하세요.</Hint>
                  )}
                </FormGroup>
                <FormGroup>
                  <FormLabel>권한 선택 (역할 이름)</FormLabel>
                  {!availableRoles?.length ? (
                    <p style={{ color: 'rgba(148,163,184,0.9)', fontSize: 13 }}>역할 목록을 불러오는 중…</p>
                  ) : (
                    availableRoles.map((role) => (
                      <CheckboxRow key={role.id}>
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.name)}
                          onChange={() => toggleRole(role.name)}
                        />
                        <span>
                          <strong>{role.name}</strong>
                          {role.description ? (
                            <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.9)', marginLeft: 6 }}>
                              ({role.description})
                            </span>
                          ) : null}
                        </span>
                      </CheckboxRow>
                    ))
                  )}
                  {selectedRoles.length === 0 && (selectedUser.roles?.length ?? 0) > 0 && (
                    <Hint style={{ background: 'rgba(239,68,68,0.1)', color: '#fecaca' }}>
                      모든 권한을 제거하면 일반 사용자(활성)로 전환됩니다.
                    </Hint>
                  )}
                </FormGroup>
                <BtnRow>
                  <BtnGhost type="button" onClick={() => { setIsModalOpen(false); setSelectedUser(null); }}>
                    취소
                  </BtnGhost>
                  <BtnPrimary type="button" onClick={saveRoles} disabled={updateRolesMutation.isPending}>
                    {updateRolesMutation.isPending ? '저장 중…' : '저장'}
                  </BtnPrimary>
                </BtnRow>
              </>
            )}
          </ModalCard>
        </Modal>
      )}
    </AdminShell>
  );
}
