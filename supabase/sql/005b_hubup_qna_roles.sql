-- =============================================================================
-- [005b] HUBUP Q&A용 `roles` 행 (문의·버스 레거시 역할명)
-- 선행: `public.roles` 테이블 존재 (hub_web 공유 DB)
-- 후행: `012_hubup_bus_admin.sql` 의 admin_menu_roles 시드가 이 역할 id를 참조할 수 있음
-- 참고: 버스는 신규 `hub-up/bus` 역할은 `013_hubup_bus_page.sql` 에서 추가
-- =============================================================================

insert into public.roles (name, description)
select 'hubup_qna_inquiries', 'HUBUP Q&A 문의 관리'
where not exists (select 1 from public.roles where name = 'hubup_qna_inquiries');

insert into public.roles (name, description)
select 'hubup_qna_bus', 'HUBUP Q&A 버스 변경 요청 관리'
where not exists (select 1 from public.roles where name = 'hubup_qna_bus');
