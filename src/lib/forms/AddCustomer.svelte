<script lang="ts" module>
	/** Bumped per mounted dialog so each gets its own superForm id (see below). */
	let instances = 0;
</script>

<script lang="ts">
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { UserPlus } from '@lucide/svelte';
	import type { addCustomer } from '$lib/ZodSchema';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';

	/**
	 * Self-contained add-customer dialog. The action lives on the customers page,
	 * so every other page posts across to it and relies on `invalidateAll` to pick
	 * the new customer up in its own load.
	 */
	const instance = ++instances;

	let {
		data,
		action = '/dashboard/customers?/addCustomer',
		title = '+ Add New Customer'
	}: {
		data: SuperValidated<Infer<typeof addCustomer>>;
		action?: string;
		title?: string;
	} = $props();

	let open = $state(false);

	const { form, errors, enhance, delayed, message } = superForm(data, {
		// Distinct id per instance. Several of these can share a page (a toolbar
		// button plus one inside the add-order dialog); with one shared id every
		// instance claimed the same server response and fired its own toast.
		id: `addCustomer-${instance}`,
		resetForm: true,
		invalidateAll: true,
		onUpdated: ({ form }) => {
			if (form.valid) open = false;
		}
	});

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

<DialogComp {title} dialogTitle="Add New Customer" variant="default" IconComp={UserPlus} bind:open>
	<form {action} method="post" use:enhance id="add-customer" class="flex w-full flex-col gap-2 p-1">
		<InputComp
			label="Customer Name"
			name="name"
			type="text"
			placeholder="Full name"
			required
			{form}
			{errors}
		/>
		<InputComp
			label="Email"
			name="email"
			type="email"
			placeholder="customer@example.com (optional)"
			{form}
			{errors}
		/>
		<InputComp
			label="Phone"
			name="phone"
			type="tel"
			placeholder="09XXXXXXXX"
			required
			{form}
			{errors}
		/>
		<InputComp
			label="Address"
			name="address"
			type="text"
			placeholder="Home or work address"
			{form}
			{errors}
		/>
		<InputComp
			label="Delivery Address"
			name="deliveryAddress"
			type="text"
			placeholder="Where orders are delivered"
			{form}
			{errors}
		/>

		<Button type="submit" form="add-customer" class="mt-4">
			{#if $delayed}
				<LoadingBtn name="Adding Customer" />
			{:else}
				<UserPlus class="h-4 w-4" />
				Add Customer
			{/if}
		</Button>
	</form>
</DialogComp>
