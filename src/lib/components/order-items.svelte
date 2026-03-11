<script lang="ts">
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { PackageIcon, ChevronDownIcon } from '@lucide/svelte';

	type OrderItem = {
		id: string | number;
		orderId: string | number;
		product: string;
		quantity: number | string;
		amount: number | string; // The package size/amount
		price: string | number;
		productId: string | number;
		total: number;
	};

	type Props = {
		items: OrderItem[];
		/** Currency symbol to display */
		currency?: string;
	};

	const { items, currency = 'ETB' }: Props = $props();

	const totalItems = $derived(items.reduce((sum, item) => sum + Number(item.quantity), 0));
	const grandTotal = $derived(items.reduce((sum, item) => sum + item.total, 0));

	/** Format price with currency */
	const formatPrice = (price: number | string) => `${currency} ${Number(price).toLocaleString()}`;
</script>

{#if items.length === 0}
	<span class="text-sm text-muted-foreground">No items</span>
{:else if items.length === 1}
	<div class="flex items-center gap-2">
		<div class="flex flex-col">
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium">{items[0].product}</span>
				<Badge variant="outline" class="h-4 px-1 text-[10px] font-normal">
					{items[0].amount}
				</Badge>
			</div>
			<span class="text-xs text-muted-foreground">
				{items[0].quantity} × {formatPrice(items[0].price)} = {formatPrice(items[0].total)}
			</span>
		</div>
	</div>
{:else}
	<Popover>
		<PopoverTrigger>
			{#snippet child({ props })}
				<Button variant="ghost" size="sm" class="h-auto gap-2 px-2 py-1 hover:bg-muted" {...props}>
					<div class="flex items-center gap-2">
						<div class="rounded-full bg-primary/10 p-1">
							<PackageIcon class="size-4 text-primary" />
						</div>
						<div class="flex flex-col items-start">
							<span class="text-sm font-semibold">{items.length} Variations</span>
							<span class="text-xs text-muted-foreground">
								{totalItems} items · {formatPrice(grandTotal)}
							</span>
						</div>
						<ChevronDownIcon class="size-4 text-muted-foreground" />
					</div>
				</Button>
			{/snippet}
		</PopoverTrigger>
		<PopoverContent class="w-80 p-0" align="start">
			<div class="p-3">
				<h4 class="text-sm font-semibold">Order Details</h4>
				<p class="text-xs text-muted-foreground">
					{items.length} unique selections
				</p>
			</div>
			<Separator />
			<div class="max-h-80 overflow-y-auto">
				{#each items as item, index (item.id)}
					<div
						class={[
							'flex items-start justify-between gap-3 p-3 transition-colors hover:bg-muted/30',
							index !== items.length - 1 && 'border-b'
						]}
					>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<p class="truncate text-sm font-medium">{item.product}</p>
								<span class="text-[10px] font-bold text-muted-foreground uppercase">
									[{item.amount}]
								</span>
							</div>
							<p class="text-xs text-muted-foreground">
								Qty: {item.quantity} × {formatPrice(item.price)}
							</p>
						</div>
						<div class="text-right">
							<p class="text-sm font-semibold">{formatPrice(item.total)}</p>
						</div>
					</div>
				{/each}
			</div>
			<Separator />
			<div class="flex items-center justify-between bg-muted/50 p-4">
				<span class="text-sm font-bold tracking-tight uppercase">Grand Total</span>
				<span class="text-base font-black text-primary">{formatPrice(grandTotal)}</span>
			</div>
		</PopoverContent>
	</Popover>
{/if}
