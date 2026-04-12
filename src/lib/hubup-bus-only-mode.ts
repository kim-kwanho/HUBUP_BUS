/**
 * Main app shows bus time change only (FAQ & inquiries off). See env below.
 * `NEXT_PUBLIC_HUBUP_BUS_ONLY=true` or `1`
 */
const raw = process.env.NEXT_PUBLIC_HUBUP_BUS_ONLY?.trim().toLowerCase();
export const HUBUP_BUS_ONLY_MODE = raw === 'true' || raw === '1';
