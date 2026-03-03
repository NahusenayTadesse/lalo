<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { PlusIcon, CheckIcon, ShoppingCartIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	type Props = {
		productId: number;
		productName: string;
		price: number | string;
		image?: string;
		category?: string;
	};

	let { productId, productName, price, image, category }: Props = $props();
	const cart = useCart();

	let justAdded = $state(false);

	// Reusable formatter (performance friendly)
	const formatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'ETB'
	});

	// Derived values for clarity
	const numericPrice = $derived(typeof price === 'string' ? parseFloat(price) : price);
	const formattedPrice = $derived(formatter.format(numericPrice));
	const quantityInCart = $derived(cart.items.find((i) => i.productId === productId)?.quantity ?? 0);

	function addToCart() {
		if (justAdded) return; // Prevent double-clicks during animation

		cart.addItem({ productId, productName, price: numericPrice });
		justAdded = true;

		toast.success(`${productName} added to cart`, {
			description: `Total in cart: ${quantityInCart + 1}`
		});

		setTimeout(() => {
			justAdded = false;
		}, 1500);
	}
</script>

<Card
	class="group overflow-hidden border-sidebar-border transition-all duration-300 hover:ring-2 hover:ring-primary/20"
>
	<div class="relative aspect-square overflow-hidden bg-muted">
		{#if image}
			<a href="/shop/single/{productId}">
				<img
					src="/files/{image}"
					alt={productName}
					loading="lazy"
					class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
				/>
			</a>
		{:else}
			<a href="/shop/single/{productId}">
				<div class="flex h-full w-full items-center justify-center text-muted-foreground/40">
					<ShoppingCartIcon class="size-12" />
				</div>
			</a>
		{/if}

		<div class="absolute inset-x-2 top-2 flex justify-between gap-2">
			{#if category}
				<Badge variant="secondary" class="bg-white/80 backdrop-blur-md dark:bg-black/80">
					{category}
				</Badge>
			{/if}

			{#if quantityInCart > 0}
				<Badge variant="default" class="animate-in zoom-in-50 duration-200">
					{quantityInCart} in cart
				</Badge>
			{/if}
		</div>
	</div>

	<CardContent class="grid gap-1 p-4">
		<div class="flex flex-col">
			<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
				>ID: {productId}</span
			>
			<h3 class="line-clamp-1 text-lg leading-tight font-bold" title={productName}>
				{productName}
			</h3>
		</div>
		<p class="text-xl font-black text-primary">
			{formattedPrice}
		</p>
	</CardContent>

	<CardFooter class="p-4 pt-0">
		<Button
			class="w-full transition-all active:scale-95"
			onclick={addToCart}
			variant={justAdded ? 'outline' : 'default'}
			disabled={justAdded}
		>
			{#if justAdded}
				<CheckIcon class="mr-2 size-4 text-green-500" />
				Added to Cart
			{:else}
				<PlusIcon class="mr-2 size-4" />
				Add to Cart
			{/if}
		</Button>
	</CardFooter>
</Card>
