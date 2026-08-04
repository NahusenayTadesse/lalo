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

	type DamagedFilters = { reason: string };

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
		customFilters: DamagedFilters;
	}) {
		updateFilters({
			search: payload.search,
			start: payload.dateRange?.start.toString(),
			end: payload.dateRange?.end.toString(),
			reason: payload.customFilters.reason || undefined
		});
	}
</script>

<svelte:head>
	<title>Damage History</title>
</svelte:head>
<Button href="/dashboard/products/single/{page.params.id}" class="justify-self-start"
	><ArrowLeft /> Back</Button
>

<div class="mt-4">
	<QueryBuilder
		title="Damage Filters"
		description="Search, filter by reason, and pick a date range — applied server-side"
		showSearch={true}
		showDate={true}
		showPageSize={false}
		initialSearch={data.search}
		initialStart={data.start}
		initialEnd={data.end}
		initialCustomFilters={{ reason: data.reasonFilter }}
		searchPlaceholder="Reason or damaged by..."
		totalResults={data.allTransactions.length}
		onQueryChange={handleQueryChange}
	>
		{#snippet children(filters, update)}
			<div class="flex flex-col gap-2">
				<Label class="text-sm font-medium text-foreground">Reason</Label>
				<Select
					type="single"
					value={String(filters.reason ?? '')}
					onValueChange={(v) => update('reason', v)}
				>
					<SelectTrigger class="w-full">
						{filters.reason || 'Any'}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">Any</SelectItem>
						{#each data.reasonOptions as reason (reason)}
							<SelectItem value={reason}>{reason}</SelectItem>
						{/each}
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

			Damage History is Empty for this Date Range or Filters
		</p>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		<h2 class="my-4 text-2xl">No of Damages {data.allTransactions?.length}</h2>

		<DataTable
			data={data.allTransactions}
			{columns}
			fileName="{data?.product.name} Supply History"
		/>
	</div>
{/if}
