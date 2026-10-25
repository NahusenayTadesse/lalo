import { and, asc, desc, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	orderBatchAllocations,
	prices,
	productAdjustments,
	products,
	stockBatches
} from '$lib/server/db/schema';

/**
 * Every stock movement goes through here, so that three things always agree:
 * each batch's `quantityRemaining`, its variant's cached `quantity` (and the
 * product's, the sum of its variants), and the ledger in `product_adjustments`.
 *
 * Stock arrives only as a batch (`receiveStock`) and leaves earliest-expiry-first.
 * Batches with no expiry date go last, and among equals the oldest delivery goes
 * first. Sales never draw from an expired batch; damage and corrections can,
 * since writing off expired stock is exactly what they are for.
 */

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type AdjustmentType = 'receive' | 'sale' | 'return' | 'damage' | 'correction';

export class StockError extends Error {}

/** Today in Addis Ababa, as the `YYYY-MM-DD` that `expires_at` is compared against. */
function todayInAddis() {
	return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Earliest expiry first, undated last, then oldest delivery first. */
const fefoOrder = [
	sql`${stockBatches.expiresAt} IS NULL`,
	asc(stockBatches.expiresAt),
	asc(stockBatches.receivedAt),
	asc(stockBatches.id)
];

/** The reverse: the order units are given back to batches in. */
const latestExpiryFirst = [
	sql`${stockBatches.expiresAt} IS NULL DESC`,
	desc(stockBatches.expiresAt),
	desc(stockBatches.receivedAt),
	desc(stockBatches.id)
];

/**
 * A batch number for a delivery that came without one: `B` + the date + a
 * counter, e.g. `B260325-03`, unique within the variant.
 */
async function nextBatchNumber(tx: Tx, variantId: number) {
	const stamp = todayInAddis().slice(2).replaceAll('-', '');
	const prefix = `B${stamp}-`;
	const [{ n }] = await tx
		.select({ n: sql<number>`COUNT(*)`.mapWith(Number) })
		.from(stockBatches)
		.where(
			and(
				eq(stockBatches.variantId, variantId),
				sql`${stockBatches.batchNumber} LIKE ${prefix + '%'}`
			)
		);
	return `${prefix}${String(n + 1).padStart(2, '0')}`;
}

/** Locks and returns the variant, or throws if it doesn't exist. */
async function lockVariant(tx: Tx, variantId: number) {
	const [variant] = await tx
		.select({ id: prices.id, productId: prices.productId, amount: prices.amount })
		.from(prices)
		.where(eq(prices.id, variantId))
		.for('update');
	if (!variant || variant.productId === null)
		throw new StockError('That variant no longer exists.');
	return variant as { id: number; productId: number; amount: string };
}

/** Recomputes the cached stock of the given variants and of their products. */
async function syncTotals(tx: Tx, variantIds: number[]) {
	if (variantIds.length === 0) return new Map<number, number>();

	await tx
		.update(prices)
		.set({
			quantity: sql`(SELECT COALESCE(SUM(b.quantity_remaining), 0) FROM stock_batches b WHERE b.variant_id = prices.id)`
		})
		.where(inArray(prices.id, variantIds));

	const rows = await tx
		.select({ id: prices.id, productId: prices.productId, quantity: prices.quantity })
		.from(prices)
		.where(inArray(prices.id, variantIds));

	const productIds = [...new Set(rows.map((r) => r.productId).filter((id) => id !== null))];
	if (productIds.length > 0) {
		await tx
			.update(products)
			.set({
				quantity: sql`(SELECT COALESCE(SUM(p2.quantity), 0) FROM prices p2 WHERE p2.product_id = products.id)`
			})
			.where(inArray(products.id, productIds));
	}

	return new Map(rows.map((r) => [r.id, r.quantity]));
}

/** Recomputes a product's cached total, e.g. after one of its variants was deleted. */
export async function syncProductTotal(tx: Tx, productId: number) {
	await tx
		.update(products)
		.set({
			quantity: sql`(SELECT COALESCE(SUM(p2.quantity), 0) FROM prices p2 WHERE p2.product_id = products.id)`
		})
		.where(eq(products.id, productId));
}

type LedgerRow = {
	productId: number;
	variantId: number;
	batchId: number;
	adjustment: number;
	type: AdjustmentType;
	reason: string;
	orderId?: number;
	supplierId?: number | null;
	transactionId?: number;
};

/** Syncs the totals, then writes the ledger rows stamped with each variant's new balance. */
async function writeLedger(tx: Tx, rows: LedgerRow[], userId: string | undefined) {
	const balances = await syncTotals(tx, [...new Set(rows.map((r) => r.variantId))]);
	const changes = rows.filter((r) => r.adjustment !== 0);
	if (changes.length === 0) return;

	await tx.insert(productAdjustments).values(
		changes.map((r) => ({
			productsId: r.productId,
			variantId: r.variantId,
			batchId: r.batchId,
			orderId: r.orderId,
			type: r.type,
			supplierId: r.supplierId ?? undefined,
			adjustment: r.adjustment,
			balanceAfter: balances.get(r.variantId),
			reason: r.reason,
			transactionId: r.transactionId,
			createdBy: userId
		}))
	);
}

export type ReceiveInput = {
	variantId: number;
	quantity: number;
	batchNumber?: string | null;
	expiresAt?: string | null;
	manufacturedAt?: string | null;
	costPerUnit?: number | null;
	supplierId?: number | null;
	transactionId?: number;
	notes?: string | null;
	reason?: string;
};

/**
 * Books a delivery in as a new batch. A batch number that the variant already
 * has is refused rather than merged: two deliveries under one number usually
 * means a typo, and merging would blur their expiry dates and costs.
 */
export async function receiveStock(tx: Tx, input: ReceiveInput, userId: string | undefined) {
	const variant = await lockVariant(tx, input.variantId);
	const batchNumber = input.batchNumber?.trim() || (await nextBatchNumber(tx, variant.id));

	const [clash] = await tx
		.select({ id: stockBatches.id })
		.from(stockBatches)
		.where(and(eq(stockBatches.variantId, variant.id), eq(stockBatches.batchNumber, batchNumber)));
	if (clash) {
		throw new StockError(`Batch ${batchNumber} already exists for ${variant.amount}.`);
	}

	const [batch] = await tx
		.insert(stockBatches)
		.values({
			variantId: variant.id,
			batchNumber,
			quantityReceived: input.quantity,
			quantityRemaining: input.quantity,
			costPerUnit: input.costPerUnit != null ? input.costPerUnit.toFixed(2) : null,
			supplierId: input.supplierId || null,
			manufacturedAt: input.manufacturedAt || null,
			expiresAt: input.expiresAt || null,
			receivedAt: new Date(),
			transactionId: input.transactionId,
			notes: input.notes || null,
			createdBy: userId
		})
		.$returningId();

	await writeLedger(
		tx,
		[
			{
				productId: variant.productId,
				variantId: variant.id,
				batchId: batch.id,
				adjustment: input.quantity,
				type: 'receive',
				reason: input.reason || `Received batch ${batchNumber}`,
				supplierId: input.supplierId,
				transactionId: input.transactionId
			}
		],
		userId
	);

	return { batchId: batch.id, batchNumber };
}

type Draw = { batchId: number; quantity: number };

/**
 * Picks `quantity` units from a variant's batches, earliest expiry first, and
 * takes them out. Throws, naming what is available, if there isn't enough.
 */
async function drawFefo(
	tx: Tx,
	variant: { id: number; amount: string },
	quantity: number,
	{ allowExpired }: { allowExpired: boolean }
): Promise<Draw[]> {
	const today = todayInAddis();
	const batches = await tx
		.select({ id: stockBatches.id, remaining: stockBatches.quantityRemaining })
		.from(stockBatches)
		.where(
			and(
				eq(stockBatches.variantId, variant.id),
				gt(stockBatches.quantityRemaining, 0),
				allowExpired
					? undefined
					: or(isNull(stockBatches.expiresAt), sql`${stockBatches.expiresAt} >= ${today}`)
			)
		)
		.orderBy(...fefoOrder)
		.for('update');

	const available = batches.reduce((sum, b) => sum + b.remaining, 0);
	if (available < quantity) {
		throw new StockError(
			`Not enough ${variant.amount}: ${quantity} more needed, only ${available}${allowExpired ? '' : ' unexpired'} in stock.`
		);
	}

	const draws: Draw[] = [];
	let left = quantity;
	for (const batch of batches) {
		if (left === 0) break;
		const take = Math.min(batch.remaining, left);
		draws.push({ batchId: batch.id, quantity: take });
		left -= take;
	}

	for (const draw of draws) {
		await tx
			.update(stockBatches)
			.set({ quantityRemaining: sql`${stockBatches.quantityRemaining} - ${draw.quantity}` })
			.where(eq(stockBatches.id, draw.batchId));
	}
	return draws;
}

export type RemoveInput = {
	variantId: number;
	quantity: number;
	/** Take from this batch only. Omitted, the units come out earliest-expiry-first. */
	batchId?: number | null;
	type: 'damage' | 'correction';
	reason: string;
	transactionId?: number;
};

/** Takes stock out for damage or a correction. Returns the batches it came from. */
export async function removeStock(tx: Tx, input: RemoveInput, userId: string | undefined) {
	const variant = await lockVariant(tx, input.variantId);
	let draws: Draw[];

	if (input.batchId) {
		const [batch] = await tx
			.select({ remaining: stockBatches.quantityRemaining, batchNumber: stockBatches.batchNumber })
			.from(stockBatches)
			.where(and(eq(stockBatches.id, input.batchId), eq(stockBatches.variantId, variant.id)))
			.for('update');
		if (!batch) throw new StockError('That batch does not belong to this variant.');
		if (batch.remaining < input.quantity) {
			throw new StockError(
				`Batch ${batch.batchNumber} has only ${batch.remaining} left, ${input.quantity} requested.`
			);
		}
		await tx
			.update(stockBatches)
			.set({ quantityRemaining: sql`${stockBatches.quantityRemaining} - ${input.quantity}` })
			.where(eq(stockBatches.id, input.batchId));
		draws = [{ batchId: input.batchId, quantity: input.quantity }];
	} else {
		draws = await drawFefo(tx, variant, input.quantity, { allowExpired: true });
	}

	await writeLedger(
		tx,
		draws.map((d) => ({
			productId: variant.productId,
			variantId: variant.id,
			batchId: d.batchId,
			adjustment: -d.quantity,
			type: input.type,
			reason: input.reason,
			transactionId: input.transactionId
		})),
		userId
	);
	return draws;
}

/**
 * Makes the stock an order holds match `target` — what it should hold now,
 * per variant: its items if it is delivered, nothing otherwise.
 *
 * Works per variant on the difference, so an edit that leaves a variant's count
 * alone moves none of its stock and doesn't reshuffle its batches. A variant
 * held more of is drawn earliest-expiry-first; one held less of is given back
 * to its batches latest-expiry-first, so the units nearest expiry stay sold.
 */
export async function syncOrderStock(
	tx: Tx,
	orderId: number,
	target: Map<number, number>,
	{ reason, transactionId }: { reason: string; transactionId?: number },
	userId: string | undefined
) {
	const held = await tx
		.select({
			id: orderBatchAllocations.id,
			variantId: orderBatchAllocations.variantId,
			batchId: orderBatchAllocations.batchId,
			quantity: orderBatchAllocations.quantity
		})
		.from(orderBatchAllocations)
		.innerJoin(stockBatches, eq(stockBatches.id, orderBatchAllocations.batchId))
		.where(eq(orderBatchAllocations.orderId, orderId))
		.orderBy(...latestExpiryFirst)
		.for('update');

	const heldByVariant = new Map<number, typeof held>();
	for (const row of held) {
		heldByVariant.set(row.variantId, [...(heldByVariant.get(row.variantId) ?? []), row]);
	}

	const ledger: LedgerRow[] = [];
	const variantIds = [...new Set([...heldByVariant.keys(), ...target.keys()])].sort(
		(a, b) => a - b
	);

	for (const variantId of variantIds) {
		const rows = heldByVariant.get(variantId) ?? [];
		const before = rows.reduce((sum, r) => sum + r.quantity, 0);
		const after = target.get(variantId) ?? 0;
		if (before === after) continue;

		if (after > before) {
			const variant = await lockVariant(tx, variantId);
			const draws = await drawFefo(tx, variant, after - before, { allowExpired: false });
			await tx
				.insert(orderBatchAllocations)
				.values(
					draws.map((d) => ({ orderId, variantId, batchId: d.batchId, quantity: d.quantity }))
				);
			for (const d of draws) {
				ledger.push({
					productId: variant.productId,
					variantId,
					batchId: d.batchId,
					adjustment: -d.quantity,
					type: 'sale',
					reason,
					orderId,
					transactionId
				});
			}
			continue;
		}

		// Held less of: return units, latest-expiry batch first (`rows` is in that order).
		const [variant] = await tx
			.select({ productId: prices.productId })
			.from(prices)
			.where(eq(prices.id, variantId));
		let toReturn = before - after;
		for (const row of rows) {
			if (toReturn === 0) break;
			const give = Math.min(row.quantity, toReturn);
			toReturn -= give;

			await tx
				.update(stockBatches)
				.set({ quantityRemaining: sql`${stockBatches.quantityRemaining} + ${give}` })
				.where(eq(stockBatches.id, row.batchId));
			if (give === row.quantity) {
				await tx.delete(orderBatchAllocations).where(eq(orderBatchAllocations.id, row.id));
			} else {
				await tx
					.update(orderBatchAllocations)
					.set({ quantity: row.quantity - give })
					.where(eq(orderBatchAllocations.id, row.id));
			}
			if (variant?.productId != null) {
				ledger.push({
					productId: variant.productId,
					variantId,
					batchId: row.batchId,
					adjustment: give,
					type: 'return',
					reason,
					orderId,
					transactionId
				});
			}
		}
	}

	await writeLedger(tx, ledger, userId);
}

/** Totals order items into the per-variant map `syncOrderStock` takes. */
export function stockTarget(items: Array<{ priceId: number | null; quantity: number }>) {
	const target = new Map<number, number>();
	for (const item of items) {
		if (item.priceId === null) continue;
		target.set(item.priceId, (target.get(item.priceId) ?? 0) + item.quantity);
	}
	return target;
}
