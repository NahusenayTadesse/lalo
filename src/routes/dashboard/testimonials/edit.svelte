<script lang="ts">
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { SquarePen, Save } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { EditPaymentMethod as schema } from './schema';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	let {
		data,
		action = '/dashboard/customers?/addCustomer',
		id,
		name,
		position,
		testimonial,
		avatar,
		icon = false
	}: {
		data: SuperValidated<Infer<schema>>;
		action: string;
		id: number;
		name: string;
		position?: string;
		avatar?: string;
		testimonial?: string;
		icon: boolean;
	} = $props();

	const { form, errors, enhance, delayed, message, allErrors } = superForm(data, {
		resetForm: false
	});

	let open = $state(false);

	$form.id = id;
	$form.name = name;
	$form.position = position;
	$form.testimonial = testimonial;

	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
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

					<ScrollArea class="h-128 w-full px-2 pr-4" orientation="both">
						<form
							{action}
							use:enhance
							method="post"
							id="edit"
							class="flex w-full flex-col gap-4 p-4"
							enctype="multipart/form-data"
						>
							<Errors allErrors={$allErrors} />
							<input type="hidden" name="id" value={$form.id} />
							<InputComp
								{form}
								{errors}
								label="Name of Customer"
								type="text"
								name="name"
								required={true}
							/>
							<InputComp {form} {errors} label="Position" type="text" name="position" />
							<InputComp {form} {errors} label="Testimonial" type="textarea" name="testimonial" />
							<InputComp
								{form}
								{errors}
								label="Logo or Avatar"
								image={avatar ? avatar : ''}
								type="file"
								name="avatar"
							/>

							<Button type="submit" class="mt-4" form="edit">
								{#if $delayed}
									<LoadingBtn name="Saving Avatar" />
								{:else}
									<Save class="h-4 w-4" />

									Save Changes
								{/if}
							</Button>
						</form>
					</ScrollArea>
				</Dialog.Content>
			</Dialog.Root>
		</Tooltip.Trigger>
		<Tooltip.Content>
			<p>Edit {name}</p>
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
