<script lang="ts">
	import Statuses from '@nahu/admin-kit/components/Table/statuses.svelte';

	/**
	 * A delivery's status as a badge. The stored values aren't the words staff use
	 * ("dispatched" reads "Out for delivery"), and the kit colours by meaning, so
	 * each is mapped to a status the kit already knows the colour of.
	 */
	let { status, overdue = false }: { status: string | null | undefined; overdue?: boolean } =
		$props();

	const LOOK: Record<string, { as: string; label: string }> = {
		ready: { as: 'queued', label: 'Ready to dispatch' },
		dispatched: { as: 'in_progress', label: 'Out for delivery' },
		delivered: { as: 'completed', label: 'Delivered' },
		failed: { as: 'failed', label: 'Failed attempt' },
		cancelled: { as: 'inactive', label: 'Cancelled' }
	};
	const look = $derived(status ? LOOK[status] : undefined);
</script>

{#if look}
	<span class="inline-flex items-center gap-1">
		<Statuses status={look.as} label={look.label} />
		{#if overdue}
			<Statuses status="overdue" label="Late" />
		{/if}
	</span>
{:else}
	<span class="text-muted-foreground">—</span>
{/if}
