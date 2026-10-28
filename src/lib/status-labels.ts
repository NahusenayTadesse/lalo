import { m } from '$lib/paraglide/messages.js';

/**
 * Display labels for the order and payment status enums. The raw values stay
 * what the database and the comparisons use; only what the customer reads is
 * translated. Unknown values fall through as-is rather than showing nothing.
 */
const orderStatus: Record<string, () => string> = {
	pending: m.status_order_pending,
	delivered: m.status_order_delivered,
	cancelled: m.status_order_cancelled
};

const paymentStatus: Record<string, () => string> = {
	pending: m.status_payment_pending,
	paid: m.status_payment_paid,
	unpaid: m.status_payment_unpaid,
	refunded: m.status_payment_refunded,
	partially_paid: m.status_payment_partially_paid,
	partially_refunded: m.status_payment_partially_refunded,
	overpaid: m.status_payment_overpaid,
	disputed: m.status_payment_disputed
};

export const orderStatusLabel = (status: string | null | undefined) =>
	status ? (orderStatus[status.toLowerCase()]?.() ?? status) : '';

export const paymentStatusLabel = (status: string | null | undefined) =>
	status ? (paymentStatus[status.toLowerCase()]?.() ?? status) : '';
