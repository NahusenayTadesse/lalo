<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		ArrowRightIcon,
		SparklesIcon,
		WheatIcon,
		ChefHatIcon,
		ShoppingBasketIcon
	} from '@lucide/svelte';
	import { fly, fade } from 'svelte/transition';

	const stats = [
		{ label: 'Years Experience', value: '25+', icon: WheatIcon },
		{ label: 'Happy Bakeries', value: '100+', icon: ChefHatIcon },
		{ label: 'Quality Products', value: '100+', icon: ShoppingBasketIcon }
	];

	// Slideshow Images
	const images = [
		'/bakery (1).webp',
		'/bakery (2).webp',
		'/bakery (3).webp',
		'/bakery (4).webp',
		'/bakery (5).webp'
	];

	let currentIndex = $state(0);

	onMount(() => {
		const interval = setInterval(() => {
			currentIndex = (currentIndex + 1) % images.length;
		}, 5000); // Change image every 5 seconds
		return () => clearInterval(interval);
	});
</script>

<section class="relative min-h-dvh w-full overflow-hidden bg-zinc-950">
	<div class="absolute inset-0 z-0">
		{#each images as img, i}
			{#if currentIndex === i}
				<div
					transition:fade={{ duration: 1500 }}
					class="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat transition-transform duration-[5000ms]"
					style="background-image: url('{img}');"
				></div>
			{/if}
		{/each}
		<div class="absolute inset-0 bg-black/30 backdrop-brightness-75 dark:bg-black/60"></div>
	</div>

	<div class="relative z-10 mx-auto flex min-h-dvh max-w-7xl flex-col justify-center px-6 lg:px-8">
		<div class="grid gap-12 lg:grid-cols-2 lg:items-center">
			<div class="flex flex-col space-y-8 text-left">
				<div
					transition:fly={{ x: -30, duration: 800 }}
					class="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md"
				>
					<SparklesIcon class="size-4 text-primary" />
					<span class="text-xs font-bold tracking-widest text-white uppercase"
						>Premium Bakery Solutions</span
					>
				</div>

				<div transition:fly={{ x: -30, duration: 800, delay: 200 }} class="space-y-4">
					<img src="/logo.webp" alt="Logo" class="h-16 w-auto opacity-90 brightness-0 invert" />
					<h1 class="text-6xl font-black tracking-tight text-white sm:text-7xl">
						Lalo Bakery
						<span class="block text-primary">Solutions</span>
					</h1>
					<p class="text-xl font-medium text-zinc-300">Ingredients That Deliver</p>
					<p class="max-w-lg text-lg leading-relaxed text-zinc-400">
						Premium bakery solutions for bakeries of all sizes. From artisan breads to delicate
						pastries.
					</p>
				</div>

				<div transition:fly={{ x: -30, duration: 800, delay: 400 }} class="flex flex-wrap gap-4">
					<Button size="lg" href="/shop" class="group px-8">
						Get Started
						<ArrowRightIcon class="ml-2 size-5 transition-transform group-hover:translate-x-1" />
					</Button>
					<Button size="lg" href="/about-us" variant="outline">Learn More</Button>
				</div>
			</div>

			<div transition:fade={{ duration: 1000, delay: 600 }} class="relative hidden lg:block">
				<div class="relative ml-auto aspect-square w-full max-w-125">
					{#each stats as stat, i (stat)}
						<div
							class="absolute flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-xl"
							style="
								top: {15 + i * 28}%;
								left: {i % 2 === 0 ? '-10%' : '15%'};
								z-index: {10 + i};
							"
							transition:fly={{ y: 20, delay: 800 + i * 200 }}
						>
							<div class="rounded-full bg-primary/20 p-3">
								<stat.icon class="size-6 text-primary" />
							</div>
							<div>
								<p class="text-2xl font-bold text-white">{stat.value}</p>
								<p class="text-xs tracking-wider text-zinc-400 uppercase">{stat.label}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div
			transition:fade
			class="mt-12 grid grid-cols-3 gap-2 border-t border-white/10 pt-8 lg:hidden"
		>
			{#each stats as stat (stat)}
				<div class="text-center">
					<p class="text-xl font-bold text-primary">{stat.value}</p>
					<p class="text-[10px] text-zinc-400 uppercase">{stat.label}</p>
				</div>
			{/each}
		</div>
	</div>
</section>
