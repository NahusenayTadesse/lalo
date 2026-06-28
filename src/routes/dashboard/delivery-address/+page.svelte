<script>
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import { Button } from '$lib/components/ui/button/index';
	import Edit from './edit.svelte';
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
				// You can pass whatever you need from `row.original` to the component
				return renderComponent(Edit, {
					id: row.original.id,
					name: row.original.name,
					fee: row.original.fee,
					action: '?/edit',
					data: data?.editForm,
					icon: false,
					status: row.original.status
				});
			}
		},
		{
			accessorKey: 'fee',
			header: 'Fee',
			sortable: true,
			cell: ({ row }) => {
				return 'ETB ' + row.original.fee;
			}
		},

		{
			accessorKey: 'status',
			header: 'Status',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(Statuses, {
					status: row.original.status ? 'Active' : 'Inactive'
				});
			}
		},

		{
			accessorKey: '',
			header: 'Edit',
			sortable: true,
			cell: ({ row }) => {
				// You can pass whatever you need from `row.original` to the component
				return renderComponent(Edit, {
					id: row.original.id,
					name: row.original.name,
					description: row.original.description,
					action: '?/edit',
					data: data?.editForm,
					icon: true,
					status: row.original.status
				});
			}
		}
	];
	let { data } = $props();
	import { superForm } from 'sveltekit-superforms/client';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Plus } from '@lucide/svelte';

	const { form, errors, enhance, delayed, message } = superForm(data.form, {});

	import { toast } from 'svelte-sonner';
	import Free from './free.svelte';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});
</script>

<svelte:head>
	<title>Delivery Address</title>
</svelte:head>




	{#key data?.allData}
		<DialogComp IconComp={Plus} title="Add New Delivery Address" variant="default">
			<form action="?/add" use:enhance id="main" class="flex flex-col gap-4" method="post">
				<InputComp {form} {errors} label="Place Name" type="text" name="name" required={true} />

				<InputComp
					{form}
					{errors}
					label="Delivery Fee"
					type="number"
					name="fee"
					placeholder="Enter Delivery Fee"
					required={true}
					rows={10}
				/>
				<InputComp
					label="Status"
					name="status"
					type="select"
					{form}
					{errors}
					items={[
						{ value: true, name: 'Active' },
						{ value: false, name: 'Inactive' }
					]}
				/>

				<Button type="submit" form="main">
					{#if $delayed}
						<LoadingBtn name="Adding Delivery Address" />
					{:else}
						<Plus /> Add Delivery Address
					{/if}
				</Button>
			</form>
		</DialogComp>
	{/key}

	{#if data?.freeData}
		<div class="rounded-2xl mt-4 border border-primary p-4 shadow-sm ring-1 ring-foreground/5">
			<div class="text-sm font-semibold ">Free Delivery Overview</div>
			<div class="mt-3 grid gap-3 sm:grid-cols-2">
				<div class="rounded-xl p-3">
					<div class="text-xs uppercase tracking-[0.2em] ">Free delivery starts at</div>
					<div class="mt-1 text-lg font-semibold">ETB {data?.freeData.threshold}</div>
				</div>
				<div class="rounded-xl p-3">
					<div class="text-xs uppercase tracking-[0.2em] ">Suggestions start at</div>
					<div class="mt-1 text-lg font-semibold">ETB {data?.freeData.suggestionThreshold}</div>
				</div>
			</div>
				<Free
		data={data?.freeForm}
		action="?/free"
		threshold={data?.freeData?.threshold}
		suggestionThreshold={data?.freeData?.suggestionThreshold}
	/>
		</div>
	{/if}
{#key data.allData}
	<DataTable {columns} data={data?.allData} search={true} />
{/key}
