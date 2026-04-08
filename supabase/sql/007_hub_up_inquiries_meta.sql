-- 문의 접수 시 페이지 경로·클라이언트 IP·User-Agent 저장 (관리자 상세「추가 정보」)
-- `hub_up_inquiries` 테이블명을 쓰는 프로젝트는 동일 컬럼을 해당 테이블에 추가하세요.

alter table public.hub_up_inquires
  add column if not exists page_url text;

alter table public.hub_up_inquires
  add column if not exists ip_address text;

alter table public.hub_up_inquires
  add column if not exists user_agent text;

comment on column public.hub_up_inquires.page_url is '문의 제출 시 브라우저 경로 (예: /lent)';
comment on column public.hub_up_inquires.ip_address is '접수 시 클라이언트 IP (프록시 시 X-Forwarded-For 우선)';
comment on column public.hub_up_inquires.user_agent is '접수 시 User-Agent 헤더';
