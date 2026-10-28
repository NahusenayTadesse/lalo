<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Check, Phone } from '@lucide/svelte';

	type Delivery = {
		status: string | null;
		pickup: boolean;
		scheduledFor: string | null;
		dispatchedAt: string | null;
		deliveredAt: string | null;
		driverName: string | null;
		driverPhone: string | null;
		vehicle: string | null;
		cashToCollect: string | null;
		confirmedByCustomer: boolean;
	};

	let { orderId, createdAt, delivery }: { orderId: number; createdAt: string; delivery: Delivery } =
		$props();

	const status = $derived(delivery.status);
	// How far along it is: placed, confirmed (queued), on its way, arrived.
	const reached = $derived(
		status === 'delivered' ? 3 : status === 'dispatched' ? 2 : status ? 1 : 0
	);
	const steps = $derived([
		{ label: m.track_step_placed(), at: createdAt },
		{ label: m.track_step_confirmed(), at: null },
		{
			label: delivery.pickup ? m.track_step_ready_pickup() : m.track_step_dispatched(),
			at: delivery.dispatchedAt
		},
		{
			label: delivery.pickup ? m.track_step_collected() : m.track_step_delivered(),
			at: delivery.deliveredAt
		}
	]);

	// Two taps, so a stray one doesn't mark an order received.
	let armed = $state(false);
	let saving = $state(false);
</script>

<ol class="grid grid-cols-2 gap-4 md:grid-cols-4">
	{#each steps as step, i (i)}
		<li class="flex items-start gap-2">
			<span
				class={[
					'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
					i <= reached
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-border bg-muted text-muted-foreground'
				]}
			>
				{#if i <= reached}<Check class="size-3.5" />{:else}{i + 1}{/if}
			</span>
			<div class="text-sm">
				<p class={i <= reached ? 'font-medium' : 'text-muted-foreground'}>{step.label}</p>
				{#if step.at && i <= reached}
					<p class="text-xs text-muted-foreground">{step.at}</p>
				{/if}
			</div>
		</li>
	{/each}
</ol>

<div class="mt-4 space-y-1 text-sm">
	{#if !status}
		<p class="text-muted-foreground">{m.track_awaiting_confirmation()}</p>
	{:else if status === 'ready'}
		<p class="text-muted-foreground">{m.track_awaiting_dispatch()}</p>
	{:else if status === 'failed'}
		<p class="text-amber-700 dark:text-amber-400">{m.track_failed_attempt()}</p>
	{/if}

	{#if delivery.scheduledFor && status !== 'delivered'}
		<p class="font-medium">{m.track_expected({ when: delivery.scheduledFor })}</p>
	{/if}
	{#if delivery.dispatchedAt}
		<p class="text-muted-foreground">{m.track_left_at({ when: delivery.dispatchedAt })}</p>
	{/if}
	{#if delivery.deliveredAt}
		<p class="text-muted-foreground">
			{m.track_arrived_at({ when: delivery.deliveredAt })}
			{#if delivery.confirmedByCustomer}· {m.track_confirmed_by_you()}{/if}
		</p>
	{/if}

	{#if status === 'dispatched'}
		{#if delivery.driverName}
			<div
				class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-muted/30 p-3"
			>
				<span>{m.track_driver({ name: delivery.driverName })}</span>
				{#if delivery.vehicle}<span>{m.track_vehicle({ vehicle: delivery.vehicle })}</span>{/if}
				{#if delivery.driverPhone}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a tel: link, not an app route -->
					<a
						href="tel:{delivery.driverPhone}"
						class="inline-flex items-center gap-1 font-medium text-primary hover:underline"
					>
						<Phone class="size-4" />
						{m.track_call_driver()}
					</a>
				{/if}
			</div>
		{/if}
		{#if delivery.cashToCollect}
			<p class="font-medium">
				{m.track_collect({ amount: Number(delivery.cashToCollect).toFixed(2) })}
			</p>
		{/if}

		<form
			method="POST"
			action="?/confirmReceived"
			class="mt-3 flex flex-wrap items-center gap-3"
			use:enhance={({ cancel }) => {
				if (!armed) {
					armed = true;
					cancel();
					return;
				}
				saving = true;
				return async ({ update }) => {
					await update();
					saving = false;
					armed = false;
				};
			}}
		>
			<input type="hidden" name="orderId" value={orderId} />
			<span class="text-muted-foreground">{m.track_received_q()}</span>
			<Button type="submit" size="sm" variant={armed ? 'default' : 'outline'} disabled={saving}>
				<Check />
				{saving
					? m.track_received_saving()
					: armed
						? m.track_received_confirm()
						: m.track_received_btn()}
			</Button>
		</form>
	{/if}
</div>
