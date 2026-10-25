<script lang="ts">
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { SquarePen, Save } from '@lucide/svelte';

	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { EditPrice } from './schema';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';

	let {
		data,
		price,
		id,
		amount,
		sku = null,
		reorderLevel = null
	}: {
		data: SuperValidated<Infer<EditPrice>>;
		price: number | string;
		id: number;
		amount: string;
		sku?: string | null;
		reorderLevel?: number | null;
	} = $props();
	const { form, errors, enhance, delayed, message } = superForm(data, {});
	import { toast } from 'svelte-sonner';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import { formatETB } from '$lib/global.svelte';

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

	$form.price = Number(price);
	$form.amount = amount;
	$form.id = id;
	$form.sku = sku ?? '';
	$form.reorderLevel = reorderLevel ?? '';
</script>

<DialogComp bind:open title={formatETB(Number(price))} variant="ghost" IconComp={SquarePen}>
	<div class="flex flex-col items-center justify-center gap-4 pt-4">
		<form
			method="post"
			action="?/editPrice"
			use:enhance
			class="flex w-full flex-col gap-3"
			enctype="multipart/form-data"
		>
			<input type="hidden" name="id" bind:value={$form.id} />
			<InputComp label="Price" name="price" type="number" {form} {errors} required={true} />
			<InputComp
				{form}
				{errors}
				type="text"
				name="amount"
				label="Variation of Product"
				placeholder="Enter Product Variation"
				required
			/>
			<InputComp
				{form}
				{errors}
				type="text"
				name="sku"
				label="SKU"
				placeholder="Optional stock-keeping code"
			/>
			<InputComp
				{form}
				{errors}
				type="number"
				name="reorderLevel"
				label="Reorder Level"
				placeholder="Empty uses the product's level"
			/>
			<Button type="submit" size="lg">
				{#if $delayed}
					<LoadingBtn name="Saving Price" />
				{:else}
					<Save /> Save Changes
				{/if}
			</Button>
		</form>
	</div>
</DialogComp>
