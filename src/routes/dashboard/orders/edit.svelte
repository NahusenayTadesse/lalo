<script lang="ts">
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { SquarePen, Plus, Save } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Edit } from './schema';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { Label } from '$lib/components/ui/label/index.js';

	import ProductLineItem from './product-line-item.svelte';

	type Item = {
		value: number;
		name: string;
	};

	type OrderItem = {
		id: string | number;
		orderId: string | number;
		product: string;
		amount: number | string;
		productId: string | number;
		quantity: number | string;
		price: string | number;
		total: number;
	};

	let {
		data,
		id,
		customer,
		customerName,
		customerList,
		productList,
		paymentMethod,
		priceList,
		image = '',
		orderItems,
		icon = false,
		status = true,
		paymentMethodList
	}: {
		data: SuperValidated<Infer<Edit>>;
		id: number;
		customer: number;
		customerName: string;
		customerList: Item[];
		productList: Item[];
		priceList: Item[];
		orderItems: OrderItem[];
		icon: boolean;
		paymentMethod?: number;
		status: boolean;
		paymentMethodList: Item[];
		image?: '';
	} = $props();

	const { form, errors, enhance, delayed, message, allErrors } = superForm(data, {
		resetForm: false,
		dataType: 'json'
	});

	let open = $state(false);

	function addProduct() {
		$form.selectedProducts = [...$form.selectedProducts, { product: 0, quantity: 1, amount: '' }];
	}

	const grandTotal = $derived(
		$form.selectedProducts.reduce((sum, item) => {
			const price = parseFloat(String(item.amount ?? '').split(' ')[0]);
			return sum + (Number.isFinite(price) ? price * (item.quantity ?? 0) : 0);
		}, 0)
	);

	interface SimpleProduct {
		product: number; // This is the productId
		quantity: number;
	}

	const simplifyOrderItems = (items: OrderItem[]): SimpleProduct[] => {
		return items.map((item) => ({
			product: item.productId,
			quantity: item.quantity,
			amount: item.price + ' ' + item.amount
		}));
	};

	$form.id = id;
	$form.customer = customer;

	if (paymentMethod) {
		$form.paymentMethod = paymentMethod;
	}

	$form.selectedProducts = simplifyOrderItems(
		orderItems.filter((item) => Number(item.orderId) === Number(id))
	);
	$form.status = status;

	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
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
</script>

<DialogComp
	bind:open
	IconComp={icon ? SquarePen : undefined}
	title={icon ? '' : customerName}
	dialogTitle={`Edit ${customerName}`}
	variant="ghost"
>
	<form
		action="/dashboard/orders/?/edit"
		use:enhance
		method="post"
		id="edit"
		class="mt-4 flex flex-col gap-4"
		enctype="multipart/form-data"
	>
		<Errors allErrors={$allErrors} />
		<input type="hidden" name="id" value={$form.id} />
		<InputComp label="Customer" name="customer" type="combo" {form} {errors} items={customerList} />

		<div class="flex items-center justify-between">
			<Label class="text-sm font-semibold">Order Items</Label>
			<Button type="button" size="sm" class="gap-2" onclick={() => addProduct()}>
				<Plus class="h-4 w-4" />
				<span>Add Product</span>
			</Button>
		</div>

		{#if $form.selectedProducts.length === 0}
			<p class="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
				No products on this order yet. Click "Add Product" to add one.
			</p>
		{/if}

		{#each $form.selectedProducts as _, i (i)}
			<ProductLineItem
				index={i}
				bind:item={$form.selectedProducts[i]}
				{productList}
				{priceList}
				errors={$errors.selectedProducts?.[i]}
				onremove={() => {
					$form.selectedProducts.splice(i, 1);
					$form.selectedProducts = $form.selectedProducts;
				}}
			/>
		{/each}

		{#if grandTotal > 0}
			<p class="text-right text-sm text-muted-foreground">
				Order Total: <span class="font-semibold text-foreground">ETB {grandTotal.toLocaleString()}</span>
			</p>
		{/if}

		<InputComp
			label="Status"
			name="status"
			type="select"
			{form}
			{errors}
			items={[
				{ value: 'pending', name: 'Pending' },
				{ value: 'delivered', name: 'Delivered' },
				{ value: 'cancelled', name: 'Cancelled' }
			]}
		/>

		{#if $form.status === 'delivered'}
			<InputComp
				label="Payment Method"
				name="paymentMethod"
				type="combo"
				{form}
				{errors}
				items={paymentMethodList}
			/>

			<InputComp
				label="Reciept"
				name="reciept"
				type="file"
				{form}
				{image}
				{errors}
				placeholder="Upload Screenshot or PDF of Reciept"
			/>
		{/if}

		<Button type="submit" class="mt-4" form="edit">
			{#if $delayed}
				<LoadingBtn name="Saving Changes" />
			{:else}
				<Save class="h-4 w-4" />

				Save Changes
			{/if}
		</Button>
	</form>
</DialogComp>
