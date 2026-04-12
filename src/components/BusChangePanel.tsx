import { useCallback, useEffect, useId, useState } from 'react';
import styled from '@emotion/styled';

type SlotOpt = { value: string; label: string };
const HUBUP_NAVY = '#0f172d';
const HUBUP_NAVY_SOFT = '#16213d';
const HUBUP_NAVY_LINE = 'rgba(148, 163, 184, 0.16)';
const HUBUP_TEXT = '#dce6f5';
const HUBUP_TEXT_SOFT = 'rgba(220, 230, 245, 0.76)';
const HUBUP_BLUE = '#35548b';
const HUBUP_BLUE_DEEP = '#243f74';
const HUBUP_POSTER_NAVY = '#2f4f86';
const HUBUP_POSTER_NAVY_DEEP = '#233d6c';

type PendingRow = {
  id: string;
  requested_departure_slot: string | null;
  requested_return_slot: string | null;
  reason: string;
  status: string;
  created_at: string;
};

type BusData = {
  hasRegistration: boolean;
  currentDeparture: SlotOpt | null;
  currentReturn: SlotOpt | null;
  departureOptions: SlotOpt[];
  returnOptions: SlotOpt[];
  pendingRequest: PendingRow | null;
  meta?: { warning?: string };
};

/** 티켓 바로 위: 한 줄 요약 */
const TicketLead = styled.p`
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.65;
  color: ${HUBUP_TEXT_SOFT};
  font-weight: 500;
`;

/** 티켓형 버스 현황 */
const TicketRoot = styled.section`
  margin-bottom: 16px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid ${HUBUP_NAVY_LINE};
  box-shadow:
    0 8px 20px rgba(2, 6, 23, 0.2),
    0 18px 40px rgba(2, 6, 23, 0.22);
`;

const TicketHeader = styled.div`
  background: linear-gradient(135deg, ${HUBUP_POSTER_NAVY} 0%, ${HUBUP_POSTER_NAVY_DEEP} 100%);
  color: #fff;
  padding: 18px 20px 16px;
  text-align: center;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.06) 0%, transparent 100%);
    pointer-events: none;
  }
`;

const TicketBrand = styled.div`
  font-size: 10px;
  letter-spacing: 0.42em;
  font-weight: 800;
  opacity: 0.88;
  margin-bottom: 8px;
`;

const TicketTitle = styled.h3`
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.03em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
`;

const TicketBody = styled.div`
  background: linear-gradient(180deg, rgba(47, 79, 134, 0.1) 0%, #ffffff 28%);
  padding: 20px 16px 18px;
`;

const TicketTimes = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0;
  align-items: center;
`;

const TicketHalf = styled.div`
  text-align: center;
  padding: 8px 6px;
  min-width: 0;
`;

const TicketHalfBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #fff;
  background: linear-gradient(180deg, ${HUBUP_BLUE} 0%, ${HUBUP_BLUE_DEEP} 100%);
  padding: 5px 12px;
  border-radius: 999px;
  margin-bottom: 10px;
  box-shadow: 0 1px 2px rgba(22, 101, 52, 0.25);
`;

const TicketHalfTime = styled.div`
  font-size: clamp(1.25rem, 4.5vw, 1.65rem);
  font-weight: 800;
  color: #203454;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
  line-height: 1.2;
  word-break: keep-all;
`;

const TicketHalfSub = styled.div`
  margin-top: 6px;
  font-size: 11px;
  color: #62718a;
  font-weight: 500;
`;

/** 출발 ↔ 복귀 사이: 세로 점선 + 원형 왕복 화살표 */
const TicketMiddleColumn = styled.div`
  position: relative;
  align-self: stretch;
  min-width: 52px;
  max-width: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2px;

  &::before {
    content: '';
    position: absolute;
    top: 6px;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    background: repeating-linear-gradient(
      180deg,
      rgba(53, 84, 139, 0.7) 0px,
      rgba(53, 84, 139, 0.7) 6px,
      transparent 6px,
      transparent 11px
    );
    opacity: 0.75;
    z-index: 0;
    border-radius: 1px;
  }
`;

const TicketArrowCircle = styled.div`
  position: relative;
  z-index: 1;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  flex-shrink: 0;
  background: linear-gradient(155deg, #ffffff 0%, #eef3fb 100%);
  border: 2px solid rgba(53, 84, 139, 0.56);
  box-shadow:
    0 2px 10px rgba(37, 54, 91, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${HUBUP_BLUE};
`;

/** 출발 ↔ 복귀 왕복(양방향 화살표) */
function TicketArrowIcon() {
  const gid = useId().replace(/:/g, '');
  const gradId = `ticketArrowGrad-${gid}`;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6f8fc8" />
          <stop offset="100%" stopColor="#35548b" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradId})`}
        d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"
      />
    </svg>
  );
}

const TicketPerf = styled.div`
  padding: 10px 0 6px;
  background: #f4f7fc;

  &::before {
    content: '';
    display: block;
    height: 1px;
    margin: 0 22px;
    background-image: repeating-linear-gradient(
      90deg,
      rgba(53, 84, 139, 0.7) 0px,
      rgba(53, 84, 139, 0.7) 7px,
      transparent 7px,
      transparent 13px
    );
  }
`;

const TicketStub = styled.div`
  background: linear-gradient(180deg, #f7f9fd 0%, #edf2fb 100%);
  padding: 14px 18px 16px;
`;

const TicketStubText = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: #203454;
  font-weight: 600;
`;

const TicketStubHint = styled.span`
  display: block;
  margin-top: 6px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${HUBUP_BLUE};
  opacity: 0.92;
`;

const TicketStubMuted = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: #6b7280;
  font-weight: 500;
  text-align: center;
`;

/** 티켓 아래: 입력·절차 안내 */
const IntroBlock = styled.div`
  margin-bottom: 18px;
`;

const IntroParagraph = styled.p`
  margin: 0 0 8px;
  font-size: 14px;
  color: #5a687c;
  line-height: 1.65;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #243b63;
  margin-bottom: 14px;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(53, 84, 139, 0.18);
  background: #ffffff;
  color: #18253f;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: ${HUBUP_BLUE};
    box-shadow: 0 0 0 3px rgba(53, 84, 139, 0.18);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(53, 84, 139, 0.18);
  background: #ffffff;
  color: #18253f;
  outline: none;
  resize: vertical;

  &:focus {
    border-color: ${HUBUP_BLUE};
    box-shadow: 0 0 0 3px rgba(53, 84, 139, 0.18);
  }

  &::placeholder {
    color: rgba(100, 116, 139, 0.72);
  }
`;

const Disclaimer = styled.p`
  margin: 8px 0 16px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 14px 18px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(180deg, ${HUBUP_BLUE} 0%, ${HUBUP_BLUE_DEEP} 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const Message = styled.p`
  margin: 0;
  font-size: 14px;
  color: #5a687c;
  line-height: 1.6;
`;

const ErrorText = styled.p`
  margin: 0 0 12px;
  font-size: 14px;
  color: #b91c1c;
  line-height: 1.5;
`;

function withNoChange(opts: SlotOpt[]): { value: string; label: string }[] {
  return [{ value: '', label: '변경 없음' }, ...opts];
}

function formatPendingLine(
  p: PendingRow,
  depOpts: SlotOpt[],
  retOpts: SlotOpt[]
): string {
  const dep = p.requested_departure_slot
    ? depOpts.find((o) => o.value === p.requested_departure_slot)?.label ?? p.requested_departure_slot
    : null;
  const ret = p.requested_return_slot
    ? retOpts.find((o) => o.value === p.requested_return_slot)?.label ?? p.requested_return_slot
    : null;
  const parts: string[] = [];
  if (dep) parts.push(`출발 → ${dep}`);
  if (ret) parts.push(`복귀 → ${ret}`);
  const req = parts.length ? parts.join(', ') : '변경 없음(사유만)';
  return `처리 대기 중입니다. 요청: ${req}`;
}

type Props = {
  userId: string | null;
  ssoLoading: boolean;
};

export default function BusChangePanel({ userId, ssoLoading }: Props) {
  const [data, setData] = useState<BusData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [departureChoice, setDepartureChoice] = useState('');
  const [returnChoice, setReturnChoice] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/hub-up/bus-change');
      const ct = res.headers.get('content-type') || '';
      const raw = await res.text();
      if (!ct.includes('application/json')) {
        throw new Error(
          `API가 JSON 대신 다른 응답을 보냈습니다 (${res.status}). 개발자 도구 Network에서 /api/hub-up/bus-change 응답을 확인하세요. (주소가 hubup_quest인지, Supabase 환경 변수가 채워졌는지 확인)`
        );
      }
      let json: { success?: boolean; data?: BusData; message?: string };
      try {
        json = JSON.parse(raw) as typeof json;
      } catch {
        throw new Error(
          '응답을 JSON으로 해석할 수 없습니다. Network 탭에서 /api/hub-up/bus-change 가 HTML(오류 페이지)인지 확인하세요.'
        );
      }
      if (!res.ok) {
        throw new Error(typeof json?.message === 'string' ? json.message : '불러오기에 실패했습니다.');
      }
      const d = json.data as BusData;
      setData(d);
      setDepartureChoice('');
      setReturnChoice('');
      setReason('');
      setFormError(null);
    } catch (e) {
      setData(null);
      setLoadError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ssoLoading || !userId) return;
    void load();
  }, [ssoLoading, userId, load]);

  const onSubmit = async () => {
    setFormError(null);
    if (!reason.trim()) {
      setFormError('변경 사유를 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hub-up/bus-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedDepartureSlot: departureChoice,
          requestedReturnSlot: returnChoice,
          reason: reason.trim()
        })
      });
      const json = (await res.json()) as {
        message?: string;
        detail?: string;
      };
      if (!res.ok) {
        const base = typeof json?.message === 'string' ? json.message : '제출에 실패했습니다.';
        const detail = typeof json?.detail === 'string' && json.detail.trim() ? `\n\n(개발용 상세: ${json.detail})` : '';
        throw new Error(base + detail);
      }
      alert(json.message ?? '접수되었습니다.');
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (ssoLoading) {
    return <Message>로그인 정보를 확인하는 중…</Message>;
  }

  if (!userId) {
    return (
      <Message>
        버스 시간 변경은 허브워십 로그인 후 이 페이지로 이동할 때(SSO)에만 이용할 수 있습니다. 상단에서 토큰으로
        들어왔는지 확인해 주세요.
      </Message>
    );
  }

  if (loading && !data) {
    return <Message>버스 정보를 불러오는 중…</Message>;
  }

  if (loadError) {
    return (
      <>
        <ErrorText>{loadError}</ErrorText>
        <Message>Supabase에 `hub_up_bus_change_requests` 테이블을 만든 뒤(.sql 참고), 환경 변수가 hub_web과 동일한지 확인해 주세요.</Message>
      </>
    );
  }

  if (!data) {
    return <Message>데이터를 불러오지 못했습니다.</Message>;
  }

  const depSelectOpts = withNoChange(data.departureOptions);
  const retSelectOpts = withNoChange(data.returnOptions);
  const hasPending = Boolean(data.pendingRequest);
  const canSubmit = data.hasRegistration && !hasPending;

  return (
    <>
      <TicketLead>
        허브업 신청 시 선택한 출발·복귀 시간을 확인하고, 필요하면 변경을 요청할 수 있습니다.
      </TicketLead>

      <TicketRoot>
        <TicketHeader>
          <TicketBrand>HUBUP · BUS</TicketBrand>
          <TicketTitle>내 버스 현황</TicketTitle>
        </TicketHeader>
        <TicketBody>
          <TicketTimes>
            <TicketHalf>
              <TicketHalfBadge>출발</TicketHalfBadge>
              <TicketHalfTime>{data.currentDeparture?.label ?? '—'}</TicketHalfTime>
              <TicketHalfSub>현재 출발</TicketHalfSub>
            </TicketHalf>
            <TicketMiddleColumn>
              <TicketArrowCircle>
                <TicketArrowIcon />
              </TicketArrowCircle>
            </TicketMiddleColumn>
            <TicketHalf>
              <TicketHalfBadge>복귀</TicketHalfBadge>
              <TicketHalfTime>{data.currentReturn?.label ?? '—'}</TicketHalfTime>
              <TicketHalfSub>현재 복귀</TicketHalfSub>
            </TicketHalf>
          </TicketTimes>
        </TicketBody>
        <TicketPerf aria-hidden />
        <TicketStub>
          {hasPending && data.pendingRequest ? (
            <>
              <TicketStubText>
                {formatPendingLine(data.pendingRequest, data.departureOptions, data.returnOptions)}
              </TicketStubText>
              <TicketStubHint>담당자 확인 후 처리됩니다.</TicketStubHint>
            </>
          ) : (
            <TicketStubMuted>아직 변경 요청 내역이 없습니다.</TicketStubMuted>
          )}
        </TicketStub>
      </TicketRoot>

      <IntroBlock>
        <IntroParagraph>
          변경을 원하시면 아래에서 출발·복귀 시간과 변경 사유를 입력한 뒤 제출해 주세요.
        </IntroParagraph>
        <IntroParagraph>
          제출하시면 요청이 접수되고, 담당자 확인 후 처리됩니다.
        </IntroParagraph>
      </IntroBlock>

      {!data.hasRegistration && (
        <Message style={{ marginBottom: 16 }}>
          허브업 버스 신청 내역이 없습니다. 허브워십에서 허브업 신청을 완료한 뒤 이용해 주세요.
        </Message>
      )}

      {data.meta?.warning && (
        <ErrorText style={{ color: '#b45309', marginBottom: 12 }}>{data.meta.warning}</ErrorText>
      )}

      <Label>
        출발 버스 변경
        <Select
          value={departureChoice}
          onChange={(e) => setDepartureChoice(e.target.value)}
          disabled={!canSubmit}
        >
          {depSelectOpts.map((o) => (
            <option key={`d-${o.value}-${o.label}`} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Label>

      <Label>
        복귀 버스 변경
        <Select
          value={returnChoice}
          onChange={(e) => setReturnChoice(e.target.value)}
          disabled={!canSubmit}
        >
          {retSelectOpts.map((o) => (
            <option key={`r-${o.value}-${o.label}`} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Label>

      <Label>
        <span>
          변경 사유 <span style={{ color: '#b91c1c' }}>*</span>
        </span>
        <TextArea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="변경 사유를 간단히 입력해 주세요."
          disabled={!canSubmit}
        />
      </Label>

      <Disclaimer>※ 슬롯 마감 등에 따라 변경이 어려울 수 있습니다.</Disclaimer>

      {formError && <ErrorText>{formError}</ErrorText>}

      <SubmitBtn type="button" onClick={() => void onSubmit()} disabled={!canSubmit || submitting}>
        {submitting ? '제출 중…' : '변경 문의 제출'}
      </SubmitBtn>
    </>
  );
}
