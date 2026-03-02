<script>
	import { Button } from '$lib/components/ui/button/index';

	let { data } = $props();
	import { superForm } from 'sveltekit-superforms/client';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Plus } from '@lucide/svelte';

	const { form, errors, enhance, delayed, message } = superForm(data.form, {});

	import { toast } from 'svelte-sonner';
	import FormCard from '$lib/formComponents/FormCard.svelte';
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
	<title>Add Suppliers</title>
</svelte:head>

<FormCard title="+ Add New Supplier">
	<form action="?/add" use:enhance id="main" class="flex flex-col gap-4" method="post">
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

		<Button type="submit" form="main">
			{#if $delayed}
				<LoadingBtn name="Adding Suppliers" />
			{:else}
				<Plus /> Add Suppliers
			{/if}
		</Button>
	</form>
</FormCard>
