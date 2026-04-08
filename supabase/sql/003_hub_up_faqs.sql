-- 허브업 문의 센터 FAQ (hub_web과 동일 Supabase 프로젝트에서 실행)

create table if not exists public.hub_up_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hub_up_faqs_active_sort_idx
  on public.hub_up_faqs (is_active, sort_order);

comment on table public.hub_up_faqs is '허브업 Q&A 자주 묻는 질문';

-- 초기 샘플(필요 없으면 삭제)
insert into public.hub_up_faqs (question, answer, sort_order, is_active)
values
  (
    '어디서 문의를 남기나요?',
    '「질문하기」 탭에서 바로 남기면 됩니다. 별도 페이지로 이동하지 않아도 됩니다.',
    1,
    true
  ),
  (
    '허브워십에서 넘어온 토큰은 어떻게 처리되나요?',
    '주소에 포함된 token 값을 읽어 세션 쿠키로 바꾼 뒤, 문의 저장 시 사용자 ID와 연결할 수 있도록 유지합니다.',
    2,
    true
  ),
  (
    '버스 시간 변경은 어떻게 하나요?',
    '「버스 시간 변경」 탭에서 신청 시 배정된 출발·복귀 시간을 확인하고, 변경 요청을 제출할 수 있습니다.',
    3,
    true
  );
