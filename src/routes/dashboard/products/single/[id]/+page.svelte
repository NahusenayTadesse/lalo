<script lang="ts">
	import { Input } from '@nahu/admin-kit/components/ui/input/index.js';
	import { Label } from '@nahu/admin-kit/components/ui/label/index.js';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { untrack } from 'svelte';
	import { edit } from './schema.js';
	let { data } = $props();

	import SingleTable from '@nahu/admin-kit/components/SingleTable.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { superForm } from 'sveltekit-superforms/client';
	import { page } from '$app/state';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';

	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import {
		ArrowLeft,
		Pencil,
		Save,
		History,
		X,
		Plus,
		ArrowDown,
		Tag,
		TriangleAlert,
		CalendarX
	} from '@lucide/svelte';
	import type { Snapshot } from '@sveltejs/kit';
	import Delete from '$lib/forms/Delete.svelte';
	import SingleView from '@nahu/admin-kit/components/SingleView.svelte';
	import Errors from '@nahu/admin-kit/formComponents/Errors.svelte';
	import Adjustment from './adjustment.svelte';
	import Damaged from './damaged.svelte';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import ExpiryCell from '@nahu/admin-kit/components/Table/expiry-cell.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import { EXPIRY_WARNING_DAYS } from '$lib/expiry';

	const lowStockVariants = $derived(data.priceList.filter((v) => v.lowStock));
	const expiredUnits = $derived(data.priceList.reduce((sum, v) => sum + v.expired, 0));
	const expiredText = $derived(`${expiredUnits} expired unit${expiredUnits === 1 ? '' : 's'}`);

	function scrollToPrices() {
		const element = document.getElementById('price-section-anchor');
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' });
		}
	}

	let singleTable = $derived([
		{ name: 'Name', value: data.product?.name },
		{ name: 'Category', value: data.product?.category },
		{ name: 'Price', value: data.product?.price },
		{ name: 'Total Stock (all variants)', value: data.product?.quantity },
		{ name: 'Expired, not yet written off', value: expiredUnits },
		{ name: 'Product Description', value: data.product?.description },
		{ name: 'Default Reorder Level', value: data.product?.reorderLevel },
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

	// An effect keyed on the product, not top-level assignments: moving from one
	// product to another reuses this component, and the form kept the first
	// product's values. `untrack` because writing `$form` also reads it.
	$effect(() => {
		const product = data.product;
		if (!product) return;
		untrack(() => {
			$form.productName = product.name;
			$form.productNameAm = product.nameAm ?? '';
			$form.category = product.categoryId;
			$form.description = product.description;
			$form.descriptionAm = product.descriptionAm ?? '';
			$form.reorderLevel = product.reorderLevel;
			$form.supplier = product.supplierId;
		});
	});

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

	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import DataTableSort from '@nahu/admin-kit/components/Table/data-table-sort.svelte';
	import { renderComponent } from '@nahu/admin-kit/components/ui/data-table/index.js';
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
			accessorKey: 'sku',
			header: 'SKU',
			cell: ({ row }) => row.original.sku ?? '—'
		},
		{
			accessorKey: 'sellable',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'In Stock',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			// Sellable stock; expired units are still on the shelf until written off.
			cell: ({ row }) =>
				[
					row.original.sellable,
					row.original.lowStock ? '(low)' : '',
					row.original.expired ? `+ ${row.original.expired} expired` : ''
				]
					.filter(Boolean)
					.join(' ')
		},
		{
			accessorKey: 'effectiveReorder',
			header: 'Reorder At',
			cell: ({ row }) =>
				row.original.reorderLevel != null
					? row.original.reorderLevel
					: row.original.effectiveReorder != null
						? `${row.original.effectiveReorder} (product default)`
						: '—'
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
					sku: row.original.sku,
					reorderLevel: row.original.reorderLevel,
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

	const batchColumns = [
		{ accessorKey: 'batchNumber', header: 'Batch' },
		{ accessorKey: 'variant', header: 'Variant' },
		{
			accessorKey: 'quantityRemaining',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Remaining',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => `${row.original.quantityRemaining} / ${row.original.quantityReceived}`
		},
		{
			accessorKey: 'expiresAt',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Expires',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) =>
				renderComponent(ExpiryCell, {
					expiresOn: row.original.expiresAt,
					warningDays: EXPIRY_WARNING_DAYS
				})
		},
		{
			accessorKey: 'manufacturedAt',
			header: 'Manufactured',
			cell: ({ row }) => row.original.manufacturedAt ?? '—'
		},
		{ accessorKey: 'receivedAt', header: 'Received' },
		{
			accessorKey: 'supplier',
			header: 'Supplier',
			cell: ({ row }) => row.original.supplier ?? '—'
		},
		{
			accessorKey: 'costPerUnit',
			header: 'Cost / Unit',
			cell: ({ row }) => row.original.costPerUnit ?? '—'
		}
	];

	let images = $derived(data?.images);
</script>

<svelte:head>
	<title>Product Details</title>
</svelte:head>

<SingleView title={data?.product?.name} photo={String(data?.product?.image)} class="w-full!">
	{#each lowStockVariants as variant (variant.id)}
		<Badge variant="secondary" class="ml-4 gap-1 bg-amber-500 text-white">
			<TriangleAlert class="h-3.5 w-3.5" /> Low stock: {variant.amount} has {variant.sellable} left (reorder
			at {variant.effectiveReorder})
		</Badge>
	{/each}
	{#if expiredUnits > 0}
		<Badge variant="destructive" class="ml-4 gap-1">
			<CalendarX class="h-3.5 w-3.5" />
			{expiredText} on the shelf: write them off
		</Badge>
	{/if}
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
			<Adjustment
				data={data.adjustForm}
				name={data.product?.name}
				supplierList={data.supplierList}
				variants={data.priceList}
				batches={data.batches}
			/>
		{/key}
		<Button href="/dashboard/products/single/{page.params.id}/ranges">
			<History /> See Change History
		</Button>
		<Damaged
			data={data.damagedForm}
			name={data.product?.name}
			variants={data.priceList}
			batches={data.batches}
		/>
		<Button href="/dashboard/products/single/{page.params.id}/damaged">
			<History /> See Damaged History
		</Button>
		{#if expiredUnits > 0}
			<ConfirmAction
				action="?/writeOffExpired"
				label="Write Off Expired ({expiredUnits})"
				title="Write off the expired stock?"
				description="Every expired batch of {data.product?.name} that still holds stock is emptied and recorded as damaged: {expiredText} in all."
				icon={CalendarX}
				variant="destructive"
			/>
		{/if}

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
					items={data?.allCategories?.map((c) => ({
						...c,
						description: c.description ?? undefined
					}))}
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
			<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Variants &amp; Stock</h1>
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
	<div class="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-4">
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Stock Batches</h1>
		{#if data.batches.length === 0}
			<p class="text-muted-foreground">
				No stock received yet. Use “Change Stock” to receive a batch for a variant.
			</p>
		{:else}
			<DataTable
				columns={batchColumns}
				data={data.batches}
				class="w-6xl!"
				fileName="{data?.product?.name} - Batches"
				search={true}
			/>
		{/if}
	</div>
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
