<script lang="ts">
	import ReorderList from '$lib/components/dashboard/reorder-list.svelte';
	import { CalendarClock, CalendarX, PackageIcon } from '@lucide/svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import { EXPIRY_WARNING_DAYS } from '$lib/expiry';

	import Reports from '$lib/components/dashboard/reports.svelte';
	import DailyStats from '$lib/components/dashboard/daily-stats.svelte';

	let { data } = $props();

	const expiredUnits = $derived(data.expiredBatches.reduce((sum, b) => sum + b.quantity, 0));
	const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
	const writeOffText = $derived(
		`Every expired batch that still holds stock is emptied and recorded as damaged: ${plural(expiredUnits, 'unit')} across ${plural(data.expiredBatches.length, 'batch', 'batches')}.`
	);
</script>

<svelte:head>
	<title>Dashboard</title>
</svelte:head>

<div
	class="min-h-dvh w-full rounded-lg border bg-linear-to-br from-background/10 via-background/10
 to-muted/30 backdrop-blur-md transition-colors duration-300"
>
	<!-- Header Section -->
	<div
		class="rounded-xl border-b border-border/50 bg-linear-to-r from-primary/5 via-accent/5
	 to-secondary/5 shadow-sm backdrop-blur-sm"
	>
		<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="space-y-1">
					<h1
						class="bg-linear-to-r from-primary to-black bg-clip-text text-3xl font-bold text-transparent dark:to-white"
					>
						Dashboard
					</h1>
					<p class="text-sm text-muted-foreground">Welcome back! Here's your daily overview.</p>
				</div>
			</div>
		</div>
	</div>
	<div class="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
		<DailyStats stats={data?.dailyStats} />
	</div>

	<!-- Main Content -->
	<div class="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
		<!-- Stats Grid -->

		<!-- Reorder Items Grid -->

		<div class="mb-8 grid gap-6 md:grid-cols-2">
			<ReorderList
				title="Products to Reorder"
				description="Variants at or below their reorder level"
				items={data.reorderProducts}
				icon={PackageIcon}
			/>
			<ReorderList
				title="Expiring Soon"
				description="Stock expiring within {EXPIRY_WARNING_DAYS} days: sell these first"
				items={data.expiringBatches}
				icon={CalendarClock}
				badge="Expiring"
				emptyText="No batches expiring soon"
			/>
			<div class="flex flex-col gap-3 md:col-span-2">
				<ReorderList
					title="Expired Stock"
					description="Can't be sold or delivered. Write it off so stock counts stay true."
					items={data.expiredBatches}
					icon={CalendarX}
					badge="Expired"
					emptyText="Nothing on the shelf has expired"
				/>
				{#if expiredUnits > 0}
					<div class="flex justify-end">
						<ConfirmAction
							action="?/writeOffExpired"
							label="Write Off All Expired ({expiredUnits})"
							title="Write off all expired stock?"
							description={writeOffText}
							icon={CalendarX}
							variant="destructive"
						/>
					</div>
				{/if}
			</div>
		</div>

		<!-- Report Section -->
	</div>
</div>
