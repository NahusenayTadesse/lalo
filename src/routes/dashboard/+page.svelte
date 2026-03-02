<script lang="ts">
	import ReorderList from '$lib/components/dashboard/reorder-list.svelte';
	import { PackageIcon } from '@lucide/svelte';

	import Reports from '$lib/components/dashboard/reports.svelte';

	let { data } = $props();
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

	<!-- Main Content -->
	<div class="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
		<Reports report={data.todayReport} />
		<!-- Stats Grid -->

		<!-- Reorder Items Grid -->

		<div class="mb-8 grid gap-6 md:grid-cols-2">
			<ReorderList
				title="Products to Reorder"
				description="Items below reorder level"
				items={data.reorderProducts}
				icon={PackageIcon}
			/>
		</div>

		<!-- Report Section -->
	</div>
</div>
