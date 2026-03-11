<script lang="ts">
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import Edit from '../edit.svelte';
	import DataTableLinks from '$lib/components/Table/data-table-links.svelte';

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
					status: row.original.status,
					image: row.original.recieptLink,
					paymentMethod: row.original.paymentMethod
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
			accessorKey: 'paymentMethodName',
			header: 'Payment Method Name',
			sortable: true,
			cell: ({ row }) => {
				return row.original.paymentMethodName || 'No Payment Method Added';
			}
		},
		{
			accessorKey: 'recieptLink',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Reciepts',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => {
				// You can pass whatever you need from `row.original` to the component
				return renderComponent(DataTableLinks, {
					id: row.original.recieptLink,
					name: row.original.recieptLink ? 'View Receipt' : 'No Reciept Uploaded',
					link: '/files',
					target: '_blank'
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
					paymentMethodList: data?.paymentMethodList,
					priceList: data?.fetchedPrices,
					productList: data?.fetchedProducts,
					data: data?.editForm,
					icon: true,
					status: row.original.status,
					image: row.original.recieptLink,
					paymentMethod: row.original.paymentMethod
				});
			}
		}
	];
	let { data } = $props();

	import OrderItems from '$lib/components/order-items.svelte';

	import Copy from '$lib/Copy.svelte';
</script>

<svelte:head>
	<title>Delivered Orders</title>
</svelte:head>

{#key data.allData}
	<DataTable {columns} data={data?.allData} search={true} />
{/key}
