-- hub_web `hub_up_inquires`: 질문하기 카테고리(접수/숙소/차량/티셔츠/기타)는 `subject`에 저장합니다.
-- 테이블이 아예 없으면 먼저 `000_create_hub_up_inquires.sql`을 실행하세요.
-- Supabase Table Editor로 수동 추가한 경우와 동일한 스키마입니다.
-- 앱은 컬럼이 없을 때도 insert를 재시도하며, 컬럼이 있으면 `subject` / `user_id`를 바로 저장합니다.

alter table public.hub_up_inquires
  add column if not exists subject text;

alter table public.hub_up_inquires
  add column if not exists user_id text;

-- 대시보드 컬럼 설명과 맞춤 (선택, 이미 있어도 덮어씀)
comment on column public.hub_up_inquires.subject is '카테고리 (접수/숙소/차량/티셔츠/기타)';
comment on column public.hub_up_inquires.user_id is 'SSO 사용자 ID (hub_web / hubup_quest 세션)';
