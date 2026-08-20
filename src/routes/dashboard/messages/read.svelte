<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { MarkRead as schema } from './schema';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { CircleCheckBig } from '@lucide/svelte';
	import Errors from '$lib/formComponents/Errors.svelte';

	let {
		data,
		id
	}: {
		data: SuperValidated<Infer<schema>>;
		id: number;
	} = $props();

	// Unique per row, for both the superforms instance and the DOM form — see
	// `delete.svelte` for the whole story. Here the DOM half was the worse of the
	// two: these forms are all mounted at once, not behind a dialog, so with every
	// one of them hard-coding the same element id, the submit button's `form`
	// attribute (resolved with `getElementById`) pointed at the first unread row
	// and every "Mark as Read" marked that one row.
	const formId = `read-message-${id}`;

	const { form, enhance, delayed, message, allErrors } = superForm(data, {
		id: formId,
		resetForm: false
	});
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

	$form.id = id;
</script>

<form
	method="post"
	id={formId}
	class="-mt-4 flex h-full flex-col items-start justify-start"
	action="?/read"
	use:enhance
>
	<Button type="submit" size="sm" variant="outline" class="mt-4" form={formId}>
		{#if $delayed}
			<LoadingBtn name="Marking as Read" />
		{:else}
			<CircleCheckBig /> Mark as Read
		{/if}
	</Button>
	<input bind:value={$form.id} name="id" type="hidden" />
</form>
