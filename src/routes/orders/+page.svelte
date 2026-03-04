<script lang="ts">
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import { Button } from '$lib/components/ui/button/index';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	import ComboboxComp from '$lib/formComponents/ComboboxComp.svelte';
	import Edit from './edit.svelte';
	let arrParts = `flex flex-col justify-start gap-2 w-full`;

	const columns = [
		{
			accessorKey: 'index',
			header: '#',
			cell: (info) => info.row.index + 1,
			sortable: false
		},
		{
			accessorKey: 'name',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Name',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(Edit, {
					id: row.original.id,
					customer: data?.customerId?.value,
					customerList: data?.fetchedCustomers,
					customerName: row.original.name,
					orderItems: data?.allItems,
					productList: data?.fetchedProducts,
					data: data?.editForm,
					icon: false
				});
			}
		},

		{
			accessorKey: 'items',
			header: 'Items',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(OrderItems, {
					items:
						data?.allItems?.filter((item) => Number(item.orderId) === Number(row.original.id)) ??
						[],
					currency: 'ETB'
				});
			}
		},

		{
			accessorKey: 'status',
			header: 'Status',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(Statuses, {
					status: row.original.status
				});
			}
		},

		{
			accessorKey: '',
			header: 'Edit',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(Edit, {
					id: row.original.id,
					customer: data?.customerId?.value,
					customerList: data?.fetchedCustomers,
					customerName: row.original.name,
					orderItems: data?.allItems,
					productList: data?.fetchedProducts,
					data: data?.editForm,
					icon: true
				});
			}
		}
	];
	let { data } = $props();
	import { superForm } from 'sveltekit-superforms/client';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Plus, X } from '@lucide/svelte';

	import OrdersGrid from './orders-grid.svelte';

	const { form, errors, enhance, delayed, message } = superForm(data.form, {
		dataType: 'json'
	});

	import { toast } from 'svelte-sonner';
	import OrderItems from './order-items.svelte';

	function addProduct() {
		$form.selectedProducts = [...$form.selectedProducts, { product: 0, quantity: 1 }];
	}

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});
	import { fly } from 'svelte/transition';

	let selectedOrder = $state(null);
	const handleOrderClick = (order: any) => {
		selectedOrder = order;
	};

	$form.customerId = data?.customerId?.value;
</script>

<svelte:head>
	<title>All Orders</title>
</svelte:head>

<div
	class="mt-16 flex min-h-dvh w-full! flex-col bg-linear-to-br from-primary/5 via-accent/5 to-background px-8 text-foreground"
>
	<div class="mb-12 text-center">
		<h2 class="mb-4 text-4xl font-bold sm:text-5xl">Orders</h2>
		<p class="mx-auto max-w-2xl text-lg text-muted-foreground">Edit and Update your orders</p>
	</div>
	<div class="ml-8">
		<DialogComp title="+ Add New Order" variant="default">
			<form
				action="?/add"
				use:enhance
				id="main"
				class="flex flex-col gap-4"
				method="post"
				enctype="multipart/form-data"
			>
				<InputComp label="Customer" name="customer" type="hidden" {form} {errors} />
				<div class="mb-4 flex justify-end">
					<Button type="button" size="sm" class="gap-2" onclick={() => addProduct()}>
						<Plus class="h-4 w-4" />
						<span>Add Product</span>
					</Button>
				</div>
				{#each $form.selectedProducts as product, i (product)}
					<div
						class="flex w-full flex-col items-end gap-3
 rounded-lg border
 border-white/20 bg-white/10 p-3 shadow-lg
  backdrop-blur-lg lg:flex-row dark:border-black/20 dark:bg-gray-700"
						transition:fly={{ x: -200, duration: 200 }}
					>
						<div class={arrParts}>
							<Label for="product">Selling Product</Label>

							<ComboboxComp
								items={data?.fetchedProducts}
								name="selectedProducts"
								required={true}
								bind:value={$form.selectedProducts[i].product}
							/>

							{#if $errors.selectedProducts?.[i]?.product}
								<p class="text-sm text-red-500">{$errors.selectedProducts[i].product}</p>
							{/if}
						</div>

						<div class={arrParts}>
							<Label for="noofproducts">Number of Product</Label>

							<Input
								type="number"
								min="1"
								name="quantity"
								bind:value={$form.selectedProducts[i].quantity}
							/>

							{#if $errors.selectedProducts?.[i]?.quantity}
								<p class="text-sm text-red-500">{$errors.selectedProducts[i].quantity}</p>
							{/if}
						</div>
						<Button
							type="button"
							variant="outline"
							title="Remove this product from list"
							onclick={() => {
								$form.selectedProducts.splice(i, 1);
								$form.selectedProducts = $form.selectedProducts;
							}}
						>
							<X class="h-8 w-8" />
						</Button>
					</div>
				{/each}

				<Button type="submit" form="main">
					{#if $delayed}
						<LoadingBtn name="Adding Order" />
					{:else}
						<Plus /> Add Order
					{/if}
				</Button>
			</form>
		</DialogComp>
	</div>
	<div class="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
		<OrdersGrid
			orders={data?.allData}
			orderItems={data?.allItems}
			currency="ETB"
			isAdmin={false}
			customerList={data?.fetchedCustomers}
			productList={data?.fetchedProducts}
			data={data?.editForm}
		/>
	</div>
</div>
<!-- {#key data.allData}
	<DataTable {columns} data={data?.allData} search={true} />
{/key} -->
