<script lang="ts">
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { untrack } from 'svelte';
	import { editUserSchema } from './schema';

	let { data } = $props();

	import SingleTable from '$lib/components/SingleTable.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { superForm } from 'sveltekit-superforms/client';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { ArrowLeft, Pencil, Save, Pen, History } from '@lucide/svelte';
	import type { Snapshot } from '@sveltejs/kit';

	import SingleView from '$lib/components/SingleView.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	import { columns } from './columns.js';

	const countFor = (status: string) =>
		data?.orderCounts?.find((item) => item.status === status)?.count ?? 0;

	let singleTable = $derived([
		{ name: 'Name', value: data.singleUser?.name },
		{ name: 'Email', value: data.singleUser?.email },
		{ name: 'Phone', value: data.singleUser?.phone },
		{ name: 'General Address', value: data.singleUser?.address ?? 'N/A' },
		{ name: 'Delivery Address', value: data.singleUser?.deliveryAddress ?? 'N/A' },

		// `{ … } + 'Orders'` added a string to the object, which put the text
		// "[object Object]Orders" in the table instead of a row. And `count ?? 0 + ' Orders'`
		// parses as `count ?? (0 + ' Orders')`, so only a zero got the suffix.
		{ name: 'Life Time Orders', value: `${data.singleUser?.numberOfOrders ?? 0} Orders` },
		{ name: 'Number of Pending Orders', value: `${countFor('pending')} Orders` },
		{ name: 'Number of Delivered Orders', value: `${countFor('delivered')} Orders` },
		{ name: 'Number of Cancelled Orders', value: `${countFor('cancelled')} Orders` },

		{
			name: 'Joined',
			value: data.singleUser?.createdAt.toLocaleString('en-ca', {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			})
		}
	]);

	const { form, errors, enhance, delayed, capture, restore, allErrors, message } = superForm(
		data.form,
		{
			validators: zod4Client(editUserSchema),
			resetForm: false
		}
	);

	import { toast } from 'svelte-sonner';
	import Logout from '$lib/forms/Logout.svelte';
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

	//   let date = $derived(dateProxy(editForm, 'appointmentDate', { format: 'date'}));

	let edit = $state(false);

	// Re-synced when the saved profile changes (e.g. after a save), not just once at
	// startup. `untrack` because writing `$form` also reads it.
	$effect(() => {
		const user = data.singleUser;
		if (!user) return;
		untrack(() => {
			$form.name = user.name;
			$form.phone = user.phone ?? '';
			$form.email = user.email;
			$form.address = user.address ?? '';
			$form.deliveryAddress = user.deliveryAddress ?? '';
		});
	});
</script>

<svelte:head>
	<title>My Account Details</title>
</svelte:head>
<SingleView title="My Account Details" class="my-8 justify-self-center">
	<div class="mt-4 flex w-full flex-row items-start justify-start gap-2 pl-4">
		<Button onclick={() => (edit = !edit)}>
			{#if !edit}
				<Pencil class="h-4 w-4" />
				Edit Account
			{:else}
				<ArrowLeft class="h-4 w-4" />

				Back
			{/if}
		</Button>
	</div>
	{#if edit === false}
		<div class="w-full p-4"><SingleTable {singleTable} /></div>
	{/if}
	{#if edit}
		<div class="w-full p-4">
			<form action="?/editUser" use:enhance class="flex flex-col gap-4" id="edit" method="post">
				<Errors allErrors={$allErrors} />
				<InputComp
					label="Your Name"
					{form}
					{errors}
					type="text"
					name="name"
					placeholder="Enter the name of new user"
					required
				/>
				<InputComp
					label="Phone"
					{form}
					{errors}
					type="tel"
					name="phone"
					placeholder="Enter your phone number"
				/>
				<InputComp
					label="Email"
					{form}
					type="email"
					{errors}
					name="email"
					placeholder="Enter the email of new admin user"
					required
				/>

				<InputComp
					label="General Address"
					name="address"
					type="select"
					{form}
					{errors}
					placeholder="+251 9-11-00-00-00"
					items={data?.placeList}
				/>
				<InputComp
					label="Specific Delivery Address"
					name="deliveryAddress"
					type="text"
					{form}
					{errors}
					placeholder="Mexico, Edna Mall, 2nd Floor, Apt 201"
				/>

				<Button form="edit" type="submit" class="mt-4">
					{#if $delayed}
						<LoadingBtn name="Saving Changes" />
					{:else}
						<Save class="h-4 w-4" />
						Save Changes
					{/if}
				</Button>
			</form>
		</div>
	{/if}
</SingleView>

<!-- {#snippet fe(
	label = '',
	name = '',
	type = '',
	placeholder = '',
	required = false,
	min = '',
	max = ''
)}
	<div class="flex w-full flex-col justify-start gap-2">
		<Label for={name}>{label}</Label>
		<Input
			{type}
			{name}
			{placeholder}
			{required}
			{min}
			{max}
			bind:value={$form[name]}
			aria-invalid={$errors[name] ? 'true' : undefined}
		/>
		{#if $errors[name]}
			<span class="text-red-500">{$errors[name]}</span>
		{/if}
	</div>
{/snippet}
{#snippet selects(name, items)}
	<div class="flex w-full flex-col justify-start gap-2">
		<Label for={name} class="capitalize">{name.replace(/([a-z])([A-Z])/g, '$1 $2')}:</Label>

		<SelectComp {name} bind:value={$form[name]} {items} />
		{#if $errors[name]}<span class="text-red-500">{$errors[name]}</span>{/if}
	</div>
{/snippet} -->
