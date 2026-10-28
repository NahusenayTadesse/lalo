<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import ProductCard from '$lib/components/product-card.svelte';
	import { Input } from '@nahu/admin-kit/components/ui/input/index.js';
	import { Checkbox } from '@nahu/admin-kit/components/ui/checkbox/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { SearchIcon, XIcon, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import Label from '@nahu/admin-kit/components/ui/label/label.svelte';
	import { goto } from '$app/navigation';
	import { page as sveltePage } from '$app/state';

	let { data } = $props();

	/** The slider's range, from the catalogue's real prices (see the load). */
	const priceFloor = $derived(data.priceBounds.min);
	const priceCeiling = $derived(Math.max(data.priceBounds.max, data.priceBounds.min + 1));

	// The filter inputs follow the URL — back/forward and "Reset" included — while
	// still being editable: a writable `$derived` takes the input's value until the
	// URL next changes. Initialising them once from the URL (as before) left them
	// showing stale values after navigation.
	const params = $derived(sveltePage.url.searchParams);
	let minPrice = $derived(Number(params.get('min')) || priceFloor);
	let maxPrice = $derived(Number(params.get('max')) || priceCeiling);
	let selectedCategories = $derived(params.get('categories')?.split(',').filter(Boolean) ?? []);

	// Search is the exception, and stays `$state` synced by an effect: the customer may
	// keep typing while the debounced navigation is in flight, and a derived would
	// overwrite those keystrokes with the older term when the URL catches up.
	// `pushedSearch` is the term this page last put in the URL.
	let searchQuery = $state(sveltePage.url.searchParams.get('search') ?? '');
	let pushedSearch: string | undefined;

	$effect(() => {
		const urlSearch = params.get('search') ?? '';
		if (urlSearch !== pushedSearch) searchQuery = urlSearch;
		pushedSearch = undefined;
	});

	// A filter is active only if one actually narrows the list. Checking for *any*
	// query string counted `?page=1`, which every filter change adds, so "Reset
	// Filters" appeared after any interaction — including clearing the filters.
	const hasActiveFilters = $derived.by(() => {
		const params = sveltePage.url.searchParams;
		return ['search', 'min', 'max', 'categories'].some((key) => params.get(key));
	});

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

	// Debounced: navigating on every keystroke re-ran the listing, count, category
	// and price queries once per character typed.
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	function handleSearch() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			pushedSearch = searchQuery;
			updateFilters({ search: searchQuery });
		}, 300);
	}

	function applyPriceFilter() {
		const newUrl = new URL(sveltePage.url);
		// Only a bound that actually narrows the catalogue goes into the URL, so the
		// full range reads as "no price filter".
		const min = Number(minPrice);
		const max = Number(maxPrice);
		if (Number.isFinite(min) && min > priceFloor) newUrl.searchParams.set('min', String(min));
		else newUrl.searchParams.delete('min');
		if (Number.isFinite(max) && max < priceCeiling) newUrl.searchParams.set('max', String(max));
		else newUrl.searchParams.delete('max');
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
		newUrl.searchParams.set('page', '1');
		goto(newUrl, { keepFocus: true, noScroll: true });
	}

	function resetFilters() {
		clearTimeout(searchTimer);
		goto(sveltePage.url.pathname);
	}

	const goToPage = (p: number) => updateFilters({ page: p });

	/**
	 * Page buttons to show: the first, the last, and two either side of the current
	 * page, with `null` marking a gap. One button per page was fine at 7 pages and
	 * unusable at 70.
	 */
	const pageButtons = $derived.by(() => {
		const { currentPage, totalPages } = data.pagination;
		const wanted = new Set([1, totalPages]);
		for (let p = currentPage - 2; p <= currentPage + 2; p++) {
			if (p >= 1 && p <= totalPages) wanted.add(p);
		}
		const sorted = [...wanted].sort((a, b) => a - b);
		const buttons: (number | null)[] = [];
		sorted.forEach((p, i) => {
			if (i > 0 && p - sorted[i - 1] > 1) buttons.push(null);
			buttons.push(p);
		});
		return buttons;
	});
</script>

<svelte:head>
	<title>{m.shop_meta_title()}</title>
	<meta
		name="description"
		content={m.shop_meta_description()}
	/>
	<meta
		name="keywords"
		content="buy wholesale flour, bakery improvers, commercial yeast, bakery equipment supplier, bulk baking mixes"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:title" content={m.shop_og_title()} />
	<meta
		property="og:description"
		content={m.shop_og_description()}
	/>
	<meta property="og:image" content="/files/demo.webp" />

	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content={m.shop_twitter_title()} />
	<meta property="twitter:image" content="/files/demo.webp" />
</svelte:head>

<section
	class="relative flex h-96 flex-col items-center justify-center overflow-hidden border-b bg-contain bg-center px-6 py-20 lg:px-8"
	style="background-image: url('/42.webp')"
>
	<div class="backdrop-blur-xm absolute inset-0 bg-black/40"></div>

	<div class="relative mx-auto max-w-4xl text-center">
		<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight text-white lg:text-5xl">
			{m.shop_hero_title()}
		</h1>
		<p class="mt-6 text-2xl leading-8 font-bold text-gray-100 text-shadow-sm">
			{m.shop_hero_subtitle()}
		</p>
	</div>
</section>

<div class="min-h-dvh bg-background pb-8 text-foreground transition-colors duration-300">
	<!-- Header + Search. Not sticky: the site header already holds the top of the screen. -->
	<header class="aurora relative isolate overflow-hidden">
		<div class="mx-auto max-w-7xl px-4 pt-10 pb-6 sm:px-6 lg:px-8">
			<div data-reveal class="mb-6 flex items-center justify-between">
				<div>
					<h2 class="text-4xl font-bold tracking-tight sm:text-5xl">{m.shop_title()}</h2>
					<p class="mt-1 text-muted-foreground">{m.shop_subtitle()}</p>
				</div>
				{#if hasActiveFilters}
					<Button variant="outline" size="sm" onclick={resetFilters}>
						<XIcon size={14} class="mr-1" /> {m.shop_reset_filters()}
					</Button>
				{/if}
			</div>
			<div data-reveal style="--reveal-delay: 120ms" class="group relative">
				<SearchIcon
					class="absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
				/>
				<Input
					type="text"
					placeholder={m.shop_search_placeholder()}
					bind:value={searchQuery}
					oninput={handleSearch}
					class="glass h-13 rounded-2xl pl-12 text-base transition-shadow focus-visible:shadow-lg focus-visible:shadow-primary/15"
				/>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-4">
			<!-- Filters Sidebar -->
			<aside data-reveal="left" class="lg:col-span-1">
				<div class="glass sticky top-28 space-y-6 rounded-3xl p-5">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">{m.shop_filters()}</h3>
					</div>

					<!-- Price Range -->
					<div class="flex flex-col gap-4 border-b pb-6">
						<h4 class="text-sm font-medium">{m.shop_price_range()}</h4>
						<div class="flex gap-2">
							<div class="flex-1">
								<Label class="mb-1 block text-xs text-muted-foreground">{m.shop_min()}</Label>
								<Input
									type="number"
									bind:value={minPrice}
									onchange={applyPriceFilter}
									class="h-9 text-sm"
								/>
							</div>
							<div class="flex-1">
								<Label class="mb-1 block text-xs text-muted-foreground">{m.shop_max()}</Label>
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
							min={priceFloor}
							max={priceCeiling}
							onchange={applyPriceFilter}
							class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
						/>
						<input
							type="range"
							bind:value={maxPrice}
							min={priceFloor}
							max={priceCeiling}
							onchange={applyPriceFilter}
							class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
						/>
						<div class="flex justify-between text-xs text-muted-foreground">
							<span>{m.price_etb({ amount: minPrice })}</span>
							<span>{m.price_etb({ amount: maxPrice })}</span>
						</div>
					</div>

					<!-- Categories -->
					<div class="flex flex-col gap-3">
						<h4 class="text-sm font-medium">{m.shop_categories()}</h4>
						<div class="flex items-center gap-3">
							<Checkbox
								id="category-all"
								checked={isAllSelected}
								onCheckedChange={clearCategories}
								class="cursor-pointer"
							/>
							<Label for="category-all" class="flex-1 cursor-pointer text-sm">{m.shop_all()}</Label>
						</div>
						{#each data?.categories as category (category.name)}
							<div class="flex items-center gap-3">
								<!-- The id used the row object ("category-[object Object]") while the
								     label pointed at the name, so clicking the label did nothing. -->
								<Checkbox
									id={`category-${category.name}`}
									checked={selectedCategories.includes(category.name)}
									onCheckedChange={() => applyCategoryFilter(category.name)}
									class="cursor-pointer"
								/>
								<Label for={`category-${category.name}`} class="flex-1 cursor-pointer text-sm">
									{category.label}
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
						<h3 class="text-lg font-semibold">{m.shop_no_products()}</h3>
						<p class="mt-1 text-sm text-muted-foreground">
							{m.shop_no_products_hint()}
						</p>
						<Button variant="outline" class="mt-4" onclick={resetFilters}>{m.shop_clear_filters()}</Button>
					</div>
				{:else}
					<div data-reveal-stagger class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
								aria-label={m.pagination_previous()}
							>
								<ChevronLeft size={16} />
							</Button>

							{#each pageButtons as p, i (p ?? `gap-${i}`)}
								{#if p === null}
									<span class="px-1 text-muted-foreground" aria-hidden="true">…</span>
								{:else}
									<Button
										variant={p === data.pagination.currentPage ? 'default' : 'outline'}
										size="sm"
										onclick={() => goToPage(p)}
										aria-current={p === data.pagination.currentPage ? 'page' : undefined}
									>
										{p}
									</Button>
								{/if}
							{/each}

							<Button
								variant="outline"
								size="sm"
								disabled={!data.pagination.hasNextPage}
								onclick={() => goToPage(data.pagination.currentPage + 1)}
								aria-label={m.pagination_next()}
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
