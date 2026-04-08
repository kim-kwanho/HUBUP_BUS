-- `hub_up_inquires` 테이블이 없으면 PostgREST 오류:
-- "Could not find the table 'public.hub_up_inquires' in the schema cache"
-- hub_web DB에 이미 테이블이 있는 경우 이 스크립트는 건너뛰어도 됩니다 (`create table if not exists`).

create table if not exists public.hub_up_inquires (
  id bigint generated always as identity primary key,
  name text,
  email text,
  phone text,
  subject text,
  message text not null,
  status text not null default 'new',
  user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.hub_up_inquires is '허브업 문의(Q&A) — hub_web과 동일 테이블명';

comment on column public.hub_up_inquires.subject is '카테고리 (접수/숙소/차량/티셔츠/기타)';
comment on column public.hub_up_inquires.user_id is 'SSO 사용자 ID (hub_web / hubup_quest 세션)';
