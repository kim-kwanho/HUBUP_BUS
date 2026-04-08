/**
 * hub_web `tech-inquiries` 관리 화면과 동일한 UX: 통계·필터·검색·테이블·상세 모달·PATCH/DELETE
 * 카테고리는 `subject`(접수/숙소/차량/티셔츠/기타) — 공개 폼과 동일
 */
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from '@emotion/styled';
import AdminShell from '@src/components/admin/AdminShell';
import { hubUpHasInquiriesAccess } from '@src/lib/hubup-permissions';
import {
  INQUIRY_STATUS_LABELS,
  getInquiryWorkflowStepIndex,
  WORKFLOW_STEP_LABELS,
  isNewLikeStatus
} from '@src/lib/inquiry-status';

const CATEGORIES = ['접수', '숙소', '차량', '티셔츠', '기타'] as const;

type Inquiry = {
  id: number | string;
  name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  status: string;
  page_url?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  user_id?: string | null;
  admin_note?: string | null;
  admin_response?: string | null;
  response_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
};

type BadgeTone = 'blue' | 'yellow' | 'green' | 'red' | 'purple' | 'gray';

const STATUS_COLORS: Record<string, BadgeTone> = {
  new: 'blue',
  pending: 'blue',
  answered: 'green',
  in_progress: 'yellow',
  resolved: 'green',
  closed: 'red'
};

/** 질문하기 subject(카테고리)별 배지 색 — 미분류·알 수 없는 값은 gray */
const CATEGORY_BADGE_COLORS: Record<string, BadgeTone> = {
  접수: 'blue',
  숙소: 'green',
  차량: 'yellow',
  티셔츠: 'purple',
  기타: 'red',
  미분류: 'gray'
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
    ${({ $active }) => ($active ? 'rgba(34, 197, 94, 0.45)' : 'rgba(255, 255, 255, 0.12)')};
  background: ${({ $active }) => ($active ? 'rgba(34, 197, 94, 0.2)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#ecfdf5' : 'rgba(226, 232, 240, 0.88)')};
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
  color: #86efac;
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
  opacity: 0.85;
  padding: 12px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const Td = styled.td`
  padding: 12px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  vertical-align: middle;
  font-size: 13px;
`;

const Badge = styled.span<{ $color: 'blue' | 'yellow' | 'green' | 'red' | 'purple' | 'gray' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: ${({ $color }) => {
    switch ($color) {
      case 'blue':
        return 'rgba(59, 130, 246, 0.2)';
      case 'yellow':
        return 'rgba(234, 179, 8, 0.2)';
      case 'green':
        return 'rgba(34, 197, 94, 0.2)';
      case 'red':
        return 'rgba(239, 68, 68, 0.2)';
      case 'purple':
        return 'rgba(168, 85, 247, 0.2)';
      default:
        return 'rgba(148, 163, 184, 0.15)';
    }
  }};
`;

const MsgCell = styled.div`
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`;

const ActionBtn = styled.button`
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(34, 197, 94, 0.35);
  background: rgba(34, 197, 94, 0.15);
  color: #ecfdf5;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
`;

const WorkflowBox = styled.div`
  padding: 14px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 14px;
`;

const StepTrack = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 12px;
`;

const StepItem = styled.div<{ $state: 'done' | 'current' | 'todo' }>`
  flex: 1;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: ${({ $state }) =>
    $state === 'done'
      ? 'rgba(134, 239, 172, 0.95)'
      : $state === 'current'
        ? '#f1f5f9'
        : 'rgba(148, 163, 184, 0.65)'};
`;

const StepDot = styled.div<{ $state: 'done' | 'current' | 'todo' }>`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  margin: 0 auto 6px;
  background: ${({ $state }) =>
    $state === 'done'
      ? '#22c55e'
      : $state === 'current'
        ? '#3b82f6'
        : 'rgba(148, 163, 184, 0.35)'};
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

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(5, 10, 25, 0.45);
  color: #f1f5f9;
  font-size: 14px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(5, 10, 25, 0.45);
  color: #f1f5f9;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
`;

const InfoRow = styled.div`
  display: flex;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 6px;
  color: rgba(226, 232, 240, 0.9);
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

const Btn = styled.button<{ $variant?: 'primary' | 'ghost' | 'danger' }>`
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  ${({ $variant }) =>
    $variant === 'danger'
      ? `
    background: rgba(239, 68, 68, 0.18);
    border-color: rgba(239, 68, 68, 0.4);
    color: #fecaca;
  `
      : $variant === 'primary'
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

function categoryLabel(subject: string | null) {
  const s = (subject || '').trim();
  return s || '미분류';
}

function categoryBadgeColor(subject: string | null): BadgeTone {
  const s = (subject || '').trim();
  if (!s) return 'gray';
  return CATEGORY_BADGE_COLORS[s] ?? 'gray';
}

function seoulDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function AdditionalMetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  const v = (value ?? '').trim();
  if (!v) return null;
  return (
    <AdditionalInfoRow>
      <AdditionalInfoLabel>{label}</AdditionalInfoLabel>
      <AdditionalInfoValue>{v}</AdditionalInfoValue>
    </AdditionalInfoRow>
  );
}

export default function AdminInquiriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileStatus = session?.user?.profileStatus ?? undefined;
  const roles = session?.user?.roles ?? [];
  const hubupArea = session?.user?.hubupArea;
  const canAccess = hubUpHasInquiriesAccess(roles, profileStatus, hubupArea);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [adminResponse, setAdminResponse] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/api/auth/signin');
      return;
    }
    if (status === 'authenticated' && !canAccess) {
      router.replace('/admin');
    }
  }, [status, canAccess, router]);

  const {
    data: inquiryBundle,
    isLoading,
    isError,
    error: queryError
  } = useQuery<{ rows: Inquiry[]; warnings: string[] }>({
    queryKey: ['hubup-admin-inquiries'],
    queryFn: async () => {
      const res = await fetch('/api/inquiries', {
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
      return {
        rows: Array.isArray(json.data) ? json.data : [],
        warnings: Array.isArray(json.warnings) ? json.warnings.filter((w: unknown) => typeof w === 'string') : []
      };
    },
    enabled: status === 'authenticated' && canAccess
  });

  const allInquiries = inquiryBundle?.rows ?? [];
  const apiWarnings = inquiryBundle?.warnings ?? [];

  const stats = useMemo(() => {
    const list = allInquiries;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekAgo = new Date(startOfToday);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let today = 0;
    let week = 0;
    let pendingReply = 0;

    for (const row of list) {
      const d = new Date(row.created_at);
      if (d >= startOfToday) today += 1;
      if (d >= weekAgo) week += 1;
      const ar = row.admin_response?.trim();
      if (!ar) pendingReply += 1;
    }

    return {
      total: list.length,
      new_count: list.filter((i) => isNewLikeStatus(i.status)).length,
      answered_count: list.filter((i) => i.status === 'answered').length,
      today_count: today,
      this_week_count: week,
      pending_reply: pendingReply
    };
  }, [allInquiries]);

  const filtered = useMemo(() => {
    return allInquiries.filter((row) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'new') {
          if (!isNewLikeStatus(row.status)) return false;
        } else if (row.status !== statusFilter) {
          return false;
        }
      }
      if (categoryFilter !== 'all') {
        const sub = (row.subject || '').trim();
        if (categoryFilter === '__uncat__') {
          if (sub) return false;
        } else if (sub !== categoryFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const blob = [
          row.message,
          row.name,
          row.email,
          row.phone,
          row.subject,
          row.page_url,
          row.ip_address,
          row.user_agent,
          row.user_id,
          row.admin_note,
          row.admin_response
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [allInquiries, statusFilter, categoryFilter, searchQuery]);

  /** 테이블「순서」열과 동일: 현재 필터된 목록에서 위→아래 n…1 */
  const selectedOrderInList = useMemo(() => {
    if (!selected) return null;
    const idx = filtered.findIndex((r) => r.id === selected.id);
    if (idx < 0) return null;
    return filtered.length - idx;
  }, [selected, filtered]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: number | string;
      status?: string;
      subject?: string;
      adminNote?: string;
      adminResponse?: string;
    }) => {
      const res = await fetch(`/api/inquiries/${encodeURIComponent(String(payload.id))}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: payload.status,
          subject: payload.subject,
          adminNote: payload.adminNote,
          adminResponse: payload.adminResponse
        }),
        cache: 'no-store',
        credentials: 'same-origin'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || '저장에 실패했습니다.');
      return json.data as Inquiry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubup-admin-inquiries'] });
      setModalOpen(false);
      setSelected(null);
      alert('문의사항이 저장되었습니다.');
    },
    onError: (e: Error) => alert(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number | string) => {
      const res = await fetch(`/api/inquiries/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || '삭제에 실패했습니다.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubup-admin-inquiries'] });
      setModalOpen(false);
      setSelected(null);
      alert('문의사항이 삭제되었습니다.');
    },
    onError: (e: Error) => alert(e.message)
  });

  const openModal = (row: Inquiry) => {
    setSelected(row);
    setEditStatus(row.status);
    setEditCategory((row.subject || '').trim() || '');
    setAdminNote(row.admin_note || '');
    setAdminResponse(row.admin_response || '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelected(null);
    setEditStatus('');
    setEditCategory('');
    setAdminNote('');
    setAdminResponse('');
  };

  const handleSave = () => {
    if (!selected) return;
    updateMutation.mutate({
      id: selected.id,
      status: editStatus,
      subject: editCategory,
      adminNote,
      adminResponse
    });
  };

  const handleDelete = () => {
    if (!selected) return;
    if (!confirm('정말 이 문의를 삭제할까요?')) return;
    deleteMutation.mutate(selected.id);
  };

  if (status === 'loading' || (status === 'authenticated' && !canAccess)) {
    return (
      <AdminShell title="문의사항">
        <Small>로딩 중…</Small>
      </AdminShell>
    );
  }

  if (isError) {
    return (
      <AdminShell title="문의사항">
        <Small style={{ color: '#fca5a5', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {queryError instanceof Error ? queryError.message : '목록을 불러오지 못했습니다.'}
        </Small>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="문의사항">
      <HeaderBlock>
        <Title>문의사항 관리</Title>
        <Subtitle>허브업 질문하기 접수를 hub_web과 유사한 방식으로 검색·필터·상세 처리합니다.</Subtitle>
      </HeaderBlock>
      {apiWarnings.length > 0 ? (
        <Subtitle style={{ color: '#fbbf24', marginTop: -8, marginBottom: 12 }}>
          {apiWarnings.join(' ')}
        </Subtitle>
      ) : null}

      <FilterSection>
        <SearchInput
          type="search"
          placeholder="검색 (내용, 이름, 연락처, 메모, 답변)"
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
              ['new', '접수대기'],
              ['answered', '답변완료']
            ] as const
          ).map(([v, label]) => (
            <FilterBtn key={v} type="button" $active={statusFilter === v} onClick={() => setStatusFilter(v)}>
              {label}
            </FilterBtn>
          ))}
        </FilterRow>

        <FilterRow>
          <FilterLabel>카테고리</FilterLabel>
          <FilterBtn type="button" $active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
            전체
          </FilterBtn>
          {CATEGORIES.map((c) => (
            <FilterBtn
              key={c}
              type="button"
              $active={categoryFilter === c}
              onClick={() => setCategoryFilter(c)}
            >
              {c}
            </FilterBtn>
          ))}
          <FilterBtn
            type="button"
            $active={categoryFilter === '__uncat__'}
            onClick={() => setCategoryFilter('__uncat__')}
          >
            미분류
          </FilterBtn>
        </FilterRow>
      </FilterSection>

      <StatsGrid>
        <StatCard>
          <StatValue>{stats.total}</StatValue>
          <StatLabel>전체</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.new_count}</StatValue>
          <StatLabel>접수대기</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.answered_count}</StatValue>
          <StatLabel>답변완료</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.today_count}</StatValue>
          <StatLabel>오늘 접수</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.this_week_count}</StatValue>
          <StatLabel>이번 주</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.pending_reply}</StatValue>
          <StatLabel>답변 없음</StatLabel>
        </StatCard>
      </StatsGrid>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th style={{ width: 64 }}>순서</Th>
              <Th style={{ width: 100 }}>카테고리</Th>
              <Th>메시지</Th>
              <Th style={{ width: 100 }}>상태</Th>
              <Th style={{ width: 150 }}>등록일</Th>
              <Th style={{ width: 100 }}>작업</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRow>
                <Td colSpan={6}>
                  로딩 중…
                </Td>
              </LoadingRow>
            ) : filtered.length === 0 ? (
              <LoadingRow>
                <Td colSpan={6}>
                  <EmptyState>
                    {statusFilter === 'all' && categoryFilter === 'all' && !searchQuery.trim()
                      ? '등록된 문의가 없습니다.'
                      : '조건에 맞는 문의가 없습니다.'}
                  </EmptyState>
                </Td>
              </LoadingRow>
            ) : (
              filtered.map((row, index) => (
                <tr key={row.id}>
                  <Td>{filtered.length - index}</Td>
                  <Td>
                    <Badge $color={categoryBadgeColor(row.subject)}>{categoryLabel(row.subject)}</Badge>
                  </Td>
                  <Td title={row.message}>
                    <MsgCell>
                      {row.message}
                      {row.admin_response?.trim() ? (
                        <Badge $color="green" style={{ marginLeft: 8, fontSize: 10 }}>
                          답변
                        </Badge>
                      ) : null}
                    </MsgCell>
                  </Td>
                  <Td>
                    <Badge $color={STATUS_COLORS[row.status] ?? 'gray'}>
                      {INQUIRY_STATUS_LABELS[row.status] ?? row.status}
                    </Badge>
                  </Td>
                  <Td>{seoulDate(row.created_at)}</Td>
                  <Td>
                    <ActionRow>
                      <ActionBtn type="button" onClick={() => openModal(row)}>
                        상세
                      </ActionBtn>
                    </ActionRow>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      {modalOpen && selected ? (
        <Modal
          role="presentation"
          onClick={() => {
            if (!updateMutation.isPending && !deleteMutation.isPending) closeModal();
          }}
        >
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalHead>
              <ModalTitle>
                {selectedOrderInList != null
                  ? `문의 상세 · 순서 ${selectedOrderInList}`
                  : `문의 상세 #${selected.id}`}
              </ModalTitle>
              <CloseBtn
                type="button"
                aria-label="닫기"
                onClick={() => {
                  if (!updateMutation.isPending && !deleteMutation.isPending) closeModal();
                }}
              >
                ×
              </CloseBtn>
            </ModalHead>

            <FormGroup>
              <Label>문의 내용</Label>
              <MessageBox>{selected.message}</MessageBox>
            </FormGroup>

            <FormGroup>
              <Label>카테고리 (subject)</Label>
              <Select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                <option value="">미분류</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FormGroup>

            <WorkflowBox>
              <Label>처리 단계 (DB `status`: pending → 답변 저장 시 answered)</Label>
              <StepTrack>
                {WORKFLOW_STEP_LABELS.map((label, i) => {
                  const wfIdx = getInquiryWorkflowStepIndex(selected.status);
                  const fullyDone = selected.status === 'answered';
                  let stepState: 'done' | 'current' | 'todo';
                  if (fullyDone) {
                    stepState = 'done';
                  } else if (wfIdx < 0) {
                    stepState = 'todo';
                  } else if (i < wfIdx) {
                    stepState = 'done';
                  } else if (i === wfIdx) {
                    stepState = 'current';
                  } else {
                    stepState = 'todo';
                  }
                  return (
                    <StepItem key={label} $state={stepState}>
                      <StepDot $state={stepState} />
                      {label}
                    </StepItem>
                  );
                })}
              </StepTrack>
              <Small>답변을 저장하면 `answer` 컬럼과 함께 `status`가 answered 로 반영됩니다.</Small>
            </WorkflowBox>

            <FormGroup>
              <Label>상태 직접 변경</Label>
              <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="pending">접수대기 (pending)</option>
                <option value="answered">답변완료 (answered)</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>관리자 메모 (내부)</Label>
              <TextArea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="내부 메모 (사용자에게 보이지 않음)"
              />
            </FormGroup>

            <FormGroup>
              <Label>사용자 답변 (공개)</Label>
              <TextArea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="참여자에게 전달할 답변 (저장 시 answer 컬럼·answered 상태로 반영)"
                style={{ minHeight: 140 }}
              />
              <Small>저장 시 DB 컬럼 `answer`, `answered_at`, `status=answered` 로 반영됩니다.</Small>
            </FormGroup>

            <FormGroup>
              <AdditionalInfoBlock>
                <AdditionalInfoTitle>추가 정보</AdditionalInfoTitle>
                <AdditionalInfoRow>
                  <AdditionalInfoLabel>등록일</AdditionalInfoLabel>
                  <AdditionalInfoValue>{seoulDate(selected.created_at)}</AdditionalInfoValue>
                </AdditionalInfoRow>
                <AdditionalMetaRow label="페이지 URL" value={selected.page_url} />
                <AdditionalMetaRow label="IP" value={selected.ip_address} />
                <AdditionalMetaRow label="사용자 이름" value={selected.name} />
                <AdditionalMetaRow label="사용자 이메일" value={selected.email} />
                <AdditionalMetaRow label="연락처" value={selected.phone} />
                <AdditionalMetaRow label="사용자 ID" value={selected.user_id} />
                <AdditionalMetaRow label="User Agent" value={selected.user_agent} />
              </AdditionalInfoBlock>
              {selected.resolved_at || selected.response_at ? (
                <>
                  <Label style={{ marginTop: 12 }}>처리 시각</Label>
                  {selected.response_at ? (
                    <InfoRow>
                      <span style={{ opacity: 0.75 }}>답변 시각:</span>
                      {seoulDate(selected.response_at)}
                    </InfoRow>
                  ) : null}
                  {selected.resolved_at ? (
                    <InfoRow>
                      <span style={{ opacity: 0.75 }}>해결 시각:</span>
                      {seoulDate(selected.resolved_at)}
                    </InfoRow>
                  ) : null}
                </>
              ) : null}
            </FormGroup>

            <BtnRow>
              <Btn
                type="button"
                $variant="danger"
                disabled={deleteMutation.isPending || updateMutation.isPending}
                onClick={handleDelete}
              >
                {deleteMutation.isPending ? '삭제 중…' : '삭제'}
              </Btn>
              <Btn
                type="button"
                $variant="ghost"
                disabled={updateMutation.isPending || deleteMutation.isPending}
                onClick={closeModal}
              >
                취소
              </Btn>
              <Btn
                type="button"
                $variant="primary"
                disabled={updateMutation.isPending || deleteMutation.isPending}
                onClick={handleSave}
              >
                {updateMutation.isPending ? '저장 중…' : '저장'}
              </Btn>
            </BtnRow>
          </ModalCard>
        </Modal>
      ) : null}
    </AdminShell>
  );
}
