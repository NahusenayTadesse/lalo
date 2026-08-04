<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Trash } from '@lucide/svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { idSchema } from '$lib/server/crud';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { toast } from 'svelte-sonner';

	let {
		data,
		id
	}: {
		data: SuperValidated<Infer<typeof idSchema>>;
		id: number;
	} = $props();

	const { form, errors, enhance, delayed, message, allErrors } = superForm(data, {
		resetForm: false
	});

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

	$form.id = String(id);
</script>

<DialogComp bind:open variant="destructive" title="" dialogTitle="Delete Order">
	<h5 class="text-center">
		Are you sure you want to delete this order? This action is irreversible.
	</h5>
	<div class="flex flex-row items-end justify-center gap-4 pt-4">
		<form method="post" id="delete-order" action="/dashboard/orders/?/delete" use:enhance>
			<Errors allErrors={$allErrors} />
			<input bind:value={$form.id} name="id" type="hidden" />
			<Button type="submit" variant="destructive" class="mt-4" form="delete-order">
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
