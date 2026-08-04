<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { formatETB } from '$lib/global.svelte';

	let { breakdown }: { breakdown: { name: string; revenue: number }[] } = $props();

	// Same validated categorical order as the payment-method chart, offset by one slot
	// so the two adjacent charts don't visually imply the same series identity.
	const PALETTE = ['#eda100', '#e87ba4', '#4a3aa7', '#1baf7a', '#eb6834', '#2a78d6', '#e34948'];

	let canvas = $state<HTMLCanvasElement | null>(null);
	let Chart: any;
	let instance: any;

	function buildConfig() {
		return {
			type: 'pie' as const,
			data: {
				labels: breakdown.map((c) => c.name),
				datasets: [
					{
						data: breakdown.map((c) => c.revenue),
						backgroundColor: breakdown.map((_, i) => PALETTE[i % PALETTE.length] + 'cc'),
						borderColor: breakdown.map((_, i) => PALETTE[i % PALETTE.length]),
						borderWidth: 2,
						hoverOffset: 8
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'bottom' as const,
						labels: { color: 'hsl(var(--foreground))', font: { size: 12 }, padding: 16 }
					},
					tooltip: {
						callbacks: {
							label: (ctx: any) => ` ${ctx.label}: ${formatETB(ctx.raw as number)}`
						}
					}
				}
			}
		};
	}

	onMount(async () => {
		const mod = await import('chart.js/auto');
		Chart = mod.Chart;
		if (canvas) instance = new Chart(canvas, buildConfig());
	});

	onDestroy(() => instance?.destroy());

	$effect(() => {
		void breakdown;
		if (!instance) return;
		instance.data = buildConfig().data;
		instance.update('active');
	});
</script>

<Card class="w-full">
	<CardHeader>
		<CardTitle>Revenue by Category</CardTitle>
		<CardDescription>Top categories, this range (rest folded into "Other")</CardDescription>
	</CardHeader>
	<CardContent>
		{#if breakdown.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">No product sales in this range</p>
		{:else}
			<div class="relative h-56 w-full">
				<canvas bind:this={canvas}></canvas>
			</div>
		{/if}
	</CardContent>
</Card>
