import { renderComponent } from '@nahu/admin-kit/components/ui/data-table/index.js';
import DataTableLinks from '@nahu/admin-kit/components/Table/data-table-links.svelte';
import DataTableActions from './data-table-actions.svelte';
import DataTableSort from '@nahu/admin-kit/components/Table/data-table-sort.svelte';

const TYPE_LABELS: Record<string, string> = {
	receive: 'Received',
	sale: 'Sold',
	return: 'Returned',
	damage: 'Damaged',
	correction: 'Correction'
};

export const columns = [
	{
		accessorKey: 'index',
		header: '#',
		cell: (info) => info.row.index + 1
	},

	{
		accessorKey: 'date',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Changed At',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true
	},

	{
		accessorKey: 'quantity',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Changed Quantity',
				onclick: column.getToggleSortingHandler()
			}),

		sortable: true
	},

	{
		accessorKey: 'type',
		header: 'Type',
		cell: ({ row }) => TYPE_LABELS[row.original.type] ?? 'Adjustment'
	},

	{
		accessorKey: 'variant',
		header: 'Variant',
		cell: ({ row }) => row.original.variant ?? 'Whole product'
	},

	{
		accessorKey: 'batchNumber',
		header: 'Batch',
		cell: ({ row }) => row.original.batchNumber ?? '—'
	},

	{
		accessorKey: 'balanceAfter',
		header: 'Stock After',
		cell: ({ row }) => row.original.balanceAfter ?? '—'
	},

	{
		accessorKey: 'reason',
		header: 'Reason',
		cell: ({ row }) => row.original.reason ?? '—'
	},

	{
		accessorKey: 'changedBy',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Changed By',
				onclick: column.getToggleSortingHandler()
			}),

		sortable: true,
		cell: ({ row }) => {
			return renderComponent(DataTableLinks, {
				id: row.original.extraSettings,
				name: row.original.changedBy,
				link: `/dashboard/users/${row.original.changedById}`,
				target: '_blank'
			});
		}
	},

	{
		accessorKey: 'reciept',
		header: 'Reciept',
		sortable: true,
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			//
			if (row.original.reciept) {
				return renderComponent(DataTableLinks, {
					id: row.original.extraSettings,
					name: 'View Reciept',
					link: `/dashboard/files/${row.original.reciept}`,
					target: '_blank'
				});
			} else {
				return 'No Reciept';
			}
		}
	}

	// {
	// 	accessorKey: 'action',
	// 	header: 'Actions',
	// 	cell: ({ row }) => {
	// 		// You can pass whatever you need from `row.original` to the component
	// 		return renderComponent(DataTableActions, {
	// 			id: row.original.id,
	// 			recieptLink: row.original.recieptLink,
	// 			date: row.original.date
	// 		});
	// 	}
	// }
];
