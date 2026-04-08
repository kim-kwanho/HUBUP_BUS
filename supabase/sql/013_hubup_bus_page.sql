-- ================================================================
-- 허브업 / 버스 / 페이지 추가 — 파일: 013_hubup_bus_page.sql
-- 상위 hub-up 아래 버스 하위 메뉴·역할 (hub-up/bus)
-- - parent: admin_menus.menu_id = 'hub-up' (없으면 NULL parent로 삽입)
-- - child:  menu_id = 'hub-up/bus', path = /admin/bus-requests
-- - role:   roles.name = 'hub-up/bus'
-- 기존 hubup_qna_bus 행·연결은 유지(앱에서 병행 인식). 저장 시 신규 행으로 통합됨.
-- 선행: 012_hubup_bus_admin.sql 권장 (레거시 버스·문의 메뉴 시드)
-- ================================================================

-- 1) 역할
INSERT INTO public.roles (name, description)
SELECT 'hub-up/bus', '허브업 버스 변경 요청 관리 (hub-up 하위)'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'hub-up/bus');

-- 2) 부모 hub-up 메뉴 (011 미적용 환경 대비)
INSERT INTO public.admin_menus (menu_id, title, icon, path, parent_id, order_index, is_active)
SELECT 'hub-up', '허브업 관리', '🎪', '/admin', NULL, 999, true
WHERE NOT EXISTS (SELECT 1 FROM public.admin_menus WHERE menu_id = 'hub-up');

-- 3) 하위 버스 메뉴
INSERT INTO public.admin_menus (menu_id, title, icon, path, parent_id, order_index, is_active)
SELECT
  'hub-up/bus',
  '허브업 버스 변경 요청',
  '🚌',
  '/admin/bus-requests',
  (SELECT id FROM public.admin_menus WHERE menu_id = 'hub-up' LIMIT 1),
  100,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.admin_menus WHERE menu_id = 'hub-up/bus');

-- 4) 레거시 버스 메뉴에 매핑된 역할을 신규 메뉴에 복사
INSERT INTO public.admin_menu_roles (menu_id, role_id)
SELECT new_m.id, amr.role_id
FROM public.admin_menu_roles amr
INNER JOIN public.admin_menus old_m ON old_m.menu_id = 'hubup_qna_bus' AND amr.menu_id = old_m.id
INNER JOIN public.admin_menus new_m ON new_m.menu_id = 'hub-up/bus'
ON CONFLICT (menu_id, role_id) DO NOTHING;

-- 5) 역할 hub-up/bus ↔ 메뉴 hub-up/bus  시드
INSERT INTO public.admin_menu_roles (menu_id, role_id)
SELECT m.id, r.id
FROM public.admin_menus m
CROSS JOIN public.roles r
WHERE m.menu_id = 'hub-up/bus'
  AND r.name = 'hub-up/bus'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_menu_roles x WHERE x.menu_id = m.id AND x.role_id = r.id
  );
