<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Plus } from '@lucide/svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import AddCustomer from '$lib/forms/AddCustomer.svelte';
	import ProductLineItem from './product-line-item.svelte';

	type Item = { value: string | number; name: string };
	type CustomerItem = Item & { address?: string | null; deliveryAddress?: string | null };
	type PlaceItem = Item & { fee: string };
	type PriceItem = {
		id: number;
		value: string;
		productId: number | string | null;
		productName?: string | null;
		price: string;
		amount: string;
	};

	/**
	 * Everything the add and edit dialogs have in common. Both used to carry their
	 * own copy of this markup, which is how the add dialog ended up with a delivery
	 * address field the edit dialog never had.
	 */
	let {
		form,
		errors,
		customerList,
		priceList,
		placeList,
		addCustomerForm,
		freeDeliveryThreshold = null,
		statusItems,
		/** Read back by the dialogs so the pinned footer can show the same figure. */
		total = $bindable(0)
	}: {
		// The add and edit schemas differ (edit also carries id/receipt/payment), so
		// there is no single SuperForm<T> both stores satisfy. Only the fields below
		// are touched here, and both schemas define all of them.
		/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
		form: any;
		/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
		errors: any;
		customerList: CustomerItem[];
		priceList: PriceItem[];
		placeList: PlaceItem[];
		/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
		addCustomerForm?: any;
		freeDeliveryThreshold?: string | null;
		statusItems: Item[];
		total?: number;
	} = $props();

	/**
	 * One flat, searchable list of orderable variants.
	 *
	 * `prices.amount` is a free-text label, so installs differ: some write the full
	 * "Whipped Cream Powder 10*2kg", others just "500g". Prefixing the product name
	 * only when the label doesn't already start with it keeps both readable without
	 * "Cream Powder Cream Powder 500g". The product name is a search keyword either
	 * way, so typing it always finds the variant.
	 */
	const variants = $derived(
		priceList.map((p) => {
			const productName = p.productName ?? '';
			// A blank product name must not take the "already named" branch —
			// ''.slice() makes startsWith('') true for everything, which is how every
			// row briefly rendered as a bare "100g".
			const alreadyNamed =
				productName.length > 0 &&
				p.amount.toLowerCase().startsWith(productName.toLowerCase().slice(0, 8));
			const label = alreadyNamed ? p.amount : `${productName} ${p.amount}`.trim();

			return {
				value: p.id,
				name: `${label} · ETB ${Number(p.price).toLocaleString()}`,
				keywords: [productName, p.amount].filter(Boolean) as string[],
				productId: p.productId,
				amountValue: p.value
			};
		})
	);

	function addProduct() {
		$form.selectedProducts = [...$form.selectedProducts, { product: 0, quantity: 1, amount: '' }];
	}

	function removeProduct(index: number) {
		$form.selectedProducts = $form.selectedProducts.filter((_: unknown, i: number) => i !== index);
	}

	const subtotal = $derived(
		$form.selectedProducts.reduce((sum: number, item: { amount?: string; quantity?: number }) => {
			const price = parseFloat(String(item.amount ?? '').split(' ')[0]);
			return sum + (Number.isFinite(price) ? price * (item.quantity ?? 0) : 0);
		}, 0)
	);

	const threshold = $derived(freeDeliveryThreshold === null ? null : Number(freeDeliveryThreshold));
	const qualifiesForFreeDelivery = $derived(
		threshold !== null && subtotal > 0 && subtotal >= threshold
	);

	const areaFee = $derived(placeList.find((p) => p.value === $form.address)?.fee);
	/**
	 * Preview only, and mirrors resolveDeliveryFee() on the server — that value is
	 * the one actually stored, so a stale price list here can't overcharge anyone.
	 */
	const fee = $derived(qualifiesForFreeDelivery ? 0 : Number(areaFee ?? 0));

	$effect(() => {
		total = subtotal + fee;
	});

	/**
	 * Picking a customer fills in the delivery fields from their profile — the
	 * common case is a repeat customer ordering to the same place. Only ever fills
	 * blanks, so it can't overwrite an address already typed or loaded.
	 */
	let lastCustomer: string | number | undefined = $state(undefined);
	$effect(() => {
		const picked = $form.customer;

		untrack(() => {
			if (picked === lastCustomer) return;
			lastCustomer = picked;

			const customer = customerList.find((c) => Number(c.value) === Number(picked));
			if (!customer) return;

			if (!$form.address && customer.address) $form.address = customer.address;
			if (!$form.deliveryAddress && customer.deliveryAddress) {
				$form.deliveryAddress = customer.deliveryAddress;
			}
		});
	});
</script>

<div class="flex items-end gap-2">
	<div class="min-w-0 flex-1">
		<InputComp label="Customer" name="customer" type="combo" {form} {errors} items={customerList} />
	</div>
	{#if addCustomerForm}
		<!-- Inline, because staff taking a phone order from a new customer used to
		     have to abandon the order, add the customer, and start again. -->
		<div class="pb-1">
			<AddCustomer data={addCustomerForm} title="+ New" />
		</div>
	{/if}
</div>

<div class="flex items-center justify-between pt-2">
	<Label class="text-sm font-semibold">Order Items</Label>
	<Button type="button" size="sm" class="gap-2" onclick={addProduct}>
		<Plus class="h-4 w-4" />
		<span>Add Product</span>
	</Button>
</div>

{#if $form.selectedProducts.length === 0}
	<button
		type="button"
		onclick={addProduct}
		class="w-full rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
	>
		No products yet — click to add the first one.
	</button>
{/if}

<div class="flex flex-col gap-1.5">
	{#each [...$form.selectedProducts.keys()] as i (i)}
		<ProductLineItem
			index={i}
			bind:product={$form.selectedProducts[i].product}
			bind:quantity={$form.selectedProducts[i].quantity}
			bind:amount={$form.selectedProducts[i].amount}
			{variants}
			errors={$errors.selectedProducts?.[i]}
			onremove={() => removeProduct(i)}
		/>
	{/each}
</div>

{#if $errors.selectedProducts?._errors}
	<p class="text-sm font-medium text-destructive">{$errors.selectedProducts._errors}</p>
{/if}

<div class="grid gap-3 pt-2 sm:grid-cols-2">
	<InputComp label="Delivery Area" name="address" type="combo" {form} {errors} items={placeList} />
	<InputComp
		label="Delivery Address"
		name="deliveryAddress"
		type="text"
		placeholder="Street, building, landmark"
		{form}
		{errors}
	/>
</div>

<InputComp label="Status" name="status" type="select" {form} {errors} items={statusItems} />

{#if subtotal > 0}
	<div class="space-y-1 rounded-lg border bg-muted/40 p-3 text-sm">
		<div class="flex justify-between text-muted-foreground">
			<span>Subtotal</span>
			<span class="tabular-nums">ETB {subtotal.toLocaleString()}</span>
		</div>
		<div class="flex justify-between text-muted-foreground">
			<span>
				Delivery
				{#if qualifiesForFreeDelivery}
					<span class="text-xs font-medium text-green-600 dark:text-green-500">(free)</span>
				{:else if !$form.address}
					<span class="text-xs">(pick an area)</span>
				{/if}
			</span>
			<span class="tabular-nums">ETB {fee.toLocaleString()}</span>
		</div>
	</div>
{/if}
