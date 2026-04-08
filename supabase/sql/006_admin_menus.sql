-- hub_web `admin_menus` / `admin_menu_roles` — 관리자 메뉴·역할 매핑
-- `roles` 테이블이 이미 있어야 합니다 (hub_web 공유 DB).

create table if not exists public.admin_menus (
  id serial primary key,
  menu_id varchar(50) not null unique,
  title varchar(100) not null,
  icon varchar(10),
  path varchar(255) not null,
  parent_id integer references public.admin_menus (id) on delete set null,
  order_index integer not null default 0,
  is_active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_menu_roles (
  id serial primary key,
  menu_id integer not null references public.admin_menus (id) on delete cascade,
  role_id integer not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (menu_id, role_id)
);

create index if not exists idx_admin_menus_menu_id on public.admin_menus (menu_id);
create index if not exists idx_admin_menus_parent_id on public.admin_menus (parent_id);
create index if not exists idx_admin_menus_order on public.admin_menus (order_index);
create index if not exists idx_admin_menu_roles_menu_id on public.admin_menu_roles (menu_id);
create index if not exists idx_admin_menu_roles_role_id on public.admin_menu_roles (role_id);
