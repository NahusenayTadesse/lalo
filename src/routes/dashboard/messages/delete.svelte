<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Trash } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { DeleteTestimonial as schema } from './schema';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';

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

	let open = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: 'destructive' })}><Trash /></Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>Delete</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="h-auto rounded-md border p-2">
			<h5 class="text-center">Are you sure you want to Delete? This action is irreversable</h5>
			<div class="flex flex-row items-end justify-center gap-4 pt-4">
				<form method="post" id="delete" action="?/delete" use:enhance>
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
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
