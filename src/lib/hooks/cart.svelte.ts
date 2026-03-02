import { setContext, getContext } from 'svelte';
export type CartItem = {
	productId: number;
	productName: string;
	price: number;
	quantity: number;
};

/** Cart state type */
export type CartState = {
	items: CartItem[];
	isOpen: boolean;
};

const CART_STORAGE_KEY = 'svelte0-cart';

/** Cart state class-based management with localStorage persistence */
class UseCart {
	items: CartItem[] = $state([]);
	isOpen: boolean = $state(false);

	/** Total items count */
	totalItems = $derived(this.items.reduce((sum, item) => sum + item.quantity, 0));

	/** Total price */
	totalPrice = $derived(this.items.reduce((sum, item) => sum + item.price * item.quantity, 0));

	constructor() {
		// Load cart from localStorage on initialization

		this.loadFromStorage();

		// Save to localStorage whenever items change

		$effect(() => {
			this.saveToStorage();
		});
	}

	/** Load cart from localStorage */
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

	/** Save cart to localStorage */
	private saveToStorage = () => {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
		} catch (e) {
			console.error('Failed to save cart to localStorage:', e);
		}
	};

	/** Toggle cart open/close */
	toggle = () => {
		this.isOpen = !this.isOpen;
	};

	/** Open cart */
	open = () => {
		this.isOpen = true;
	};

	/** Close cart */
	close = () => {
		this.isOpen = false;
	};

	/** Add item to cart */
	addItem = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
		const existingIndex = this.items.findIndex((i) => i.productId === item.productId);
		if (existingIndex >= 0) {
			this.items[existingIndex].quantity += quantity;
		} else {
			this.items = [...this.items, { ...item, quantity }];
		}
	};

	/** Remove item from cart */
	removeItem = (productId: number) => {
		this.items = this.items.filter((item) => item.productId !== productId);
	};

	/** Update item quantity */
	updateQuantity = (productId: number, quantity: number) => {
		if (quantity <= 0) {
			this.removeItem(productId);
			return;
		}
		const index = this.items.findIndex((i) => i.productId === productId);
		if (index >= 0) {
			this.items[index].quantity = quantity;
		}
	};

	/** Clear all items from cart */
	clearCart = () => {
		this.items = [];
	};
}

/** Set cart state */
export const setCart = () => setContext('cartState', new UseCart());

/** Use cart state */
export const useCart = () => getContext<ReturnType<typeof setCart>>('cartState');
