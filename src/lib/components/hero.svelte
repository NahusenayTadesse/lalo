<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import {
		ArrowRightIcon,
		SparklesIcon,
		WheatIcon,
		ChefHatIcon,
		ShoppingBasketIcon,
		ChevronDownIcon
	} from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	const stats = [
		{ label: m.hero_stat_years(), value: '8+', icon: WheatIcon },
		{ label: m.hero_stat_bakeries(), value: '150+', icon: ChefHatIcon },
		{ label: m.hero_stat_products(), value: '100+', icon: ShoppingBasketIcon }
	];

	// Slideshow Images
	const images = [
		'/bakery (1).webp',
		'/bakery (2).webp',
		'/bakery (3).webp',
		'/bakery (4).webp',
		'/bakery (5).webp',
		'/bakery (6).webp',
		'/bakery (7).webp',
		'/bakery (8).webp',
		'/bakery (9).webp',
		'/bakery (10).webp',
		'/bakery (11).webp'
	];

	const SLIDE_MS = 6000;

	let currentIndex = $state(0);

	onMount(() => {
		const interval = setInterval(() => {
			currentIndex = (currentIndex + 1) % images.length;
		}, SLIDE_MS);
		return () => clearInterval(interval);
	});

	/** Entrance delay for the nth piece of the hero's opening choreography. */
	const enter = (i: number) => `animation-delay: ${150 + i * 140}ms`;
</script>

<section class="relative -mt-24 min-h-dvh w-full overflow-hidden bg-zinc-950 pt-24">
	<div class="absolute inset-0 z-0">
		{#each images as img, i (img)}
			{#if currentIndex === i}
				<div transition:fade={{ duration: 1600 }} class="absolute inset-0 overflow-hidden">
					<div
						class="absolute inset-0 animate-ken-burns bg-cover bg-center bg-no-repeat"
						style="background-image: url('{img}'); animation-duration: {SLIDE_MS + 1600}ms"
					></div>
				</div>
			{/if}
		{/each}
		<div class="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-black/30"></div>
		<div class="absolute inset-0 bg-linear-to-r from-black/70 via-black/20 to-transparent"></div>
		<div
			class="absolute -bottom-40 -left-40 size-[40rem] animate-blob rounded-full bg-primary/30 blur-[120px]"
		></div>
	</div>

	<div
		class="relative z-10 mx-auto flex min-h-[calc(100dvh-6rem)] max-w-7xl flex-col justify-center px-6 py-16 lg:px-8"
	>
		<div class="grid gap-12 lg:grid-cols-2 lg:items-center">
			<div class="flex flex-col space-y-8 text-left">
				<div
					class="glass-dark inline-flex w-fit animate-enter items-center gap-2 rounded-full px-4 py-1.5"
					style={enter(0)}
				>
					<SparklesIcon class="size-4 text-primary" />
					<span class="text-xs font-bold tracking-widest text-white uppercase"
						>{m.hero_badge()}</span
					>
				</div>

				<div class="space-y-5">
					<img
						src="/logo.webp"
						alt={m.footer_logo_alt()}
						class="h-16 w-auto animate-enter opacity-90 brightness-0 invert"
						style={enter(1)}
					/>
					<h1
						class="animate-enter text-6xl leading-[0.95] font-black tracking-tight text-white sm:text-7xl lg:text-8xl"
						style={enter(2)}
					>
						{m.hero_title_lead()}
						<span class="text-gradient block pb-2">{m.hero_title_accent()}</span>
					</h1>
					<p class="max-w-lg animate-enter text-xl font-medium text-zinc-200/90" style={enter(3)}>
						{m.hero_tagline()}
					</p>
				</div>

				<div class="flex animate-enter flex-wrap gap-4" style={enter(4)}>
					<Button
						size="lg"
						href="/shop"
						class="group sheen relative h-12 overflow-hidden rounded-full px-8 text-base shadow-xl shadow-primary/40 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/50"
					>
						{m.hero_get_started()}
						<ArrowRightIcon class="ml-1 size-5 transition-transform group-hover:translate-x-1" />
					</Button>
					<Button
						size="lg"
						href="/about-us"
						variant="ghost"
						class="glass-dark h-12 rounded-full px-8 text-base text-white hover:bg-white/15 hover:text-white"
						>{m.hero_learn_more()}</Button
					>
				</div>
			</div>

			<div class="relative hidden lg:block">
				<div class="relative ml-auto aspect-square w-full max-w-125">
					{#each stats as stat, i (stat)}
						<div
							class="absolute animate-pop"
							style="
								top: {12 + i * 28}%;
								left: {i % 2 === 0 ? '0%' : '28%'};
								z-index: {10 + i};
								animation-delay: {700 + i * 180}ms;
							"
						>
							<div
								class="glass-dark flex animate-float items-center gap-4 rounded-3xl p-6 transition-transform duration-500 hover:scale-105"
								style="animation-delay: {i * -2}s"
							>
								<div class="rounded-2xl bg-primary/25 p-3 ring-1 ring-primary/40">
									<stat.icon class="size-6 text-primary" />
								</div>
								<div>
									<p class="text-3xl font-bold text-white">{stat.value}</p>
									<p class="text-xs tracking-wider text-zinc-300 uppercase">{stat.label}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div
			class="glass-dark mt-12 grid animate-enter grid-cols-3 gap-2 rounded-2xl p-4 lg:hidden"
			style={enter(5)}
		>
			{#each stats as stat (stat)}
				<div class="text-center">
					<p class="text-xl font-bold text-primary">{stat.value}</p>
					<p class="text-[10px] text-zinc-300 uppercase">{stat.label}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Slide progress -->
	<div class="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 gap-1.5 md:flex">
		{#each images as img, i (img)}
			<button
				type="button"
				onclick={() => (currentIndex = i)}
				aria-label={`${i + 1} / ${images.length}`}
				class={[
					'h-1.5 rounded-full transition-all duration-500',
					currentIndex === i ? 'w-8 bg-primary' : 'w-1.5 bg-white/40 hover:bg-white/70'
				]}
			></button>
		{/each}
	</div>

	<a
		href="#about"
		class="absolute right-8 bottom-6 z-10 hidden animate-enter flex-col items-center gap-1 text-[10px] tracking-[0.3em] text-white/60 uppercase transition-colors hover:text-white md:flex"
		style={enter(6)}
	>
		{m.hero_scroll()}
		<ChevronDownIcon class="size-5 animate-bounce" />
	</a>
</section>
