-- 관리자 승인/반려/완료 시 처리 시각·메모 (008 이후 한 번 실행)

alter table public.hub_up_bus_change_requests
  add column if not exists processed_at timestamptz null;

alter table public.hub_up_bus_change_requests
  add column if not exists processed_note text null;
