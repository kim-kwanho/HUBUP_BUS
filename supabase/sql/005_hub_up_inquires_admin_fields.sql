-- 허브업 문의 관리(hub_web tech-inquiries 스타일): 내부 메모·사용자 답변·타임스탬프
-- Supabase SQL Editor에서 실행

alter table public.hub_up_inquires
  add column if not exists admin_note text;

alter table public.hub_up_inquires
  add column if not exists admin_response text;

alter table public.hub_up_inquires
  add column if not exists response_at timestamptz;

alter table public.hub_up_inquires
  add column if not exists resolved_at timestamptz;
