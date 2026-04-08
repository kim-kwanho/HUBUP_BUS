-- hub_web SSO로 식별된 사용자 ID를 문의에 남기려면 실행하세요.
alter table public.inquiries
  add column if not exists user_id text;
