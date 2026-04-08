import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
export const supabaseAdmin = createClient(
  supabaseUrl!,
  supabaseServiceRoleKey || supabaseAnonKey!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' }
  }
);

/**
 * hub_web 기본값: `hub_up_inquires`
 * `hub_up_inquiries`(철자 다름) 등이면 `.env`의 `HUB_UP_INQUIRIES_TABLE`로 지정
 */
export const HUB_UP_INQUIRIES_TABLE = process.env.HUB_UP_INQUIRIES_TABLE?.trim() || 'hub_up_inquires';

/** PK 컬럼명 (`id`가 아니면 지정 — 목록에 ID가 0으로만 보이면 이 값 확인) */
export const HUB_UP_INQUIRIES_ID_COLUMN =
  process.env.HUB_UP_INQUIRIES_ID_COLUMN?.trim() || 'id';

/** 질문 본문 DB 컬럼명 (`question`만 있으면 `question`) */
export const HUB_UP_INQUIRIES_MESSAGE_COLUMN =
  process.env.HUB_UP_INQUIRIES_MESSAGE_COLUMN?.trim() || 'message';

/** 신규 행 `status` 기본값 — hub_up_inquiries DDL 은 `pending` */
export const HUB_UP_INQUIRIES_INITIAL_STATUS =
  process.env.HUB_UP_INQUIRIES_INITIAL_STATUS?.trim() || 'pending';

/** 목록 정렬 컬럼 (`created_at` 없으면 `id` 등) */
export const HUB_UP_INQUIRIES_ORDER_COLUMN =
  process.env.HUB_UP_INQUIRIES_ORDER_COLUMN?.trim() || 'created_at';

function normalizeInquiryIdValue(raw: unknown): number | string {
  if (raw == null) return 0;
  if (typeof raw === 'bigint') {
    const n = Number(raw);
    return Number.isSafeInteger(n) ? n : String(raw);
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return 0;
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    return t;
  }
  return 0;
}

/**
 * URL `[id]` 또는 PUT body의 id. 정수 PK는 숫자, UUID는 전체 문자열을 유지합니다.
 * `parseInt`/부분 파싱만 쓰면 UUID가 잘려 잘못된 행이 갱신됩니다.
 */
export function parseInquiryIdParam(raw: string | string[] | undefined): number | string | null {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s == null) return null;
  const str = String(s).trim();
  if (!str) return null;
  if (/^\d+$/.test(str)) {
    const n = parseInt(str, 10);
    return Number.isFinite(n) ? n : null;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  return str.length > 0 ? str : null;
}

export function parseInquiryIdFromBody(id: unknown): number | string | null {
  if (id == null) return null;
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  if (typeof id === 'string') return parseInquiryIdParam(id);
  return null;
}

/** 숫자 PK가 0이거나 비어 있으면 PATCH가 잘못된 행을 건드립니다. */
export function isInvalidInquiryIdForApi(id: number | string): boolean {
  if (typeof id === 'number') return !Number.isFinite(id) || id === 0;
  const s = String(id).trim();
  if (!s) return true;
  if (/^\d+$/.test(s)) return parseInt(s, 10) === 0;
  return false;
}

/** hub_web `pending`|`answered` 및 레거시 status를 관리 UI용으로 정리 */
function mapInquiryStatusForDisplay(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s === 'new' || s === 'pending') return 'pending';
  if (s === 'answered') return 'answered';
  if (['in_progress', 'resolved', 'closed'].includes(s)) return 'answered';
  return raw.trim() || 'pending';
}

/** API·관리자 응답은 항상 `message` 필드로 통일 */
export function normalizeInquiryRow(row: Record<string, unknown>): InquiryTable {
  const msgCol = HUB_UP_INQUIRIES_MESSAGE_COLUMN;
  const idCol = HUB_UP_INQUIRIES_ID_COLUMN;
  const rawPk =
    row[idCol] !== undefined && row[idCol] !== null ? row[idCol] : row.id;
  const message =
    typeof row.message === 'string'
      ? row.message
      : typeof row[msgCol] === 'string'
        ? (row[msgCol] as string)
        : typeof row.question === 'string'
          ? row.question
          : '';

  const answeredAt =
    row.answered_at != null ? String(row.answered_at) : row.response_at != null ? String(row.response_at) : undefined;

  return {
    id: normalizeInquiryIdValue(rawPk),
    name: (row.name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    subject: (row.subject as string | null) ?? null,
    message,
    status: mapInquiryStatusForDisplay(String(row.status ?? '')),
    page_url: row.page_url != null ? String(row.page_url) : null,
    ip_address: row.ip_address != null ? String(row.ip_address) : null,
    user_agent: row.user_agent != null ? String(row.user_agent) : null,
    user_id: (row.user_id as string | null) ?? null,
    admin_note: (row.admin_note as string | null) ?? null,
    admin_response: (row.admin_response as string | null) ?? (row.answer as string | null) ?? null,
    response_at: answeredAt,
    resolved_at: row.resolved_at != null ? String(row.resolved_at) : undefined,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? row.answered_at ?? row.created_at ?? '')
  };
}

export interface InquiryTable {
  /** DB PK — bigint/serial은 number, uuid는 string */
  id: number | string;
  name: string | null;
  email: string | null;
  phone: string | null;
  /** 질문하기 카테고리 — DB 컬럼명 `subject` (`004_hub_up_inquires_columns.sql`) */
  subject: string | null;
  message: string;
  status: string;
  /** `007_hub_up_inquiries_meta.sql` — 문의 제출 페이지 경로 */
  page_url?: string | null;
  /** 접수 시 클라이언트 IP */
  ip_address?: string | null;
  /** 접수 시 User-Agent */
  user_agent?: string | null;
  /** hub_web / hubup_quest SSO 사용자 ID — `subject`와 같이 `004` 스크립트 컬럼 */
  user_id?: string | null;
  /** `005_hub_up_inquires_admin_fields.sql` 적용 후 */
  admin_note?: string | null;
  admin_response?: string | null;
  response_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** hub_web `hub_up_registrations` — 버스 변경에 필요한 필드만 */
export interface HubUpRegistrationBusFields {
  departure_slot: string | null;
  return_slot: string | null;
  /** hub_web 스키마에 따라 없을 수 있음 — 없으면 요청 시 `-` 로 저장 */
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  group_name?: string | null;
}

/** hub_web `hub_up_departure_slots` / `hub_up_return_slots` */
export interface HubUpSlotRow {
  value: string;
  label: string;
}

/** `003_hub_up_faqs.sql` */
export interface HubUpFaqRow {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/** `002_hub_up_bus_change_requests.sql` */
export interface HubUpBusChangeRequestRow {
  id: string;
  user_id: string;
  /** hub_web과 동일 — 신청자 표시명 */
  name: string;
  phone: string;
  /** 소그룹/조 등 — hub_web 스키마 */
  group_name: string;
  email: string;
  requested_departure_slot: string | null;
  requested_return_slot: string | null;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
}

