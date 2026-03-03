<script lang="ts">
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { edit as schema } from './schema';

	let { data } = $props();

	import SingleTable from '$lib/components/SingleTable.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { superForm } from 'sveltekit-superforms/client';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { ArrowLeft, Pencil, Save, Trash } from '@lucide/svelte';
	import type { Snapshot } from '@sveltejs/kit';

	import Delete from '$lib/forms/Delete.svelte';
	import SingleView from '$lib/components/SingleView.svelte';
	// import DataTable from '$lib/components/Table/data-table.svelte';
	// import { columns, userColumns } from './columns.js';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';

	let singleTable = $derived([
		{ name: 'Name', value: data.single?.name },
		{ name: 'Phone', value: data.single?.phone },
		{ name: 'Email', value: data.single?.email },

		{
			name: 'Description',
			value: data.single?.description
		},

		{ name: 'Status', value: data.single?.status ? 'Active' : 'Inactive' }
	]);

	const { form, errors, enhance, delayed, capture, restore, allErrors, message } = superForm(
		data.form,
		{
			validators: zod4Client(schema),
			resetForm: false
		}
	);

	import { toast } from 'svelte-sonner';
	import ComboboxComp from '$lib/formComponents/ComboboxComp.svelte';

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	export const snapshot: Snapshot = { capture, restore };

	let edit = $state(false);

	$form.name = data?.single?.name;
	$form.phone = data?.single?.phone;
	$form.email = data?.single?.email;
	$form.description = data?.single?.description || '';

	$form.status = data?.single?.status;
</script>

<svelte:head>
	<title>Supplier Details</title>
</svelte:head>
<SingleView title="Supplier Details">
	<div class="mt-4 flex w-full flex-row items-start justify-start gap-2 pl-4">
		<Button onclick={() => (edit = !edit)}>
			{#if !edit}
				<Pencil class="h-4 w-4" />
				Edit
			{:else}
				<ArrowLeft class="h-4 w-4" />

				Back
			{/if}
		</Button>
		{#if data.single?.userCount > 0}
			<Button
				variant="destructive"
				onclick={() => toast.error('Cannot delete role with users')}
				title="Cannot delete role with users"><Trash /> Delete</Button
			>
		{:else}
			<Delete redirect="/dashboard/admin-panel/roles" />
		{/if}
	</div>
	{#if edit === false}
		<div class="w-full p-4"><SingleTable {singleTable} /></div>
	{/if}
	{#if edit}
		<div class="w-full p-4">
			<form use:enhance action="?/edit" id="main" class="flex flex-col gap-4" method="POST">
				<Errors allErrors={$allErrors} />

				<InputComp {form} {errors} label="" type="hidden" name="addressId" required={true} />
				<InputComp {form} {errors} label="name" type="text" name="name" required={true} />
				<InputComp {form} {errors} label="phone" type="tel" name="phone" required={true} />
				<InputComp {form} {errors} label="email" type="email" name="email" required={false} />
				<InputComp
					{form}
					{errors}
					label="description"
					type="textarea"
					name="description"
					required={false}
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

				<Button type="submit" class="mt-4" form="main">
					{#if $delayed}
						<LoadingBtn name="Saving Change" />
					{:else}
						<Save class="h-4 w-4" />

						Save Changes
					{/if}
				</Button>
			</form>
		</div>
	{/if}
</SingleView>

<br />

<!-- {#if data?.userList?.length}
	<h3>Users on this Role</h3>
	<DataTable
		data={data?.userList}
		columns={userColumns}
		fileName="{data?.singleUser.name} Users List"
	/>
{/if}
{#if data?.permissionList?.length}
	<h3>Permissions on this Role</h3>

	<DataTable
		data={data?.permissionList}
		{columns}
		fileName="{data?.singleUser.name} Permissions List"
	/>
{/if} -->
