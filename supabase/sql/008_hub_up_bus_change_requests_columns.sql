-- hub_web / 구버전 DB에 테이블만 있고 스냅샷 컬럼이 빠진 경우 일괄 보강합니다.
-- 002 스크립트 이후 한 번 실행하면 됩니다.

alter table public.hub_up_bus_change_requests
  add column if not exists name text not null default '-';

alter table public.hub_up_bus_change_requests
  add column if not exists phone text not null default '-';

alter table public.hub_up_bus_change_requests
  add column if not exists group_name text not null default '-';

alter table public.hub_up_bus_change_requests
  add column if not exists email text not null default '-';

alter table public.hub_up_bus_change_requests
  add column if not exists requested_departure_slot text null;

alter table public.hub_up_bus_change_requests
  add column if not exists requested_return_slot text null;

alter table public.hub_up_bus_change_requests
  add column if not exists reason text not null default '-';

alter table public.hub_up_bus_change_requests
  add column if not exists status text not null default 'pending';

alter table public.hub_up_bus_change_requests
  add column if not exists created_at timestamptz not null default now();

alter table public.hub_up_bus_change_requests
  add column if not exists updated_at timestamptz not null default now();

-- hub_web: 변경 직전 출발/복귀 슬롯 (NOT NULL)
alter table public.hub_up_bus_change_requests
  add column if not exists current_departure_slot text not null default '-';

alter table public.hub_up_bus_change_requests
  add column if not exists current_return_slot text not null default '-';
