<script lang="ts">
	import StatCard from './stat-card.svelte';
	import {
		ShoppingCartIcon,
		PackageIcon,
		TrendingUpIcon,
		DollarSignIcon,
		CreditCardIcon
	} from '@lucide/svelte';

	interface DailyStats {
		totalOrders: number;
		totalItemsSold: number;
		totalRevenue: number;
		averageOrderValue: number;
		totalPaymentsCollected: number;
	}

	const { stats }: { stats: DailyStats } = $props();

	/** Format currency */
	const formatCurrency = (value: number): string => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'ETB',
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(value);
	};

	/** Format number with commas */
	const formatNumber = (value: number): string => {
		return new Intl.NumberFormat('en-US').format(Math.round(value));
	};
</script>

<div class="w-full">
	<div class="mb-8">
		<h2 class="text-3xl font-bold text-foreground">Daily Statistics</h2>
		<p class="mt-2 text-muted-foreground">Today's performance overview</p>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
		<!-- Total Orders -->
		<StatCard
			title="Total Orders"
			value={formatNumber(stats.totalOrders || 0)}
			description="Delivered orders"
			measure="Orders"
		>
			{#snippet icon()}
				<ShoppingCartIcon class="size-6" />
			{/snippet}
		</StatCard>

		<!-- Total Items Sold -->
		<StatCard
			title="Items Sold"
			value={formatNumber(stats.totalItemsSold || 0)}
			description="Total quantity"
			measure="Sold"
		>
			{#snippet icon()}
				<PackageIcon class="size-6" />
			{/snippet}
		</StatCard>

		<!-- Total Revenue -->
		<StatCard
			title="Total Revenue"
			value={formatCurrency(stats.totalRevenue || 0)}
			description="Today's earnings"
		>
			{#snippet icon()}
				<TrendingUpIcon class="size-6" />
			{/snippet}
		</StatCard>

		<!-- Average Order Value -->
		<StatCard
			title="Avg Order Value"
			value={formatCurrency(stats.averageOrderValue || 0)}
			description="Per order"
		>
			{#snippet icon()}
				<DollarSignIcon class="size-6" />
			{/snippet}
		</StatCard>

		<!-- Payments Collected -->
		<StatCard
			title="Payments Collected"
			value={formatCurrency(stats.totalPaymentsCollected || 0)}
			description="Confirmed payments"
		>
			{#snippet icon()}
				<CreditCardIcon class="size-6" />
			{/snippet}
		</StatCard>
	</div>
</div>
