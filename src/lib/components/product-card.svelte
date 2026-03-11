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
	const item = $derived({
		productId,
		productName,
		price,
		amount,
		image,
		category,
		quantity,
		priceList
	});
	const cart = useCart();

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
	<div class="relative aspect-square overflow-hidden bg-muted">
		{#if image}
			<a href="/shop/single/{productId}">
				<img
					src="/files/{image}"
					alt={productName}
					loading="lazy"
					class="h-fu ll w-full object-cover transition-transform duration-500 group-hover:scale-110"
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
			<span class="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase"
				>Variation: {amount}</span
			>
			<h3 class="line-clamp-1 text-lg leading-tight font-bold" title={productName}>
				{productName}
			</h3>
		</div>

		<div class="space-y-3">
			<label class="flex items-center gap-2 text-sm font-semibold text-foreground/80">
				<PackageIcon class="size-4" />
				Package Options
			</label>
			<Select type="single" value={`${amount}-${price}`}>
				<SelectTrigger
					class="h-auto w-full border-2 py-4 transition-colors duration-200 hover:border-primary/50"
				>
					<div class="flex items-center justify-between gap-3 border-y border-foreground/10 py-3">
						<div class="truncateitems-center grid grid-cols-2 gap-3">
							<div
								class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"
							>
								<ShoppingCartIcon class="size-5 text-primary" />
							</div>
							<div class="max-w-full text-left leading-tight">
								<div class="truncate font-semibold wrap-break-word text-foreground">{amount}</div>
								<div class="text-[12px] text-foreground/60">ETB {price}</div>
							</div>
						</div>

						<div class="text-right leading-tight">
							<div class="text-sm font-bold text-primary tabular-nums">ETB {price}</div>
						</div>
					</div>
				</SelectTrigger>
				<SelectContent class="">
					{#each priceList as newprice (newprice)}
						<SelectItem
							value={`${newprice.amount}-${newprice.price}`}
							onclick={() => handlePriceChange(newprice.amount, Number(newprice.price))}
							class="cursor-pointer px-4 py-3"
						>
							<div class="flex w-full items-center justify-between gap-6">
								<div class="flex items-center gap-3">
									<div class="flex size-8 items-center justify-center rounded-lg bg-primary/10">
										<PackageIcon class="size-4 text-primary" />
									</div>
									<div class="text-left">
										<div class="font-semibold">{newprice.amount}</div>
										<div class="text-xs text-foreground/60">Standard pack</div>
									</div>
								</div>
								<div class="text-right">
									<div class="font-bold text-primary">ETB {newprice.price}</div>
								</div>
							</div>
						</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		</div>
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
