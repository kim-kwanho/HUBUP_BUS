-- hub_web `roles` 테이블에 HUBUP Q&A 전용 역할 name을 추가합니다.
-- 실행 후 hub_web 관리자 > 역할/권한에서 사용자에게 `admin_roles`로 연결하세요.
-- `profiles.status = '관리자'`인 계정은 역할 없이도 HUBUP 관리 전체에 접근합니다.

insert into public.roles (name, description)
select 'hubup_qna_inquiries', 'HUBUP Q&A 문의 관리'
where not exists (select 1 from public.roles where name = 'hubup_qna_inquiries');

insert into public.roles (name, description)
select 'hubup_qna_bus', 'HUBUP Q&A 버스 변경 요청 관리'
where not exists (select 1 from public.roles where name = 'hubup_qna_bus');
