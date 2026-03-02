<script lang="ts">
	import ProductCard from '$lib/components/product-card.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { SearchIcon, XIcon } from '@lucide/svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	let { data } = $props();

	// Set app hook

	// Search state
	let searchQuery = $state('');

	// Price range state

	// Category filter state
	let selectedCategories = $state<string[]>([]);
	let minPrice = $state(0);
	let maxPrice = $state(
		Math.max(
			...(data?.productList.map((p) =>
				typeof p.price === 'number' ? p.price : parseFloat(p.price as string)
			) ?? [0])
		)
	);

	// Get unique categories from products
	const categories = $derived(
		Array.from(new Set(data?.productList.map((p) => p.category).filter(Boolean))).sort()
	);

	// Filtered products based on search query, price range, and categories
	const filteredProducts = $derived(
		data?.productList.filter((product) => {
			const matchesSearch =
				product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				product.category?.toLowerCase().includes(searchQuery.toLowerCase());

			const price =
				typeof product.price === 'number' ? product.price : parseFloat(product.price as string);
			const matchesPrice = price >= minPrice && price <= maxPrice;

			const matchesCategory =
				selectedCategories.length === 0 || selectedCategories.includes(product.category || '');

			return matchesSearch && matchesPrice && matchesCategory;
		})
	);

	// Count of results
	const resultCount = $derived(filteredProducts.length);

	// Get max price from products for slider
	const maxProductPrice = $derived(
		Math.max(
			...(data?.productList.map((p) =>
				typeof p.price === 'number' ? p.price : parseFloat(p.price as string)
			) ?? [0])
		)
	);

	// Toggle category selection
	const toggleCategory = (category: string) => {
		selectedCategories = selectedCategories.includes(category)
			? selectedCategories.filter((c) => c !== category)
			: [...selectedCategories, category];
	};

	// Reset all filters
	const resetFilters = () => {
		searchQuery = '';
		minPrice = 0;
		maxPrice = maxProductPrice;
		selectedCategories = [];
	};

	// Check if any filters are active
	const hasActiveFilters = $derived(
		searchQuery !== '' ||
			minPrice > 0 ||
			maxPrice < maxProductPrice ||
			selectedCategories.length > 0
	);
</script>

<div class="min-h-dvh bg-background pb-8 text-foreground transition-colors duration-300">
	<!-- Header -->
	<header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="mb-6 flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold">Shop</h1>
					<p class="mt-1 text-muted-foreground">Browse our collection of products</p>
				</div>
			</div>

			<!-- Search Bar -->
			<div class="relative">
				<SearchIcon class="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search by product name or category..."
					bind:value={searchQuery}
					class="h-11 rounded-lg pl-10"
				/>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-4">
			<!-- Filters Sidebar -->
			<aside class="lg:col-span-1">
				<div class="sticky top-24 space-y-6">
					<!-- Filter Header -->
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-semibold">Filters</h2>
						{#if hasActiveFilters}
							<Button variant="ghost" size="sm" onclick={resetFilters} class="h-8 text-xs">
								<XIcon size={14} />
								Reset
							</Button>
						{/if}
					</div>

					<!-- Price Range Filter -->
					<div class="flex flex-col gap-4 border-b pb-6">
						<h3 class="text-sm font-medium">Price Range</h3>
						<div class="space-y-3">
							<div class="flex gap-2">
								<div class="flex-1">
									<Label class="mb-1 block text-xs text-muted-foreground">Min</Label>
									<Input
										type="number"
										bind:value={minPrice}
										min="0"
										max={maxPrice}
										class="h-9 text-sm"
									/>
								</div>
								<div class="flex-1">
									<Label class="mb-1 block text-xs text-muted-foreground">Max</Label>
									<Input
										type="number"
										bind:value={maxPrice}
										min={minPrice}
										max={maxProductPrice}
										class="h-9 text-sm"
									/>
								</div>
							</div>
							<input
								type="range"
								bind:value={minPrice}
								min="0"
								max={maxPrice}
								class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
							/>
							<input
								type="range"
								bind:value={maxPrice}
								min={minPrice}
								max={maxProductPrice}
								class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
							/>
							<p class="text-xs text-muted-foreground">
								${minPrice.toFixed(0)} - ${maxPrice.toFixed(0)}
							</p>
						</div>
					</div>

					<!-- Category Filter -->
					<div class="flex flex-col gap-4">
						<h3 class="text-sm font-medium">Categories</h3>
						<div class="space-y-3">
							{#each categories as category (category)}
								<div class="flex items-center gap-3">
									<Checkbox
										id={`category-${category}`}
										checked={selectedCategories.includes(category)}
										onchange={() => toggleCategory(category)}
										class="cursor-pointer"
									/>
									<Label for={`category-${category}`} class="flex-1 cursor-pointer text-sm">
										{category}
									</Label>
									<span class="text-xs text-muted-foreground">
										{filteredProducts.filter((p) => p.category === category).length}
									</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</aside>

			<!-- Products Grid -->
			<div class="lg:col-span-3">
				<!-- Results Info -->
				<div class="mb-8">
					<p class="text-sm text-muted-foreground">
						Showing <span class="font-semibold text-foreground">{resultCount}</span>
						{resultCount === 1 ? 'product' : 'products'}
						{searchQuery && `for "${searchQuery}"`}
						{selectedCategories.length > 0 && `in ${selectedCategories.join(', ')}`}
					</p>
				</div>

				<!-- Products Grid -->
				{#if filteredProducts.length > 0}
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{#each filteredProducts as product (product.productId)}
							<div class="animate-in duration-300 fade-in">
								<ProductCard {...product} />
							</div>
						{/each}
					</div>
				{:else}
					<!-- Empty State -->
					<div class="flex flex-col items-center justify-center py-20">
						<SearchIcon class="mb-4 size-16 text-muted-foreground/30" />
						<h3 class="mb-2 text-xl font-semibold">No products found</h3>
						<p class="max-w-sm text-center text-muted-foreground">
							We couldn't find any products matching your filters. Try adjusting your search terms
							or price range.
						</p>
						{#if hasActiveFilters}
							<Button variant="outline" size="sm" onclick={resetFilters} class="mt-4"
								>Reset Filters</Button
							>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>
