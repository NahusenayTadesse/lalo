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
	import { ArrowLeft, Pencil, Save, History, X, Plus, ArrowDown, Tag } from '@lucide/svelte';
	import type { Snapshot } from '@sveltejs/kit';
	import { getCurrentMonthRange } from '$lib/global.svelte';
	import Delete from '$lib/forms/Delete.svelte';
	import SingleView from '$lib/components/SingleView.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import Adjustment from '$lib/forms/Adjustment.svelte';
	import Damaged from '$lib/forms/Damaged.svelte';

	function scrollToPrices() {
		const element = document.getElementById('price-section-anchor');
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' });
		}
	}

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
			resetForm: false,
			dataType: 'json'
		}
	);

	(($form.productName = data.product.name),
		($form.category = data.product.categoryId),
		($form.commission = data.product.commission),
		($form.description = data.product.description),
		($form.productId = data.product.id),
		($form.prices = data?.priceList),
		($form.quantity = data.product.quantity),
		($form.reorderLevel = data.product.reorderLevel),
		($form.supplier = data.product.supplier));

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

	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import EditPrice from './editPrice.svelte';
	import AddPrice from './addPrice.svelte';
	import DeletePrice from './deletePrice.svelte';

	const columns = [
		{
			accessorKey: 'index',
			header: '#',
			cell: (info) => info.row.index + 1,
			sortable: false
		},

		{
			accessorKey: 'amount',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Amount',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true
		},

		{
			accessorKey: 'Price',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Price',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => {
				// You can pass whatever you need from `row.original` to the component
				return renderComponent(EditPrice, {
					id: row.original.id,
					price: row.original.price,
					amount: row.original.amount,
					data: data?.priceEdit
				});
			}
		},
		{
			accessorKey: 'delete',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Delete',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => {
				// You can pass whatever you need from `row.original` to the component
				return renderComponent(DeletePrice, {
					id: row.original.id,
					price: row.original.price,
					amount: row.original.amount,
					data: data?.priceEdit
				});
			}
		}
	];

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
		<Button href="/dashboard/products/single/{page.params.id}/ranges/{getCurrentMonthRange()}">
			<History /> See Change History
		</Button>
		<Damaged data={data.damagedForm} name={data.product?.name} />
		<Button href={`/dashboard/products/single/${page.params.id}/damaged/${getCurrentMonthRange()}`}>
			<History /> See Damaged History
		</Button>

		<Delete redirect="/dashboard/products" />
	</div>
	{#if data.priceList.length === 0}
		<div
			class="mx-auto my-12 flex w-1/2 flex-col items-center rounded-xl border border-destructive p-8 text-center text-destructive backdrop-blur-sm"
		>
			<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full">
				<Tag class="h-6 w-6" />
			</div>

			<h3 class="text-lg font-bold">Pricing Required</h3>
			<p class="mx-auto mt-2 max-w-sm text-sm leading-relaxed">
				This product is currently hidden from customers. Add at least one price to enable
				purchasing.
			</p>

			<Button variant="default" class="mt-4" onclick={scrollToPrices}>
				<Plus class="mr-2 h-4 w-4" />
				Add Pricing Structure
			</Button>
		</div>
	{/if}
	{#if editForm === false}
		<div class="w-full p-4"><SingleTable {singleTable} /></div>
	{/if}
	{#if editForm}
		<div class="w-full p-4">
			<form
				action="?/editProduct"
				use:enhance
				class="flex w-full flex-col items-start justify-start gap-4 lg:w-full"
				id="edit"
				method="post"
				enctype="multipart/form-data"
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
<div id="price-section-anchor" class="mx-auto my-12 px-4 pt-12 sm:px-6 lg:px-4">
	{#key data?.priceList}
		<div class="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-4">
			<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Price List</h1>
			<div class="w-sm"><AddPrice data={data?.priceAdd} /></div>
			{#if data.priceList.length === 0}
				<p class="animate-pulse text-destructive">No prices available for this product.</p>
			{:else}
				<DataTable
					{columns}
					data={data?.priceList}
					class="w-6xl!"
					fileName="{data?.product?.name} - Price List"
					search={true}
				/>
			{/if}
		</div>
	{/key}
</div>

<div class="mx-auto my-12 px-4 sm:px-6 lg:px-4">
	{#if data?.product?.name}
		<div class="mb-6 border-b border-gray-100 pb-4">
			<nav class="mb-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
				Gallery Images
			</nav>
			<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
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
				<Gallery {images} title={data?.product?.name} />
			{:else}
				<EditGallery data={data?.galleryEdit} bind:images />
			{/if}
		</div>
	</div>
</div>
