<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Trash } from '@lucide/svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { DeleteTestimonial as schema } from './schema';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';

	let {
		data,
		action = '/dashboard/customers?/addCustomer',
		id
	}: {
		data: SuperValidated<Infer<schema>>;
		action: string;
		id: number;
	} = $props();

	const { form, errors, enhance, delayed, message, allErrors } = superForm(data, {
		resetForm: false
	});
	import { toast } from 'svelte-sonner';

	let open = $state(false);

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
				open = false;
			}
		}
	});

	$form.id = id;
</script>

<DialogComp bind:open variant="destructive" title="" dialogTitle="Delete">
	<h5 class="text-center">Are you sure you want to Delete? This action is irreversable</h5>
	<div class="flex flex-row items-end justify-center gap-4 pt-4">
		<form method="post" id="delete" {action} use:enhance>
			<Errors allErrors={$allErrors} />
			<input bind:value={$form.id} name="id" type="hidden" />
			<Button type="submit" class="mt-4" form="delete">
				{#if $delayed}
					<LoadingBtn name="Deleting" />
				{:else}
					<Trash /> Delete
				{/if}
			</Button>
		</form>

		<Button onclick={() => (open = false)} class="mt-4">Cancel</Button>
	</div>
</DialogComp>
