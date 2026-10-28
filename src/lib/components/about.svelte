<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '@nahu/admin-kit/components/ui/card/index.js';
	import { CheckIcon, SparklesIcon, TrendingUpIcon, AwardIcon } from '@lucide/svelte';

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
	id="about"
	class="aurora relative isolate overflow-hidden bg-linear-to-b from-background via-primary/5 to-background px-4 py-24 sm:px-6 lg:px-8"
>
	<div class="mx-auto max-w-6xl">
		<!-- Section Header -->
		<div data-reveal class="mb-16 flex flex-col gap-4 text-center">
			<span class="mx-auto h-1 w-16 rounded-full bg-linear-to-r from-primary to-amber-400"></span>
			<h2 class="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{m.about_title()}</h2>
			<p class="mx-auto max-w-3xl text-lg text-foreground/70">
				{m.about_intro()}
			</p>
		</div>

		<!-- Main Content Grid -->
		<div class="mb-16 grid gap-8 lg:grid-cols-3">
			<!-- Company Story -->
			<div data-reveal="left" class="lg:col-span-2">
				<Card
					class="group relative isolate z-0 h-full overflow-hidden border-white/10 bg-zinc-900 text-white shadow-2xl shadow-primary/10"
				>
					<div
						class="absolute inset-0 -z-10 scale-105 bg-cover bg-center transition-transform duration-[1.5s] ease-out-expo group-hover:scale-110"
						style="background-image: url('/bakery (9).webp')"
					></div>
					<div class="absolute inset-0 -z-10 bg-linear-to-t from-black/85 via-black/60 to-black/30"></div>
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
			<div data-reveal-stagger class="flex flex-col gap-4">
				{#each highlights as highlight (highlight.label)}
					<Card class="glass lift group rounded-2xl">
						<CardContent class="flex gap-3">
							<div class="shrink-0">
								<div
									class="flex size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 transition-all duration-500 group-hover:rotate-6 group-hover:bg-primary group-hover:[&_svg]:text-primary-foreground"
								>
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
		<div data-reveal class="mb-16">
			<Card class="glass rounded-3xl">
				<CardHeader>
					<CardTitle>{m.about_portfolio()}</CardTitle>
					<CardDescription>{m.about_portfolio_subtitle()}</CardDescription>
				</CardHeader>
				<CardContent>
					<div data-reveal-stagger class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
						{#each products as product (product)}
							<div
								class="flex items-center gap-3 rounded-xl border border-primary/10 bg-primary/5 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/10"
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
