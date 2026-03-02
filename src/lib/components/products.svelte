<script lang="ts">
	import { featuredProducts } from '$lib/data/products.js';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { StarIcon, HeartIcon, ShoppingBagIcon } from '@lucide/svelte';

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-ET', {
			style: 'currency',
			currency: 'ETB',
			minimumFractionDigits: 0
		}).format(price);
	};
</script>

<section id="products" class="py-20">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-12 flex flex-col items-center justify-between gap-4 sm:flex-row">
			<div>
				<h2 class="mb-2 text-3xl font-bold sm:text-4xl">Featured Products</h2>
				<p class="text-muted-foreground">Discover our most loved beauty essentials</p>
			</div>
			<Button variant="outline" class="gap-2">
				View All Products
				<ShoppingBagIcon class="size-4" />
			</Button>
		</div>

		<!-- Products Grid -->
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			{#each featuredProducts as product}
				<Card
					class="group shadow-lg-md hover:shadow-lg-xl overflow-hidden border-0 bg-card transition-all duration-300 hover:-translate-y-1"
				>
					<!-- Image -->
					<div class="relative aspect-square overflow-hidden bg-muted">
						<img
							src={product.image}
							alt={product.name}
							class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
						/>

						{#if product.badge}
							<Badge class="absolute top-3 left-3">{product.badge}</Badge>
						{/if}

						<!-- Quick actions -->
						<div
							class="absolute top-3 right-3 flex flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<Button size="icon" variant="secondary" class="shadow-lg-md size-9 rounded-full">
								<HeartIcon class="size-4" />
							</Button>
						</div>

						<!-- Add to cart overlay -->
						<div
							class="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent p-4 transition-transform group-hover:translate-y-0"
						>
							<Button class="w-full gap-2">
								<ShoppingBagIcon class="size-4" />
								Add to Cart
							</Button>
						</div>
					</div>

					<!-- Content -->
					<div class="p-4">
						<p class="mb-1 text-xs font-medium text-muted-foreground">{product.brand}</p>
						<h3 class="mb-2 leading-tight font-semibold transition-colors group-hover:text-primary">
							{product.name}
						</h3>

						<!-- Rating -->
						<div class="mb-3 flex items-center gap-1">
							<StarIcon class="size-4 fill-accent text-accent" />
							<span class="text-sm font-medium">{product.rating}</span>
							<span class="text-sm text-muted-foreground">({product.reviews})</span>
						</div>

						<!-- Price -->
						<div class="flex items-center gap-2">
							<span class="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
							{#if product.originalPrice}
								<span class="text-sm text-muted-foreground line-through"
									>{formatPrice(product.originalPrice)}</span
								>
							{/if}
						</div>
					</div>
				</Card>
			{/each}
		</div>
	</div>
</section>
