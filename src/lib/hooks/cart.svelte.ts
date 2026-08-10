import { setContext, getContext } from 'svelte';

export type CartItem = {
	/** `prices.id` — the variant's primary key, and this line's identity. */
	priceId: number;
	productId: number;
	productName: string;
	/** `prices.amount` — a varchar, e.g. "1kg" or "10 Pieces". */
	amount: string;
	price: number;
	quantity: number;
};

export interface ProductPrice {
	/** `prices.id` */
	id: number;
	amount: string; // e.g., "10 Pieces"
	price: string | number; // decimal column: a string over the wire
}

const CART_STORAGE_KEY = 'lalo_bakery';

/**
 * Bumped when the stored shape changes. Carts written by an older version are
 * discarded rather than migrated — see `loadFromStorage`.
 */
const CART_STORAGE_VERSION = 2;

/**
 * Stable identity for a cart line, for use as an `{#each}` key.
 *
 * A cart holds one line per *variant*, so keying on `productId` alone yields
 * duplicate keys the moment someone adds two packages of the same product —
 * which is a fatal error in Svelte, not a warning.
 */
export const cartKey = (item: CartItem) => String(item.priceId);

class UseCart {
	items: CartItem[] = $state([]);
	isOpen: boolean = $state(false);

	/** Total items count */
	totalItems = $derived(this.items.reduce((sum, item) => sum + item.quantity, 0));

	/** Total price */
	totalPrice = $derived(this.items.reduce((sum, item) => sum + item.price * item.quantity, 0));

	constructor() {
		this.loadFromStorage();

		$effect(() => {
			this.saveToStorage();
		});
	}

	private loadFromStorage = () => {
		if (typeof window === 'undefined') return;
		try {
			const stored = localStorage.getItem(CART_STORAGE_KEY);
			if (!stored) return;

			const parsed = JSON.parse(stored);

			// Version 1 stored a bare array whose lines were identified by
			// `(productId, amount)`. That pair is not unique — two variants of one
			// product can share an `amount` — so such a line cannot be priced
			// reliably. Discard those carts rather than guess at a variant.
			if (!parsed || parsed.version !== CART_STORAGE_VERSION || !Array.isArray(parsed.items)) {
				localStorage.removeItem(CART_STORAGE_KEY);
				return;
			}

			this.items = parsed.items.filter(isValidCartItem);
		} catch (e) {
			console.error('Failed to load cart from localStorage:', e);
		}
	};

	private saveToStorage = () => {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(
				CART_STORAGE_KEY,
				JSON.stringify({ version: CART_STORAGE_VERSION, items: this.items })
			);
		} catch (e) {
			console.error('Failed to save cart to localStorage:', e);
		}
	};

	toggle = () => (this.isOpen = !this.isOpen);
	open = () => (this.isOpen = true);
	close = () => (this.isOpen = false);

	/**
	 * Add a variant to the cart.
	 *
	 * Identity is `priceId` — the variant's primary key. Matching on
	 * `(productId, amount)` used to merge genuinely different packages into one
	 * line, because two variants of the same product can carry the same `amount`.
	 */
	addItem = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
		const qty = normalizeQuantity(quantity);
		const existingIndex = this.items.findIndex((i) => i.priceId === item.priceId);

		if (existingIndex >= 0) {
			this.items[existingIndex].quantity += qty;
		} else {
			this.items.push({ ...item, quantity: qty });
		}
	};

	/** Remove a variant from the cart. */
	removeItem = (priceId: number) => {
		this.items = this.items.filter((item) => item.priceId !== priceId);
	};

	/**
	 * Correct a line to the catalogue's current price and label.
	 *
	 * Used by the checkout page's reconciliation step: the stored price is a
	 * snapshot from whenever the item was added, and the server prices the order
	 * from the database, so the two have to be brought together *before* the
	 * customer is shown a total.
	 */
	syncVariant = (priceId: number, price: number, amount: string) => {
		const index = this.items.findIndex((i) => i.priceId === priceId);
		if (index >= 0) {
			this.items[index].price = price;
			this.items[index].amount = amount;
		}
	};

	/** Set the quantity of a variant already in the cart. */
	updateQuantity = (priceId: number, quantity: number) => {
		if (!Number.isFinite(quantity) || quantity <= 0) {
			this.removeItem(priceId);
			return;
		}

		const index = this.items.findIndex((i) => i.priceId === priceId);

		if (index >= 0) {
			this.items[index].quantity = normalizeQuantity(quantity);
		}
	};

	clearCart = () => {
		this.items = [];
	};
}

/** A whole number of at least 1, whatever the caller passed in. */
function normalizeQuantity(quantity: unknown): number {
	const n = Math.floor(Number(quantity));
	return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Guards against hand-edited or half-written `localStorage` entries. */
function isValidCartItem(item: unknown): item is CartItem {
	if (!item || typeof item !== 'object') return false;
	const candidate = item as Partial<CartItem>;
	return (
		Number.isInteger(candidate.priceId) &&
		Number.isInteger(candidate.productId) &&
		Number.isFinite(candidate.price) &&
		Number.isFinite(candidate.quantity) &&
		(candidate.quantity as number) > 0
	);
}

/** Context API Helpers */
export const setCart = () => setContext('cartState', new UseCart());
export const useCart = () => getContext<UseCart>('cartState');
