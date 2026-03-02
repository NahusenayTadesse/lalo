<script lang="ts">
	import { zod4Client } from 'sveltekit-superforms/adapters';

	let { data } = $props();

	import SingleTable from '$lib/components/SingleTable.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { superForm } from 'sveltekit-superforms/client';

	import { ArrowLeft, History, Pencil, Save } from '@lucide/svelte';
	import type { Snapshot } from '@sveltejs/kit';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Delete from '$lib/forms/Delete.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import SingleView from '$lib/components/SingleView.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { edit } from './schema.js';

	let singleTable = $derived([
		{ name: 'Name', value: data.customer?.customerName },
		{ name: 'Phone', value: data.customer?.phone },
		{ name: 'Email', value: data.customer?.email },
		{ name: 'Address', value: data.customer?.address },
		{ name: 'Status', value: data.customer?.status ? 'Active' : 'Inactive' },

		{
			name: 'Number of Pending Orders',
			value: data?.orderCounts?.find((item) => item.status === 'pending')?.count ?? 0
		},
		{
			name: 'Number of Delivered Orders',
			value: data?.orderCounts?.find((item) => item.status === 'delivered')?.count ?? 0
		},
		{
			name: 'Number of Delivered Orders',
			value: data?.orderCounts?.find((item) => item.status === 'cancelled')?.count ?? 0
		},
		{ name: 'Number of Days Since Joined', value: data.customer?.daysSinceJoined + ' Days' }
	]);

	const { form, errors, enhance, delayed, capture, restore, allErrors, message } = superForm(
		data.form,
		{
			validators: zod4Client(edit),
			resetForm: false
		}
	);

	export const snapshot: Snapshot = { capture, restore };

	let editCus = $state(false);
	import { toast } from 'svelte-sonner';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import OrderItems from '../../orders/order-items.svelte';
	import { page } from '$app/state';
	const columns = [
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
			accessorKey: 'createdAt',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Ordered On',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: false
		}
	];

	$form.name = data?.customer?.customerName;
	$form.phone = data?.customer?.phone;
	$form.email = data?.customer?.email;
	$form.address = data?.customer?.address;
	$form.status = data?.customer?.status;
</script>

<svelte:head>
	<title>Customer Details</title>
</svelte:head>

{#if data?.customer}
	<SingleView title="Customer Details">
		<div class="mt-4 flex w-full flex-row items-start justify-start gap-2 pl-4">
			<Button onclick={() => (editCus = !editCus)}>
				{#if !editCus}
					<Pencil class="h-4 w-4" />
					Edit
				{:else}
					<ArrowLeft class="h-4 w-4" />

					Back
				{/if}
			</Button>
			<Button href="{page.url.pathname}/history">
				<History /> Order History
			</Button>
			<Delete redirect="/dashboard/customers" />
		</div>
		{#if editCus === false}
			<div class="w-full p-4"><SingleTable {singleTable} /></div>
		{:else}
			<form
				id="main"
				action="?/edit"
				class="flex w-full! min-w-full! flex-col items-center justify-center gap-3 p-2"
				use:enhance
				method="post"
				enctype="multipart/form-data"
			>
				<Errors allErrors={$allErrors} />

				<InputComp
					label="Name"
					name="name"
					type="text"
					{form}
					{errors}
					required={true}
					placeholder="Enter Customer Name"
				/>
				<InputComp
					label="Phone"
					name="phone"
					type="tel"
					{form}
					{errors}
					required={true}
					placeholder="Enter Customer Phone"
				/>
				<InputComp
					label="Email"
					name="email"
					type="email"
					{form}
					{errors}
					required={false}
					placeholder="Enter Customer Email"
				/>
				<InputComp
					label="Address"
					name="address"
					type="text"
					{form}
					{errors}
					required={false}
					placeholder="Enter Customer Address"
				/>

				<InputComp
					label="Status"
					name="status"
					type="select"
					{form}
					{errors}
					required={true}
					placeholder="Enter Customer Phone"
					items={[
						{ value: true, name: 'Active' },
						{ value: false, name: 'InActive' }
					]}
				/>

				<Button type="submit" class="w-full" form="main" variant="default">
					{#if $delayed}
						<LoadingBtn name="Saving Changes" />
					{:else}
						<Save class="h-4 w-4" />
						Save Changes
					{/if}
				</Button>
			</form>
		{/if}
	</SingleView>

	<header class="mt-6 flex w-lg flex-col gap-1 pb-4">
		<h1 class="text-3xl font-bold tracking-tight text-foreground">Pending Orders</h1>
		<p class="text-sm text-foreground">
			Viewing active records for <span class="font-semibold text-slate-700"
				>{data?.customer?.customerName}</span
			>
		</p>
	</header>

	<DataTable
		{columns}
		data={data?.allData}
		class="w-6xl!"
		fileName="Pending Orders - {data?.customer?.customerName}"
		search={true}
	/>
{:else}
	<Empty title="customer" />
{/if}
