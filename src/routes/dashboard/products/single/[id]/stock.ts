/** What the stock dialogs need to know about a product's variants and batches. */
export type StockVariantOption = { id: number; amount: string; quantity: number };

export type StockBatchOption = {
	id: number;
	variantId: number;
	batchNumber: string;
	quantityRemaining: number;
	expiresAt: string | null;
};

export function variantItems(variants: StockVariantOption[]) {
	return variants.map((v) => ({ value: v.id, name: `${v.amount} — ${v.quantity} in stock` }));
}

/**
 * The batch picker for one variant: its non-empty batches, after an "any" choice
 * (value 0) that leaves the pick to earliest-expiry-first.
 */
export function batchItems(batches: StockBatchOption[], variantId: number | undefined) {
	return [
		{ value: 0, name: 'Earliest expiry first' },
		...batches
			.filter((b) => b.variantId === Number(variantId) && b.quantityRemaining > 0)
			.map((b) => ({
				value: b.id,
				name: `${b.batchNumber} — ${b.quantityRemaining} left${b.expiresAt ? `, expires ${b.expiresAt}` : ''}`
			}))
	];
}
