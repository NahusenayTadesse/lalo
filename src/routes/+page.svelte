<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
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
	import FeaturedProducts from '$lib/components/featured-products.svelte';

	let partners = [
		{
			name: 'Lalo Coffee Exports',
			description: m.home_partner_exp(),
			icon: Coffee,
			short: 'LAL_EXP'
		},
		{
			name: 'Lalo Bakery',
			description: m.home_partner_bak(),
			icon: Croissant,
			short: 'LAL_BAK'
		},

		{
			name: 'Lalo Laundry',
			description: m.home_partner_lau(),
			icon: WashingMachine,
			short: 'LAL_LAU'
		},
		{
			name: 'Lalo Fixtec',
			description: m.home_partner_fix(),
			icon: Cog,
			short: 'LAL_FIX'
		},
		{
			name: 'Lalo Cafe',
			description: m.home_partner_caf(),
			icon: Utensils,
			short: 'LAL_CAF'
		},
		{
			name: 'Lalo Apartments',
			description: m.home_partner_apt(),
			icon: Building,
			short: 'LAL_APT'
		},
		{
			name: 'Fahem General Trading',
			description: m.home_partner_fah(),
			icon: Globe,
			short: 'FAH_GEN'
		}
	];
</script>

<svelte:head>
	<title>{m.home_meta_title()}</title>
	<meta
		name="description"
		content={m.home_meta_description()}
	/>
	<meta
		name="keywords"
		content="Lalo Bakery Solutions, professional bakery supplies, wholesale flour, bakery equipment, MasterChef rebranding, industrial baking solutions"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:title" content={m.home_og_title()} />
	<meta
		property="og:description"
		content={m.home_og_description()}
	/>
	<meta property="og:image" content="/logo.webp" />

	<meta property="twitter:card" content="summary_large_image" />
	<meta
		property="twitter:title"
		content={m.home_twitter_title()}
	/>
	<meta
		property="twitter:description"
		content={m.home_twitter_description()}
	/>
	<meta property="twitter:image" content="/logo.webp" />
</svelte:head>

<Hero />
<About />

{#if data.featuredProducts.length > 0}
	<FeaturedProducts products={data.featuredProducts} />
{/if}

<section
	class="relative isolate z-0 mx-auto max-w-full overflow-hidden bg-zinc-950 bg-cover bg-center px-6 py-24 lg:bg-fixed md:py-32"
	style="background-image: url('/bakery (6).webp');"
>
	<div class="absolute inset-0 -z-10 bg-linear-to-b from-black/80 via-black/60 to-black/85"></div>
	<div
		class="absolute top-1/3 -right-40 -z-10 size-[36rem] animate-blob rounded-full bg-primary/25 blur-[120px]"
	></div>
	<div class="mx-auto max-w-7xl">
		<div data-reveal class="mb-16 md:mb-20">
			<h3
				class="mt-4 max-w-4xl text-4xl font-semibold tracking-tighter text-white sm:text-5xl lg:text-6xl"
			>
				{m.home_partners_title_lead()}
				<span class="text-gradient">{m.home_partners_title_accent()}</span>
			</h3>
		</div>

		<div
			data-reveal-stagger
			class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:gap-8"
		>
			{#each partners as p (p)}
				<div
					class="glass-dark sheen group relative flex flex-col gap-5 overflow-hidden rounded-3xl p-8 transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20"
				>
					<div
						class="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary to-transparent opacity-0 transition duration-500 group-hover:opacity-100"
					></div>

					<div class="flex items-center justify-between">
						<div
							class="flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary ring-1 ring-primary/30 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-primary group-hover:text-primary-foreground"
						>
							<p.icon class="size-7" />
						</div>
						<span class="text-xs font-bold tracking-widest text-white/50 uppercase"
							>{p.short}</span
						>
					</div>

					<div class="grow space-y-2">
						<p class="text-2xl font-semibold tracking-tight text-white">{p.name}</p>
						<p
							class="line-clamp-2 text-sm leading-relaxed text-white/65 group-hover:line-clamp-none"
						>
							{p.description}
						</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

{#if data?.imagesList?.length > 0}
	<Slider imagesList={data?.imagesList} />
{/if}

{#if data?.allPaymentMethods.length > 0}
	<main
		class="aurora relative isolate flex flex-col items-center justify-center overflow-hidden px-4 py-16 md:py-24"
	>
		<!-- Section Header -->
		<div data-reveal class="mb-12 max-w-2xl text-center">
			<h2 class="mb-4 text-3xl font-bold text-foreground md:text-4xl">{m.home_testimonials_title()}</h2>
			<p class="text-lg text-muted-foreground">
				{m.home_testimonials_subtitle()}
			</p>
		</div>

		<!-- Testimonial Carousel -->
		<div data-reveal="scale" class="w-full">
			<Testimonial testimonials={data?.allPaymentMethods} />
		</div>
	</main>
{/if}

<Accordion />

{#if data?.files}<Catalog files={data?.files} />{/if}
