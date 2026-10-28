<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Truck } from '@lucide/svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import DeliveryStatus from '$lib/components/delivery/delivery-status.svelte';

	/**
	 * The order's delivery, linking to it on the deliveries page — or, for a pending
	 * order not yet queued (cash on delivery, an unchecked transfer), a button that
	 * queues it.
	 */
	let {
		orderId,
		orderStatus,
		deliveryStatus
	}: {
		orderId: number;
		orderStatus: string | null;
		deliveryStatus: string | null;
	} = $props();

	let busy = $state(false);
	const queueable = $derived(
		orderStatus === 'pending' && (!deliveryStatus || deliveryStatus === 'cancelled')
	);
</script>

{#if queueable}
	<form
		method="post"
		action="/dashboard/deliveries?/queue"
		use:enhance={() => {
			busy = true;
			return async ({ result }) => {
				busy = false;
				if (result.type === 'success') {
					toast.success(`Order #${orderId} queued for delivery`);
					await invalidateAll();
				} else if (result.type === 'failure') {
					toast.error(String(result.data?.message ?? 'Could not queue the order'));
				} else {
					toast.error('Could not queue the order');
				}
			};
		}}
	>
		<input type="hidden" name="orderId" value={orderId} />
		<Button type="submit" size="sm" variant="outline" disabled={busy}>
			<Truck />
			{busy ? 'Queueing…' : 'Queue'}
		</Button>
	</form>
{:else if deliveryStatus}
	<a
		href="{resolve('/dashboard/deliveries')}?status=all&search={orderId}"
		title="Open in Deliveries"
	>
		<DeliveryStatus status={deliveryStatus} />
	</a>
{:else}
	<span class="text-muted-foreground">—</span>
{/if}
