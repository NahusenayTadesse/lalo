<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { columns } from './columns';

	let { data } = $props();

	import DataTable from '$lib/components/Table/data-table.svelte';
	import FilterMenu from '$lib/components/Table/FilterMenu.svelte';
	import QueryBuilder from '$lib/QueryBuilder.svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';

	import { Frown, Plus, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	let filteredList = $derived(data.productList);

	function updateFilters(params: Record<string, string | number | undefined>) {
		const url = new URL(page.url);
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== '') {
				url.searchParams.set(key, String(value));
			} else {
				url.searchParams.delete(key);
			}
		}
		if (!('page' in params)) url.searchParams.set('page', '1');
		goto(url, { keepFocus: true, noScroll: true });
	}

	type ProductFilters = { category: string };

	function handleQueryChange(payload: {
		search: string;
		pageSize: number;
		customFilters: ProductFilters;
	}) {
		updateFilters({
			search: payload.search,
			pageSize: payload.pageSize === 20 ? undefined : payload.pageSize,
			category: payload.customFilters.category || undefined
		});
	}

	const goToPage = (p: number) => updateFilters({ page: p });
</script>

<svelte:head>
	<title>Products List</title>
</svelte:head>

<h2 class="my-4 text-2xl">No of Products {data.pagination.totalCount}</h2>

<QueryBuilder
	title="Product Filters"
	description="Search and filter by category — applied server-side"
	showSearch={true}
	showPageSize={true}
	initialSearch={data.filters.search}
	initialPageSize={data.filters.pageSize}
	initialCustomFilters={{ category: data.filters.category ?? '' }}
	searchPlaceholder="Product name or description..."
	totalResults={data.pagination.totalCount}
	onQueryChange={handleQueryChange}
>
	{#snippet children(filters, update)}
		<div class="flex flex-col gap-2">
			<Label class="text-sm font-medium text-foreground">Category</Label>
			<Select
				type="single"
				value={String(filters.category ?? '')}
				onValueChange={(v) => update('category', v)}
			>
				<SelectTrigger class="w-full">
					{data.categories.find((c) => String(c.value) === filters.category)?.name ?? 'Any'}
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="">Any</SelectItem>
					{#each data.categories as category (category.value)}
						<SelectItem value={String(category.value)}>{category.name}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		</div>
	{/snippet}
</QueryBuilder>

{#if data.productList.length === 0}
	<div class="flex h-96 w-full flex-col items-center justify-center lg:w-5xl">
		<p class="justify-self-cente mt-4 flex flex-row gap-4 text-center text-4xl">
			<Frown class="h-12 w-16  animate-bounce" />
			Products List is Empty
		</p>
		<Button href="/dashboard/products/add-products"><Plus />Add New Products</Button>
	</div>
{:else}
	<div class="mt-4 w-6xl p-0 lg:w-full lg:p-0">
		<FilterMenu
			bind:filteredList
			data={data.productList}
			filterKeys={['category', 'quantity', 'supplier']}
		/>
		<DataTable data={filteredList} {columns} fileName="Product List" />
	</div>

	{#if data.pagination.totalPages > 1}
		<div class="mt-6 flex items-center justify-center gap-2">
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
