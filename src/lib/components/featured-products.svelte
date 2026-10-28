<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import ProductCard from '$lib/components/product-card.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { ArrowRightIcon } from '@lucide/svelte';
	import type { ComponentProps } from 'svelte';

	let { products }: { products: ComponentProps<typeof ProductCard>[] } = $props();
</script>

<section class="relative isolate overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-7xl">
		<div
			data-reveal
			class="mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between"
		>
			<div class="flex flex-col gap-4">
				<span class="h-1 w-16 rounded-full bg-linear-to-r from-primary to-amber-400"></span>
				<h2 class="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
					{m.home_products_title_lead()}
					<span class="text-gradient">{m.home_products_title_accent()}</span>
				</h2>
				<p class="max-w-2xl text-lg text-foreground/70">{m.home_products_subtitle()}</p>
			</div>

			<Button href="/shop" variant="outline" class="group shrink-0 rounded-full">
				{m.home_products_view_all()}
				<ArrowRightIcon class="size-4 transition-transform group-hover:translate-x-1" />
			</Button>
		</div>

		<div
			data-reveal-stagger
			class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
		>
			{#each products as product (product.productId)}
				<ProductCard {...product} />
			{/each}
		</div>
	</div>
</section>
