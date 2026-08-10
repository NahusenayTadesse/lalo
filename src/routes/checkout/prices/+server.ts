import { json, error } from '@sveltejs/kit';
import { inArray } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { prices } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

/** Upper bound on how many cart lines will be priced in one request. */
const MAX_IDS = 100;

/**
 * Current catalogue price for each requested variant.
 *
 * The cart lives in `localStorage` with the price baked in at the moment the
 * item was added, while the checkout action re-prices everything from the
 * database. Without a reconciliation step the two disagree silently: the page
 * quotes what the customer saw a week ago and the order records today's price.
 * The checkout page calls this before it will let anyone submit.
 *
 * Variants that no longer exist are simply absent from the response, which is
 * how the caller detects a discontinued item.
 *
 * No authorisation: this returns catalogue prices, which are already public on
 * every product page.
 */
export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Expected a JSON body');
	}

	const requested = (body as { priceIds?: unknown } | null)?.priceIds;
	if (!Array.isArray(requested)) {
		error(400, '`priceIds` must be an array');
	}

	const priceIds = [...new Set(requested.map(Number).filter(Number.isInteger))].slice(0, MAX_IDS);
	if (!priceIds.length) return json([]);

	const rows = await db
		.select({ id: prices.id, price: prices.price, amount: prices.amount })
		.from(prices)
		.where(inArray(prices.id, priceIds));

	return json(rows);
};
