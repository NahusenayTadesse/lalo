<script lang="ts">
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { ChevronDownIcon } from '@lucide/svelte';

	type PriceItem = {
		amount: number;
		price: number;
	};

	const { priceList = [] }: { priceList: PriceItem[] } = $props();
</script>

<Popover>
	<PopoverTrigger>
		{#snippet child({ props })}
			<Button variant="outline" size="sm" {...props} class="gap-2">
				View Prices
				<ChevronDownIcon class="size-4" />
			</Button>
		{/snippet}
	</PopoverTrigger>
	<PopoverContent class="w-56 p-0">
		<div class="flex flex-col divide-y">
			<div class="px-4 py-3">
				<p class="text-sm font-semibold text-foreground">Available Prices</p>
			</div>
			<div class="max-h-64 overflow-y-auto">
				{#if priceList.length > 0}
					{#each priceList as price (price.amount)}
						<div
							class="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/50"
						>
							<span class="text-sm text-foreground">{price.amount}</span>
							<span class="text-sm font-semibold text-primary">{price.price}</span>
						</div>
					{/each}
				{:else}
					<div class="px-4 py-6 text-center">
						<p class="text-sm text-muted-foreground">No prices available</p>
					</div>
				{/if}
			</div>
		</div>
	</PopoverContent>
</Popover>
