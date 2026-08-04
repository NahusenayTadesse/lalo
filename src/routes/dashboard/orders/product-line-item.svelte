<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import ComboboxComp from '$lib/formComponents/ComboboxComp.svelte';
	import { X } from '@lucide/svelte';
	import { fly } from 'svelte/transition';

	type Item = { value: string | number; name: string };
	type PriceItem = Item & { productId?: number | string | null };
	type LineItem = { product: number; quantity: number; amount: string };

	let {
		index,
		item = $bindable(),
		productList,
		priceList,
		errors,
		onremove
	}: {
		index: number;
		item: LineItem;
		productList: Item[];
		priceList: PriceItem[];
		errors?: { product?: string; amount?: string; quantity?: string };
		onremove: () => void;
	} = $props();

	/** Package-size choices narrow to the selected product; a fresh row has none picked yet. */
	const availableAmounts = $derived(
		item.product
			? priceList.filter((p) => Number(p.productId) === Number(item.product))
			: [{ value: '', name: 'Select a product first' }]
	);

	const productName = $derived(productList.find((p) => p.value === item.product)?.name);

	/** `amount` is stored as "<price> <package label>" (see splitNumbers() server-side). */
	const unitPrice = $derived(parseFloat(String(item.amount ?? '').split(' ')[0]));
	const lineTotal = $derived(
		Number.isFinite(unitPrice) && item.quantity ? unitPrice * item.quantity : null
	);
</script>

<div
	class="group relative rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
	transition:fly={{ y: 12, duration: 150 }}
>
	<div class="mb-3 flex items-start justify-between gap-2">
		<div class="min-w-0">
			<span class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
				Item #{index + 1}
			</span>
			{#if productName}
				<p class="truncate text-sm font-medium" title={productName}>{productName}</p>
			{/if}
		</div>
		<Button
			type="button"
			variant="ghost"
			size="sm"
			class="h-7 w-7 shrink-0 rounded-full p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
			onclick={onremove}
		>
			<X class="h-4 w-4" />
			<span class="sr-only">Remove item</span>
		</Button>
	</div>

	<div class="flex flex-col gap-3">
		<div class="min-w-0 space-y-1.5">
			<Label class="text-xs font-medium text-muted-foreground">Product</Label>
			<ComboboxComp
				items={productList}
				name="selectedProducts"
				required={true}
				bind:value={item.product}
			/>
			{#if errors?.product}
				<p class="text-[11px] font-medium text-destructive">{errors.product}</p>
			{/if}
		</div>

		<div class="grid grid-cols-[1fr_6rem] gap-3">
			<div class="min-w-0 space-y-1.5">
				<Label class="text-xs font-medium text-muted-foreground">Package Size</Label>
				<ComboboxComp
					items={availableAmounts}
					name="selectedProducts"
					required={true}
					bind:value={item.amount}
				/>
				{#if errors?.amount}
					<p class="text-[11px] font-medium text-destructive">{errors.amount}</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<Label class="text-xs font-medium text-muted-foreground">Qty</Label>
				<Input type="number" min="1" placeholder="1" bind:value={item.quantity} />
				{#if errors?.quantity}
					<p class="text-[11px] font-medium text-destructive">{errors.quantity}</p>
				{/if}
			</div>
		</div>

		{#if lineTotal !== null}
			<p class="text-right text-xs text-muted-foreground">
				{item.quantity} × ETB {unitPrice.toLocaleString()} = <span
					class="font-semibold text-foreground">ETB {lineTotal.toLocaleString()}</span
				>
			</p>
		{/if}
	</div>
</div>
