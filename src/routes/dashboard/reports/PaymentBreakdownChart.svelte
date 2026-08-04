<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { formatETB } from '$lib/global.svelte';

	let { breakdown }: { breakdown: { name: string; revenue: number; orders: number }[] } = $props();

	// Validated categorical order — fixed, never cycled.
	const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7'];

	let canvas = $state<HTMLCanvasElement | null>(null);
	let Chart: any;
	let instance: any;

	function buildConfig() {
		return {
			type: 'polarArea' as const,
			data: {
				labels: breakdown.map((p) => p.name),
				datasets: [
					{
						data: breakdown.map((p) => p.revenue),
						backgroundColor: breakdown.map((_, i) => PALETTE[i % PALETTE.length] + 'b3'),
						borderColor: breakdown.map((_, i) => PALETTE[i % PALETTE.length]),
						borderWidth: 2
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
				},
				scales: {
					r: {
						ticks: { display: false },
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
		void breakdown;
		if (!instance) return;
		instance.data = buildConfig().data;
		instance.update('active');
	});
</script>

<Card class="w-full">
	<CardHeader>
		<CardTitle>Revenue by Payment Method</CardTitle>
		<CardDescription>Collected amount per method, this range</CardDescription>
	</CardHeader>
	<CardContent>
		{#if breakdown.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">No payments in this range</p>
		{:else}
			<div class="relative h-56 w-full">
				<canvas bind:this={canvas}></canvas>
			</div>
		{/if}
	</CardContent>
</Card>
