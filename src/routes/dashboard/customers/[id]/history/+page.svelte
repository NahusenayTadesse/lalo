<script lang="ts">
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { editCustomer } from '$lib/Zodschema';

	let { data } = $props();

	import { Button } from '$lib/components/ui/button/index.js';

	import { ArrowLeft } from '@lucide/svelte';

	import Empty from '$lib/components/Empty.svelte';

	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import OrderItems from '../../../orders/order-items.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import FilterMenu from '$lib/components/Table/FilterMenu.svelte';
	export const columns = [
		{
			accessorKey: 'index',
			header: '#',
			cell: (info) => info.row.index + 1,
			sortable: false
		},

		{
			accessorKey: 'items',
			header: 'Items',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(OrderItems, {
					items:
						data?.allItems?.filter((item) => Number(item.orderId) === Number(row.original.id)) ??
						[],
					currency: 'ETB'
				});
			}
		},

		{
			accessorKey: 'status',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Status',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(Statuses, {
					status: row.original.status
				});
			}
		},

		{
			accessorKey: 'createdAt',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Ordered On',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: false
		}
	];

	let filteredList = $derived(data?.allData);

	import { page } from '$app/state';
</script>

<svelte:head>
	<title>Order History for {data?.customer?.customerName}</title>
</svelte:head>
<Button href="/dashboard/customers/{page.params.id}">
	<ArrowLeft /> Back
</Button>
{#if data?.allData}
	<header class="mt-6 flex w-lg flex-col gap-1 pb-4">
		<h1 class="text-3xl font-bold tracking-tight text-foreground">Order History</h1>
		<p class="text-sm text-foreground">
			Viewing records for <span class="font-semibold text-slate-700"
				>{data?.customer?.customerName}</span
			>
		</p>
	</header>
	<FilterMenu bind:filteredList filterKeys={['status']} data={data?.allData} />
	<DataTable
		{columns}
		data={filteredList}
		class="w-6xl!"
		fileName="Pending Orders - {data?.customer?.customerName}"
		search={true}
	/>
{:else}
	<Empty title="orders" />
{/if}
