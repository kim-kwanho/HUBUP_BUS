-- hub_up_bus_change_requests: 자차 스냅샷 컬럼 (사용자 GET·관리자 승인 반영용)
-- hub_web과 동일 스키마가 없을 때 한 번 실행합니다.

alter table public.hub_up_bus_change_requests
  add column if not exists car_role text null;

alter table public.hub_up_bus_change_requests
  add column if not exists car_passenger_count text null;

alter table public.hub_up_bus_change_requests
  add column if not exists car_passenger_names text null;

alter table public.hub_up_bus_change_requests
  add column if not exists car_plate_number text null;

alter table public.hub_up_bus_change_requests
  add column if not exists car_arrival_time text null;

alter table public.hub_up_bus_change_requests
  add column if not exists car_departure_time text null;
