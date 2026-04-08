/**
 * 문의 처리 — Supabase `hub_up_inquiries.status`: `pending` | `answered`
 * (과거 `new` / `in_progress` 등은 normalize 단계에서 읽기 호환용으로만 매핑)
 */

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  pending: '접수대기',
  answered: '답변완료',
  /** 레거시·호환 */
  new: '접수대기',
  in_progress: '처리중(구)',
  resolved: '해결됨(구)',
  closed: '종료(구)'
};

/** 단계 진행 버튼 없음 — 답변 저장 시 `answered` 로 전환 */
export function getNextInquiryStatus(_current: string): string | null {
  return null;
}

/** 단계 표시: 0=접수대기, 1=답변완료 */
export function getInquiryWorkflowStepIndex(status: string): number {
  const s = status.trim();
  if (s === 'new' || s === 'pending') return 0;
  if (s === 'answered') return 1;
  if (['in_progress', 'resolved', 'closed'].includes(s)) return 1;
  return -1;
}

export const WORKFLOW_STEP_LABELS = ['접수대기', '답변완료'] as const;

export function isNewLikeStatus(status: string): boolean {
  const s = status.trim();
  return s === 'new' || s === 'pending';
}

/** 접수대기·신규면 답변 작성 가능 */
export function canWriteInquiryReply(status: string): boolean {
  return isNewLikeStatus(status) || status.trim() === 'answered';
}
