-- [구버전] HUBUP 전용 별도 테이블 — 신규는 `012_hubup_bus_admin.sql` 로
-- `admin_menus` + `admin_menu_roles` 만 사용하는 것을 권장합니다.
-- 이 스크립트를 이미 적용한 DB는 012의 DO 블록이 admin_menu_roles 로 이전합니다.
--
-- HUBUP Admin: 버스 / 문의 화면 접근 허용 역할 (hub_web admin_menus 전체와 분리)
-- hub_web `roles`와만 FK로 연결됩니다.

create table if not exists public.hubup_area_allowed_roles (
  area text not null check (area in ('bus', 'inquiries')),
  role_id integer not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (area, role_id)
);

create index if not exists idx_hubup_area_allowed_roles_role_id
  on public.hubup_area_allowed_roles (role_id);

-- 기존 전용 역할 name과 동일하게 동작하도록 시드 (역할 행이 있을 때만)
insert into public.hubup_area_allowed_roles (area, role_id)
select 'bus', r.id
from public.roles r
where r.name = 'hubup_qna_bus'
on conflict do nothing;

insert into public.hubup_area_allowed_roles (area, role_id)
select 'inquiries', r.id
from public.roles r
where r.name = 'hubup_qna_inquiries'
on conflict do nothing;
