<script lang="ts">
	import { categories } from '$lib/data/products.js';
	import { Card } from '$lib/components/ui/card';
	import { ArrowRightIcon } from '@lucide/svelte';
</script>

<section id="categories" class="bg-muted/30 py-20">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-12 text-center">
			<h2 class="mb-4 text-3xl font-bold sm:text-4xl">Shop by Category</h2>
			<p class="mx-auto max-w-2xl text-muted-foreground">
				Explore our carefully curated collections designed to meet all your beauty needs
			</p>
		</div>

		<!-- Categories Grid -->
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			{#each categories as category}
				<Card
					class="group shadow-lg-lg hover:shadow-lg-xl cursor-pointer overflow-hidden border-0 bg-card transition-all duration-300 hover:-translate-y-2"
				>
					<div class="relative aspect-square overflow-hidden">
						<img
							src={category.image}
							alt={category.name}
							class="size-full object-cover transition-transform duration-500 group-hover:scale-110"
						/>
						<div
							class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
						></div>
						<div class="absolute inset-x-0 bottom-0 p-6 text-white">
							<h3 class="mb-1 text-xl font-bold">{category.name}</h3>
							<p class="mb-3 text-sm text-white/80">{category.description}</p>
							<div class="flex items-center justify-between">
								<span class="text-sm">{category.productCount} Products</span>
								<div
									class="flex size-8 items-center justify-center rounded-full bg-white/20 transition-colors group-hover:bg-primary"
								>
									<ArrowRightIcon class="size-4" />
								</div>
							</div>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	</div>
</section>
