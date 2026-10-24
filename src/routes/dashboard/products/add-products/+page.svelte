<script lang="ts">
	import type { Snapshot } from '@sveltejs/kit';

	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { Input } from '@nahu/admin-kit/components/ui/input/index.js';
	import { Label } from '@nahu/admin-kit/components/ui/label/index.js';

	import { Plus, X } from '@lucide/svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { add as schema } from './schema';
	import { superForm } from 'sveltekit-superforms/client';
	import Errors from '@nahu/admin-kit/formComponents/Errors.svelte';
	import FormCard from '@nahu/admin-kit/formComponents/FormCard.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import GalleryField from '$lib/formComponents/GalleryField.svelte';

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
				type="text"
				name="productNameAm"
				label="Product Name (Amharic)"
				placeholder="Optional — shown to visitors browsing in Amharic"
			/>
		<InputComp
			{form}
			{errors}
			type="select"
			name="category"
			label="Product Category"
			placeholder="Enter Product Name"
			required
			items={data?.allCategories?.map((c) => ({ ...c, description: c.description ?? undefined }))}
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
				type="textarea"
				name="descriptionAm"
				label="Product Description (Amharic)"
				placeholder="Optional — shown to visitors browsing in Amharic"
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
			label="Product Supplier"
			placeholder="Enter Product Name"
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

		<GalleryField
			{form}
			{errors}
			
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
