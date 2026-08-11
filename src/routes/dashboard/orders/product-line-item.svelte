<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import ComboboxComp from '$lib/formComponents/ComboboxComp.svelte';
	import { Minus, Plus, X } from '@lucide/svelte';
	import { fly } from 'svelte/transition';

	type Variant = {
		/** `prices.id` — the picker's own key. */
		value: string | number;
		name: string;
		keywords?: string[];
		/** What selecting this row writes back into the form. */
		productId: number | string | null;
		amountValue: string;
	};

	/**
	 * The three line fields are bound individually rather than as one `item` object.
	 * `$form` (a plain superforms store, not a `$state` proxy) hands out plain
	 * objects, so mutating `item.product` in here changed the data but fired no
	 * signal: the trigger label, the package list and the totals all kept showing
	 * pre-selection values. Binding `$form.selectedProducts[i].product` from the
	 * parent compiles to a store mutation, which does notify.
	 */
	let {
		index,
		product = $bindable(),
		quantity = $bindable(),
		amount = $bindable(),
		variants,
		errors,
		onremove
	}: {
		index: number;
		product: number;
		quantity: number;
		amount: string;
		variants: Variant[];
		errors?: { product?: string; amount?: string; quantity?: string };
		onremove: () => void;
	} = $props();

	/**
	 * Product and package used to be two pickers for what is one decision, which is
	 * exactly what let them fall out of sync — `amount` carries the unit price, so a
	 * package left over from the previously chosen product priced the new one at the
	 * old rate. One variant row now writes both fields together, so that state
	 * cannot be expressed at all.
	 */
	const selectedVariant = $derived(
		variants.find((v) => Number(v.productId) === Number(product) && v.amountValue === amount)
	);

	function choose(variant: Variant) {
		product = Number(variant.productId);
		amount = variant.amountValue;
	}

	/** `amount` is stored as "<price> <package label>" (see splitNumbers() server-side). */
	const unitPrice = $derived(parseFloat(String(amount ?? '').split(' ')[0]));
	const lineTotal = $derived(Number.isFinite(unitPrice) && quantity ? unitPrice * quantity : null);

	function step(by: number) {
		quantity = Math.max(1, (Number(quantity) || 0) + by);
	}

	const rowError = $derived(errors?.product || errors?.amount || errors?.quantity);
</script>

<div
	class="rounded-lg border bg-card p-2 transition-colors hover:border-primary/40"
	transition:fly={{ y: 8, duration: 120 }}
>
	<div class="flex items-center gap-2">
		<span class="w-5 shrink-0 text-center text-xs font-medium text-muted-foreground">
			{index + 1}
		</span>

		<div class="min-w-0 flex-1">
			<ComboboxComp
				items={variants}
				name="selectedProducts"
				placeholder="Search products…"
				required={true}
				value={selectedVariant?.value}
				onselect={(v) => choose(v as Variant)}
			/>
		</div>

		<div class="flex shrink-0 items-center">
			<Button
				type="button"
				variant="outline"
				size="sm"
				class="h-9 w-7 rounded-r-none p-0"
				onclick={() => step(-1)}
				disabled={Number(quantity) <= 1}
			>
				<Minus class="h-3 w-3" />
				<span class="sr-only">Decrease quantity</span>
			</Button>
			<Input
				type="number"
				min="1"
				placeholder="1"
				class="h-9 w-12 rounded-none px-1 text-center"
				bind:value={quantity}
			/>
			<Button
				type="button"
				variant="outline"
				size="sm"
				class="h-9 w-7 rounded-l-none p-0"
				onclick={() => step(1)}
			>
				<Plus class="h-3 w-3" />
				<span class="sr-only">Increase quantity</span>
			</Button>
		</div>

		<span class="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
			{#if lineTotal !== null}
				ETB {lineTotal.toLocaleString()}
			{:else}
				<span class="text-muted-foreground">—</span>
			{/if}
		</span>

		<Button
			type="button"
			variant="ghost"
			size="sm"
			class="h-8 w-8 shrink-0 rounded-full p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
			onclick={onremove}
		>
			<X class="h-4 w-4" />
			<span class="sr-only">Remove item {index + 1}</span>
		</Button>
	</div>

	{#if rowError}
		<p class="mt-1 pl-7 text-[11px] font-medium text-destructive">{rowError}</p>
	{/if}
</div>
