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

	// One id for both the superforms instance and the DOM `<form>`, since both
	// have to be unique per row.
	//
	// Every row on the page mounts one of these, and the page also mounts a
	// `read.svelte` per unread row — whose schema is `{ id: number }`, the same
	// shape as this one, so superforms generated the *same* form id for all of
	// them. Superforms routes an action's response by form id and applies it to
	// the first instance that matches, so a delete could land on some other row's
	// form: this dialog never saw `$message`, never closed and never toasted,
	// while another row's hidden `id` got overwritten with the deleted id. That is
	// the "delete doesn't always work". A per-row id keeps the instances distinct;
	// superforms posts it as `__superform_id`, so the server's `superValidate`
	// hands the response back to exactly the form that submitted it.
	//
	// The DOM id matters for the same reason: `form="..."` on the submit button is
	// resolved with `getElementById`, which returns the *first* match in the
	// document, so a hard-coded `id="delete"` on every row pointed the button at
	// whichever dialog rendered first.
	const formId = `delete-message-${id}`;

	const { form, errors, enhance, delayed, message, allErrors } = superForm(data, {
		id: formId,
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
		<form method="post" id={formId} {action} use:enhance>
			<Errors allErrors={$allErrors} />
			<input bind:value={$form.id} name="id" type="hidden" />
			<Button type="submit" class="mt-4" form={formId}>
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
