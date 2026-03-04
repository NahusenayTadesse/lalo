<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowRightIcon, SparklesIcon } from '@lucide/svelte';
	import { fly } from 'svelte/transition';
</script>

<section
	class="relative min-h-dvh w-full overflow-hidden bg-linear-to-br from-primary/30 via-background to-accent/10"
>
	<!-- Decorative elements -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<div class="absolute top-20 right-10 size-72 rounded-full bg-primary/10 blur-3xl"></div>
		<div class="absolute bottom-20 left-10 size-96 rounded-full bg-accent/10 blur-3xl"></div>
	</div>

	<!-- Content -->
	<div
		class="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6 lg:px-8"
	>
		<div class="mx-auto max-w-4xl space-y-8 text-center">
			<!-- Badge -->
			<div
				transition:fly={{ y: -20, duration: 600, delay: 100 }}
				class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 backdrop-blur-sm"
			>
				<SparklesIcon class="size-4 text-primary" />
				<span class="text-sm font-medium text-primary">Premium Bakery Solutions</span>
			</div>

			<!-- Main heading -->
			<div
				transition:fly={{ y: 20, duration: 600, delay: 200 }}
				class="flex flex-col items-center justify-center gap-4"
			>
				<img
					src="/logo.webp"
					loading="lazy"
					class="my-2 h-28 w-40 justify-self-center"
					alt="Logo"
				/>
				<h1 class="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
					<span
						class="bg-linear-to-r from-primary via-primary/40 to-primary bg-clip-text text-transparent"
						>Lalo Bakery</span
					>
					<br />
					<span class="text-foreground">Solutions</span>
				</h1>
			</div>

			<!-- Tagline -->
			<div transition:fly={{ y: 20, duration: 600, delay: 300 }} class="flex flex-col gap-4">
				<p class="text-xl font-semibold text-primary sm:text-2xl">Ingredients That Deliver</p>
				<p class="mx-auto max-w-2xl text-lg leading-relaxed text-foreground/70">
					Premium quality ingredients and expert solutions for bakeries of all sizes. From artisan
					breads to delicate pastries, we provide everything you need to create exceptional baked
					goods.
				</p>
			</div>

			<!-- CTA Buttons -->
			<div
				transition:fly={{ y: 20, duration: 600, delay: 400 }}
				class="flex flex-col justify-center gap-4 pt-4 sm:flex-row"
			>
				<Button size="lg" href="/shop">
					Get Started
					<ArrowRightIcon class="ml-2 size-5 transition-transform group-hover:translate-x-1" />
				</Button>
				<Button size="lg" href="/about-us" variant="outline">Learn More</Button>
			</div>

			<!-- Stats -->
			<div
				transition:fly={{ y: 20, duration: 600, delay: 500 }}
				class="grid grid-cols-3 gap-4 border-t border-primary/10 pt-12 sm:gap-8"
			>
				{#each [{ label: 'Years Experience', value: '25+' }, { label: 'Happy Bakeries', value: '500+' }, { label: 'Quality Products', value: '100+' }] as stat (stat.label)}
					<div class="flex flex-col gap-2">
						<p class="text-2xl font-bold text-primary sm:text-3xl">{stat.value}</p>
						<p class="text-sm text-foreground/60">{stat.label}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Scroll indicator -->
	<div class="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
		<div
			class="flex h-10 w-6 items-start justify-center rounded-full border-2 border-primary/40 p-2"
		>
			<div class="h-2 w-1 rounded-full bg-primary/40"></div>
		</div>
	</div>
</section>
