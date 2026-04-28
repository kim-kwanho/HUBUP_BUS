-- hub_up_bus_change_requests 중 status = 'approved' 인 건만 반영하여
-- hub_up_registrations 를 백필합니다. (과거 승인 시 자차 필드가 복사되지 않았던 경우 보정)
--
-- 규칙
-- - user_id 당 가장 최근 승인 건 1건만 사용 (processed_at 있으면 우선, 없으면 created_at)
--   (일부 DB에는 hub_up_bus_change_requests.updated_at 컬럼이 없음 → 사용 안 함)
-- - 출발/복귀 슬롯: 요청에 값이 있고 빈 문자·'-' 가 아니면 반영, 아니면 등록 테이블 유지
-- - 자차 필드: 요청에 값이 있으면 반영, 없으면 등록 테이블 유지 (COALESCE)
--
-- 전제: hub_up_registrations · hub_up_bus_change_requests 에 car_* 컬럼이 hub_web 과 동일하게 존재
-- Supabase SQL Editor 에서 한 번 실행합니다.

WITH latest_approved AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    requested_departure_slot,
    requested_return_slot,
    car_role,
    car_passenger_count,
    car_passenger_names,
    car_plate_number,
    car_arrival_time,
    car_departure_time
  FROM public.hub_up_bus_change_requests
  WHERE lower(trim(status)) = 'approved'
  ORDER BY
    user_id,
    COALESCE(processed_at, created_at) DESC NULLS LAST,
    created_at DESC
)
UPDATE public.hub_up_registrations r
SET
  departure_slot = CASE
    WHEN la.requested_departure_slot IS NOT NULL
      AND trim(la.requested_departure_slot::text) NOT IN ('', '-')
    THEN la.requested_departure_slot::text
    ELSE r.departure_slot
  END,
  return_slot = CASE
    WHEN la.requested_return_slot IS NOT NULL
      AND trim(la.requested_return_slot::text) NOT IN ('', '-')
    THEN la.requested_return_slot::text
    ELSE r.return_slot
  END,
  car_role = COALESCE(la.car_role, r.car_role),
  car_passenger_count = COALESCE(la.car_passenger_count, r.car_passenger_count),
  car_passenger_names = COALESCE(la.car_passenger_names, r.car_passenger_names),
  car_plate_number = COALESCE(la.car_plate_number, r.car_plate_number),
  car_arrival_time = COALESCE(la.car_arrival_time, r.car_arrival_time),
  car_departure_time = COALESCE(la.car_departure_time, r.car_departure_time)
FROM latest_approved la
WHERE r.user_id = la.user_id;

-- processed_at 컬럼도 없으면 위 ORDER BY 두 줄을 아래 한 줄로 바꾸세요:
--     created_at DESC
--
-- 미리보기 예시 (실행 전 행 수·내용 확인용, 필요 시 주석 해제 후 단독 실행)
-- SELECT r.user_id, r.departure_slot AS reg_dep, la.requested_departure_slot AS req_dep,
--        r.car_role AS reg_car_role, la.car_role AS req_car_role
-- FROM public.hub_up_registrations r
-- INNER JOIN (
--   SELECT DISTINCT ON (user_id) user_id, requested_departure_slot, requested_return_slot,
--          car_role, status, COALESCE(processed_at, created_at) AS ts
--   FROM public.hub_up_bus_change_requests
--   WHERE lower(trim(status)) = 'approved'
--   ORDER BY user_id, COALESCE(processed_at, created_at) DESC NULLS LAST, created_at DESC
-- ) la ON la.user_id = r.user_id
-- LIMIT 50;
