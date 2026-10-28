import { localToday } from '@nahu/admin-kit/time';

/**
 * Food goes off, so every batch of stock carries an expiry date. These are the
 * rules shared by the receive form (browser) and `$lib/server/inventory`.
 */

/** Days ahead that a batch counts as expiring soon: on the dashboard, the product page, deliveries. */
export const EXPIRY_WARNING_DAYS = 7;

/** Today in Addis Ababa as `YYYY-MM-DD`, which `expires_at` is compared against. */
export const today = () => localToday();

/** Expired means the date has passed: stock that expires today can still be sold today. */
export const isExpired = (expiresAt: string | null | undefined) =>
	Boolean(expiresAt) && (expiresAt as string) < today();
