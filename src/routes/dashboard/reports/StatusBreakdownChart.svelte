<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';

	let { breakdown }: { breakdown: { status: string; count: number }[] } = $props();

	// Status colors are reserved/semantic, never reused for generic series.
	const STATUS_COLOR: Record<string, string> = {
		pending: '#fab219',
		delivered: '#0ca30c',
		cancelled: '#d03b3b'
	};

	let canvas = $state<HTMLCanvasElement | null>(null);
	let Chart: any;
	let instance: any;

	const total = $derived(breakdown.reduce((sum, s) => sum + s.count, 0));

	function buildConfig() {
		return {
			type: 'doughnut' as const,
			data: {
				labels: breakdown.map((s) => s.status[0].toUpperCase() + s.status.slice(1)),
				datasets: [
					{
						data: breakdown.map((s) => s.count),
						backgroundColor: breakdown.map((s) => (STATUS_COLOR[s.status] ?? '#898781') + 'cc'),
						borderColor: breakdown.map((s) => STATUS_COLOR[s.status] ?? '#898781'),
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
		<CardTitle>Order Status</CardTitle>
		<CardDescription>{total} order{total !== 1 ? 's' : ''} in this range</CardDescription>
	</CardHeader>
	<CardContent>
		{#if total === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">No orders in this range</p>
		{:else}
			<div class="relative h-56 w-full">
				<canvas bind:this={canvas}></canvas>
			</div>
		{/if}
	</CardContent>
</Card>
