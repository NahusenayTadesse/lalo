<script lang="ts">
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { SquarePen, Save } from '@lucide/svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import type { edit } from './schema';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '@nahu/admin-kit/formComponents/Errors.svelte';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import OrderFormFields from './order-form-fields.svelte';

	/** Price and place lists key off strings, customer/product lists off ids. */
	type Item = {
		value: string | number;
		name: string;
	};

	type Status = 'pending' | 'delivered' | 'cancelled';

	type PriceItem = {
		id: number;
		value: string;
		productId: number | string | null;
		productName?: string | null;
		price: string;
		amount: string;
	};

	type OrderItem = {
		id: string | number;
		// Nullable in the DB — `order_items.order_id` has no NOT NULL constraint.
		orderId: string | number | null;
		product: string | null;
		amount: number | string;
		productId: string | number | null;
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
		paymentMethod,
		priceList,
		placeList = [],
		freeDeliveryThreshold = null,
		address = '',
		deliveryAddress = '',
		image = '',
		orderItems,
		icon = false,
		status = 'pending',
		paymentConfirmed = false,
		paymentMethodList
	}: {
		// `Infer<typeof edit>`, not `Infer<Edit>` — the latter is already an inferred
		// type, so it silently resolved `$form` to `{}` and every field access on it
		// went unchecked.
		data: SuperValidated<Infer<typeof edit>>;
		id: number;
		customer: number;
		customerName: string;
		customerList: Item[];
		priceList: PriceItem[];
		placeList?: (Item & { fee: string })[];
		freeDeliveryThreshold?: string | null;
		address?: string | null;
		deliveryAddress?: string | null;
		orderItems: OrderItem[];
		icon: boolean;
		paymentMethod?: number;
		status: Status;
		/** Staff have already confirmed the payment. */
		paymentConfirmed?: boolean;
		paymentMethodList: Item[];
		image?: '';
	} = $props();

	const { form, errors, enhance, delayed, message, allErrors } = superForm(data, {
		resetForm: false,
		dataType: 'json',
		// Every row renders this component twice (the customer-name cell and the
		// edit cell), so without a per-instance id a single save broadcast its
		// result to all of them — one toast per instance, for every row on the page.
		id: `edit-order-${id}-${icon ? 'icon' : 'name'}`
	});

	let open = $state(false);
	let total = $state(0);

	const simplifyOrderItems = (items: OrderItem[]) =>
		items.map((item) => ({
			product: Number(item.productId),
			quantity: Number(item.quantity),
			amount: item.price + ' ' + item.amount
		}));

	$form.id = id;
	$form.customer = customer;
	$form.status = status;
	$form.address = address ?? '';
	$form.deliveryAddress = deliveryAddress ?? '';
	$form.paymentConfirmed = paymentConfirmed;

	if (paymentMethod) {
		$form.paymentMethod = paymentMethod;
	}

	$form.selectedProducts = simplifyOrderItems(
		orderItems.filter((item) => Number(item.orderId) === Number(id))
	);

	const hasItems = $derived($form.selectedProducts.length > 0);

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
	wide
	IconComp={icon ? SquarePen : undefined}
	title={icon ? '' : customerName}
	dialogTitle={`Edit Order #${id} — ${customerName}`}
	variant="ghost"
>
	{#snippet footer()}
		<div class="flex items-center justify-between gap-4">
			<div class="text-sm">
				<span class="text-muted-foreground">Total</span>
				<span class="ml-2 text-base font-semibold tabular-nums">
					ETB {total.toLocaleString()}
				</span>
			</div>
			<Button type="submit" form="edit" disabled={!hasItems || $delayed}>
				{#if $delayed}
					<LoadingBtn name="Saving Changes" />
				{:else}
					<Save class="h-4 w-4" />
					Save Changes
				{/if}
			</Button>
		</div>
	{/snippet}

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

		<OrderFormFields
			{form}
			{errors}
			{customerList}
			{priceList}
			{placeList}
			{freeDeliveryThreshold}
			bind:total
			statusItems={status === 'delivered'
				? [{ value: 'delivered', name: 'Delivered' }]
				: [
						{ value: 'pending', name: 'Pending' },
						{ value: 'cancelled', name: 'Cancelled' }
					]}
		/>

		<p class="text-xs text-muted-foreground">
			{#if status === 'delivered'}
				Delivered orders are reopened from the
				<a href="{resolve('/dashboard/deliveries')}?status=all&search={id}" class="underline"
					>Deliveries</a
				> page.
			{:else}
				Dispatching and delivering happen on the
				<a href={resolve('/dashboard/deliveries')} class="underline">Deliveries</a> page. Cancelling stops
				the delivery and puts any stock already sent out back.
			{/if}
		</p>

		<div class="flex flex-col gap-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
			<p class="text-sm font-medium">Payment</p>
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

			<InputComp
				label="Confirmed"
				name="paymentConfirmed"
				type="checkboxSingle"
				{form}
				{errors}
				placeholder="Payment received and checked"
			/>
			<p class="text-xs text-muted-foreground">
				Confirming the payment puts the order in the delivery queue. A cash-on-delivery order can
				be queued from the Delivery column without it.
			</p>
		</div>
	</form>
</DialogComp>
