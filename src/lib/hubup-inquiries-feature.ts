/**
 * 문의(질문하기·/admin/inquiries) 마스터 스위치.
 * 기본 비활성. `NEXT_PUBLIC_HUBUP_INQUIRIES_ENABLED=true` 또는 `1`이면 활성.
 */
const raw = process.env.NEXT_PUBLIC_HUBUP_INQUIRIES_ENABLED?.trim().toLowerCase();
export const HUBUP_INQUIRIES_ENABLED = raw === 'true' || raw === '1';
