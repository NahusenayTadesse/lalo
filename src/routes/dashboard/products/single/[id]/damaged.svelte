<script lang="ts">
	import { Button, buttonVariants } from '@nahu/admin-kit/components/ui/button/index.js';
	import { PackageX as Minus } from '@lucide/svelte';
	import * as Dialog from '@nahu/admin-kit/components/ui/dialog/index.js';
	import { ScrollArea } from '@nahu/admin-kit/components/ui/scroll-area/index.js';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { DamagedForm } from './schema';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import { toast } from 'svelte-sonner';
	import type { StockBatchOption, StockVariantOption } from './stock';
	import { batchItems, variantItems } from './stock';

	let isOpen = $state(false);

	let {
		data,
		name = 'item',
		variants,
		batches
	}: {
		data: SuperValidated<Infer<DamagedForm>>;
		name: string;
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
		class={buttonVariants({ variant: 'destructive' })}
		title="Add Damaged Item of {name}"
	>
		<Minus /> Damaged Item
	</Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>{name} Damaged</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="h-auto max-h-[calc(100vh-200px)] rounded-md border p-2">
			<div class="flex flex-col items-center justify-center gap-4 pt-4">
				<form method="post" action="?/damaged" use:enhance class="flex w-full flex-col gap-3">
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
						label="From Batch"
						name="batchId"
						type="select"
						{form}
						{errors}
						items={batchOptions}
					/>
					<InputComp
						label="Damaged Quantity"
						name="quantity"
						type="number"
						{form}
						{errors}
						placeholder="Enter number of items damaged"
						required={true}
					/>
					<InputComp
						label="Reason"
						name="reason"
						type="textarea"
						{form}
						{errors}
						placeholder="Enter explanation for the damage"
						required={true}
					/>
					<InputComp
						label="Employee Responsible for the damage"
						name="damagedBy"
						type="text"
						{form}
						{errors}
						placeholder="Enter Employee Name"
						required={true}
					/>

					<Button type="submit" variant="destructive" size="lg">
						{#if $delayed}
							<LoadingBtn name="Entering Damaged Item" />
						{:else}
							<Minus /> Enter Damaged Item
						{/if}
					</Button>
				</form>
			</div>
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
