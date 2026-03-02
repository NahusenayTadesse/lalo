<script lang="ts">
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { SquarePen, Plus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Edit } from './schema';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	type Item = {
		value: number;
		name: string;
	};

	let {
		data,
		action = '?/edit',
		id,
		name,
		description,
		icon = false,
		status = true
	}: {
		data: SuperValidated<Infer<Edit>>;
		action: string;
		id: number;
		name: string;
		icon: boolean;
		description: string;
		status: boolean;
	} = $props();

	const { form, errors, enhance, delayed, message, allErrors } = superForm(data, {
		resetForm: false
	});

	let open = $state(false);

	$form.id = id;
	$form.name = name;

	$form.description = description;
	$form.status = status;

	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
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
</script>

<Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger class="{buttonVariants({ variant: 'ghost' })} justify-self-start p-0!">
			<Dialog.Root bind:open>
				<Dialog.Trigger class="flex w-auto flex-row items-center justify-center gap-2 border-0">
					{#if icon}
						<SquarePen /> Edit
					{:else}
						{name}
					{/if}
				</Dialog.Trigger>
				<Dialog.Content class="w-full bg-white">
					<Dialog.Header>
						<Dialog.Title class="text-center text-4xl">Edit {name}</Dialog.Title>
					</Dialog.Header>
					<form {action} use:enhance method="post" id="edit" class="flex w-full flex-col gap-4 p-4">
						<Errors allErrors={$allErrors} />
						<input type="hidden" name="id" value={$form.id} />
						<InputComp {form} {errors} label="name" type="text" name="name" required={true} />

						<InputComp
							{form}
							{errors}
							label="Description"
							type="textarea"
							name="description"
							placeholder="Enter Department Description"
							required={true}
							rows={10}
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

						<Button type="submit" class="mt-4" form="edit">
							{#if $delayed}
								<LoadingBtn name="Saving Changes" />
							{:else}
								<Plus class="h-4 w-4" />

								Save Changes
							{/if}
						</Button>
					</form>
				</Dialog.Content>
			</Dialog.Root>
		</Tooltip.Trigger>
		<Tooltip.Content>
			<p>Edit {name}</p>
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
