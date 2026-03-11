<script lang="ts">
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import Edit from '../edit.svelte';

	const columns = [
		{
			accessorKey: 'index',
			header: '#',
			cell: (info) => info.row.index + 1,
			sortable: false
		},
		{
			accessorKey: 'name',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Name',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(Edit, {
					id: row.original.id,
					customer: row.original.customerId,
					customerList: data?.fetchedCustomers,
					customerName: row.original.name,
					orderItems: data?.allItems,
					priceList: data?.fetchedPrices,
					paymentMethodList: data?.paymentMethodList,
					productList: data?.fetchedProducts,
					data: data?.editForm,
					icon: false,
					status: row.original.status
				});
			}
		},

		{
			accessorKey: 'phone',
			header: 'Phone',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(Copy, {
					data: row.original.phone
				});
			}
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
			header: 'Status',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(Statuses, {
					status: row.original.status
				});
			}
		},

		{
			accessorKey: '',
			header: 'Edit',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(Edit, {
					id: row.original.id,
					customer: row.original.customerId,
					customerList: data?.fetchedCustomers,
					customerName: row.original.name,
					orderItems: data?.allItems,
					priceList: data?.fetchedPrices,
					paymentMethodList: data?.paymentMethodList,
					productList: data?.fetchedProducts,
					data: data?.editForm,
					icon: true,
					status: row.original.status
				});
			}
		}
	];
	let { data } = $props();

	import OrderItems from '$lib/components/order-items.svelte';

	import Copy from '$lib/Copy.svelte';
</script>

<svelte:head>
	<title>Cancelled Orders</title>
</svelte:head>

{#key data.allData}
	<DataTable {columns} data={data?.allData} search={true} />
{/key}
