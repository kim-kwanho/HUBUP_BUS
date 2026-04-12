-- ================================================================
-- 허브업 / 버스 / admin 전용 — 파일: 012_hubup_bus_admin.sql
-- HUBUP Admin 전용 admin_menus 2행 + admin_menu_roles (기존 테이블 사용)
-- hub_web 다른 메뉴는 건드리지 않고, menu_id 가 아래 두 개인 행만 다룹니다.
-- 문의(hub_up_inquires)·역할 실행 순서: README_HUB_UP_INQUIRES.md 참고
-- ================================================================

INSERT INTO public.admin_menus (menu_id, title, icon, path, parent_id, order_index, is_active)
SELECT
  'hubup_qna_bus',
  '허브업 버스 변경 요청',
  '🚌',
  '/admin/bus-requests',
  NULL,
  100,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.admin_menus WHERE menu_id = 'hubup_qna_bus');

INSERT INTO public.admin_menus (menu_id, title, icon, path, parent_id, order_index, is_active)
SELECT
  'hubup_qna_inquiries',
  '허브업 문의사항',
  '✉️',
  '/admin/inquiries',
  NULL,
  101,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.admin_menus WHERE menu_id = 'hubup_qna_inquiries');

-- (선택) 예전 hubup_area_allowed_roles 가 있으면 admin_menu_roles 로 이전
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'hubup_area_allowed_roles'
  ) THEN
    INSERT INTO public.admin_menu_roles (menu_id, role_id)
    SELECT m.id, h.role_id
    FROM public.hubup_area_allowed_roles h
    INNER JOIN public.admin_menus m
      ON m.menu_id = CASE h.area
        WHEN 'bus' THEN 'hubup_qna_bus'
        WHEN 'inquiries' THEN 'hubup_qna_inquiries'
      END
    ON CONFLICT (menu_id, role_id) DO NOTHING;
  END IF;
END $$;

-- 레거시 역할명이 있으면 동일 연결 시드 (중복 시 무시)
INSERT INTO public.admin_menu_roles (menu_id, role_id)
SELECT m.id, r.id
FROM public.admin_menus m
CROSS JOIN public.roles r
WHERE m.menu_id = 'hubup_qna_bus'
  AND r.name = 'hubup_qna_bus'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_menu_roles x WHERE x.menu_id = m.id AND x.role_id = r.id
  );

INSERT INTO public.admin_menu_roles (menu_id, role_id)
SELECT m.id, r.id
FROM public.admin_menus m
CROSS JOIN public.roles r
WHERE m.menu_id = 'hubup_qna_inquiries'
  AND r.name = 'hubup_qna_inquiries'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_menu_roles x WHERE x.menu_id = m.id AND x.role_id = r.id
  );
