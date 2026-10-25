<script lang="ts">
	import { Button, buttonVariants } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Pen } from '@lucide/svelte';
	import * as Dialog from '@nahu/admin-kit/components/ui/dialog/index.js';
	import { ScrollArea } from '@nahu/admin-kit/components/ui/scroll-area/index.js';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { AdjustForm } from './schema';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import { toast } from 'svelte-sonner';
	import type { StockBatchOption, StockVariantOption } from './stock';
	import { batchItems, variantItems } from './stock';

	let isOpen = $state(false);

	let {
		data,
		name = 'product',
		supplierList = [],
		variants,
		batches
	}: {
		data: SuperValidated<Infer<AdjustForm>>;
		name: string;
		supplierList?: { value: number; name: string }[];
		variants: StockVariantOption[];
		batches: StockBatchOption[];
	} = $props();

	const { form, errors, enhance, delayed, message } = superForm(data, {
		onUpdated({ form }) {
			if (form.message?.type === 'success') isOpen = false;
		}
	});

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	const batchOptions = $derived(batchItems(batches, $form.variantId));
</script>

<Dialog.Root bind:open={isOpen}>
	<Dialog.Trigger
		class={buttonVariants({ variant: 'default' })}
		title="Receive or remove stock of {name}"
	>
		<Pen /> Change Stock
	</Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>Change Stock of {name}</Dialog.Title>
			<Dialog.Description>
				Received stock is booked in as a batch. Removed stock comes out of the batch you pick, or
				the one expiring soonest.
			</Dialog.Description>
		</Dialog.Header>
		<ScrollArea class="h-auto max-h-[calc(100vh-200px)] rounded-md border p-2">
			<div class="flex flex-col items-center justify-center gap-4 pt-4">
				<form
					method="post"
					action="?/adjust"
					use:enhance
					class="flex w-full flex-col gap-3"
					enctype="multipart/form-data"
				>
					<InputComp
						label="Receive or Remove"
						name="intent"
						type="select"
						required={true}
						{form}
						{errors}
						items={[
							{ value: 'add', name: '+ Receive stock' },
							{ value: 'remove', name: '- Remove stock' }
						]}
					/>

					<InputComp
						label="Variant"
						name="variantId"
						type="select"
						required={true}
						{form}
						{errors}
						items={variantItems(variants)}
					/>

					<InputComp
						label="Quantity"
						name="quantity"
						type="number"
						{form}
						{errors}
						placeholder="Enter Quantity"
						required={true}
					/>

					{#if $form.intent === 'add'}
						<InputComp
							label="Batch / Lot Number"
							name="batchNumber"
							type="text"
							{form}
							{errors}
							placeholder="Leave empty to generate one"
						/>
						<InputComp
							label="Manufactured On"
							name="manufacturedAt"
							type="date"
							{form}
							{errors}
							futureDays={true}
						/>
						<InputComp
							label="Expires On"
							name="expiresAt"
							type="date"
							{form}
							{errors}
							oldDays={false}
						/>
						<InputComp
							label="Supplier"
							name="supplier"
							type="select"
							{form}
							{errors}
							required={false}
							items={supplierList}
						/>
						<InputComp
							label="Cost per Unit"
							name="costPerItem"
							type="number"
							{form}
							{errors}
							placeholder="Enter Cost per Unit"
						/>
						<InputComp
							label="Receipt"
							name="reciept"
							type="file"
							{form}
							{errors}
							required={false}
						/>
					{:else if $form.intent === 'remove'}
						<InputComp
							label="From Batch"
							name="batchId"
							type="select"
							{form}
							{errors}
							items={batchOptions}
						/>
					{/if}

					<InputComp
						label="Reason"
						name="reason"
						type="textarea"
						{form}
						{errors}
						placeholder="Why the stock changed"
					/>
					<InputComp
						label="Employee Responsible"
						name="employeeResponsible"
						type="text"
						{form}
						{errors}
						placeholder="Enter Employee Name"
						required={true}
					/>

					<Button type="submit" variant="default" size="lg">
						{#if $delayed}
							<LoadingBtn name="Saving" />
						{:else}
							<Pen /> {$form.intent === 'remove' ? 'Remove Stock' : 'Receive Stock'}
						{/if}
					</Button>
				</form>
			</div>
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
