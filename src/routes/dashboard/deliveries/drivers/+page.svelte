<script lang="ts">
	import { renderComponent } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import Statuses from '@nahu/admin-kit/components/Table/statuses.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { ArrowLeft } from '@lucide/svelte';
	import DriverForm from './driver-form.svelte';
	import TwoLines from '../two-lines.svelte';

	let { data } = $props();
	type Row = (typeof data.drivers)[number];
	type Cell = { row: { original: Row } };

	const columns = [
		{
			accessorKey: 'name',
			header: 'Driver',
			cell: ({ row }: Cell) =>
				renderComponent(TwoLines, {
					main: row.original.name,
					sub: row.original.phone,
					href: `tel:${row.original.phone}`
				})
		},
		{
			accessorKey: 'vehicleType',
			header: 'Vehicle',
			cell: ({ row }: Cell) =>
				renderComponent(TwoLines, {
					main: row.original.vehicleType,
					sub: row.original.vehiclePlate
				})
		},
		{ accessorKey: 'out', header: 'Out now' },
		{ accessorKey: 'delivered', header: 'Delivered' },
		{ accessorKey: 'failed', header: 'Failed attempts' },
		{
			accessorKey: 'onTime',
			header: 'On time',
			cell: ({ row }: Cell) =>
				row.original.promised
					? `${Math.round((row.original.onTime / row.original.promised) * 100)}% of ${row.original.promised}`
					: '—'
		},
		{
			accessorKey: 'lastTrip',
			header: 'Last trip',
			cell: ({ row }: Cell) => row.original.lastTrip ?? '—'
		},
		{
			accessorKey: 'active',
			header: 'Status',
			cell: ({ row }: Cell) =>
				renderComponent(Statuses, { status: row.original.active ? 'active' : 'inactive' })
		},
		{ accessorKey: 'notes', header: 'Notes', cell: ({ row }: Cell) => row.original.notes ?? '' },
		{
			accessorKey: 'edit',
			header: 'Edit',
			cell: ({ row }: Cell) =>
				renderComponent(DriverForm, { data: data.form, driver: row.original })
		}
	];
</script>

<svelte:head>
	<title>Drivers</title>
</svelte:head>

<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
	<Button variant="outline" href="/dashboard/deliveries"><ArrowLeft /> Deliveries</Button>
	<DriverForm data={data.form} />
</div>

<p class="mb-4 text-sm text-muted-foreground">
	Saved drivers fill in the name, phone and vehicle when dispatching. A one-off driver can still be
	typed in on the delivery itself; deactivating a driver keeps their past trips.
</p>

<DataTable {columns} data={data.drivers} fileName="Drivers" />
