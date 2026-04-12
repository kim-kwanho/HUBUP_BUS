/**
 * 문의사항 관리(admin/inquiries)와 동일 UX: 통계·검색·필터·테이블·상세 모달
 */
import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from '@emotion/styled';
import AdminShell from '@src/components/admin/AdminShell';

type Row = {
  id: string;
  user_id: string;
  name?: string;
  phone?: string;
  group_name?: string;
  email?: string;
  requested_departure_slot: string | null;
  requested_return_slot: string | null;
  requested_departure_label: string;
  requested_return_label: string;
  current_departure_slot?: string | null;
  current_return_slot?: string | null;
  current_departure_label?: string;
  current_return_label?: string;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
  processed_at?: string | null;
  processed_note?: string | null;
};

type BadgeTone = 'blue' | 'yellow' | 'green' | 'red' | 'purple' | 'gray';

const BUS_STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '반려',
  completed: '완료'
};

const BUS_STATUS_BADGE: Record<string, BadgeTone> = {
  pending: 'blue',
  approved: 'yellow',
  rejected: 'red',
  completed: 'green'
};

const STATUS_OPTIONS = [
  { value: 'pending', label: '대기 (pending)' },
  { value: 'approved', label: '승인 (approved)' },
  { value: 'rejected', label: '반려 (rejected)' },
  { value: 'completed', label: '완료 (completed)' }
] as const;

/** 필터·통계 '완료': 승인·반려(+ DB completed) = 처리된 건만 묶음 */
function isProcessedDoneStatus(status: string): boolean {
  const t = (status || '').trim().toLowerCase();
  return t === 'approved' || t === 'rejected' || t === 'completed';
}

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
`;

const FilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

const SearchInput = styled.input`
  width: 100%;
  max-width: 420px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(5, 10, 25, 0.45);
  color: #f1f5f9;
  font-size: 14px;
`;

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

const FilterLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: rgba(148, 163, 184, 0.95);
  margin-right: 4px;
`;

const FilterBtn = styled.button<{ $active: boolean }>`
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active }) => ($active ? 'rgba(53, 84, 139, 0.45)' : 'rgba(255, 255, 255, 0.12)')};
  background: ${({ $active }) => ($active ? 'rgba(53, 84, 139, 0.2)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#eef4ff' : 'rgba(226, 232, 240, 0.88)')};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;

const SearchMeta = styled.div`
  font-size: 12px;
  color: rgba(148, 163, 184, 0.95);
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ClearLink = styled.button`
  background: none;
  border: none;
  color: #a9c4f4;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
  margin-bottom: 18px;
`;

const StatCard = styled.div`
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 800;
  color: #f1f5f9;
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: rgba(148, 163, 184, 0.95);
  margin-top: 4px;
`;

const Card = styled.section`
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.14);
  box-shadow: 0 12px 36px rgba(2, 6, 23, 0.24);
  overflow: hidden;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 760px;
`;

const Th = styled.th`
  text-align: left;
  font-size: 11px;
  color: rgba(226, 232, 240, 0.78);
  letter-spacing: 0.04em;
  font-weight: 700;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.96);
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  vertical-align: middle;
  font-size: 13px;
  color: #e5edf7;
`;

const Badge = styled.span<{ $color: BadgeTone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${({ $color }) => {
    switch ($color) {
      case 'blue':
        return '#bfdbfe';
      case 'yellow':
        return '#fde68a';
      case 'green':
        return '#c7d7f6';
      case 'red':
        return '#fecaca';
      case 'purple':
        return '#e9d5ff';
      default:
        return '#cbd5e1';
    }
  }};
  background: ${({ $color }) => {
    switch ($color) {
      case 'blue':
        return 'rgba(59, 130, 246, 0.18)';
      case 'yellow':
        return 'rgba(234, 179, 8, 0.18)';
      case 'green':
        return 'rgba(53, 84, 139, 0.18)';
      case 'red':
        return 'rgba(239, 68, 68, 0.16)';
      case 'purple':
        return 'rgba(168, 85, 247, 0.16)';
      default:
        return 'rgba(148, 163, 184, 0.14)';
    }
  }};
`;

const MsgCell = styled.div`
  color: #f8fafc;
  font-size: 13.5px;
  line-height: 1.65;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`;

const ActionBtn = styled.button`
  padding: 8px 13px;
  border-radius: 10px;
  border: 1px solid rgba(53, 84, 139, 0.28);
  background: rgba(53, 84, 139, 0.16);
  color: #eef4ff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;

  &:hover {
    background: rgba(53, 84, 139, 0.24);
    border-color: rgba(111, 143, 200, 0.38);
    transform: translateY(-1px);
  }
`;

const EmptyState = styled.div`
  padding: 48px 20px;
  text-align: center;
  color: rgba(148, 163, 184, 0.95);
  font-size: 14px;
`;

const LoadingRow = styled.tr`
  td {
    padding: 28px;
    text-align: center;
    color: rgba(148, 163, 184, 0.95);
  }
`;

const DataRow = styled.tr`
  background: rgba(15, 23, 42, 0.66);
  transition: background 0.15s ease;

  &:nth-of-type(even) {
    background: rgba(30, 41, 59, 0.56);
  }

  &:hover {
    background: rgba(51, 65, 85, 0.76);
  }
`;

const OrderText = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
`;

const DateText = styled.div`
  font-size: 13px;
  line-height: 1.55;
  color: #dbe7f3;
  font-variant-numeric: tabular-nums;
`;

const ReasonSub = styled.div`
  margin-top: 6px;
  font-size: 11px;
  color: rgba(148, 163, 184, 0.92);
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
  max-width: 640px;
  max-height: 90vh;
  overflow: auto;
  border-radius: 16px;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 20px;
`;

const ModalHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: #f1f5f9;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: rgba(148, 163, 184, 0.95);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
`;

const FormGroup = styled.div`
  margin-bottom: 14px;
`;

const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: rgba(148, 163, 184, 0.95);
  margin-bottom: 6px;
`;

const MessageBox = styled.div`
  padding: 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  color: #e2e8f0;
`;

/** 모달: 출발·복귀 — 변경 전 vs 요청 비교 */
const SlotCompareBox = styled.div`
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  background: rgba(0, 0, 0, 0.22);
`;

const SlotCompareGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(56px, 76px) minmax(0, 1fr) minmax(0, 1fr);
  font-size: 13px;
  line-height: 1.5;
`;

const SlotCompareCorner = styled.div`
  min-height: 40px;
  background: rgba(0, 0, 0, 0.28);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const SlotCompareHead = styled.div<{ $tone: 'before' | 'after' }>`
  padding: 10px 12px;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.02em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ $tone }) =>
    $tone === 'before' ? 'rgba(251, 191, 36, 0.95)' : 'rgba(52, 211, 153, 0.95)'};
`;

const SlotCompareKind = styled.div`
  padding: 12px 10px;
  font-weight: 600;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.98);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: flex-start;
`;

const SlotCompareCell = styled.div<{ $tone: 'before' | 'after' }>`
  padding: 12px;
  color: #e2e8f0;
  word-break: break-word;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: ${({ $tone }) =>
    $tone === 'before' ? 'rgba(251, 191, 36, 0.05)' : 'rgba(16, 185, 129, 0.07)'};
`;

const StatusSelect = styled.select`
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(15, 23, 42, 0.92);
  color: #f8fafc;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  min-height: 46px;
  font-family: inherit;

  &:hover:not(:disabled) {
    border-color: rgba(148, 163, 184, 0.45);
    background: rgba(30, 41, 59, 0.95);
  }
  &:focus-visible {
    outline: 2px solid rgba(52, 211, 153, 0.55);
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 88px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(5, 10, 25, 0.45);
  color: #f1f5f9;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  font-family: inherit;
`;

const AdditionalInfoBlock = styled.div`
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  margin-bottom: 4px;
`;

const AdditionalInfoTitle = styled.div`
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const AdditionalInfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
  &:last-child {
    border-bottom: none;
  }
`;

const AdditionalInfoLabel = styled.span`
  flex-shrink: 0;
  color: rgba(148, 163, 184, 0.95);
  min-width: 112px;
`;

const AdditionalInfoValue = styled.span`
  text-align: right;
  word-break: break-word;
  color: rgba(226, 232, 240, 0.95);
`;

const BtnRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 18px;
`;

const Btn = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  ${({ $variant }) =>
    $variant === 'primary'
      ? `
    background: rgba(34, 197, 94, 0.22);
    border-color: rgba(34, 197, 94, 0.4);
    color: #ecfdf5;
  `
      : `
    background: transparent;
    border-color: rgba(255, 255, 255, 0.14);
    color: rgba(226, 232, 240, 0.9);
  `}
`;

const Small = styled.div`
  font-size: 12px;
  color: rgba(148, 163, 184, 0.9);
  margin-top: 6px;
`;

function seoulDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function statusBadgeColor(st: string): BadgeTone {
  return BUS_STATUS_BADGE[st] ?? 'gray';
}

function statusDisplayLabel(st: string) {
  return BUS_STATUS_LABELS[st] ?? st;
}

function AdditionalMetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  const v = (value ?? '').trim();
  if (!v || v === '-') return null;
  return (
    <AdditionalInfoRow>
      <AdditionalInfoLabel>{label}</AdditionalInfoLabel>
      <AdditionalInfoValue>{v}</AdditionalInfoValue>
    </AdditionalInfoRow>
  );
}

function slotLine(label: string | null | undefined, rawSlot: string | null | undefined): string {
  const l = (label ?? '').trim();
  if (l) return l;
  const s = (rawSlot ?? '').trim();
  if (s && s !== '-') return s;
  return '—';
}

export default function AdminBusRequestsPage() {
  const { status } = useSession();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editProcessedNote, setEditProcessedNote] = useState('');

  const canLoad = status !== 'loading';

  const {
    data: busBundle,
    isLoading,
    isError,
    error: queryError
  } = useQuery<{ rows: Row[]; warnings: string[] }>({
    queryKey: ['hubup-admin-bus-requests'],
    queryFn: async () => {
      const res = await fetch('/api/admin/hub-up/bus-change-requests', {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = typeof json?.detail === 'string' ? json.detail : '';
        throw new Error(
          detail ? `${json?.message || '목록을 불러오지 못했습니다.'}\n${detail}` : json?.message || '목록을 불러오지 못했습니다.'
        );
      }
      if (json && json.success === false) {
        throw new Error(typeof json?.message === 'string' ? json.message : '목록을 불러오지 못했습니다.');
      }
      return {
        rows: Array.isArray(json.data) ? json.data : [],
        warnings: Array.isArray(json.warnings) ? json.warnings.filter((w: unknown) => typeof w === 'string') : []
      };
    },
    enabled: canLoad,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  });

  const allItems = busBundle?.rows ?? [];
  const apiWarnings = busBundle?.warnings ?? [];

  const stats = useMemo(() => {
    const list = allItems;
    return {
      total: list.length,
      pending: list.filter((i) => i.status === 'pending').length,
      approved: list.filter((i) => i.status === 'approved').length,
      rejected: list.filter((i) => i.status === 'rejected').length,
      completed: list.filter((i) => isProcessedDoneStatus(i.status)).length
    };
  }, [allItems]);

  const filtered = useMemo(() => {
    return allItems.filter((row) => {
      if (statusFilter === 'completed') {
        if (!isProcessedDoneStatus(row.status)) return false;
      } else if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const blob = [
          row.reason,
          row.processed_note,
          row.name,
          row.email,
          row.phone,
          row.group_name,
          row.user_id,
          row.requested_departure_label,
          row.requested_return_label,
          row.current_departure_label,
          row.current_return_label
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [allItems, statusFilter, searchQuery]);

  const selectedOrderInList = useMemo(() => {
    if (!selected) return null;
    const idx = filtered.findIndex((r) => r.id === selected.id);
    if (idx < 0) return null;
    return filtered.length - idx;
  }, [selected, filtered]);

  const statusPickerOptions = useMemo(() => {
    const base = STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
    if (selected && !STATUS_OPTIONS.some((o) => o.value === selected.status)) {
      return [{ value: selected.status, label: `${selected.status} (현재값)` }, ...base];
    }
    return base;
  }, [selected]);

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; status: string; processedNote: string }) => {
      const res = await fetch('/api/admin/hub-up/bus-change-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payload.id,
          status: payload.status,
          processedNote: payload.processedNote
        }),
        cache: 'no-store',
        credentials: 'same-origin'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || '저장에 실패했습니다.');
      return json.data as Row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubup-admin-bus-requests'] });
      setModalOpen(false);
      setSelected(null);
      alert('상태가 저장되었습니다.');
    },
    onError: (e: Error) => alert(e.message)
  });

  const openModal = (row: Row) => {
    setSelected(row);
    setEditStatus(row.status);
    setEditProcessedNote(typeof row.processed_note === 'string' ? row.processed_note : '');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (updateMutation.isPending) return;
    setModalOpen(false);
    setSelected(null);
    setEditStatus('');
    setEditProcessedNote('');
  };

  const handleSave = () => {
    if (!selected) return;
    updateMutation.mutate({ id: selected.id, status: editStatus, processedNote: editProcessedNote });
  };

  if (status === 'loading') {
    return (
      <AdminShell title="버스 변경 요청">
        <Small>로딩 중…</Small>
      </AdminShell>
    );
  }

  if (isError) {
    return (
      <AdminShell title="버스 변경 요청">
        <Small style={{ color: '#fca5a5', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {queryError instanceof Error ? queryError.message : '목록을 불러오지 못했습니다.'}
        </Small>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="버스 변경 요청">
      <HeaderBlock>
        <Title>버스 변경 요청</Title>
        <Subtitle>
          사용자가 제출한 버스 시간 변경을 확인합니다. (DB{' '}
          <code style={{ opacity: 0.9 }}>hub_up_bus_change_requests</code>)
        </Subtitle>
      </HeaderBlock>
      {apiWarnings.length > 0 ? (
        <Subtitle style={{ color: '#fbbf24', marginTop: -8, marginBottom: 12 }}>
          {apiWarnings.join(' ')}
        </Subtitle>
      ) : null}

      <FilterSection>
        <SearchInput
          type="search"
          placeholder="검색 (신청 사유, 관리자 처리 사유, 이름, 연락처, 이메일, 조, user_id, 슬롯)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery.trim() ? (
          <SearchMeta>
            검색 결과: {filtered.length}건
            <ClearLink type="button" onClick={() => setSearchQuery('')}>
              검색 초기화
            </ClearLink>
          </SearchMeta>
        ) : null}

        <FilterRow>
          <FilterLabel>상태</FilterLabel>
          {(
            [
              ['all', '전체'],
              ['pending', '대기'],
              ['approved', '승인'],
              ['rejected', '반려'],
              ['completed', '완료']
            ] as const
          ).map(([v, label]) => (
            <FilterBtn key={v} type="button" $active={statusFilter === v} onClick={() => setStatusFilter(v)}>
              {label}
            </FilterBtn>
          ))}
        </FilterRow>
      </FilterSection>

      <StatsGrid>
        <StatCard>
          <StatValue>{stats.total}</StatValue>
          <StatLabel>전체</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.pending}</StatValue>
          <StatLabel>대기</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.approved}</StatValue>
          <StatLabel>승인</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.rejected}</StatValue>
          <StatLabel>반려</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.completed}</StatValue>
          <StatLabel>완료</StatLabel>
        </StatCard>
      </StatsGrid>

      <Card>
        <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th style={{ width: 72 }}>순서</Th>
              <Th style={{ width: 110 }}>상태</Th>
              <Th>사유</Th>
              <Th style={{ width: 190 }}>접수일</Th>
              <Th style={{ width: 108 }}>작업</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRow>
                <Td colSpan={5}>로딩 중…</Td>
              </LoadingRow>
            ) : filtered.length === 0 ? (
              <LoadingRow>
                <Td colSpan={5}>
                  <EmptyState>
                    {statusFilter === 'all' && !searchQuery.trim()
                      ? '등록된 요청이 없습니다.'
                      : '조건에 맞는 요청이 없습니다.'}
                  </EmptyState>
                </Td>
              </LoadingRow>
            ) : (
              filtered.map((row, index) => (
                <DataRow key={row.id}>
                  <Td>
                    <OrderText>{filtered.length - index}</OrderText>
                  </Td>
                  <Td>
                    <Badge $color={statusBadgeColor(row.status)}>{statusDisplayLabel(row.status)}</Badge>
                  </Td>
                  <Td title={row.reason}>
                    <MsgCell>{row.reason || '—'}</MsgCell>
                    <ReasonSub>{row.id.slice(0, 8)}...</ReasonSub>
                  </Td>
                  <Td>
                    <DateText>{seoulDate(row.created_at)}</DateText>
                  </Td>
                  <Td>
                    <ActionRow>
                      <ActionBtn type="button" onClick={() => openModal(row)}>
                        상세
                      </ActionBtn>
                    </ActionRow>
                  </Td>
                </DataRow>
              ))
            )}
          </tbody>
        </Table>
        </TableWrap>
      </Card>

      {modalOpen && selected ? (
        <Modal
          role="presentation"
          onClick={() => {
            if (!updateMutation.isPending) closeModal();
          }}
        >
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalHead>
              <ModalTitle>
                {selectedOrderInList != null
                  ? `버스 변경 요청 · 순서 ${selectedOrderInList}`
                  : `버스 변경 요청 · ${selected.id.slice(0, 8)}…`}
              </ModalTitle>
              <CloseBtn type="button" aria-label="닫기" onClick={() => !updateMutation.isPending && closeModal()}>
                ×
              </CloseBtn>
            </ModalHead>

            <FormGroup>
              <Label>변경 사유</Label>
              <MessageBox>{selected.reason || '—'}</MessageBox>
            </FormGroup>

            <FormGroup>
              <Label>슬롯 (변경 전 → 요청)</Label>
              <SlotCompareBox>
                <SlotCompareGrid>
                  <SlotCompareCorner aria-hidden />
                  <SlotCompareHead $tone="before">변경 전</SlotCompareHead>
                  <SlotCompareHead $tone="after">요청</SlotCompareHead>
                  <SlotCompareKind>출발</SlotCompareKind>
                  <SlotCompareCell $tone="before">
                    {slotLine(selected.current_departure_label, selected.current_departure_slot)}
                  </SlotCompareCell>
                  <SlotCompareCell $tone="after">
                    {slotLine(selected.requested_departure_label, selected.requested_departure_slot)}
                  </SlotCompareCell>
                  <SlotCompareKind>복귀</SlotCompareKind>
                  <SlotCompareCell $tone="before">
                    {slotLine(selected.current_return_label, selected.current_return_slot)}
                  </SlotCompareCell>
                  <SlotCompareCell $tone="after">
                    {slotLine(selected.requested_return_label, selected.requested_return_slot)}
                  </SlotCompareCell>
                </SlotCompareGrid>
              </SlotCompareBox>
            </FormGroup>

            <FormGroup>
              <AdditionalInfoBlock>
                <AdditionalInfoTitle>신청자 정보</AdditionalInfoTitle>
                <AdditionalMetaRow label="이름" value={selected.name} />
                <AdditionalMetaRow label="연락처" value={selected.phone} />
                <AdditionalMetaRow label="이메일" value={selected.email} />
                <AdditionalMetaRow label="조" value={selected.group_name} />
                <AdditionalInfoRow>
                  <AdditionalInfoLabel>user_id</AdditionalInfoLabel>
                  <AdditionalInfoValue style={{ wordBreak: 'break-all' }}>{selected.user_id}</AdditionalInfoValue>
                </AdditionalInfoRow>
                <AdditionalInfoRow>
                  <AdditionalInfoLabel>접수일</AdditionalInfoLabel>
                  <AdditionalInfoValue>{seoulDate(selected.created_at)}</AdditionalInfoValue>
                </AdditionalInfoRow>
              </AdditionalInfoBlock>
            </FormGroup>

            <FormGroup>
              <Label id="bus-req-status-label">상태</Label>
              <StatusSelect
                  id="bus-req-status-select"
                  disabled={updateMutation.isPending}
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  {statusPickerOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
              </StatusSelect>
            </FormGroup>

            {selected.processed_at ? (
              <FormGroup>
                <Label>처리일시 (기록)</Label>
                <Small style={{ marginTop: 0 }}>{seoulDate(selected.processed_at)}</Small>
              </FormGroup>
            ) : null}

            <FormGroup>
              <Label>관리자 처리 사유</Label>
              <TextArea
                value={editProcessedNote}
                onChange={(e) => setEditProcessedNote(e.target.value)}
                disabled={updateMutation.isPending}
                placeholder="승인·반려·완료 시 메모(사유)를 입력하세요. 대기로 되돌리면 저장된 처리 사유가 비워집니다."
                maxLength={4000}
              />
              <Small>승인·반려·완료로 저장할 때 함께 기록됩니다.</Small>
            </FormGroup>

            <BtnRow>
              <Btn type="button" $variant="ghost" disabled={updateMutation.isPending} onClick={closeModal}>
                취소
              </Btn>
              <Btn type="button" $variant="primary" disabled={updateMutation.isPending} onClick={handleSave}>
                {updateMutation.isPending ? '저장 중…' : '저장'}
              </Btn>
            </BtnRow>
          </ModalCard>
        </Modal>
      ) : null}
    </AdminShell>
  );
}
