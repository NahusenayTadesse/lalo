<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';

	let { data } = $props();

	// Svelte 5 Derived parameters
	let customer = $derived(data.customer);
	let metrics = $derived(data.metrics);
	let recentActivity = $derived(data.recentActivity || []);
	let activeDiscounts = $derived(data.activeDiscounts || []);

	// Total order calculations extractor helper
	let pendingCount = $derived(metrics.counts.find((c) => c.status === 'pending')?.count || 0);
	let deliveredCount = $derived(metrics.counts.find((c) => c.status === 'delivered')?.count || 0);

	// Polymorphic design mappings for Payment states using core Shadcn elements
	const paymentStyles: Record<string, { bg: string; text: string; border: string }> = {
		paid: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
		pending: { bg: 'bg-warning/10', text: 'text-warning-foreground', border: 'border-warning/20' },
		unpaid: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
		refunded: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
		disputed: {
			bg: 'bg-destructive/20',
			text: 'text-destructive font-bold',
			border: 'border-destructive/40'
		}
	};

	function getPaymentStyle(status: string) {
		return paymentStyles[status.toLowerCase()] || paymentStyles.pending;
	}
</script>

<svelte:head>
	<title>Account Overview - Lalo Bakery Solutions</title>
</svelte:head>

<div class="mx-auto min-h-screen max-w-7xl space-y-8 bg-background p-6 text-foreground">
	<header class="flex flex-col gap-1 border-b border-border pb-6">
		<h1 class="text-3xl font-bold tracking-tight">Overview Dashboard</h1>
		<p class="text-muted-foreground">
			Hello, {customer?.name ?? 'Valued Customer'}. Here is your current commercial account status.
		</p>
	</header>

	<section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
			<p class="text-sm font-medium text-muted-foreground">Settled Expenditures</p>
			<div class="mt-2 font-mono text-3xl font-bold tracking-tight text-primary">
				ETB {metrics.totalSpent.toFixed(2)}
			</div>
			<p class="mt-1 text-xs text-muted-foreground">Successfully cleared payments</p>
		</div>

		<div class="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
			<p class="text-sm font-medium text-muted-foreground">Outstanding Dues</p>
			<div
				class="mt-2 font-mono text-3xl font-bold tracking-tight {metrics.totalOutstanding > 0
					? 'text-destructive'
					: 'text-muted-foreground'}"
			>
				ETB {metrics.totalOutstanding.toFixed(2)}
			</div>
			<p class="mt-1 text-xs text-muted-foreground">Pending, unpaid, or open processing</p>
		</div>

		<div class="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
			<p class="text-sm font-medium text-muted-foreground">Active Processing Orders</p>
			<div class="mt-2 text-3xl font-bold tracking-tight">{pendingCount}</div>
			<p class="mt-1 text-xs text-muted-foreground">Items currently being fulfilled</p>
		</div>

		<div class="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
			<p class="text-sm font-medium text-muted-foreground">Completed Deliveries</p>
			<div class="mt-2 text-3xl font-bold tracking-tight">{deliveredCount}</div>
			<p class="mt-1 text-xs text-muted-foreground">Total orders received in past sessions</p>
		</div>
	</section>

	<div class="grid gap-6 lg:grid-cols-3">
		<div
			class="rounded-xl border border-border bg-card text-card-foreground shadow-sm lg:col-span-2"
		>
			<div class="p-6">
				<h2 class="text-lg leading-none font-semibold tracking-tight">
					Recent Orders & Transactions
				</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					A combined overview of product lines, shipping status, and payment linkages.
				</p>
			</div>

			<div class="divide-y divide-border border-t border-border">
				{#if recentActivity.length === 0}
					<div class="p-8 text-center text-sm text-muted-foreground">
						No recorded transactions found.
					</div>
				{:else}
					{#each recentActivity as activity}
						{@const payStyle = getPaymentStyle(activity.paymentStatus)}
						<div class="space-y-4 p-6 transition-colors hover:bg-muted/20">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<div class="flex items-center gap-3">
									<span class="font-mono text-sm font-semibold">Order #{activity.id}</span>
									<span
										class="inline-flex items-center rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground uppercase"
									>
										Fulfillment: {activity.status}
									</span>
									<span
										class={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${payStyle.bg} ${payStyle.text} ${payStyle.border}`}
									>
										Payment: {activity.paymentStatus}
									</span>
								</div>

								<div class="flex items-center gap-4">
									<span class="font-mono text-base font-bold">ETB {activity.amount.toFixed(2)}</span
									>
									{#if activity.receiptLink}
										<a
											href={activity.receiptLink}
											target="_blank"
											rel="noopener noreferrer"
											class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
													points="7 10 12 15 17 10"
												/><line x1="12" x2="12" y1="15" y2="3" /></svg
											>
											Receipt
										</a>
									{/if}
								</div>
							</div>

							<div class="rounded-lg border border-border bg-muted/40 p-3">
								<ul class="space-y-1.5 divide-y divide-border/50 text-xs">
									{#each activity.items as item}
										<li class="flex items-center justify-between pt-1.5 first:pt-0">
											<span class="font-medium text-muted-foreground"
												>{item.name} <span class="text-foreground/70">× {item.qty}</span></span
											>
											<span class="font-mono">ETB {(item.price * item.qty).toFixed(2)}</span>
										</li>
									{/each}
								</ul>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<div class="space-y-6">
			<div class="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
				<div class="p-6">
					<h2 class="text-lg leading-none font-semibold tracking-tight">
						Active Offers & Discounts
					</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Exclusive custom balance rollbacks available right now.
					</p>
				</div>

				<div class="space-y-4 p-6 pt-0">
					{#if activeDiscounts.length === 0}
						<p class="py-4 text-center text-xs text-muted-foreground">
							No public promotional events active.
						</p>
					{:else}
						{#each activeDiscounts as discount}
							<div
								class="relative flex flex-col justify-between space-y-3 overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-4"
							>
								<div class="space-y-1">
									<div class="flex items-center justify-between">
										<h3 class="text-sm font-bold tracking-tight text-foreground">
											{discount.name}
										</h3>
										<span
											class="inline-flex items-center rounded bg-primary px-1.5 py-0.5 font-mono text-xs font-bold text-primary-foreground"
										>
											-ETB{Number(discount.amount).toFixed(0)}
										</span>
									</div>
									<p class="text-xs leading-relaxed text-muted-foreground">
										{discount.description ?? 'No details provided.'}
									</p>
								</div>
								{#if discount.productName}
									<div
										class="w-fit rounded border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground"
									>
										Applies to: <span class="font-medium text-foreground"
											>{discount.productName}</span
										>
									</div>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<div class="space-y-2 rounded-xl border border-border bg-muted/40 p-6 text-card-foreground">
				<h3 class="text-sm font-semibold">Need Assistance?</h3>
				<p class="text-xs leading-normal text-muted-foreground">
					If you have open inquiries or notice discrepancies regarding pending order adjustments or
					payments, please reach out via our internal tickets portal.
				</p>
				<div class="pt-2">
					<Button href="/contact-us" variant="link">Contact Support Representative &rarr;</Button>
				</div>
			</div>
		</div>
	</div>
</div>
