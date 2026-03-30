<script lang="ts">
	import { zod4Client } from 'sveltekit-superforms/adapters';
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

	let singleTable = $derived([
		{ name: 'Name', value: data.singleUser?.name },
		{ name: 'Email', value: data.singleUser?.email },
		{ name: 'Phone', value: data.singleUser?.phone },
		{ name: 'Life Time Orders', value: data.singleUser?.numberOfOrders } + 'Orders',

		{
			name: 'Number of Pending Orders',
			value: data?.orderCounts?.find((item) => item.status === 'pending')?.count ?? 0 + ' Orders'
		},
		{
			name: 'Number of Delivered Orders',
			value: data?.orderCounts?.find((item) => item.status === 'delivered')?.count ?? 0 + ' Orders'
		},
		{
			name: 'Number of Cancelled Orders',
			value: data?.orderCounts?.find((item) => item.status === 'cancelled')?.count ?? 0 + ' Orders'
		},

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

	$form.name = data.singleUser?.name;
	$form.phone = data.singleUser?.phone;
	$form.email = data.singleUser?.email;
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
		<Button href="/account/history">
			<History /> Order History
		</Button>
		<Button variant="default" href="/change-password"><Pen /> Change Password</Button>
		<Logout />
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
				<!-- {@render fe('First Name', 'firstName', 'text', 'Change Name', true)}
				{@render fe('Last Name', 'lastName', 'text', 'Change Name', true)}
				{@render fe('Email', 'email', 'email', 'Change email', true)}

				{@render selects('role', data?.roleList)} -->

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
