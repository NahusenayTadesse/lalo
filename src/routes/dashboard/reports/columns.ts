import { renderComponent } from '$lib/components/ui/data-table/index.js';
import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
import Statuses from '$lib/components/Table/statuses.svelte';
import { formatETB } from '$lib/global.svelte';

export const columns = [
	{
		accessorKey: 'index',
		header: '#',
		cell: (info) => info.row.index + 1
	},

	{
		accessorKey: 'orderId',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Order',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => `#${row.original.orderId}`
	},

	{
		accessorKey: 'date',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Date',
				onclick: column.getToggleSortingHandler()
			}),
		// `date` already arrives pre-formatted from the server (DATE_FORMAT(...)),
		// so it's rendered as-is — re-parsing it with `new Date(...)` produced "Invalid Date".
		sortable: true
	},

	{
		accessorKey: 'status',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Status',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => renderComponent(Statuses, { status: row.original.status })
	},

	{
		accessorKey: 'customerName',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Customer',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => {
			if (!row.original.customerId) return row.original.customerName ?? '—';
			return renderComponent(DataTableLinks, {
				id: row.original.customerId,
				name: row.original.customerName ?? '—',
				link: `/dashboard/customers`,
				target: '_blank'
			});
		}
	},

	{
		accessorKey: 'productName',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Product',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => {
			return renderComponent(DataTableLinks, {
				id: row.original.productId,
				name: row.original.productName,
				link: `/dashboard/products/single`,
				target: '_blank'
			});
		}
	},

	{
		accessorKey: 'quantityPurchased',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Qty',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true
	},

	{
		accessorKey: 'unitPrice',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Unit Price',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => formatETB(Number(row.original.unitPrice))
	},

	{
		accessorKey: 'lineTotal',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Line Total',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => formatETB(Number(row.original.lineTotal))
	},

	{
		accessorKey: 'paymentMethodName',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Payment Method',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => row.original.paymentMethodName ?? '—'
	},

	{
		accessorKey: 'totalPaid',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Order Total Paid',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) =>
			row.original.totalPaid !== null ? formatETB(Number(row.original.totalPaid)) : '—'
	},

	{
		accessorKey: 'receipt',
		header: 'Receipt',
		sortable: false,
		cell: ({ row }) => {
			if (!row.original.receipt) return 'No Receipt';
			return renderComponent(DataTableLinks, {
				id: row.original.receipt,
				name: 'View Receipt',
				link: `/dashboard/files`,
				target: '_blank'
			});
		}
	}
];
