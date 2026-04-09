<script lang="ts">
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
		{ icon: AwardIcon, label: 'Halal Certified', description: 'All products meet Halal standards' },
		{
			icon: SparklesIcon,
			label: 'Specialty Options',
			description: 'Gluten-free, sugar-free & vegan'
		},
		{ icon: TrendingUpIcon, label: 'Since 2011', description: 'Over a decade of excellence' },
		{ icon: CheckIcon, label: 'Quality Assured', description: 'Consistent standards guaranteed' }
	];

	const products = ['Yeasts', 'Improvers', 'Mixes', 'Specialty Products', 'Equipment'];

	const partners = [
		{ name: 'Fixtec', description: 'Mechanical tools & construction materials' },
		{
			name: 'Fahem General Trading',
			description: 'Coffee export, agrochemicals & veterinary imports'
		}
	];
</script>

<section
	class="relative bg-linear-to-b from-background via-primary/5 to-background px-4 py-20 sm:px-6 lg:px-8"
>
	<div class="mx-auto max-w-6xl">
		<!-- Section Header -->
		<div transition:fly={{ y: 20, duration: 600 }} class="mb-16 flex flex-col gap-4 text-center">
			<h2 class="text-4xl font-bold text-foreground sm:text-5xl">About Lalo Bakery Solutions</h2>
			<p class="mx-auto max-w-3xl text-lg text-foreground/70">
				Established in 2011, we've grown from MasterChef into a comprehensive bakery ingredient and
				equipment supplier serving both small bakeries and large-scale producers.
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
						<CardTitle class="text-2xl">Our Journey</CardTitle>
						<CardDescription class="text-white">From MasterChef to Industry Leader</CardDescription>
					</CardHeader>
					<CardContent class="flex flex-col gap-4 text-white">
						<p class="leading-relaxed">
							Formerly known as MasterChef, we rebranded as Lalo Bakery Solutions to better reflect
							our mission of delivering excellence in baking across every stage of production. Our
							comprehensive portfolio includes flours, yeasts, improvers, mixes, specialty products,
							and equipment—all backed by industry knowledge and technical support.
						</p>
						<p class="leading-relaxed">
							Guided by a commitment to reliability and customer satisfaction, we work with bakeries
							to support the creation of products that meet market demands and stand out for their
							excellence.
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
					<CardTitle>Our Product Portfolio</CardTitle>
					<CardDescription>Comprehensive solutions for every baking need</CardDescription>
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
