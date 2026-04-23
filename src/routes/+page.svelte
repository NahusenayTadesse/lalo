<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';

	// Set app and cart hooks
	useCart();
	let { data } = $props();

	import Hero from '$lib/components/hero.svelte';
	import About from '$lib/components/about.svelte';
	import Accordion from '$lib/components/accordion.svelte';
	import Testimonial from '$lib/components/testimonial.svelte';

	import {
		Coffee,
		Croissant,
		Cog,
		Globe,
		Utensils,
		WashingMachine,
		Building
	} from '@lucide/svelte';
	import Slider from '$lib/components/slider.svelte';
	import Catalog from '$lib/components/catalog.svelte';

	let partners = [
		{
			name: 'Lalo Coffee Exports',
			description:
				'Global commodity supply chain coordination and international logistics management.',
			icon: Coffee,
			short: 'LAL_EXP'
		},
		{
			name: 'Lalo Bakery',
			description:
				'A bakery experience focused on handcrafted pastries, expertly brewed coffee, and high-quality ingredients sourced with care.',
			icon: Croissant,
			short: 'LAL_BAK'
		},
		{
			name: 'Fahem General Trading',
			description:
				'Diversified international trade operations across key industrial and material sectors.',
			icon: Globe,
			short: 'FAH_GEN'
		},
		{
			name: 'Lalo Laundry',
			description:
				'Commercial-scale linen and textile services for major hospitality and industrial clients.',
			icon: WashingMachine,
			short: 'LAL_LAU'
		},
		{
			name: 'Lalo Fixtec',
			description:
				'Professional-grade mechanical tools and bulk supply solutions for infrastructure, industrial, and distribution operations.',
			icon: Cog,
			short: 'LAL_FIX'
		},
		{
			name: 'Lalo Cafe',
			description:
				'Curated beverage and food services integrated within corporate and commercial environments.',
			icon: Utensils,
			short: 'LAL_CAF'
		},
		{
			name: 'Lalo Apartment',
			description:
				'Comprehensive residential property management services encompassing leasing, maintenance, and daily administrative operations.',
			icon: Building,
			short: 'LAL_APT'
		}
	];
</script>

<svelte:head>
	<title>Lalo Bakery Solutions | Professional Bakery Supplies & Equipment</title>
	<meta
		name="description"
		content="From MasterChef to Industry Leader. Lalo Bakery Solutions delivers excellence with a comprehensive portfolio of flours, yeasts, mixes, and equipment for professional bakeries."
	/>
	<meta
		name="keywords"
		content="Lalo Bakery Solutions, professional bakery supplies, wholesale flour, bakery equipment, MasterChef rebranding, industrial baking solutions"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:title" content="Lalo Bakery Solutions: From MasterChef to Industry Leader" />
	<meta
		property="og:description"
		content="Delivering excellence across every stage of production with premium ingredients and technical support."
	/>
	<meta property="og:image" content="/logo.webp" />

	<meta property="twitter:card" content="summary_large_image" />
	<meta
		property="twitter:title"
		content="Lalo Bakery Solutions | Industry-Leading Bakery Supplies"
	/>
	<meta
		property="twitter:description"
		content="Reliable supply chains and technical expertise for the modern bakery. Explore our journey from MasterChef to Lalo."
	/>
	<meta property="twitter:image" content="/logo.webp" />
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
				Our <span class="text-primary">Subsidiaries</span>
			</h3>
		</div>

		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:gap-8">
			{#each partners as p (p)}
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
							<p.icon class="size-7" />
						</div>
						<span class="text-xs font-bold tracking-widest text-muted-foreground/80 uppercase"
							>{p.short}</span
						>
					</div>

					<div class="grow space-y-2">
						<p class="text-2xl font-semibold tracking-tight text-foreground">{p.name}</p>
						<p
							class="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:line-clamp-none"
						>
							{p.description}
						</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<Slider imagesList={data?.imagesList} />

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

<Catalog files={data?.files} />
