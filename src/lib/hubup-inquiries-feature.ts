/**
 * Inquiries feature and /admin/inquiries. Off by default.
 * NEXT_PUBLIC_HUBUP_INQUIRIES_ENABLED=true|1 enables unless NEXT_PUBLIC_HUBUP_BUS_ONLY is on.
 */
import { HUBUP_BUS_ONLY_MODE } from '@src/lib/hubup-bus-only-mode';

const raw = process.env.NEXT_PUBLIC_HUBUP_INQUIRIES_ENABLED?.trim().toLowerCase();
const inquiriesFromEnv = raw === 'true' || raw === '1';
export const HUBUP_INQUIRIES_ENABLED = !HUBUP_BUS_ONLY_MODE && inquiriesFromEnv;
