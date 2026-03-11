<script lang="ts">
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
		{ label: 'Happy Bakeries', value: '500+', icon: ChefHatIcon },
		{ label: 'Quality Products', value: '100+', icon: ShoppingBasketIcon }
	];
</script>

<section class="relative min-h-dvh w-full overflow-hidden bg-background">
	<div class="absolute inset-0 z-0">
		<div
			class="absolute -top-[10%] -left-[10%] size-125 animate-pulse rounded-full bg-primary/20 blur-[120px]"
		></div>
		<div
			class="absolute top-[20%] -right-[5%] size-100 rounded-full bg-accent/20 blur-[100px]"
		></div>
		<div
			class="absolute -bottom-[10%] left-[20%] size-150 rounded-full bg-primary/10 blur-[150px]"
		></div>
	</div>

	<div class="relative z-10 mx-auto flex min-h-dvh max-w-7xl flex-col justify-center px-6 lg:px-8">
		<div class="grid gap-12 lg:grid-cols-2 lg:items-center">
			<div class="flex flex-col space-y-8 text-left">
				<div
					transition:fly={{ x: -30, duration: 800 }}
					class="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 backdrop-blur-md"
				>
					<SparklesIcon class="size-4 text-primary" />
					<span class="text-xs font-bold tracking-widest text-primary uppercase"
						>Premium Bakery Solutions</span
					>
				</div>

				<div transition:fly={{ x: -30, duration: 800, delay: 200 }} class="space-y-4">
					<img src="/logo.webp" alt="Logo" class="h-16 w-auto opacity-90" />
					<h1 class="text-6xl font-black tracking-tight sm:text-7xl">
						<span class="text-foreground">Lalo Bakery</span>
						<span
							class="block bg-linear-to-r from-primary via-primary/60 to-primary bg-clip-text text-transparent"
						>
							Solutions
						</span>
					</h1>
					<p class="text-xl font-medium text-primary/80">Ingredients That Deliver</p>
					<p class="max-w-lg text-lg leading-relaxed text-muted-foreground">
						Premium quality ingredients and expert solutions for bakeries of all sizes. From artisan
						breads to delicate pastries.
					</p>
				</div>

				<div transition:fly={{ x: -30, duration: 800, delay: 400 }} class="flex flex-wrap gap-4">
					<Button size="lg" href="/shop" class="group px-8">
						Get Started
						<ArrowRightIcon class="ml-2 size-5 transition-transform group-hover:translate-x-1" />
					</Button>
					<Button size="lg" href="/about-us" variant="outline" class="backdrop-blur-sm">
						Learn More
					</Button>
				</div>
			</div>

			<div transition:fade={{ duration: 1000, delay: 600 }} class="relative hidden lg:block">
				<div class="relative ml-auto aspect-square w-full max-w-125">
					<div
						class="absolute inset-0 rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 to-transparent backdrop-blur-3xl"
					></div>

					{#each stats as stat, i (stat)}
						<div
							class="absolute flex items-center gap-4 rounded-2xl border border-white/10 bg-background/40 p-6 shadow-2xl backdrop-blur-xl"
							style="
								top: {15 + i * 28}%;
								left: {i % 2 === 0 ? '-10%' : '15%'};
								z-index: {10 + i};
							"
							transition:fly={{ y: 20, delay: 800 + i * 200 }}
						>
							<div class="rounded-full bg-primary/20 p-3">
								<svelte:component this={stat.icon} class="size-6 text-primary" />
							</div>
							<div>
								<p class="text-2xl font-bold text-foreground">{stat.value}</p>
								<p class="text-xs tracking-wider text-muted-foreground uppercase">{stat.label}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div
			transition:fade
			class="mt-12 grid grid-cols-3 gap-2 border-t border-primary/10 pt-8 lg:hidden"
		>
			{#each stats as stat (stat)}
				<div class="text-center">
					<p class="text-xl font-bold text-primary">{stat.value}</p>
					<p class="text-[10px] text-muted-foreground uppercase">{stat.label}</p>
				</div>
			{/each}
		</div>
	</div>
</section>
