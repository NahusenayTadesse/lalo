<script lang="ts">
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import type { CartItem, ProductPrice } from '$lib/hooks/cart.svelte';

	interface Props {
		item: CartItem;
		priceList: ProductPrice[];
		onPriceChange?: (amount: number | string, price: number) => void;
	}

	const { item, priceList, onPriceChange }: Props = $props();
	// const priceList = $derived(item?.priceList ?? []);
	let selectedPrice = $derived(
		priceList?.find((p) => p.amount === item?.amount && p.price === item?.price)
	);

	const handlePriceChange = (newPrice: ProductPrice) => {
		selectedPrice = newPrice;
		if (onPriceChange) {
			onPriceChange(newPrice.amount, newPrice.price);
		}
	};
</script>

<Select
	type="single"
	value={`${selectedPrice?.amount}-${selectedPrice?.price}`}
	onchange={(value) => {
		if (value) {
			const [amount, price] = value.split('-');
			const newPrice = priceList.find((p) => p.amount === amount && p.price === parseFloat(price));
			if (newPrice) handlePriceChange(newPrice);
		}
	}}
>
	<SelectTrigger class="w-full">
		{selectedPrice?.amount} - ${selectedPrice?.price}
	</SelectTrigger>
	<SelectContent>
		{#each priceList as price (price.amount)}
			<SelectItem value={`${price.amount}-${price.price}`}>
				{price.amount} - ETB{price.price}
			</SelectItem>
		{/each}
	</SelectContent>
</Select>
