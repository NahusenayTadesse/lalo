<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';

	import ProductCard from '$lib/components/product-card.svelte';

	// Set app and cart hooks
	useCart();
	let { data } = $props();

	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import Hero from '$lib/components/hero.svelte';
	import About from '$lib/components/about.svelte';
	import Accordion from '$lib/components/accordion.svelte';
	import Testimonial from '$lib/components/testimonial.svelte';

	// const groupedProducts = $derived(
	// 	data?.productList.reduce((acc, product) => {
	// 		const category = product.category || 'Uncategorized';
	// 		if (!acc[category]) {
	// 			acc[category] = [];
	// 		}
	// 		acc[category].push(product);
	// 		return acc;
	// 	}, {})
	// );
	//
	const groupedProducts = $derived.by(() => {
		const list = data?.productList ?? [];
		const groups: Record<string, any[]> = {};

		for (const item of list) {
			const cat = item.category ?? 'Uncategorized';
			if (!groups[cat]) groups[cat] = [];
			groups[cat].push(item);
		}
		return groups;
	});
</script>

<svelte:head>
	<title>Lalo Bakery</title>
</svelte:head>

<Hero />
<About />

<!-- Main Content -->
<!-- <hr class="mb-12 border-muted/30" />
<main class="container mx-auto px-4 py-12 pb-24">
	{#each Object.entries(groupedProducts) as [categoryName, products] (categoryName)}
		<section class="mb-16 last:mb-0">
			<div class="mb-8 flex flex-col items-start gap-1 border-l-4 border-primary pl-6">
				<h2 class="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
					{categoryName}
				</h2>
			</div>

			<div class="relative px-2">
				<Carousel.Root
					opts={{
						align: 'start',
						loop: true
					}}
					class="w-full"
				>
					<Carousel.Content class="-ml-4">
						{#each products as product (product.productId)}
							<Carousel.Item class="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
								<div class="group h-full transition-transform duration-300 hover:-translate-y-2">
									<ProductCard {...product} />
								</div>
							</Carousel.Item>
						{/each}
					</Carousel.Content>

					<div class="hidden lg:block">
						<Carousel.Previous
							class="border-secondary bg-background text-secondary-foreground hover:bg-secondary"
						/>
						<Carousel.Next
							class="border-secondary bg-background text-secondary-foreground hover:bg-secondary"
						/>
					</div>
				</Carousel.Root>
			</div>
		</section>
	{/each}
</main> -->
{#if data?.allPaymentMethods.length > 0}
	<main class="flex flex-col items-center justify-center px-4 py-12 md:py-20">
		<!-- Section Header -->
		<div class="mb-12 max-w-2xl text-center">
			<h2 class="mb-4 text-3xl font-bold text-foreground md:text-4xl">What Our Customers Say</h2>
			<p class="text-lg text-muted-foreground">
				Don't just take our word for it. Here's what people are saying about their experience.
			</p>
		</div>

		<!-- Testimonial Carousel -->
		<Testimonial testimonials={data?.allPaymentMethods} />
	</main>
{/if}

<Accordion />
