<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { orderStatusLabel } from '$lib/status-labels';
	import DeliveryTimeline from './delivery-timeline.svelte';

	// Svelte 5 Runes
	let { data, form } = $props();
	let pendingOrders = $derived(data.pendingOrders || []);
</script>

<svelte:head>
	<title>{m.acc_tracking_meta_title()}</title>
</svelte:head>

<div class="mx-auto min-h-screen max-w-5xl space-y-8 bg-background p-6 text-foreground">
	<header class="border-b border-border pb-6">
		<div class="flex items-center gap-3">
			<span class="relative flex h-3 w-3">
				<span
					class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
				></span>
				<span class="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
			</span>
			<h1 class="text-3xl font-bold tracking-tight">{m.acc_tracking_title()}</h1>
		</div>
		<p class="mt-1 text-muted-foreground">
			{m.acc_tracking_hint()}
		</p>
	</header>

	{#if form && 'received' in form}
		<p
			class="rounded-md border border-green-600/25 bg-green-600/10 p-3 text-sm text-green-700 dark:text-green-400"
		>
			{m.track_received_done()}
		</p>
	{/if}

	{#if form && 'message' in form && form.message}
		<p
			class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
		>
			{form.message}
		</p>
	{/if}

	{#if pendingOrders.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center text-card-foreground"
		>
			<div class="mb-4 rounded-full bg-muted p-3 text-muted-foreground">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m16 10-4 4-2-2" /></svg
				>
			</div>
			<h3 class="text-lg font-semibold">{m.acc_no_shipments()}</h3>
			<p class="mt-1 max-w-sm text-sm text-muted-foreground">
				{m.acc_no_shipments_hint()}
			</p>
		</div>
	{:else}
		<div class="space-y-8">
			{#each pendingOrders as order}
				<div
					class="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm"
				>
					<div
						class="flex flex-col justify-between gap-4 border-b border-border bg-muted/30 p-6 sm:flex-row sm:items-center"
					>
						<div class="space-y-1">
							<div class="flex items-center gap-2">
								<span class="font-mono text-sm font-semibold text-muted-foreground"
									>{m.acc_order_id({ id: order.id })}</span
								>
								<span
									class="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize"
								>
									{orderStatusLabel(order.status)}
								</span>
							</div>
							<p class="text-xs text-muted-foreground">
								{m.acc_initiated({ created: order.createdAt, updated: order.updatedAt })}
							</p>
						</div>
						<div class="text-sm sm:text-right">
							<p class="text-xs font-medium text-muted-foreground">{m.acc_estimated()}</p>
							<p class="font-mono text-xl font-bold text-foreground">
								{m.price_etb({ amount: order.orderTotal.toFixed(2) })}
							</p>
						</div>
					</div>

					<div class="border-b border-border bg-card p-6">
						<DeliveryTimeline
							orderId={order.id}
							createdAt={order.createdAt}
							delivery={order.delivery}
						/>
					</div>

					<div class="bg-muted/10 p-6">
						<h4 class="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
							{m.acc_manifest()}
						</h4>
						<ul
							class="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background"
						>
							{#each order.items as item}
								<li
									class="flex items-center justify-between p-4 text-sm transition-colors hover:bg-muted/30"
								>
									<div class="space-y-0.5">
										<p class="font-medium text-foreground">{item.productName}</p>
										<p class="font-mono text-xs text-muted-foreground">
											{m.acc_qty_line({ quantity: item.quantity, price: m.price_etb({ amount: item?.price }) })}
										</p>
									</div>
									<span class="font-mono font-medium text-foreground"
										>{m.price_etb({ amount: item?.total })}</span
									>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
