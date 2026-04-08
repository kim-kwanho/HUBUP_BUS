/** hub_web `admin_menus.menu_id` — HUBUP 앱에서 쓰는 행 (전체 메뉴 목록을 가져오지 않음) */

/** hub_web 참고용·그룹 메뉴 (011_hub_web_hub_up_menu_reference.sql) */
export const HUBUP_ADMIN_MENU_ID_HUB_ROOT = 'hub-up';

/** 버스 변경 요청 관리 — 상위 hub-up 아래 하위 권한(메뉴) */
export const HUBUP_ADMIN_MENU_ID_BUS = 'hub-up/bus';

/** 이전 시드명 — DB에 남아 있으면 접근 판정·마이그레이션용으로 병행 인식 */
export const HUBUP_ADMIN_MENU_ID_BUS_LEGACY = 'hubup_qna_bus';

export const HUBUP_BUS_MENU_IDS = [HUBUP_ADMIN_MENU_ID_BUS, HUBUP_ADMIN_MENU_ID_BUS_LEGACY] as const;

export const HUBUP_ADMIN_MENU_ID_INQUIRIES = 'hubup_qna_inquiries';
