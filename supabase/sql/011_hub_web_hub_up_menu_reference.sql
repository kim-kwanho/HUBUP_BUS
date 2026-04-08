-- ================================================================
-- [참고] hub_web 관리 메뉴 + 역할 — hub_web 공유 Supabase에서 실행
-- ================================================================
-- hubup_quest 앱의 접근 제어는 `012_hubup_bus_admin.sql` · `013_hubup_bus_page.sql` + `/admin/access` 와 별개입니다.
-- hub_web 사이드바에「허브업 관리」를
-- 띄울 때 roles / admin_menus / admin_menu_roles 를 맞추는 용도입니다.
-- ================================================================

-- 1. hub-up 역할 추가 (name만, id는 자동 생성)
INSERT INTO public.roles (name)
SELECT 'hub-up'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'hub-up');

-- 2. hub-up 메뉴 추가
INSERT INTO public.admin_menus (menu_id, title, icon, path, parent_id, order_index, is_active)
SELECT 'hub-up', '허브업 관리', '🎪', '/admin', NULL, 999, true
WHERE NOT EXISTS (SELECT 1 FROM public.admin_menus WHERE menu_id = 'hub-up');

-- 3. hub-up 메뉴에 hub-up 역할 연결
INSERT INTO public.admin_menu_roles (menu_id, role_id)
SELECT m.id, r.id
FROM public.admin_menus m
CROSS JOIN public.roles r
WHERE m.menu_id = 'hub-up'
  AND r.name = 'hub-up'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_menu_roles amr
    WHERE amr.menu_id = m.id AND amr.role_id = r.id
  );

-- 확인
SELECT m.menu_id, m.title, r.name AS role_name
FROM public.admin_menus m
LEFT JOIN public.admin_menu_roles amr ON amr.menu_id = m.id
LEFT JOIN public.roles r ON r.id = amr.role_id
WHERE m.menu_id = 'hub-up';
