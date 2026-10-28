<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { ChevronRightIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { orderStatusLabel } from '$lib/status-labels';
	import { getLocale } from '$lib/paraglide/runtime.js';

	interface Props {
		order: {
			id: string | number;
			name: string;
			customerId?: string | number;
			status: string;
			createdAt?: string;
		};
		orderItems?: any[];
		currency?: string;
		isAdmin?: boolean;
		children?: Snippet<[{ order: any }]>;
	}

	const { order, orderItems = [], currency = 'ETB', isAdmin = false, children }: Props = $props();

	const formatDate = (date?: string) => {
		if (!date) return '';
		return new Date(date).toLocaleDateString(getLocale() === 'am' ? 'am-ET' : 'en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	const getStatusColor = (status: string) => {
		const statusMap: Record<string, string> = {
			pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
			completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
			cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
			processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
		};
		return (
			statusMap[status?.toLowerCase()] ||
			'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
		);
	};

	const totalItems = orderItems.length;
	const totalPrice = orderItems.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0);
</script>

<Card class="hover:shadow-lg-lg overflow-hidden transition-all duration-200 hover:scale-[1.02]">
	<CardHeader class="pb-3">
		<div class="flex items-start justify-between gap-4">
			<div class="min-w-0 flex-1">
				<CardTitle class="truncate text-lg">{order.name}</CardTitle>
				<CardDescription class="text-sm">
					{m.acc_order_id_label()} <span class="font-mono text-foreground">#{order.id}</span>
					{#if order.createdAt}
						<span class="ml-2">• {formatDate(order.createdAt)}</span>
					{/if}
				</CardDescription>
			</div>
			<Badge class={getStatusColor(order.status)}>
				{orderStatusLabel(order.status)}
			</Badge>
		</div>
	</CardHeader>

	<Separator />

	<CardContent class="pt-4">
		<!-- Order Items Summary -->
		<div class="mb-4">
			<h4 class="mb-2 text-sm font-semibold">{m.orders_items_count({ count: totalItems })}</h4>
			<div class="flex flex-col gap-2">
				{#if orderItems.length > 0}
					{#each orderItems.slice(0, 3) as item (item.id)}
						<div class="flex items-center justify-between text-sm">
							<span class="truncate text-muted-foreground">{item.name || m.orders_item()}</span>
							<span class="font-medium">
								{item.quantity}x {currency}
								{item?.price ?? '0.00'}
							</span>
						</div>
					{/each}
					{#if orderItems.length > 3}
						<div class="pt-2 text-sm text-muted-foreground">
							{m.orders_more_items({ count: orderItems.length - 3 })}
						</div>
					{/if}
				{:else}
					<p class="text-sm text-muted-foreground">{m.orders_no_items()}</p>
				{/if}
			</div>
		</div>

		<!-- Total Price -->
		{#if totalPrice > 0}
			<div class="flex items-center justify-between border-t pt-2">
				<span class="text-sm font-semibold">{m.orders_total()}</span>
				<span class="text-lg font-bold text-primary">
					{currency}
					{totalPrice.toFixed(2)}
				</span>
			</div>
		{/if}
	</CardContent>

	<!-- Actions -->
	{#if children}
		<Separator />
		<div class="flex items-center gap-2 bg-muted/30 px-6 py-3">
			{@render children({ order })}
		</div>
	{/if}
</Card>
