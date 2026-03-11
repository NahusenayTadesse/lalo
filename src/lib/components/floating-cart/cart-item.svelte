<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import { MinusIcon, PlusIcon, TrashIcon } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge'; // Optional: if you have a badge component
	import type { CartItem } from '$lib/hooks/cart.svelte.js';

	const { item }: { item: CartItem } = $props();
	const cart = useCart();

	/** Format price to currency */
	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	};

	/** Decrease quantity - Now passing amount */
	const decreaseQuantity = () => {
		cart.updateQuantity(item.productId, item.amount, item.quantity - 1);
	};

	/** Increase quantity - Fixed: Now passing amount and correct current quantity */
	const increaseQuantity = () => {
		cart.updateQuantity(item.productId, item.amount, item.quantity + 1);
	};

	/** Remove item - Now passing amount */
	const removeItem = () => {
		cart.removeItem(item.productId, item.amount);
	};
</script>

<div class="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/50 p-3">
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<h4 class="truncate text-sm font-medium">{item.productName}</h4>
				<span
					class="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/20 ring-inset"
				>
					{item.amount}
				</span>
			</div>
			<p class="text-xs text-muted-foreground">ID: {item.productId}</p>
		</div>
		<Button
			size="icon"
			variant="ghost"
			class="size-7 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
			onclick={removeItem}
		>
			<TrashIcon class="size-4" />
		</Button>
	</div>
	<div class="flex items-center justify-between gap-2">
		<div class="flex flex-col">
			<span class="text-xs text-muted-foreground">Price per unit</span>
			<span class="text-sm font-semibold text-primary">{formatPrice(item.price)}</span>
		</div>
		<div class="flex items-center gap-1">
			<Button size="icon" variant="outline" class="size-7" onclick={decreaseQuantity}>
				<MinusIcon class="size-3" />
			</Button>
			<span class="w-8 text-center text-sm font-medium">{item.quantity}</span>
			<Button size="icon" variant="outline" class="size-7" onclick={increaseQuantity}>
				<PlusIcon class="size-3" />
			</Button>
		</div>
	</div>
	<div class="flex items-center justify-between border-t border-border/50 pt-1">
		<span class="text-xs text-muted-foreground">Subtotal</span>
		<span class="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</span>
	</div>
</div>
