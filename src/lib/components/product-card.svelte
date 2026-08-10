<script lang="ts">
	import { useCart, type ProductPrice } from '$lib/hooks/cart.svelte.js';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { ShoppingCartIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	/**
	 * The catalogue card shows an image and a name only — **no price, no variant
	 * selector and no add-to-cart, by client request**. Both were built and then
	 * removed on instruction; browsing to the product page is the intended path to
	 * buying. Please don't "restore" them as a missing feature.
	 */
	type Props = {
		productId: number;
		productName: string;
		/** `prices.id` of the variant this card defaults to — the cheapest one. */
		priceId: number;
		price: number | string;
		amount: string;
		image?: string | null;
		category?: string | null;
		priceList?: ProductPrice[];
	};

	let { productId, productName, priceId, price, amount, image, category, priceList }: Props =
		$props();

	const cart = $derived(useCart());

	let justAdded = $state(false);

	/**
	 * The variant this card represents: the cheapest one, chosen by the load.
	 * Price and amount come off that same row, so they always describe one
	 * variant — `min(price)` and `min(amount)` used to be unrelated aggregates.
	 *
	 * Nothing on the card displays it today (see the note above); it is here so
	 * `addToCart` stays correct for the badge and for any future use.
	 */
	const selected = $derived(
		priceList?.find((v) => v.id === priceId) ?? { id: priceId, price, amount }
	);

	/** Any variant of this product that is already in the cart. */
	const quantityInCart = $derived(
		cart.items
			.filter((i) => i.productId === productId)
			.reduce((sum, i) => sum + i.quantity, 0)
	);

	function addToCart() {
		if (justAdded) return;

		cart.addItem({
			priceId: selected.id,
			productId,
			amount: selected.amount,
			productName,
			price: Number(selected.price)
		});
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
	<a href="/shop/single/{productId}" class="relative aspect-square overflow-hidden bg-muted">
		{#if image}
			<!-- `h-full` was mistyped as `h-fu ll`, so the image had no height rule and
			     the card collapsed to a strip. -->
			<img
				src="/files/{image}"
				alt={productName}
				loading="lazy"
				class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
			/>
		{:else}
			<div class="flex h-full w-full items-center justify-center text-muted-foreground/40">
				<ShoppingCartIcon class="size-12" />
			</div>
		{/if}

		<div class="absolute inset-x-2 top-2 flex justify-between gap-2">
			{#if category}
				<Badge variant="secondary" class="bg-white/80 backdrop-blur-md dark:bg-black/80">
					{category}
				</Badge>
			{/if}

			{#if quantityInCart > 0}
				<Badge variant="default" class="animate-in duration-200 zoom-in-50">
					{quantityInCart} in cart
				</Badge>
			{/if}
		</div>
	</a>

	<!-- Name only. Price, variant selector and add-to-cart were removed at the
	     client's instruction — see the note at the top of this file. -->
	<CardContent class="grid gap-1 p-4">
		<a href="/shop/single/{productId}" class="flex flex-col hover:underline">
			<h3 class="line-clamp-1 text-lg leading-tight font-bold" title={productName}>
				{productName}
			</h3>
		</a>
	</CardContent>
</Card>
