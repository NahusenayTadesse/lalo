<script lang="ts">
	import { enhance } from '$app/forms';
	import { navigateWithQuery } from '@nahu/admin-kit/queryFilters';
	import { renderComponent } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import DataTableSort from '@nahu/admin-kit/components/Table/data-table-sort.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import type { HeaderContext } from '@tanstack/table-core';
	import {
		AlarmClock,
		Banknote,
		CircleCheckBig,
		Clock,
		IdCard,
		ListTodo,
		PackageCheck,
		Plus,
		Sheet,
		Timer,
		Truck,
		TriangleAlert,
		Ban
	} from '@lucide/svelte';
	import StatCard from '$lib/components/dashboard/stat-card.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import DeliveryStatus from '$lib/components/delivery/delivery-status.svelte';
	import ItemsBatches from './items-batches.svelte';
	import TwoLines from './two-lines.svelte';
	import ManageButton from './manage-button.svelte';
	import Manage from './manage.svelte';

	let { data } = $props();

	type Row = (typeof data.allData)[number];

	let selectedId = $state<number | null>(null);
	const selected = $derived(data.allData.find((d) => d.id === selectedId));
	// Open while the delivery is on screen. One that leaves the current filter after
	// an action (dispatched, while viewing "ready") closes it.
	const manage = (id: number) => (selectedId = id);

	const presets = [
		{ value: 'active', label: 'In progress', icon: ListTodo },
		{ value: 'ready', label: 'Ready', icon: PackageCheck },
		{ value: 'dispatched', label: 'Out for delivery', icon: Truck },
		{ value: 'late', label: 'Late', icon: AlarmClock },
		{ value: 'delivered', label: 'Delivered', icon: CircleCheckBig },
		{ value: 'failed', label: 'Failed', icon: TriangleAlert },
		{ value: 'cancelled', label: 'Cancelled', icon: Ban },
		{ value: 'all', label: 'All', icon: Sheet }
	];
	const dateOptions = [
		{ value: 'dispatched', label: 'Left the shop' },
		{ value: 'delivered', label: 'Arrived' },
		{ value: 'scheduled', label: 'Expected' },
		{ value: 'queued', label: 'Queued' }
	];

	const duration = (minutes: number | null) =>
		minutes === null
			? null
			: minutes < 60
				? `${minutes} min`
				: `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

	const sortable =
		(name: string) =>
		({ column }: HeaderContext<Row, unknown>) =>
			renderComponent(DataTableSort, { name, onclick: column.getToggleSortingHandler() });

	const columns = [
		{
			accessorKey: 'orderId',
			header: sortable('Order'),
			sortable: true,
			cell: ({ row }: { row: { original: Row } }) =>
				renderComponent(ManageButton, {
					orderId: row.original.orderId,
					onclick: () => manage(row.original.id)
				})
		},
		{
			accessorKey: 'status',
			header: sortable('Status'),
			sortable: true,
			cell: ({ row }: { row: { original: Row } }) =>
				renderComponent(DeliveryStatus, { status: row.original.status, overdue: row.original.late })
		},
		{
			accessorKey: 'customer',
			header: sortable('Customer'),
			sortable: true,
			cell: ({ row }: { row: { original: Row } }) =>
				renderComponent(TwoLines, {
					main: row.original.recipientName ?? row.original.customer,
					sub: row.original.recipientPhone,
					href: row.original.recipientPhone ? `tel:${row.original.recipientPhone}` : null
				})
		},
		{
			accessorKey: 'area',
			header: sortable('Destination'),
			sortable: true,
			cell: ({ row }: { row: { original: Row } }) =>
				row.original.method === 'pickup'
					? 'Store pickup'
					: renderComponent(TwoLines, { main: row.original.area, sub: row.original.address })
		},
		{
			accessorKey: 'driverName',
			header: sortable('Driver & vehicle'),
			sortable: true,
			cell: ({ row }: { row: { original: Row } }) =>
				renderComponent(TwoLines, {
					main: row.original.driverName
						? `${row.original.driverName}${row.original.driverPhone ? ` · ${row.original.driverPhone}` : ''}`
						: null,
					sub:
						[row.original.vehicleType, row.original.vehiclePlate].filter(Boolean).join(' · ') ||
						null
				})
		},
		{
			accessorKey: 'items',
			header: 'Items & batches',
			sortable: false,
			cell: ({ row }: { row: { original: Row } }) =>
				renderComponent(ItemsBatches, { items: row.original.items, batches: row.original.batches })
		},
		{
			accessorKey: 'scheduledFor',
			header: sortable('Expected'),
			sortable: true,
			cell: ({ row }: { row: { original: Row } }) => row.original.scheduledFor ?? '—'
		},
		{
			accessorKey: 'dispatchedAt',
			header: sortable('Left the shop'),
			sortable: true,
			cell: ({ row }: { row: { original: Row } }) =>
				renderComponent(TwoLines, {
					main: row.original.dispatchedAt,
					sub: row.original.dispatchedBy ? `approved by ${row.original.dispatchedBy}` : null
				})
		},
		{
			accessorKey: 'deliveredAt',
			header: sortable('Arrived'),
			sortable: true,
			cell: ({ row }: { row: { original: Row } }) =>
				renderComponent(TwoLines, {
					main: row.original.deliveredAt,
					sub:
						row.original.confirmedVia === 'customer'
							? 'confirmed by customer'
							: row.original.confirmedBy
								? `confirmed by ${row.original.confirmedBy}`
								: null
				})
		},
		{
			accessorKey: 'minutes',
			header: 'Took',
			sortable: false,
			cell: ({ row }: { row: { original: Row } }) => duration(row.original.minutes) ?? '—'
		},
		{
			accessorKey: 'payment',
			header: 'Payment',
			sortable: false,
			cell: ({ row }: { row: { original: Row } }) =>
				row.original.paid
					? 'Paid'
					: `Collect ETB ${Number(row.original.cashToCollect ?? 0).toLocaleString()}`
		}
	];

	let queueOpen = $state(false);
	let queueing = $state(false);
</script>

<svelte:head>
	<title>Deliveries</title>
</svelte:head>

<div class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
	<StatCard title="Ready to dispatch" value={data.stats.ready ?? 0}>
		{#snippet icon()}<PackageCheck />{/snippet}
	</StatCard>
	<StatCard title="Out for delivery" value={data.stats.dispatched ?? 0}>
		{#snippet icon()}<Truck />{/snippet}
	</StatCard>
	<StatCard
		title="Late"
		value={data.stats.late ?? 0}
		description="Past the expected time"
		className={data.stats.late ? 'ring-2 ring-destructive/50' : ''}
	>
		{#snippet icon()}<AlarmClock />{/snippet}
	</StatCard>
	<StatCard title="Delivered today" value={data.stats.deliveredToday ?? 0}>
		{#snippet icon()}<CircleCheckBig />{/snippet}
	</StatCard>
	<StatCard
		title="Average trip"
		value={duration(data.stats.avgMinutes) ?? '—'}
		description="Shop to customer, last 30 days"
	>
		{#snippet icon()}<Timer />{/snippet}
	</StatCard>
	<StatCard
		title="Cash on the road"
		value={`ETB ${(data.stats.cashOut ?? 0).toLocaleString()}`}
		description="To collect on deliveries out now"
	>
		{#snippet icon()}<Banknote />{/snippet}
	</StatCard>
</div>

<div class="mb-4 flex flex-col gap-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex flex-wrap items-center gap-2">
			{#each presets as preset (preset.value)}
				<Button
					variant={data.status === preset.value ? 'default' : 'outline'}
					onclick={() => navigateWithQuery({ status: preset.value, page: 1 })}
				>
					<preset.icon />
					{preset.label}
					{#if preset.value === 'late' && data.stats.late}
						<span class="rounded-full bg-destructive px-1.5 text-xs text-white"
							>{data.stats.late}</span
						>
					{/if}
				</Button>
			{/each}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<Button variant="outline" href="/dashboard/deliveries/drivers"><IdCard /> Drivers</Button>
			<DialogComp
				bind:open={queueOpen}
				title="Queue order"
				dialogTitle="Queue an order for delivery"
				variant="default"
				IconComp={Plus}
			>
				<form
					method="post"
					action="?/queue"
					class="flex flex-col gap-3 p-1"
					use:enhance={() => {
						queueing = true;
						return async ({ result, update }) => {
							queueing = false;
							if (result.type === 'success') {
								toast.success(String(result.data?.message ?? 'Queued'));
								queueOpen = false;
							} else if (result.type === 'failure') {
								toast.error(String(result.data?.message ?? 'Could not queue the order'));
							}
							await update();
						};
					}}
				>
					<p class="text-sm text-muted-foreground">
						Paid orders join the queue by themselves once the payment is confirmed. Queue an unpaid
						one here to deliver it cash on delivery — the driver is shown what to collect.
					</p>
					<select
						name="orderId"
						required
						class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
					>
						<option value="">Choose a pending order…</option>
						{#each data.queueable as order (order.value)}
							<option value={order.value}>{order.name}</option>
						{/each}
					</select>
					<Button type="submit" disabled={queueing}
						><Truck /> {queueing ? 'Queueing…' : 'Queue for delivery'}</Button
					>
				</form>
			</DialogComp>
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-2 text-sm">
		<Clock class="size-4 text-muted-foreground" />
		<span class="text-muted-foreground">Date filter applies to:</span>
		{#each dateOptions as option (option.value)}
			<Button
				size="sm"
				variant={data.dateOn === option.value ? 'secondary' : 'ghost'}
				onclick={() => navigateWithQuery({ dateOn: option.value, page: 1 })}
			>
				{option.label}
			</Button>
		{/each}
		<span class="text-xs text-muted-foreground">
			· Search finds order numbers, names, phones, plates, addresses and batch numbers.
		</span>
	</div>
</div>

<DataTable
	{columns}
	data={data.allData}
	fileName="Deliveries"
	server={data.table}
	facetKeys={[
		'driverName',
		'vehicleType',
		'area',
		'method',
		'payment',
		'confirmedVia',
		'dispatchedBy'
	]}
	facetLabels={{
		driverName: 'Driver',
		vehicleType: 'Vehicle',
		area: 'Area',
		method: 'Delivery / pickup',
		payment: 'Payment',
		confirmedVia: 'Confirmed by',
		dispatchedBy: 'Approved by'
	}}
	charts
	dateFilter={dateOptions.find((o) => o.value === data.dateOn)?.label}
	rowClass={(row: Row) => (row.late ? 'bg-destructive/5' : null)}
/>

<Manage
	bind:open={() => selected !== undefined, (open) => !open && (selectedId = null)}
	delivery={selected}
	drivers={data.drivers}
	paymentMethodList={data.paymentMethodList}
	tripForm={data.tripForm}
	deliverForm={data.deliverForm}
	reasonForm={data.reasonForm}
	requeueForm={data.requeueForm}
/>
