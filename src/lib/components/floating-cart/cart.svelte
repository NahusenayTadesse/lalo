<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { ShoppingCartIcon, TrashIcon } from '@lucide/svelte';
	import CartItem from './cart-item.svelte';
	import * as Popover from '$lib/components/ui/sheet/index.js';

	const cart = useCart();

	/** Format price to currency */
	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	};
</script>

<svelte:body style:overflow={cart.isOpen ? 'hidden' : 'auto'} />

<Popover.Root>
	<Popover.Trigger
		class="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
	>
		<div class="relative">
			<ShoppingCartIcon class="size-6" />
			{#if cart.totalItems > 0}
				<Badge
					variant="destructive"
					class="absolute -top-5 -right-5 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[12px]"
				>
					{cart.totalItems}
				</Badge>
			{/if}
		</div>
	</Popover.Trigger>
	<Popover.Content>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-border bg-muted/30 p-4">
			<div class="flex items-center gap-2">
				<ShoppingCartIcon class="size-5 text-primary" />
				<h3 class="font-semibold">Your Cart</h3>
			</div>
		</div>

		<!-- Cart Items -->
		{#if cart.items.length > 0}
			<ScrollArea class="overscroll-behavior-contain min-h-0 flex-1">
				<div class="flex flex-col gap-2 p-3">
					{#each cart.items as item (item.productId)}
						<CartItem {item} />
					{/each}
				</div>
			</ScrollArea>

			<!-- Footer -->
			<div class="z-100 space-y-3 border-t border-border bg-muted p-4">
				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">Total ({cart.totalItems} items)</span>
					<span class="text-lg font-bold text-primary">{formatPrice(cart.totalPrice)}</span>
				</div>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" class="flex-1 gap-2" onclick={() => cart.clearCart()}>
						<TrashIcon class="size-4" />
						Clear
					</Button>
					<Button size="sm" class="flex-1" href="/checkout">Checkout</Button>
				</div>
			</div>
		{:else}
			<div class=" p-8 text-center">
				<ShoppingCartIcon class="mx-auto mb-3 size-12 text-muted-foreground/50" />
				<p class="text-sm text-muted-foreground">Your cart is empty</p>
				<p class="mt-1 text-xs text-muted-foreground/70">Add some products to get started</p>
			</div>
		{/if}
		<!-- <Button
			size="icon"
			class="shadow-lg-lg shadow-lg-primary/30 hover:shadow-lg-xl hover:shadow-lg-primary/40 z-100 size-14 rounded-full transition-all duration-200 hover:scale-105"
			onclick={() => cart.toggle()}
		>
			<ShoppingCartIcon class="size-6" />
			{#if cart.totalItems > 0}
				<span
					transition:fade={{ duration: 150 }}
					class="text-destructive-foreground absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-destructive text-xs font-bold"
				>
					{cart.totalItems > 99 ? '99+' : cart.totalItems}
				</span>
			{/if}
		</Button> -->
	</Popover.Content>
</Popover.Root>
