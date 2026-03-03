<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { edit } from './schema.js';
	let { data } = $props();

	import SingleTable from '$lib/components/SingleTable.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { superForm } from 'sveltekit-superforms/client';
	import { page } from '$app/state';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { ArrowLeft, Pencil, Save, History } from '@lucide/svelte';
	import SelectComp from '$lib/formComponents/SelectComp.svelte';
	import type { Snapshot } from '@sveltejs/kit';
	import { getCurrentMonthRange } from '$lib/global.svelte';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import Delete from '$lib/forms/Delete.svelte';
	import SingleView from '$lib/components/SingleView.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import Adjustment from '$lib/forms/Adjustment.svelte';
	import Damaged from '$lib/forms/Damaged.svelte';

	let singleTable = $derived([
		{ name: 'Name', value: data.product?.name },
		{ name: 'Category', value: data.product.category },
		{ name: 'Price', value: data.product?.price },
		{ name: 'Available Quantity', value: data.product?.quantity },
		{ name: 'Product Description', value: data.product?.description },
		{ name: 'Reorder Notification Quantity', value: data.product?.reorderLevel },
		{ name: 'Product Supplier', value: data?.product?.supplier },
		{ name: 'Added On', value: data.product?.createdAt },
		{ name: 'Added By', value: data.product?.createdBy },
		{
			name: 'Number of Sells',
			value:
				data.product?.saleCount === null
					? '0 Pieces Sold'
					: data.product?.saleCount + ' Pieces Sold'
		}
	]);

	const { form, errors, enhance, delayed, capture, restore, allErrors, message } = superForm(
		data.form,
		{
			validators: zod4Client(edit),
			resetForm: false
		}
	);

	(($form.productName = data.product.name),
		($form.category = data.product.categoryId),
		($form.commission = data.product.commission),
		($form.description = data.product.description),
		($form.productId = data.product.id),
		($form.quantity = data.product.quantity),
		($form.price = data.product.price),
		($form.reorderLevel = data.product.reorderLevel),
		($form.supplier = data?.product?.supplierId));

	export const snapshot: Snapshot = { capture, restore };

	//   let date = $derived(dateProxy(editForm, 'appointmentDate', { format: 'date'}));

	let editForm = $state(false);
	let editGallery = $state(false);
	import { toast } from 'svelte-sonner';
	import Gallery from '$lib/components/gallery.svelte';
	import EditGallery from './editGallery.svelte';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	let images = $derived(data?.images);
</script>

<svelte:head>
	<title>Product Details</title>
</svelte:head>

<SingleView title={data?.product?.name} photo={String(data?.product?.image)} class="w-full!">
	<div class="mt-4 flex w-full flex-row flex-wrap items-start justify-start gap-2 pl-4">
		<Button onclick={() => (editForm = !editForm)}>
			{#if !editForm}
				<Pencil class="h-4 w-4" />
				Edit
			{:else}
				<ArrowLeft class="h-4 w-4" />

				Back
			{/if}
		</Button>
		{#key data?.product}
			<Adjustment data={data.adjustForm} name={data.product?.name} />
		{/key}
		<Button href="/dashboard/products/{page.params.id}/ranges/{getCurrentMonthRange()}">
			<History /> See Change History
		</Button>
		<Damaged data={data.damagedForm} name={data.product?.name} employees={data.employeesList} />
		<Button href={`/dashboard/products/${page.params.id}/damaged/${getCurrentMonthRange()}`}>
			<History /> See Damaged History
		</Button>

		<Delete redirect="/dashboard/products" />
	</div>
	{#if editForm === false}
		<div class="w-full p-4"><SingleTable {singleTable} /></div>
	{/if}
	{#if editForm}
		<div class="w-full p-4">
			<form
				action="?/editProduct"
				use:enhance
				class="flex w-full flex-col items-start justify-start gap-4 lg:w-1/2"
				id="edit"
				method="post"
			>
				<Errors allErrors={$allErrors} />

				<InputComp
					{form}
					{errors}
					type="file"
					name="image"
					label="Product Image"
					placeholder="Upload Product Image"
					required
					image={String(data?.product?.image)}
				/>
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
					type="number"
					name="price"
					label="Price"
					placeholder="Enter the price of item"
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

				<Button form="edit" type="submit" class="mt-4">
					{#if $delayed}
						<LoadingBtn name="Saving Changes" />
					{:else}
						<Save class="h-4 w-4" />
						Save Changes
					{/if}
				</Button>
			</form>
		</div>
	{/if}
</SingleView>

<div class="mx-auto my-12 px-4 sm:px-6 lg:px-4">
	{#if data?.product?.name}
		<div class="mb-6 border-b border-gray-100 pb-4">
			<nav class="mb-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
				Gallery Images
			</nav>
			<h1 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
				{data.product.name}
			</h1>
		</div>
	{/if}

	<div
		class="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl transition-shadow hover:shadow-2xl"
	>
		<div class="p-3 sm:p-6">
			<Button onclick={() => (editGallery = !editGallery)} class="mb-4">
				{#if !editGallery}
					<Pencil class="h-4 w-4" />
					Edit
				{:else}
					<ArrowLeft class="h-4 w-4" />

					Back
				{/if}
			</Button>

			{#if !editGallery}
				<Gallery images={data?.images} title={data?.product?.name} />
			{:else}
				<EditGallery data={data?.galleryEdit} bind:images />
			{/if}
		</div>
	</div>
</div>
