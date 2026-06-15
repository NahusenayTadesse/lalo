<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { ShoppingCart } from '@lucide/svelte';
	import type { PageData } from './$types';

	// Svelte 5 Rune for props
	let { data }: { data: PageData } = $props();

	// Fallback safe extraction from your PageServerLoad return
	let customer = $derived(data.customer);
	let orderCounts = $derived(data.orderCounts || []);
	let allMethods = $derived(data.allMethods || []);
	let allData = $derived(data.allData || []);
	let allItems = $derived(data.allItems || []);

	// --- Polymorphic Status Config using Shadcn Color Variables ---
	// This maps backend database statuses to semantic Shadcn classes dynamically
	const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
		pending: {
			bg: 'bg-warning/10',
			text: 'text-warning-foreground',
			border: 'border-warning/20'
		},
		completed: {
			bg: 'bg-success/10', // Or custom extensions, defaults to primary/secondary
			text: 'text-primary',
			border: 'border-primary/20'
		},
		cancelled: {
			bg: 'bg-destructive/10',
			text: 'text-destructive',
			border: 'border-destructive/20'
		},
		default: {
			bg: 'bg-muted',
			text: 'text-muted-foreground',
			border: 'border-border'
		}
	};

	function getStatusStyles(status: string) {
		return statusConfig[status.toLowerCase()] || statusConfig.default;
	}
</script>

<svelte:head>
	<title>Order History - Lalo Bakery Solutions</title>
</svelte:head>

<div class="mx-auto min-h-screen max-w-7xl space-y-8 bg-background p-6 text-foreground">
	<header
		class="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between"
	>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">
				Welcome back, {customer?.customerName ?? 'Customer'}
			</h1>
			<p class="mt-1 text-muted-foreground">
				Manage your orders, items, and billing configurations.
			</p>
		</div>
		<div class="flex gap-2">
			<Button href="/shop"><ShoppingCart /> New Order</Button>
		</div>
	</header>

	<section aria-labelledby="metrics-title">
		<h2 id="metrics-title" class="sr-only">Order Metrics</h2>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each orderCounts as metric}
				{@const styles = getStatusStyles(metric.status)}
				<div
					class="flex flex-row items-center justify-between space-y-0 rounded-xl border border-border bg-card p-6 pb-2 text-card-foreground shadow-sm"
				>
					<div class="space-y-1">
						<p class="text-sm font-medium tracking-tight text-muted-foreground capitalize">
							{metric.status} Orders
						</p>
						<div class="text-2xl font-bold">{metric.count}</div>
					</div>
					<div class={`h-4 w-4 rounded-full ${styles.bg} border ${styles.border}`}></div>
				</div>
			{/each}
		</div>
	</section>

	<div class="grid gap-6 md:grid-cols-3">
		<div
			class="rounded-xl border border-border bg-card text-card-foreground shadow-sm md:col-span-2"
		>
			<div class="p-6">
				<h3 class="text-lg leading-none font-semibold tracking-tight">Recent Orders</h3>
				<p class="mt-1 text-sm text-muted-foreground">
					A historical view of your generated invoices.
				</p>
			</div>
			<div class="overflow-x-auto border-t border-border">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-border bg-muted/50 font-medium text-muted-foreground">
						<tr>
							<th class="p-4">Order ID</th>
							<th class="p-4">Customer</th>
							<th class="p-4">Date</th>
							<th class="p-4 text-right">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#if allData.length === 0}
							<tr>
								<td colspan="4" class="p-8 text-center text-muted-foreground">No orders found.</td>
							</tr>
						{:else}
							{#each allData as order}
								{@const styles = getStatusStyles(order.status)}
								<tr class="transition-colors hover:bg-muted/40">
									<td class="p-4 font-mono text-xs text-muted-foreground">#{order.id}</td>
									<td class="p-4 font-medium">{order.name}</td>
									<td class="p-4 text-muted-foreground">{order.createdAt}</td>
									<td class="p-4 text-right">
										<span
											class={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles.bg} ${styles.text} ${styles.border} capitalize`}
										>
											{order.status}
										</span>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<div
			class="flex flex-col justify-between rounded-xl border border-border bg-card text-card-foreground shadow-sm"
		>
			<div>
				<div class="p-6">
					<h3 class="text-lg leading-none font-semibold tracking-tight">Active Payment Channels</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						Your verified methods for automated checkout.
					</p>
				</div>
				<div class="space-y-4 p-6 pt-0">
					{#each allMethods as method}
						<div
							class="flex items-start gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
						>
							<div class="rounded-md bg-secondary p-2 text-secondary-foreground">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><rect width="20" height="14" x="2" y="5" rx="2" /><line
										x1="2"
										x2="22"
										y1="10"
										y2="10"
									/></svg
								>
							</div>
							<div class="space-y-0.5">
								<p class="text-sm leading-none font-medium">{method.name}</p>
								<p class="text-xs text-muted-foreground">
									{method.description ?? 'No description provided.'}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
			<div class="rounded-b-xl border-t border-border bg-muted/20 p-6">
				<button
					class="w-full rounded-md border border-input bg-background px-4 py-2 text-center text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
				>
					Manage Methods
				</button>
			</div>
		</div>
	</div>

	<div class="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
		<div class="p-6">
			<h3 class="text-lg leading-none font-semibold tracking-tight">Pending Order Breakdown</h3>
			<p class="mt-1 text-sm text-muted-foreground">
				Items linked exclusively to your open queries.
			</p>
		</div>
		<div class="overflow-x-auto border-t border-border">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-border bg-muted/50 font-medium text-muted-foreground">
					<tr>
						<th class="p-4">Product Name</th>
						<th class="p-4 text-center">Quantity</th>
						<th class="p-4 text-right">Unit Price</th>
						<th class="p-4 text-right">Total</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#if allItems.filter((i) => i.orderId !== null).length === 0}
						<tr>
							<td colspan="4" class="p-8 text-center text-muted-foreground"
								>No active pending items found.</td
							>
						</tr>
					{:else}
						{#each allItems as item}
							{#if item.orderId}
								<tr class="transition-colors hover:bg-muted/40">
									<td class="p-4 font-medium">
										{item.product}
										<span class="mt-0.5 block font-mono text-xs text-muted-foreground"
											>ID: {item.productId}</span
										>
									</td>
									<td class="p-4 text-center font-mono">{item.quantity}</td>
									<td class="p-4 text-right font-mono">ETB {item.price.toFixed(2)}</td>
									<td class="p-4 text-right font-mono font-semibold">ETB {item.total.toFixed(2)}</td
									>
								</tr>
							{/if}
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
