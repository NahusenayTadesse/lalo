<script lang="ts">
	/**
	 * What went in the delivery: each line of the order, and under it the batches
	 * its units left the shop in. No batches until it is dispatched.
	 */
	let {
		items,
		batches
	}: {
		items: { product: string | null; amount: string; quantity: number }[];
		batches: { product: string | null; variant: string; batchNumber: string; quantity: number }[];
	} = $props();

	const linesWithBatches = $derived(
		items.map((item) => ({
			...item,
			batches: batches.filter((b) => b.product === item.product && b.variant === item.amount)
		}))
	);
</script>

<ul class="flex min-w-48 flex-col gap-1 text-xs">
	{#each linesWithBatches as line, i (i)}
		<li>
			<span class="font-medium">{line.quantity} × {line.product ?? '—'}</span>
			<span class="text-muted-foreground">({line.amount})</span>
			{#if line.batches.length}
				<div class="mt-0.5 flex flex-wrap gap-1">
					{#each line.batches as batch (batch.batchNumber)}
						<span
							class="rounded border bg-muted px-1 font-mono text-[11px]"
							title="{batch.quantity} from batch {batch.batchNumber}"
						>
							{batch.batchNumber} ×{batch.quantity}
						</span>
					{/each}
				</div>
			{/if}
		</li>
	{/each}
</ul>
