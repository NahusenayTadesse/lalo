<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import { MinusIcon, PlusIcon, TrashIcon } from '@lucide/svelte';
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

	/** Decrease quantity */
	const decreaseQuantity = () => {
		cart.updateQuantity(item.productId, item.quantity - 1);
	};

	/** Increase quantity */
	const increaseQuantity = () => {
		cart.updateQuantity(item.productId, item.quantity + 1);
	};

	/** Remove item */
	const removeItem = () => {
		cart.removeItem(item.productId);
	};
</script>

<div class="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/50 p-3">
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0 flex-1">
			<h4 class="truncate text-sm font-medium">{item.productName}</h4>
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
		<span class="text-sm font-semibold text-primary">{formatPrice(item.price)}</span>
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
