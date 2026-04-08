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
	import { Coffee, Cog, Globe, Utensils, WashingMachine } from '@lucide/svelte';

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

<section
	class="relative z-0 mx-auto max-w-full border-t border-border/50 bg-background bg-cover bg-center px-6 py-24 md:py-32"
	style="background-image: url('/bakery (6).webp');"
>
	<div class="absolute inset-0 -z-1 bg-black/60"></div>
	<div class="mx-auto max-w-7xl">
		<div class="mb-16 md:mb-20">
			<h3
				class="mt-4 max-w-4xl text-4xl font-semibold tracking-tighter text-white sm:text-5xl lg:text-6xl"
			>
				Our <span class="text-primary">Partners</span>
			</h3>
		</div>

		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:gap-8">
			<div
				class="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30 hover:shadow-xl"
			>
				<div
					class="absolute inset-x-0 top-0 h-1 bg-primary opacity-0 transition group-hover:opacity-100"
				></div>

				<div class="flex items-center justify-between">
					<div
						class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
					>
						<Coffee class="size-7" />
					</div>
					<span class="text-xs font-bold tracking-widest text-muted-foreground/80 uppercase"
						>LAL_EXP</span
					>
				</div>

				<div class="flex-grow space-y-2">
					<p class="text-2xl font-semibold tracking-tight text-foreground">Lalo Coffee Exports</p>
					<p
						class="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:line-clamp-none"
					>
						Global commodity supply chain coordination and international logistics management.
					</p>
				</div>
			</div>

			<div
				class="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30 hover:shadow-xl"
			>
				<div
					class="absolute inset-x-0 top-0 h-1 bg-primary opacity-0 transition group-hover:opacity-100"
				></div>

				<div class="flex items-center justify-between">
					<div
						class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
					>
						<Globe class="size-7" />
					</div>
					<span class="text-xs font-bold tracking-widest text-muted-foreground/80 uppercase"
						>FAH_GEN</span
					>
				</div>

				<div class="flex-grow space-y-2">
					<p class="text-2xl font-semibold tracking-tight text-foreground">Fahem General Trading</p>
					<p
						class="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:line-clamp-none"
					>
						Diversified international trade operations across key industrial and material sectors.
					</p>
				</div>
			</div>

			<div
				class="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30 hover:shadow-xl"
			>
				<div
					class="absolute inset-x-0 top-0 h-1 bg-primary opacity-0 transition group-hover:opacity-100"
				></div>

				<div class="flex items-center justify-between">
					<div
						class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
					>
						<WashingMachine class="size-7" />
					</div>
					<span class="text-xs font-bold tracking-widest text-muted-foreground/80 uppercase"
						>LAL_LAU</span
					>
				</div>

				<div class="flex-grow space-y-2">
					<p class="text-2xl font-semibold tracking-tight text-foreground">Lalo Laundry</p>
					<p
						class="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:line-clamp-none"
					>
						Commercial-scale linen and textile services for major hospitality and industrial
						clients.
					</p>
				</div>
			</div>

			<div
				class="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30 hover:shadow-xl"
			>
				<div
					class="absolute inset-x-0 top-0 h-1 bg-primary opacity-0 transition group-hover:opacity-100"
				></div>

				<div class="flex items-center justify-between">
					<div
						class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
					>
						<Cog class="size-7" />
					</div>
					<span class="text-xs font-bold tracking-widest text-muted-foreground/80 uppercase"
						>LAL_FIC</span
					>
				</div>

				<div class="flex-grow space-y-2">
					<p class="text-2xl font-semibold tracking-tight text-foreground">Lalo Fixtec</p>
					<p
						class="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:line-clamp-none"
					>
						Professional-grade mechanical tools and bulk supply solutions for infrastructure,
						industrial, and distribution operations.
					</p>
				</div>
			</div>

			<div
				class="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30 hover:shadow-xl md:col-span-2 lg:col-span-1"
			>
				<div
					class="absolute inset-x-0 top-0 h-1 bg-primary opacity-0 transition group-hover:opacity-100"
				></div>

				<div class="flex items-center justify-between">
					<div
						class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
					>
						<Utensils class="size-7" />
					</div>
					<span class="text-xs font-bold tracking-widest text-muted-foreground/80 uppercase"
						>LAL_CAF</span
					>
				</div>

				<div class="flex-grow space-y-2">
					<p class="text-2xl font-semibold tracking-tight text-foreground">Lalo Cafe</p>
					<p
						class="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:line-clamp-none"
					>
						Curated beverage and food services integrated within corporate and commercial
						environments.
					</p>
				</div>
			</div>
		</div>
	</div>
</section>
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
