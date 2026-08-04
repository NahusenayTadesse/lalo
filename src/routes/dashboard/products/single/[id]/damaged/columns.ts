import { renderComponent } from '$lib/components/ui/data-table/index.js';
import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
import DataTableActions from './data-table-actions.svelte';
import DataTableSort from '$lib/components/Table/data-table-sort.svelte';

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
		// `date` already arrives pre-formatted from the server (DATE_FORMAT(...)),
		// so it's rendered as-is — re-parsing it with `new Date(...)` produced "Invalid Date".
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
		// `damagedBy` is a freetext name entered on the damage form, not a user
		// account — there's no id to link it to, so it's rendered as plain text.
		accessorKey: 'damagedBy',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Damaged By',
				onclick: column.getToggleSortingHandler()
			}),

		sortable: true
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
