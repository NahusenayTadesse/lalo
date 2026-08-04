<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';

	let { trend }: { trend: { date: string; revenue: number }[] } = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let Chart: any;
	let instance: any;

	function buildConfig() {
		return {
			type: 'line' as const,
			data: {
				labels: trend.map((t) => t.date),
				datasets: [
					{
						label: 'Revenue (ETB)',
						data: trend.map((t) => t.revenue),
						borderColor: '#2a78d6',
						backgroundColor: '#2a78d633',
						fill: true,
						tension: 0.3,
						pointRadius: 3,
						pointHoverRadius: 5
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index' as const, intersect: false },
				plugins: {
					legend: { display: false }
				},
				scales: {
					x: {
						ticks: { color: 'hsl(var(--muted-foreground))', font: { size: 11 } },
						grid: { color: 'hsl(var(--border))' }
					},
					y: {
						beginAtZero: true,
						ticks: { color: 'hsl(var(--muted-foreground))', font: { size: 11 } },
						grid: { color: 'hsl(var(--border))' }
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
		void trend;
		if (!instance) return;
		instance.data = buildConfig().data;
		instance.update('active');
	});
</script>

<Card class="w-full">
	<CardHeader>
		<CardTitle>Revenue Trend</CardTitle>
		<CardDescription>Daily revenue for the selected range</CardDescription>
	</CardHeader>
	<CardContent>
		{#if trend.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">No data for this range</p>
		{:else}
			<div class="relative h-64 w-full">
				<canvas bind:this={canvas}></canvas>
			</div>
		{/if}
	</CardContent>
</Card>
