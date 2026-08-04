<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { columns } from './columns';

	let { data } = $props();

	import DataTable from '$lib/components/Table/data-table.svelte';
	import QueryBuilder from '$lib/QueryBuilder.svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button/index';

	import { Frown, ArrowLeft } from '@lucide/svelte';
	import type { CalendarDate } from '@internationalized/date';

	type RangeFilters = { supplier: string; type: string };

	function updateFilters(params: Record<string, string | undefined>) {
		const url = new URL(page.url);
		for (const [key, value] of Object.entries(params)) {
			if (value) {
				url.searchParams.set(key, value);
			} else {
				url.searchParams.delete(key);
			}
		}
		goto(url, { keepFocus: true, noScroll: true });
	}

	function handleQueryChange(payload: {
		search: string;
		dateRange: { start: CalendarDate; end: CalendarDate } | null;
		customFilters: RangeFilters;
	}) {
		updateFilters({
			search: payload.search,
			start: payload.dateRange?.start.toString(),
			end: payload.dateRange?.end.toString(),
			supplier: payload.customFilters.supplier || undefined,
			type: payload.customFilters.type || undefined
		});
	}
</script>

<svelte:head>
	<title>Quantity Change History</title>
</svelte:head>
<Button href="/dashboard/products/single/{page.params.id}" class="justify-self-start"
	><ArrowLeft /> Back</Button
>

<div class="mt-4">
	<QueryBuilder
		title="Adjustment Filters"
		description="Search, filter by supplier or type, and pick a date range — applied server-side"
		showSearch={true}
		showDate={true}
		showPageSize={false}
		initialSearch={data.search}
		initialStart={data.start}
		initialEnd={data.end}
		initialCustomFilters={{ supplier: data.supplierFilter, type: data.typeFilter }}
		searchPlaceholder="Reason..."
		totalResults={data.allTransactions.length}
		onQueryChange={handleQueryChange}
	>
		{#snippet children(filters, update)}
			<div class="flex flex-col gap-2">
				<Label class="text-sm font-medium text-foreground">Supplier</Label>
				<Select
					type="single"
					value={String(filters.supplier ?? '')}
					onValueChange={(v) => update('supplier', v)}
				>
					<SelectTrigger class="w-full">
						{data.supplierOptions.find((s) => String(s.id) === filters.supplier)?.name ?? 'Any'}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">Any</SelectItem>
						{#each data.supplierOptions as supplier (supplier.id)}
							<SelectItem value={String(supplier.id)}>{supplier.name}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div class="flex flex-col gap-2">
				<Label class="text-sm font-medium text-foreground">Type</Label>
				<Select
					type="single"
					value={String(filters.type ?? '')}
					onValueChange={(v) => update('type', v)}
				>
					<SelectTrigger class="w-full">
						{filters.type === 'increase'
							? 'Increase'
							: filters.type === 'decrease'
								? 'Decrease'
								: 'Any'}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">Any</SelectItem>
						<SelectItem value="increase">Increase</SelectItem>
						<SelectItem value="decrease">Decrease</SelectItem>
					</SelectContent>
				</Select>
			</div>
		{/snippet}
	</QueryBuilder>
</div>

{#if data.allTransactions.length === 0}
	<div class="flex h-96 w-5xl flex-col items-center justify-center">
		<p class="justify-self-cente mt-4 flex flex-row gap-4 text-center text-4xl">
			<Frown class="h-12 w-16  animate-bounce" />

			Change History is Empty for this Date Range or Filters
		</p>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		<h2 class="my-4 text-2xl">No of Changes {data.allTransactions?.length}</h2>

		<DataTable data={data.allTransactions} {columns} search={false} />
	</div>
{/if}
