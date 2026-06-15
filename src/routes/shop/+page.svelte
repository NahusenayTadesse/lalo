<script lang="ts">
	import ProductCard from '$lib/components/product-card.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { SearchIcon, XIcon, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { goto } from '$app/navigation';
	import { page as sveltePage } from '$app/state';

	let { data } = $props();

	let searchQuery = $state(sveltePage.url.searchParams.get('search') ?? '');
	let minPrice = $state(Number(sveltePage.url.searchParams.get('min')) || 0);
	let maxPrice = $state(Number(sveltePage.url.searchParams.get('max')) || 2000);
	let selectedCategories = $state(
		sveltePage.url.searchParams.get('categories')?.split(',').filter(Boolean) ?? []
	);

	const hasActiveFilters = $derived(sveltePage.url.searchParams.toString() !== '');

	// All unique categories from the current product list
	const categories = $derived(
		Array.from(new Set(data?.productList.map((p) => p.category).filter(Boolean))).sort()
	);

	const isAllSelected = $derived(selectedCategories.length === 0);

	function updateFilters(newParams: Record<string, string | number | undefined>) {
		const newUrl = new URL(sveltePage.url);
		for (const [key, value] of Object.entries(newParams)) {
			if (value !== undefined && value !== '' && value !== 0) {
				newUrl.searchParams.set(key, value.toString());
			} else {
				newUrl.searchParams.delete(key);
			}
		}
		if (!newParams.page) newUrl.searchParams.set('page', '1');
		goto(newUrl, { keepFocus: true, noScroll: true });
	}

	function handleSearch() {
		updateFilters({ search: searchQuery });
	}

	function applyPriceFilter() {
		const newUrl = new URL(sveltePage.url);
		newUrl.searchParams.set('min', minPrice.toString());
		newUrl.searchParams.set('max', maxPrice.toString());
		newUrl.searchParams.set('page', '1');
		goto(newUrl, { keepFocus: true, noScroll: true });
	}

	function applyCategoryFilter(category: string) {
		if (selectedCategories.includes(category)) {
			selectedCategories = selectedCategories.filter((c) => c !== category);
		} else {
			selectedCategories = [...selectedCategories, category];
		}
		const newUrl = new URL(sveltePage.url);
		if (selectedCategories.length > 0) {
			newUrl.searchParams.set('categories', selectedCategories.join(','));
		} else {
			newUrl.searchParams.delete('categories');
		}
		newUrl.searchParams.set('page', '1');
		goto(newUrl, { keepFocus: true, noScroll: true });
	}

	function clearCategories() {
		selectedCategories = [];
		const newUrl = new URL(sveltePage.url);
		newUrl.searchParams.delete('categories');
		goto(newUrl, { keepFocus: true, noScroll: true });
	}

	function resetFilters() {
		searchQuery = '';
		minPrice = 0;
		maxPrice = 2000;
		selectedCategories = [];
		goto(sveltePage.url.pathname);
	}

	const goToPage = (p: number) => updateFilters({ page: p });
</script>

<svelte:head>
	<title>Wholesale Catalog | Ingredients & Equipment | Lalo Bakery Solutions</title>
	<meta
		name="description"
		content="Browse our professional portfolio: premium flours, yeasts, improvers, mixes, and specialty baking equipment designed for industrial excellence."
	/>
	<meta
		name="keywords"
		content="buy wholesale flour, bakery improvers, commercial yeast, bakery equipment supplier, bulk baking mixes"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:title" content="Shop Professional Bakery Supplies | Lalo Bakery Solutions" />
	<meta
		property="og:description"
		content="Equip your bakery with high-performance ingredients and machinery. Quality backed by technical support."
	/>
	<meta property="og:image" content="/files/demo.webp" />

	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content="Lalo Bakery Solutions | Wholesale Product Catalog" />
	<meta property="twitter:image" content="/files/demo.webp" />
</svelte:head>

<section
	class="relative flex h-96 flex-col items-center justify-center overflow-hidden border-b bg-contain bg-center px-6 py-20 lg:px-8"
	style="background-image: url('/files/demo.webp')"
>
	<div class="backdrop-blur-xm absolute inset-0 bg-black/40"></div>

	<div class="relative mx-auto max-w-4xl text-center">
		<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight text-white lg:text-5xl">
			Products & Solutions
		</h1>
		<p class="mt-6 text-2xl leading-8 font-bold text-gray-100 text-shadow-sm">
			Browse our collection of bakery products and solutions.
		</p>
	</div>
</section>

<div class="min-h-dvh bg-background pb-8 text-foreground transition-colors duration-300">
	<!-- Sticky Header + Search -->
	<header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="mb-6 flex items-center justify-between">
				<div>
					<h2 class="text-3xl font-bold">Shop</h2>
					<p class="mt-1 text-muted-foreground">Industrial & Construction Supply Solutions</p>
				</div>
				{#if hasActiveFilters}
					<Button variant="outline" size="sm" onclick={resetFilters}>
						<XIcon size={14} class="mr-1" /> Reset Filters
					</Button>
				{/if}
			</div>
			<div class="relative">
				<SearchIcon class="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search by product name..."
					bind:value={searchQuery}
					oninput={handleSearch}
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
				<div class="sticky top-36 space-y-6">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">Filters</h3>
					</div>

					<!-- Price Range -->
					<div class="flex flex-col gap-4 border-b pb-6">
						<h4 class="text-sm font-medium">Price Range</h4>
						<div class="flex gap-2">
							<div class="flex-1">
								<Label class="mb-1 block text-xs text-muted-foreground">Min</Label>
								<Input
									type="number"
									bind:value={minPrice}
									onchange={applyPriceFilter}
									class="h-9 text-sm"
								/>
							</div>
							<div class="flex-1">
								<Label class="mb-1 block text-xs text-muted-foreground">Max</Label>
								<Input
									type="number"
									bind:value={maxPrice}
									onchange={applyPriceFilter}
									class="h-9 text-sm"
								/>
							</div>
						</div>
						<input
							type="range"
							bind:value={minPrice}
							min="0"
							max="2000"
							onchange={applyPriceFilter}
							class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
						/>
						<input
							type="range"
							bind:value={maxPrice}
							min="0"
							max="2000"
							onchange={applyPriceFilter}
							class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
						/>
						<div class="flex justify-between text-xs text-muted-foreground">
							<span>{minPrice} ETB</span>
							<span>{maxPrice} ETB</span>
						</div>
					</div>

					<!-- Categories -->
					<div class="flex flex-col gap-3">
						<h4 class="text-sm font-medium">Categories</h4>
						<div class="flex items-center gap-3">
							<Checkbox
								id="category-all"
								checked={isAllSelected}
								onCheckedChange={clearCategories}
								class="cursor-pointer"
							/>
							<Label for="category-all" class="flex-1 cursor-pointer text-sm">All</Label>
						</div>
						{#each data?.categories as category (category)}
							<div class="flex items-center gap-3">
								<Checkbox
									id={`category-${category}`}
									checked={selectedCategories.includes(category.name)}
									onCheckedChange={() => applyCategoryFilter(category.name)}
									class="cursor-pointer"
								/>
								<Label for={`category-${category.name}`} class="flex-1 cursor-pointer text-sm">
									{category.name}
								</Label>
							</div>
						{/each}
					</div>
				</div>
			</aside>

			<!-- Products Grid -->
			<div class="lg:col-span-3">
				{#if data.productList.length === 0}
					<div class="flex flex-col items-center justify-center py-24 text-center">
						<SearchIcon class="mb-4 size-12 text-muted-foreground/40" />
						<h3 class="text-lg font-semibold">No products found</h3>
						<p class="mt-1 text-sm text-muted-foreground">
							Try adjusting your filters or search term.
						</p>
						<Button variant="outline" class="mt-4" onclick={resetFilters}>Clear Filters</Button>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
						{#each data.productList as product (product.productId)}
							<ProductCard {...product} />
						{/each}
					</div>

					<!-- Pagination -->
					{#if data.pagination.totalPages > 1}
						<div class="mt-10 flex items-center justify-center gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={!data.pagination.hasPrevPage}
								onclick={() => goToPage(data.pagination.currentPage - 1)}
							>
								<ChevronLeft size={16} />
							</Button>

							{#each Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1) as p (p)}
								<Button
									variant={p === data.pagination.currentPage ? 'default' : 'outline'}
									size="sm"
									onclick={() => goToPage(p)}
								>
									{p}
								</Button>
							{/each}

							<Button
								variant="outline"
								size="sm"
								disabled={!data.pagination.hasNextPage}
								onclick={() => goToPage(data.pagination.currentPage + 1)}
							>
								<ChevronRight size={16} />
							</Button>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</main>
</div>
