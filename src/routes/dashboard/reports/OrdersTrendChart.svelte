<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';

	let { trend }: { trend: { date: string; orderCount: number }[] } = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let Chart: any;
	let instance: any;

	function buildConfig() {
		return {
			type: 'bar' as const,
			data: {
				labels: trend.map((t) => t.date),
				datasets: [
					{
						label: 'Orders',
						data: trend.map((t) => t.orderCount),
						backgroundColor: '#eb6834cc',
						borderColor: '#eb6834',
						borderWidth: 2,
						borderRadius: 6
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false }
				},
				scales: {
					x: {
						ticks: { color: 'hsl(var(--muted-foreground))', font: { size: 11 } },
						grid: { display: false }
					},
					y: {
						beginAtZero: true,
						ticks: { color: 'hsl(var(--muted-foreground))', font: { size: 11 }, precision: 0 },
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
		<CardTitle>Orders Per Day</CardTitle>
		<CardDescription>Order count for the selected range</CardDescription>
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
