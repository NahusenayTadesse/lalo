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

	const { form, enhance, delayed, message, allErrors } = superForm(data, {
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
	id="read"
	class="-mt-4 flex h-full flex-col items-start justify-start"
	action="?/read"
	use:enhance
>
	<Button type="submit" size="sm" variant="outline" class="mt-4" form="read">
		{#if $delayed}
			<LoadingBtn name="Marking as Read" />
		{:else}
			<CircleCheckBig /> Mark as Read
		{/if}
	</Button>
	<input bind:value={$form.id} name="id" type="hidden" />
</form>
