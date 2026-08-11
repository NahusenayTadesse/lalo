<script lang="ts">
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { SquarePen, Save } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { edit } from './schema';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
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
			statusItems={[
				{ value: 'pending', name: 'Pending' },
				{ value: 'delivered', name: 'Delivered' },
				{ value: 'cancelled', name: 'Cancelled' }
			]}
		/>

		{#if $form.status === 'delivered'}
			<div class="flex flex-col gap-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
				<p class="text-xs text-muted-foreground">
					Marking this delivered moves stock and emails the customer.
				</p>

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
			</div>
		{/if}
	</form>
</DialogComp>
