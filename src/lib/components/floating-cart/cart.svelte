<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { ShoppingCartIcon, Cookie, TrashIcon, PartyPopper } from '@lucide/svelte';
	import CartItem from './cart-item.svelte';
	import * as Sheet from '$lib/components/ui/sheet/index.js';

	let {
		freeDeliveryThreshold,
		suggestionThreshold
	}: { freeDeliveryThreshold?: number | string; suggestionThreshold?: number | string } = $props();

	const cart = $derived(useCart());

	let open = $state(false);

	/** Format price to currency */
	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'ETB'
		}).format(price);
	};
</script>

<svelte:body style:overflow={cart.isOpen ? 'hidden' : 'auto'} />

<Sheet.Root bind:open>
	<Sheet.Trigger
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
	</Sheet.Trigger>
	<Sheet.Content>
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
					{#each cart.items as item (item)}
						<CartItem {item} />
					{/each}
				</div>
			</ScrollArea>

			<!-- Footer -->
			<div class="z-100 space-y-3 border-t border-border bg-muted p-4">
			   <div>
				 {#if cart.totalPrice > Number(suggestionThreshold)}
				     {#if cart.totalPrice < Number(freeDeliveryThreshold)}
					<p class="text-sm text-muted-foreground">
						You are {formatPrice(Number(freeDeliveryThreshold) - cart.totalPrice)} away from free delivery
					</p>
					{/if}
					{#if cart.totalPrice >= Number(freeDeliveryThreshold)}
					<p class="text-sm text-muted-foreground flex flex-row items-center gap-2">
						
						<span class="flex items-center gap-1">
							<PartyPopper class="size-5 text-amber-400 animate-bounce" />
							You have qualified for free delivery!
							<span class="text-lg animate-pulse">✨</span>
						</span>
					</p>
					{/if}
				 {/if}
			   </div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">Total ({cart.totalItems} items)</span>
					<span class="text-lg font-bold text-primary">{formatPrice(cart.totalPrice)}</span>
				</div>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" class="flex-1 gap-2" onclick={() => cart.clearCart()}>
						<TrashIcon class="size-4" />
						Clear
					</Button>
					<Button size="sm" onclick={() => (open = false)} class="flex-1" href="/checkout"
						>Checkout</Button
					>
				</div>
			</div>
		{:else}
			<div class=" p-8 text-center">
				<ShoppingCartIcon class="mx-auto mb-3 size-12 text-muted-foreground/50" />
				<p class="text-sm text-muted-foreground">Your cart is empty</p>
				<p class="mt-1 text-xs text-muted-foreground/70">Add some products to get started</p>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
