<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { CheckIcon, SparklesIcon, TrendingUpIcon, AwardIcon } from '@lucide/svelte';
	import { fly } from 'svelte/transition';

	const highlights = [
		{ icon: AwardIcon, label: m.about_hl_halal(), description: m.about_hl_halal_desc() },
		{
			icon: SparklesIcon,
			label: m.about_hl_specialty(),
			description: m.about_hl_specialty_desc()
		},
		{ icon: TrendingUpIcon, label: m.about_hl_since(), description: m.about_hl_since_desc() },
		{ icon: CheckIcon, label: m.about_hl_quality(), description: m.about_hl_quality_desc() }
	];

	const products = [
		m.about_product_yeasts(),
		m.about_product_improvers(),
		m.about_product_mixes(),
		m.about_product_specialty(),
		m.about_product_equipment()
	];

	const partners = [
		{ name: 'Fixtec', description: m.about_partner_fixtec() },
		{
			name: 'Fahem General Trading',
			description: m.about_partner_fahem()
		}
	];
</script>

<section
	class="relative bg-linear-to-b from-background via-primary/5 to-background px-4 py-20 sm:px-6 lg:px-8"
>
	<div class="mx-auto max-w-6xl">
		<!-- Section Header -->
		<div transition:fly={{ y: 20, duration: 600 }} class="mb-16 flex flex-col gap-4 text-center">
			<h2 class="text-4xl font-bold text-foreground sm:text-5xl">{m.about_title()}</h2>
			<p class="mx-auto max-w-3xl text-lg text-foreground/70">
				{m.about_intro()}
			</p>
		</div>

		<!-- Main Content Grid -->
		<div class="mb-16 grid gap-8 lg:grid-cols-3">
			<!-- Company Story -->
			<div transition:fly={{ y: 20, duration: 600, delay: 100 }} class="lg:col-span-2">
				<Card
					style="background-image: url('/bakery (9).webp')"
					class="shadow-lg-lg shadow-lg-primary/10 relative z-0 h-full border-primary/20  bg-cover bg-center text-white"
				>
					<div class="absolute inset-0 -z-1 bg-black/60"></div>
					<CardHeader>
						<CardTitle class="text-2xl">{m.about_journey()}</CardTitle>
						<CardDescription class="text-white">{m.about_journey_subtitle()}</CardDescription>
					</CardHeader>
					<CardContent class="flex flex-col gap-4 text-white">
						<p class="leading-relaxed">
							{m.about_journey_p1()}
						</p>
						<p class="leading-relaxed">
							{m.about_journey_p2()}
						</p>
					</CardContent>
				</Card>
			</div>

			<!-- Key Highlights -->
			<div transition:fly={{ y: 20, duration: 600, delay: 200 }} class="flex flex-col gap-4">
				{#each highlights as highlight (highlight.label)}
					<Card
						class="shadow-lg-md shadow-lg-primary/5 hover:shadow-lg-lg hover:shadow-lg-primary/10 border-primary/20 transition-all duration-300"
					>
						<CardContent class="flex gap-2">
							<div class="shrink-0">
								<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10">
									<svelte:component this={highlight.icon} class="size-6 text-primary" />
								</div>
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-semibold text-foreground">{highlight.label}</p>
								<p class="mt-1 text-xs text-foreground/60">{highlight.description}</p>
							</div>
						</CardContent>
					</Card>
				{/each}
			</div>
		</div>

		<!-- Products & Services -->
		<div transition:fly={{ y: 20, duration: 600, delay: 300 }} class="mb-16">
			<Card class="shadow-lg-lg shadow-lg-primary/10 border-primary/20">
				<CardHeader>
					<CardTitle>{m.about_portfolio()}</CardTitle>
					<CardDescription>{m.about_portfolio_subtitle()}</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
						{#each products as product (product)}
							<div
								class="flex items-center gap-3 rounded-lg border border-primary/10 bg-primary/5 p-2 transition-colors duration-300 hover:bg-primary/10"
							>
								<CheckIcon class="size-5 shrink-0 text-primary" />
								<span class="text-sm font-medium text-foreground">{product}</span>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- Lalo Business Group -->
		<!-- <div
			transition:fly={{ y: 20, duration: 600, delay: 400 }}
			class="shadow-lg-lg relative overflow-hidden rounded-lg border border-primary/20"
			style="background-image: url('/bakery (4).webp'); background-size: contain; background-position: center;"
		>
			<div class="absolute inset-0 z-0 bg-black/70"></div>

			<Card
				class="shadow-lg-lg shadow-lg-primary/10 relative z-10 border-primary/20 bg-transparent text-white"
			>
				<CardHeader>
					<CardTitle>Part of Lalo Business Group</CardTitle>
					<CardDescription class="text-gray-200">
						Integrated solutions across industries
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="mb-6 leading-relaxed text-white">
						As part of the Lalo Business Group, we work alongside complementary businesses to give
						our clients access to integrated, cross-industry solutions that drive growth from the
						ground up.
					</p>
					<div class="grid gap-6 md:grid-cols-2">
						{#each partners as partner (partner.name)}
							<div class="rounded-lg bg-black/25 p-4 text-white shadow-lg">
								<h4 class="mb-2 font-semibold text-white">{partner.name}</h4>
								<p class="text-sm text-white/70">{partner.description}</p>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		</div> -->
	</div>
</section>
