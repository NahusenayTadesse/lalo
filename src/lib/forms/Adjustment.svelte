<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Pen } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { InventoryAdjustmentForm } from '$lib/ZodSchema';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	let isOpen = $state(false);

	let {
		data,
		name = 'product'
	}: {
		data: SuperValidated<Infer<InventoryAdjustmentForm>>;
		name: string;
	} = $props();
	const { form, errors, enhance, delayed, message } = superForm(data, {});
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
</script>

<Dialog.Root bind:open={isOpen}>
	<Dialog.Trigger
		class={buttonVariants({ variant: 'default' })}
		title="Change the quantity of {name}"
	>
		<Pen /> Change Quantity
	</Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>Change Quantity of {name}</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="h-auto max-h-[calc(100vh-200px)] rounded-md border p-2">
			<h5 class="text-center">Change {name} Quantity</h5>
			<div class="flex flex-col items-center justify-center gap-4 pt-4">
				<form
					method="post"
					action="?/adjust"
					use:enhance
					class="flex w-full flex-col gap-3"
					enctype="multipart/form-data"
				>
					<InputComp
						label="Add or Remove"
						name="intent"
						type="select"
						required={true}
						{form}
						{errors}
						items={[
							{ value: 'add', name: '+ Add' },
							{ value: 'remove', name: '- Remove' }
						]}
					/>

					<InputComp
						label="Quantity of Change"
						name="quantity"
						type="number"
						{form}
						{errors}
						placeholder="Enter Quantity"
						required={true}
					/>
					<InputComp
						label="Reason"
						name="reason"
						type="textarea"
						{form}
						{errors}
						placeholder="Enter Quantity"
						required={true}
					/>
					<InputComp
						label="Employee Responsible"
						name="employeeResponsible"
						type="text"
						{form}
						{errors}
						placeholder="Enter Quantity"
						required={true}
					/>

					{#if $form.intent === 'add'}
						<InputComp
							label="Cost per Unit"
							name="costPerItem"
							type="number"
							{form}
							{errors}
							placeholder="Enter Cost per Unit"
							required={true}
						/>
						<InputComp
							label="Reciept of Change"
							name="reciept"
							type="file"
							{form}
							{errors}
							required={false}
						/>
					{/if}

					<Button type="submit" variant="default" size="lg">
						{#if $delayed}
							<LoadingBtn name="Changing" />
						{:else}
							<Pen /> Change Quantity
						{/if}
					</Button>
				</form>
			</div>
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
