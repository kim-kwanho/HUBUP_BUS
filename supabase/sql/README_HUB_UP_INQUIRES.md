# 허브업 **문의** (`hub_up_inquires`) SQL 정리

같은 Supabase(hub_web 공유) 기준입니다. **앱에서 문의 기능이 꺼져 있어도** DB·역할·메뉴 행은 남아 있을 수 있습니다.

---

## SQL 파일별 역할 (`supabase/sql` 전체)

| 파일 | 역할 |
|------|------|
| `000_create_hub_up_inquires.sql` | `hub_up_inquires` 테이블이 없을 때 생성 |
| `001_inquiries_user_id.sql` | (레거시) 예전 `public.inquiries`에 `user_id` 컬럼 추가 |
| `002_hub_up_bus_change_requests.sql` | 버스 변경 요청 테이블 `hub_up_bus_change_requests` 생성 |
| `003_hub_up_faqs.sql` | 허브업 FAQ 샘플 데이터 삽입 |
| `004_hub_up_inquires_columns.sql` | 문의 테이블에 `subject`, `user_id` 등 컬럼 보강 |
| `005_hub_up_inquires_admin_fields.sql` | 문의 테이블에 관리자용 컬럼(`admin_note`, `admin_response` 등) 추가 |
| `005b_hubup_qna_roles.sql` | `roles`에 `hubup_qna_inquiries`, `hubup_qna_bus` 역할 행 추가 |
| `006_admin_menus.sql` | `admin_menus`, `admin_menu_roles` 테이블 DDL(없을 때) |
| `007_hub_up_inquiries_meta.sql` | 문의에 `page_url`, `ip_address`, `user_agent` 컬럼 추가 |
| `008_hub_up_bus_change_requests_columns.sql` | 버스 변경 요청 테이블 컬럼 확장(이메일·이름 등) |
| `009_hub_up_bus_change_requests_processed.sql` | 버스 요청에 `processed_at` 등 처리 시각 컬럼 |
| `010_hubup_area_allowed_roles.sql` | (구버전) 버스/문의 접근용 별도 테이블 — 신규는 `012` 권장 |
| `011_hub_web_hub_up_menu_reference.sql` | hub_worship 관리 UI용 `hub-up` 메뉴·역할 시드(참고) |
| `012_hubup_bus_admin.sql` | 허브업용 `admin_menus` 2행(버스·문의) + `admin_menu_roles` 시드 |
| `013_hubup_bus_page.sql` | `hub-up` / `hub-up/bus` 메뉴·역할, 레거시 버스 연결 복사 |
| `014_hubup_area_table_drop_optional.sql` | (선택) 구 `010` 테이블 삭제용 — 주석 해제 시에만 실행 |

---

## 1. 역할 이름 (`public.roles.name`)

| `name` | 용도 |
|--------|------|
| `hubup_qna_inquiries` | 문의 관리(레거시). `012`의 `admin_menus.menu_id = hubup_qna_inquiries` 와 연동. |
| `hub-up/bus` | 버스 관리(권장). `013_hubup_bus_page.sql` 에서 추가. |
| `hubup_qna_bus` | 버스(레거시). 앱·`005b`·`012` 에서 병행 인식. |

`profiles.status = '관리자'` 인 계정은 역할 없이도 허브업 관리 화면 전체에 들어갈 수 있습니다(앱 로직).

---

## 2. 메뉴 (`admin_menus`) — 문의

| `menu_id` | `path` |
|-----------|--------|
| `hubup_qna_inquiries` | `/admin/inquiries` |

시드: **`012_hubup_bus_admin.sql`** (버스·문의 메뉴 두 줄 + `admin_menu_roles` 시드).

---

## 3. 테이블 `public.hub_up_inquires`

| 파일 | 내용 |
|------|------|
| `000_create_hub_up_inquires.sql` | 테이블 생성(없을 때만). |
| `004_hub_up_inquires_columns.sql` | `subject`, `user_id` 등 컬럼 보강. |
| `005_hub_up_inquires_admin_fields.sql` | 관리자용 `admin_note`, `admin_response`, `response_at`, `resolved_at`. |
| `007_hub_up_inquiries_meta.sql` | `page_url`, `ip_address`, `user_agent`. |

테이블명이 **`hub_up_inquiries`(철자 다름)** 인 프로젝트는 앱 `.env`의 `HUB_UP_INQUIRIES_TABLE` 등으로 맞춥니다.

---

## 4. 권장 실행 순서 (문의만 맞출 때)

1. `000_create_hub_up_inquires.sql` — 테이블 없을 때  
2. `004_hub_up_inquires_columns.sql`  
3. `005_hub_up_inquires_admin_fields.sql`  
4. `007_hub_up_inquiries_meta.sql`  
5. `005b_hubup_qna_roles.sql` — 역할 `hubup_qna_inquiries` (및 레거시 버스 역할명)  
6. `006_admin_menus.sql` — `admin_menus` / `admin_menu_roles` DDL (없을 때)  
7. `012_hubup_bus_admin.sql` — 문의·버스 `admin_menus` 시드 + 역할 연결  
8. (선택) `013_hubup_bus_page.sql` — `hub-up` / `hub-up/bus` 계층  

**레거시:** `001_inquiries_user_id.sql` — 예전 `public.inquiries` 만 쓸 때.

**FAQ(문의 센터 본문):** `003_hub_up_faqs.sql` — 문의 테이블과 별개.

---

## 5. 구버전 정리

| 파일 | 설명 |
|------|------|
| `010_hubup_area_allowed_roles.sql` | 예전 전용 테이블. 신규는 `012` + `admin_menu_roles`. |
| `014_hubup_area_table_drop_optional.sql` | `010` 테이블 삭제용(주석 해제 시에만). |

---

## 6. 번호가 겹치지 않도록

- **`005`** … `005_hub_up_inquires_admin_fields.sql` (문의 테이블 컬럼)  
- **`005b`** … `005b_hubup_qna_roles.sql` (역할 삽입 — 예전 `005_hubup_qna_roles.sql` 과 동일 내용, 이름만 구분)
