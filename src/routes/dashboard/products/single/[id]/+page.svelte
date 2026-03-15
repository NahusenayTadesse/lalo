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
	import { ArrowLeft, Pencil, Save, History, X, Plus } from '@lucide/svelte';
	import type { Snapshot } from '@sveltejs/kit';
	import { getCurrentMonthRange } from '$lib/global.svelte';
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
			sortable: true,
			cell: ({ row }) => {
				return row.original.amount ?? 0 + 'Pieces';
			}
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
				return 'ETB ' + row.original.price;
			}
		}
	];

	let images = $derived(data?.images);
	let arrParts = `flex flex-col justify-start gap-2 w-full`;

	function addIng() {
		$form.prices = [...$form.prices, { price: 0, amount: 0 }];
	}
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
							<Label for="amount">Variant</Label>

							<Input
								type="text"
								name="amount"
								min="1"
								placeholder="Variant of Product"
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
	{#if data?.priceList}
		{#key data?.priceList}
			<div class="mb-6 border-b border-gray-100 pb-4">
				<h1 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Price List</h1>
				<DataTable
					{columns}
					data={data?.priceList}
					class="w-6xl!"
					fileName="{data?.product?.name} - Price List"
					search={true}
				/>
			</div>
		{/key}
	{/if}
</div>

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
				<Gallery {images} title={data?.product?.name} />
			{:else}
				<EditGallery data={data?.galleryEdit} bind:images />
			{/if}
		</div>
	</div>
</div>
