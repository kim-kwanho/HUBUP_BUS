-- hub_web의 hub_up_registrations / 슬롯 테이블과 동일 DB에서 사용합니다.
-- 버스 시간 변경 요청 (문의 앱 SSO user_id = hub_web session user id)

create table if not exists public.hub_up_bus_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null default '-',
  phone text not null default '-',
  group_name text not null default '-',
  email text not null default '-',
  requested_departure_slot text null,
  requested_return_slot text null,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- hub_web 등 기존 DB에 스냅샷 컬럼이 없을 때
alter table public.hub_up_bus_change_requests
  add column if not exists name text not null default '-';

alter table public.hub_up_bus_change_requests
  add column if not exists phone text not null default '-';

alter table public.hub_up_bus_change_requests
  add column if not exists group_name text not null default '-';

alter table public.hub_up_bus_change_requests
  add column if not exists email text not null default '-';

-- hub_web: 변경 직전 신청 슬롯 스냅샷 (NOT NULL)
alter table public.hub_up_bus_change_requests
  add column if not exists current_departure_slot text not null default '-';

alter table public.hub_up_bus_change_requests
  add column if not exists current_return_slot text not null default '-';

create index if not exists hub_up_bus_change_requests_user_id_idx on public.hub_up_bus_change_requests (user_id);
create index if not exists hub_up_bus_change_requests_status_idx on public.hub_up_bus_change_requests (status);

-- 사용자당 처리 대기(pending) 요청은 하나만 허용
create unique index if not exists hub_up_bus_change_one_pending_per_user
  on public.hub_up_bus_change_requests (user_id)
  where status = 'pending';

-- 구버전 테이블에 email·name 등이 없으면 008_hub_up_bus_change_requests_columns.sql 을 실행하세요.
