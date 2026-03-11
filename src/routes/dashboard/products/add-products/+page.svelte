<script lang="ts">
	import type { Snapshot } from '@sveltejs/kit';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	import { Plus, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { add as schema } from './schema';
	import { superForm } from 'sveltekit-superforms/client';
	import Errors from '$lib/formComponents/Errors.svelte';
	import FormCard from '$lib/formComponents/FormCard.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	let { data } = $props();

	const { form, errors, enhance, delayed, allErrors, capture, restore, message } = superForm(
		data.form,
		{
			taintedMessage: () => {
				return new Promise((resolve) => {
					resolve(window.confirm('Do you want to leave?\nChanges you made may not be saved.'));
				});
			},
			validators: zod4Client(schema),
			dataType: 'json'
		}
	);

	export const snapshot: Snapshot = { capture, restore };

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

	let images = $state([]);
	let arrParts = `flex flex-col justify-start gap-2 w-full`;

	function addIng() {
		$form.prices = [...$form.prices, { price: 0, amount: '' }];
	}
</script>

<svelte:head>
	<title>Add New Product Item</title>
</svelte:head>
<FormCard
	title="Add A Product Item"
	description="Add New Inventory Items to track the how many have"
>
	<form
		use:enhance
		action="?/addProduct"
		id="main"
		class="flex flex-col gap-4"
		method="POST"
		enctype="multipart/form-data"
	>
		<Errors allErrors={$allErrors} />

		<InputComp
			{form}
			{errors}
			type="text"
			name="productName"
			label="Product Name"
			placeholder="Enter Product Name"
			required
		/>
		<InputComp
			{form}
			{errors}
			type="select"
			name="category"
			label="Product Category"
			placeholder="Enter Product Name"
			required
			items={data?.allCategories}
		/>

		<InputComp
			{form}
			{errors}
			type="textarea"
			name="description"
			label="Product Discription"
			placeholder="Enter Product Description"
			required
		/>

		<InputComp
			{form}
			{errors}
			type="number"
			name="quantity"
			label="Quantity"
			placeholder="Enter the number of items the product currently has"
			required
		/>

		<InputComp
			{form}
			{errors}
			type="select"
			name="supplier"
			label="Product Category"
			placeholder="Enter Product Name"
			required
			items={data?.supplierList}
		/>

		<InputComp
			{form}
			{errors}
			type="number"
			name="reorderLevel"
			label="Reorder Notify Level"
			placeholder="Enter when you want to be notified"
			required
		/>

		<InputComp
			{form}
			{errors}
			type="file"
			name="image"
			label="Product Image"
			placeholder="Upload Product Image"
			required
		/>

		<div class="mb-4 flex justify-end">
			<Button type="button" size="sm" class="gap-2" onclick={() => addIng()}>
				<Plus class="h-4 w-4" />
				<span>Add Prices</span>
			</Button>
		</div>
		{#each $form.prices as ing, i (ing)}
			<div
				class="flex w-full flex-col items-end gap-3
 rounded-lg border
 border-white/20 bg-white/10 p-3 shadow-lg
  backdrop-blur-lg lg:flex-row dark:border-black/20 dark:bg-gray-700"
			>
				<div class={arrParts}>
					<Label for="price">Price</Label>

					<Input
						type="number"
						name="price"
						placeholder="Enter Price"
						bind:value={$form.prices[i].price}
					/>

					{#if $errors.prices?.[i]?.price}
						<p class="text-sm text-red-500">{$errors.prices[i].price}</p>
					{/if}
				</div>

				<div class={arrParts}>
					<Label for="amount">Amount</Label>

					<Input
						type="text"
						name="amount"
						min="1"
						placeholder="Variant Name"
						bind:value={$form.prices[i].amount}
					/>

					{#if $errors.prices?.[i]?.amount}
						<p class="text-sm text-red-500">{$errors.prices[i].amount}</p>
					{/if}
				</div>
				<Button
					type="button"
					variant="outline"
					title="Remove this product from list"
					onclick={() => {
						$form.prices.splice(i, 1);
						$form.prices = $form.prices;
					}}
				>
					<X class="h-8 w-8" />
				</Button>
			</div>
		{/each}

		<InputComp
			{form}
			{errors}
			type="gallery"
			name="gallery"
			label="Product Gallery Images"
			placeholder="Upload Product Gallery Images"
			required
			bind:images
		/>

		<Button type="submit" class="mt-4" form="main">
			{#if $delayed}
				<LoadingBtn name="Adding Product" />
			{:else}
				<Plus class="h-4 w-4" />

				Add Product
			{/if}
		</Button>
	</form>
</FormCard>
