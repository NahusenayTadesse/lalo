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
	const formatPrice = (price: number | string) => `${currency} ${Number(price)}`;
</script>

{#if items.length === 0}
	<span class="text-sm text-muted-foreground">No items</span>
{:else if items.length === 1}
	<!-- Single item: display inline -->
	<div class="flex items-center gap-2">
		<div class="flex flex-col">
			<span class="text-sm font-medium">{items[0].product}</span>
			<span class="text-xs text-muted-foreground">
				{items[0].quantity} × {formatPrice(items[0].price)} = {formatPrice(items[0].total)}
			</span>
		</div>
	</div>
{:else}
	<!-- Multiple items: show summary with popover -->
	<Popover>
		<PopoverTrigger>
			{#snippet child({ props })}
				<Button variant="ghost" size="sm" class="h-auto gap-2 px-2 py-1" {...props}>
					<div class="flex items-center gap-2">
						<PackageIcon class="size-4 text-muted-foreground" />
						<div class="flex flex-col items-start">
							<span class="text-sm font-medium">{items.length} products</span>
							<span class="text-xs text-muted-foreground"
								>{totalItems} items · {formatPrice(grandTotal)}</span
							>
						</div>
						<ChevronDownIcon class="size-4 text-muted-foreground" />
					</div>
				</Button>
			{/snippet}
		</PopoverTrigger>
		<PopoverContent class="w-80 p-0" align="start">
			<div class="p-3">
				<h4 class="text-sm font-semibold">Order Items</h4>
				<p class="text-xs text-muted-foreground">
					{items.length} products · {totalItems} total items
				</p>
			</div>
			<Separator />
			<div class="max-h-64 overflow-y-auto">
				{#each items as item, index (item.id)}
					<div
						class={[
							'flex items-start justify-between gap-3 p-3',
							index !== items.length - 1 && 'border-b'
						]}
					>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">{item.product}</p>
							<p class="text-xs text-muted-foreground">
								{item.quantity} × {formatPrice(item.price)}
							</p>
						</div>
						<Badge variant="secondary" class="shrink-0">
							{formatPrice(item.total)}
						</Badge>
					</div>
				{/each}
			</div>
			<Separator />
			<div class="flex items-center justify-between bg-muted/50 p-3">
				<span class="text-sm font-medium">Total</span>
				<span class="text-sm font-bold">{formatPrice(grandTotal)}</span>
			</div>
		</PopoverContent>
	</Popover>
{/if}
