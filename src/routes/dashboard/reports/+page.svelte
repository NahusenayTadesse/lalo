<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { columns } from './columns';
	import RevenueTrendChart from './RevenueTrendChart.svelte';
	import OrdersTrendChart from './OrdersTrendChart.svelte';
	import StatusBreakdownChart from './StatusBreakdownChart.svelte';
	import PaymentBreakdownChart from './PaymentBreakdownChart.svelte';
	import CategoryBreakdownChart from './CategoryBreakdownChart.svelte';

	let { data } = $props();

	import DataTable from '$lib/components/Table/data-table.svelte';
	import QueryBuilder from '$lib/QueryBuilder.svelte';
	import FilterMenu from '$lib/components/Table/FilterMenu.svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button/index';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import DataTableLinks from '$lib/components/Table/data-table-links.svelte';

	import {
		Frown,
		ChevronLeft,
		ChevronRight,
		Wallet,
		ShoppingCart,
		Package,
		Truck,
		TrendingUp
	} from '@lucide/svelte';
	import type { CalendarDate } from '@internationalized/date';
	import { DATE_PRESETS, getPresetDateRange, formatETB } from '$lib/global.svelte';

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

	function applyPreset(presetValue: string) {
		if (presetValue === 'allTime') {
			updateFilters({ preset: 'allTime', start: undefined, end: undefined });
			return;
		}
		const range = getPresetDateRange(presetValue as Parameters<typeof getPresetDateRange>[0]);
		updateFilters({ preset: presetValue, start: range?.start, end: range?.end });
	}

	type ReportFilters = { paymentMethod: string; category: string; status: string };

	function handleQueryChange(payload: {
		search: string;
		pageSize: number;
		dateRange: { start: CalendarDate; end: CalendarDate } | null;
		customFilters: ReportFilters;
	}) {
		updateFilters({
			search: payload.search,
			pageSize: payload.pageSize === 20 ? undefined : payload.pageSize,
			start: payload.dateRange?.start?.toString(),
			end: payload.dateRange?.end?.toString(),
			// a manual date-range edit supersedes any preset badge
			preset: undefined,
			paymentMethod: payload.customFilters.paymentMethod || undefined,
			category: payload.customFilters.category || undefined,
			status: payload.customFilters.status || undefined
		});
	}

	const goToPage = (p: number) => updateFilters({ page: p });

	// Client-side filter over the current page's detail rows — visualized instantly
	// via FilterMenu's own charts, no extra DB round trip.
	let filteredList = $derived(data.detailRows);
</script>

<svelte:head>
	<title>Reports</title>
</svelte:head>

<div class="mb-6 flex flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h2 class="text-2xl">Reports</h2>

		<div class="flex flex-row flex-wrap items-center gap-2">
			{#each DATE_PRESETS as preset (preset.value)}
				<Button
					size="sm"
					variant={data.filters.preset === preset.value ? 'default' : 'outline'}
					onclick={() => applyPreset(preset.value)}
				>
					{preset.label}
				</Button>
			{/each}
		</div>
	</div>

	<QueryBuilder
		title="Report Filters"
		description="Search, filter by status, payment method, category and date — applied server-side"
		showSearch={true}
		showDate={true}
		showPageSize={true}
		initialSearch={data.filters.search}
		initialPageSize={data.filters.pageSize}
		initialStart={data.filters.start ?? undefined}
		initialEnd={data.filters.end ?? undefined}
		initialCustomFilters={{
			paymentMethod: data.filters.paymentMethod ?? '',
			category: data.filters.category ?? '',
			status: data.filters.status ?? ''
		}}
		searchPlaceholder="Customer, product, or delivery address..."
		totalResults={data.pagination.totalCount}
		onQueryChange={handleQueryChange}
	>
		{#snippet children(filters, update)}
			<div class="flex flex-col gap-2">
				<Label class="text-sm font-medium text-foreground">Status</Label>
				<Select
					type="single"
					value={String(filters.status ?? '')}
					onValueChange={(v) => update('status', v)}
				>
					<SelectTrigger class="w-full capitalize">
						{filters.status || 'All'}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">All</SelectItem>
						<SelectItem value="pending">Pending</SelectItem>
						<SelectItem value="delivered">Delivered</SelectItem>
						<SelectItem value="cancelled">Cancelled</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div class="flex flex-col gap-2">
				<Label class="text-sm font-medium text-foreground">Payment Method</Label>
				<Select
					type="single"
					value={String(filters.paymentMethod ?? '')}
					onValueChange={(v) => update('paymentMethod', v)}
				>
					<SelectTrigger class="w-full">
						{data.paymentMethodList.find((p) => String(p.value) === filters.paymentMethod)
							?.name ?? 'Any'}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">Any</SelectItem>
						{#each data.paymentMethodList as method (method.value)}
							<SelectItem value={String(method.value)}>{method.name}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

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
</div>

<!-- Stat tiles -->
<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
	<Card class="border-l-4 border-l-emerald-500">
		<CardHeader class="pb-2">
			<CardTitle class="flex items-center justify-between text-sm font-medium text-muted-foreground">
				<span>Total Revenue</span>
				<Wallet class="size-4 text-emerald-500" />
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="text-2xl font-bold text-emerald-600">{formatETB(data.summary.totalRevenue)}</div>
			<p class="mt-1 text-xs text-muted-foreground">Sum of order line items</p>
		</CardContent>
	</Card>

	<Card class="border-l-4 border-l-indigo-500">
		<CardHeader class="pb-2">
			<CardTitle class="flex items-center justify-between text-sm font-medium text-muted-foreground">
				<span>Total Orders</span>
				<ShoppingCart class="size-4 text-indigo-500" />
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="text-2xl font-bold text-indigo-600">{data.summary.totalOrders}</div>
			<p class="mt-1 text-xs text-muted-foreground">
				{data.summary.statusBreakdown.map((s) => `${s.count} ${s.status}`).join(' · ')}
			</p>
		</CardContent>
	</Card>

	<Card class="border-l-4 border-l-amber-500">
		<CardHeader class="pb-2">
			<CardTitle class="flex items-center justify-between text-sm font-medium text-muted-foreground">
				<span>Avg Order Value</span>
				<TrendingUp class="size-4 text-amber-500" />
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="text-2xl font-bold text-amber-600">{formatETB(data.summary.averageOrderValue)}</div>
			<p class="mt-1 text-xs text-muted-foreground">Revenue / orders</p>
		</CardContent>
	</Card>

	<Card class="border-l-4 border-l-violet-500">
		<CardHeader class="pb-2">
			<CardTitle class="flex items-center justify-between text-sm font-medium text-muted-foreground">
				<span>Items Sold</span>
				<Package class="size-4 text-violet-500" />
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="text-2xl font-bold text-violet-600">{data.summary.totalItemsSold}</div>
			<p class="mt-1 text-xs text-muted-foreground">Units across all orders</p>
		</CardContent>
	</Card>

	<Card class="border-l-4 border-l-sky-500">
		<CardHeader class="pb-2">
			<CardTitle class="flex items-center justify-between text-sm font-medium text-muted-foreground">
				<span>Delivery Fees</span>
				<Truck class="size-4 text-sky-500" />
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="text-2xl font-bold text-sky-600">{formatETB(data.summary.totalDeliveryFees)}</div>
			<p class="mt-1 text-xs text-muted-foreground">Collected from customers</p>
		</CardContent>
	</Card>
</div>

<!-- Trend charts -->
<div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
	<RevenueTrendChart trend={data.summary.dailyTrend} />
	<OrdersTrendChart trend={data.summary.dailyTrend} />
</div>

<!-- Breakdown charts -->
<div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
	<StatusBreakdownChart breakdown={data.summary.statusBreakdown} />
	<PaymentBreakdownChart breakdown={data.summary.paymentBreakdown} />
	<CategoryBreakdownChart breakdown={data.summary.categoryBreakdown} />
</div>

<!-- Top products -->
<div class="mb-6">
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Package class="size-5 text-primary" />
				Top Products
			</CardTitle>
		</CardHeader>
		<CardContent>
			{#if data.summary.topProducts.length === 0}
				<p class="py-4 text-center text-sm text-muted-foreground">No product sales in this range</p>
			{:else}
				<div class="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
					{#each data.summary.topProducts as product, i (product.productId)}
						<div class="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0">
							<div class="flex items-center gap-3">
								<span class="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
									{i + 1}
								</span>
								<DataTableLinks
									id={String(product.productId)}
									name={product.name}
									link="/dashboard/products/single"
									target="_blank"
								/>
							</div>
							<div class="text-right">
								<div class="font-medium">{formatETB(product.revenue)}</div>
								<div class="text-xs text-muted-foreground">{product.quantitySold} sold</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>
</div>

{#if data.detailRows.length === 0}
	<div class="flex h-96 w-full flex-col items-center justify-center lg:w-5xl">
		<p class="justify-self-cente mt-4 flex flex-row gap-4 text-center text-4xl">
			<Frown class="h-12 w-16 animate-bounce" />
			No Order Data for this Range or Filters
		</p>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		<h2 class="my-4 text-2xl">Order Line Items ({data.pagination.totalCount})</h2>

		<p class="text-xs text-muted-foreground">
			Filters below apply instantly to the rows already on this page — no server round trip.
			Use the filters above to change what's loaded from the database.
		</p>

		<FilterMenu
			bind:filteredList
			data={data.detailRows}
			filterKeys={['status', 'paymentMethodName', 'productName']}
		/>

		{#key filteredList}
			<DataTable
				data={filteredList}
				{columns}
				fileName="Reports {data.filters.start ?? 'all'} - {data.filters.end ?? 'time'}"
			/>
		{/key}
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
