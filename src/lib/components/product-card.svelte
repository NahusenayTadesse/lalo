<script lang="ts">
	import { useCart, type ProductPrice } from '$lib/hooks/cart.svelte.js';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { PlusIcon, PackageIcon, CheckIcon, ShoppingCartIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';

	type Props = {
		productId: number;
		productName: string;
		price: number | string;
		amount: number | string;
		image?: string;
		category?: string;
		priceList: ProductPrice[];
	};

	let { productId, productName, price, amount, image, category, priceList }: Props = $props();

	let quantity = $state(1);
	// const item = $derived({
	// 	productId,
	// 	productName,
	// 	price,
	// 	amount,
	// 	image,
	// 	category,
	// 	quantity,
	// 	priceList
	// });
	const cart = $derived(useCart());

	let justAdded = $state(false);

	// Reusable formatter (performance friendly)
	const formatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'ETB'
	});

	// Derived values for clarity
	const numericPrice = $derived(typeof price === 'string' ? parseFloat(price) : price);
	// const formattedPrice = $derived(formatter.format(numericPrice));
	const quantityInCart = $derived(cart.items.find((i) => i.productId === productId)?.quantity ?? 0);

	function addToCart() {
		if (justAdded) return;

		cart.addItem({ productId, amount, productName, price: numericPrice });
		justAdded = true;

		toast.success(`${productName} added to cart`, {
			description: `Total in cart: ${quantityInCart + 1}`
		});

		setTimeout(() => {
			justAdded = false;
		}, 1500);
	}

	const handlePriceChange = (newAmount: number | string, newPrice: number) => {
		amount = newAmount;
		price = newPrice;
	};
</script>

<Card
	class="group overflow-hidden border-sidebar-border transition-all duration-300 hover:ring-2 hover:ring-primary/20"
>
	<a href="/shop/single/{productId}" class="relative aspect-square overflow-hidden bg-muted">
		{#if image}
			<div >
				<img
					src="/files/{image}"
					alt={productName}
					loading="lazy"
					class="h-fu ll w-full object-cover transition-transform duration-500 group-hover:scale-110"
				/>
			</div>
		{:else}
			<div href="/shop/single/{productId}">
				<div class="flex h-full w-full items-center justify-center text-muted-foreground/40">
					<ShoppingCartIcon class="size-12" />
				</div>
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

	<CardContent class="grid gap-1 p-4">
		<a href="/shop/single/{productId}" class="flex flex-col hover:underline">
			<h3 class="line-clamp-1 text-lg leading-tight font-bold" title={productName}>
				{productName}
			</h3>
		</a>

	
	</CardContent>

</Card>
