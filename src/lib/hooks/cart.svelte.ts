import { setContext, getContext } from 'svelte';

export type CartItem = {
	productId: number;
	productName: string;
	amount: number | string; // e.g., "6-pack", "12-pack", or 500
	price: number;
	quantity: number;
};

export interface ProductPrice {
	amount: string | number; // e.g., "10 Pieces"
	price: string | number; // e.g., "ETB 500"
}

const CART_STORAGE_KEY = 'lalo_bakery';

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
			if (stored) {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed)) {
					this.items = parsed;
				}
			}
		} catch (e) {
			console.error('Failed to load cart from localStorage:', e);
		}
	};

	private saveToStorage = () => {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
		} catch (e) {
			console.error('Failed to save cart to localStorage:', e);
		}
	};

	toggle = () => (this.isOpen = !this.isOpen);
	open = () => (this.isOpen = true);
	close = () => (this.isOpen = false);

	/** * Add item to cart
	 * Now checks BOTH productId and amount to determine if it's a new line item
	 */
	addItem = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
		const existingIndex = this.items.findIndex(
			(i) => i.productId === item.productId && i.amount === item.amount
		);

		if (existingIndex >= 0) {
			this.items[existingIndex].quantity += quantity;
		} else {
			this.items.push({ ...item, quantity });
		}
	};

	/** Remove specific variation from cart */
	removeItem = (productId: number, amount: number | string) => {
		this.items = this.items.filter(
			(item) => !(item.productId === productId && item.amount === amount)
		);
	};

	/** Update quantity for a specific variation */
	updateQuantity = (productId: number, amount: number | string, quantity: number) => {
		if (quantity <= 0) {
			this.removeItem(productId, amount);
			return;
		}

		const index = this.items.findIndex((i) => i.productId === productId && i.amount === amount);

		if (index >= 0) {
			this.items[index].quantity = quantity;
		}
	};

	clearCart = () => {
		this.items = [];
	};
}

/** Context API Helpers */
export const setCart = () => setContext('cartState', new UseCart());
export const useCart = () => getContext<UseCart>('cartState');
