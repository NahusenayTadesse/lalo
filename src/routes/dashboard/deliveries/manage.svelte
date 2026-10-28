<script lang="ts">
	import * as Dialog from '@nahu/admin-kit/components/ui/dialog/index.js';
	import * as Tabs from '@nahu/admin-kit/components/ui/tabs/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import Errors from '@nahu/admin-kit/formComponents/Errors.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { CircleCheckBig, FileDown, RotateCcw, Save, Truck, TriangleAlert } from '@lucide/svelte';
	import DeliveryStatus from '$lib/components/delivery/delivery-status.svelte';
	import ItemsBatches from './items-batches.svelte';
	import { downloadDeliveryNote, type NoteDelivery } from './delivery-note';
	import type { deliver, requeue, trip, withReason } from './schema';

	type Driver = {
		id: number;
		name: string;
		phone: string;
		vehiclePlate: string | null;
		vehicleType: string | null;
	};

	export type ManagedDelivery = NoteDelivery & {
		id: number;
		status: string;
		customer: string | null;
		driverId: number | null;
		queuedAt: string | null;
		deliveredAt: string | null;
		dispatchedBy: string | null;
		confirmedBy: string | null;
		confirmedVia: string | null;
		receivedBy: string | null;
		proofLink: string | null;
		attempts: number;
		failureReason: string | null;
		late: boolean;
		minutes: number | null;
		events: {
			event: string;
			note: string | null;
			by: string | null;
			byCustomer: boolean;
			at: string | null;
		}[];
	};

	let {
		delivery,
		open = $bindable(false),
		drivers,
		paymentMethodList,
		tripForm,
		deliverForm,
		reasonForm,
		requeueForm
	}: {
		delivery: ManagedDelivery | undefined;
		open?: boolean;
		drivers: Driver[];
		paymentMethodList: { value: number; name: string }[];
		tripForm: SuperValidated<Infer<typeof trip>>;
		deliverForm: SuperValidated<Infer<typeof deliver>>;
		reasonForm: SuperValidated<Infer<typeof withReason>>;
		requeueForm: SuperValidated<Infer<typeof requeue>>;
	} = $props();

	/** Toasts the action's message; the page's data reloads by itself. */
	const onUpdated = ({ form }: { form: { message?: unknown } }) => {
		const msg = form.message as { type: string; text: string } | undefined;
		if (!msg) return;
		if (msg.type === 'error') toast.error(msg.text);
		else toast.success(msg.text);
	};

	// Ids of their own, not the load's: superforms re-binds a form to the reloaded
	// page data when the ids match, which emptied these after every save. The
	// actions read the id the browser posts, so their results still come back here.
	const options = { resetForm: false, onUpdated };
	// svelte-ignore state_referenced_locally
	const trips = superForm(tripForm, { ...options, id: 'manage-trip' });
	// svelte-ignore state_referenced_locally
	const delivers = superForm(deliverForm, { ...options, id: 'manage-deliver' });
	// svelte-ignore state_referenced_locally
	const reasons = superForm(reasonForm, { ...options, id: 'manage-reason' });
	// svelte-ignore state_referenced_locally
	const requeues = superForm(requeueForm, { ...options, id: 'manage-requeue' });

	const { form: tripData, errors: tripErrors, allErrors: tripAll, delayed: tripBusy } = trips;
	const { errors: deliverErrors, allErrors: deliverAll, delayed: deliverBusy } = delivers;
	const { errors: reasonErrors, delayed: reasonBusy } = reasons;
	const { errors: requeueErrors, delayed: requeueBusy } = requeues;

	const toInput = (at: string | null) => (at ? at.replace(' ', 'T') : '');

	// Fill the forms from the delivery whenever it is opened or reloads after a save.
	// `update`, not `$tripData.x =`, so the effect doesn't depend on what it writes.
	$effect(() => {
		const d = delivery;
		if (!d) return;
		trips.form.update(() => ({
			id: d.id,
			driverId: d.driverId ?? 0,
			driverName: d.driverName ?? '',
			driverPhone: d.driverPhone ?? '',
			vehiclePlate: d.vehiclePlate ?? '',
			vehicleType: d.vehicleType ?? '',
			scheduledFor: toInput(d.scheduledFor),
			dispatchedAt: '',
			area: d.area ?? '',
			address: d.address ?? '',
			recipientName: d.recipientName ?? '',
			recipientPhone: d.recipientPhone ?? '',
			notes: d.notes ?? ''
		}));
		delivers.form.update((f) => ({ ...f, id: d.id, receivedBy: d.recipientName ?? '' }));
		reasons.form.update((f) => ({ ...f, id: d.id }));
		requeues.form.update((f) => ({ ...f, id: d.id, scheduledFor: '' }));
	});

	function pickDriver(event: Event) {
		const driver = drivers.find((d) => d.id === Number((event.target as HTMLSelectElement).value));
		$tripData.driverId = driver?.id ?? 0;
		if (!driver) return;
		$tripData.driverName = driver.name;
		$tripData.driverPhone = driver.phone;
		$tripData.vehiclePlate = driver.vehiclePlate ?? '';
		$tripData.vehicleType = driver.vehicleType ?? '';
	}

	const status = $derived(delivery?.status);
	const pickup = $derived(delivery?.method === 'pickup');
	const canDispatch = $derived(status === 'ready' || status === 'failed');
	const tabs = $derived(
		[
			status !== 'cancelled' && {
				value: 'trip',
				label: canDispatch ? (pickup ? 'Ready for pickup' : 'Dispatch') : 'Trip details'
			},
			(canDispatch || status === 'dispatched') && {
				value: 'deliver',
				label: pickup ? 'Handed over' : 'Delivered'
			},
			status === 'dispatched' && { value: 'fail', label: 'Failed attempt' },
			status === 'failed' && { value: 'requeue', label: 'Back to queue' },
			status === 'delivered' && { value: 'reopen', label: 'Reopen' }
		].filter(Boolean) as { value: string; label: string }[]
	);
	// Opens on the step that comes next — delivering, once it is out — and moves on
	// to it again whenever an action changes the status. Writable: the tabs set it.
	let tab = $derived(delivery && status === 'dispatched' ? 'deliver' : (tabs[0]?.value ?? 'trip'));

	const EVENT_LABEL: Record<string, string> = {
		queued: 'Queued',
		dispatched: 'Dispatched',
		delivered: 'Delivered',
		failed: 'Failed attempt',
		requeued: 'Back in queue',
		reopened: 'Reopened',
		cancelled: 'Cancelled',
		updated: 'Details changed'
	};
	const duration = (minutes: number | null) =>
		minutes === null
			? null
			: minutes < 60
				? `${minutes} min`
				: `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
	const selectClass =
		'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[95vh] w-4xl! max-w-[95vw]! overflow-y-auto">
		{#if delivery}
			<Dialog.Header>
				<Dialog.Title class="flex flex-wrap items-center gap-2">
					Order #{delivery.orderId} — {delivery.customer ?? delivery.recipientName ?? 'Customer'}
					<DeliveryStatus status={delivery.status} overdue={delivery.late} />
				</Dialog.Title>
				<Dialog.Description>
					{pickup
						? 'Store pickup'
						: [delivery.area, delivery.address].filter(Boolean).join(', ') ||
							'No address on record'}
				</Dialog.Description>
			</Dialog.Header>

			<div class="grid gap-4 text-sm md:grid-cols-3">
				<section class="rounded-lg border p-3">
					<h3 class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						Customer
					</h3>
					<p class="font-medium">{delivery.recipientName ?? '—'}</p>
					{#if delivery.recipientPhone}
						<a
							class="text-primary underline-offset-2 hover:underline"
							href="tel:{delivery.recipientPhone}">{delivery.recipientPhone}</a
						>
					{/if}
					<p class="mt-2">
						{#if delivery.paid}
							<span class="font-medium text-success">Paid</span>
						{:else}
							<span class="font-medium text-destructive">
								Collect ETB {Number(delivery.cashToCollect ?? 0).toLocaleString()}
							</span>
						{/if}
					</p>
				</section>

				<section class="rounded-lg border p-3">
					<h3 class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						Driver
					</h3>
					{#if delivery.driverName}
						<p class="font-medium">{delivery.driverName}</p>
						{#if delivery.driverPhone}
							<a
								class="text-primary underline-offset-2 hover:underline"
								href="tel:{delivery.driverPhone}">{delivery.driverPhone}</a
							>
						{/if}
						<p class="text-muted-foreground">
							{[delivery.vehicleType, delivery.vehiclePlate].filter(Boolean).join(' · ') ||
								'No vehicle recorded'}
						</p>
					{:else}
						<p class="text-muted-foreground">
							{pickup ? 'Collected by the customer' : 'Not assigned yet'}
						</p>
					{/if}
					{#if delivery.attempts > 1}
						<p class="mt-1 text-xs text-muted-foreground">Attempt {delivery.attempts}</p>
					{/if}
				</section>

				<section class="rounded-lg border p-3">
					<h3 class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						Times
					</h3>
					<dl class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
						<dt class="text-muted-foreground">Queued</dt>
						<dd>{delivery.queuedAt ?? '—'}</dd>
						<dt class="text-muted-foreground">Expected</dt>
						<dd class={delivery.late ? 'font-medium text-destructive' : ''}>
							{delivery.scheduledFor ?? '—'}
						</dd>
						<dt class="text-muted-foreground">Left</dt>
						<dd>
							{delivery.dispatchedAt ?? '—'}
							{#if delivery.dispatchedBy}
								<span class="text-muted-foreground">— approved by {delivery.dispatchedBy}</span>
							{/if}
						</dd>
						<dt class="text-muted-foreground">Arrived</dt>
						<dd>
							{delivery.deliveredAt ?? '—'}
							{#if delivery.confirmedVia === 'customer'}
								<span class="text-muted-foreground"> — confirmed by the customer</span>
							{:else if delivery.confirmedBy}
								<span class="text-muted-foreground"> — confirmed by {delivery.confirmedBy}</span>
							{/if}
						</dd>
						{#if duration(delivery.minutes)}
							<dt class="text-muted-foreground">Took</dt>
							<dd>{duration(delivery.minutes)}</dd>
						{/if}
						{#if delivery.receivedBy}
							<dt class="text-muted-foreground">Received by</dt>
							<dd>{delivery.receivedBy}</dd>
						{/if}
					</dl>
					{#if delivery.proofLink}
						<a
							class="mt-1 inline-block text-primary underline"
							href={resolve('/files/[name]', { name: delivery.proofLink })}
							target="_blank"
						>
							Proof of delivery
						</a>
					{/if}
				</section>
			</div>

			{#if delivery.failureReason && delivery.status === 'failed'}
				<p
					class="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive"
				>
					<TriangleAlert class="size-4" />
					{delivery.failureReason}
				</p>
			{/if}
			{#if delivery.notes}
				<p class="rounded-md bg-muted p-2 text-sm">
					<span class="font-medium">Notes:</span>
					{delivery.notes}
				</p>
			{/if}

			<div class="grid gap-4 md:grid-cols-2">
				<section class="rounded-lg border p-3">
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
							Items &amp; batches
						</h3>
						<Button size="sm" variant="outline" onclick={() => downloadDeliveryNote(delivery)}>
							<FileDown /> Delivery note
						</Button>
					</div>
					<ItemsBatches items={delivery.items} batches={delivery.batches} />
					{#if !delivery.batches.length && delivery.status !== 'cancelled'}
						<p class="mt-2 text-xs text-muted-foreground">
							Batches are picked when the order is dispatched.
						</p>
					{/if}
				</section>

				<section class="rounded-lg border p-3">
					<h3 class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						History
					</h3>
					<ol class="flex max-h-48 flex-col gap-2 overflow-y-auto border-l pl-3 text-sm">
						{#each delivery.events as event, i (i)}
							<li>
								<span class="font-medium">{EVENT_LABEL[event.event] ?? event.event}</span>
								<span class="text-xs text-muted-foreground">
									{event.at} · {event.byCustomer ? 'customer' : (event.by ?? 'system')}
								</span>
								{#if event.note}<p class="text-xs text-muted-foreground">{event.note}</p>{/if}
							</li>
						{:else}
							<li class="text-muted-foreground">No history recorded.</li>
						{/each}
					</ol>
				</section>
			</div>

			{#if tabs.length}
				<Tabs.Root bind:value={tab} class="rounded-lg border p-3">
					<Tabs.List class="flex-wrap">
						{#each tabs as t (t.value)}
							<Tabs.Trigger value={t.value}>{t.label}</Tabs.Trigger>
						{/each}
					</Tabs.List>

					<Tabs.Content value="trip">
						<form
							method="post"
							action="?/update"
							use:trips.enhance
							class="mt-3 flex flex-col gap-3"
						>
							<Errors allErrors={$tripAll} />
							<input type="hidden" name="id" value={delivery.id} />
							<input type="hidden" name="driverId" value={$tripData.driverId} />

							{#if !pickup}
								<label class="flex flex-col gap-1 text-sm font-medium">
									Saved driver
									<select
										class={selectClass}
										value={$tripData.driverId || ''}
										onchange={pickDriver}
									>
										<option value="">— Someone else (type below) —</option>
										{#each drivers as d (d.id)}
											<option value={d.id}
												>{d.name} · {[d.vehicleType, d.vehiclePlate]
													.filter(Boolean)
													.join(' ')}</option
											>
										{/each}
									</select>
								</label>
								<div class="grid gap-3 sm:grid-cols-2">
									<InputComp
										form={trips.form}
										errors={tripErrors}
										label="Driver name"
										name="driverName"
									/>
									<InputComp
										form={trips.form}
										errors={tripErrors}
										label="Driver phone"
										name="driverPhone"
										type="tel"
										placeholder="0912345678"
									/>
									<InputComp
										form={trips.form}
										errors={tripErrors}
										label="Plate number"
										name="vehiclePlate"
										placeholder="AA 3-12345"
									/>
									<InputComp
										form={trips.form}
										errors={tripErrors}
										label="Vehicle type"
										name="vehicleType"
										placeholder="Isuzu truck, pickup, motorbike"
									/>
								</div>
							{/if}

							<div class="grid gap-3 sm:grid-cols-2">
								<InputComp
									form={trips.form}
									errors={tripErrors}
									label={pickup ? 'Ready from' : 'Expected arrival'}
									name="scheduledFor"
									type="datetime-local"
								/>
								{#if canDispatch}
									<InputComp
										form={trips.form}
										errors={tripErrors}
										label="Left the shop at (blank = now)"
										name="dispatchedAt"
										type="datetime-local"
									/>
								{/if}
							</div>

							{#if !pickup}
								<div class="grid gap-3 sm:grid-cols-2">
									<InputComp form={trips.form} errors={tripErrors} label="Area" name="area" />
									<InputComp form={trips.form} errors={tripErrors} label="Address" name="address" />
									<InputComp
										form={trips.form}
										errors={tripErrors}
										label="Receiver"
										name="recipientName"
									/>
									<InputComp
										form={trips.form}
										errors={tripErrors}
										label="Receiver phone"
										name="recipientPhone"
										type="tel"
									/>
								</div>
							{/if}
							<InputComp
								form={trips.form}
								errors={tripErrors}
								label="Notes for the driver"
								name="notes"
								type="textarea"
								rows={2}
							/>

							<div class="flex flex-wrap justify-end gap-2">
								<Button type="submit" variant="outline" disabled={$tripBusy}>
									<Save /> Save details
								</Button>
								{#if canDispatch}
									<Button type="submit" formaction="?/dispatch" disabled={$tripBusy}>
										{#if $tripBusy}
											<LoadingBtn name="Dispatching" />
										{:else}
											<Truck /> {pickup ? 'Ready for pickup' : 'Dispatch now'}
										{/if}
									</Button>
								{/if}
							</div>
							{#if canDispatch}
								<p class="text-xs text-muted-foreground">
									Dispatching takes the items out of stock, earliest expiry first, records the
									batches, records you as the approver, and emails the customer.
								</p>
							{/if}
						</form>
					</Tabs.Content>

					<Tabs.Content value="deliver">
						<form
							method="post"
							action="?/deliver"
							enctype="multipart/form-data"
							use:delivers.enhance
							class="mt-3 flex flex-col gap-3"
						>
							<Errors allErrors={$deliverAll} />
							<input type="hidden" name="id" value={delivery.id} />
							<div class="grid gap-3 sm:grid-cols-2">
								<InputComp
									form={delivers.form}
									errors={deliverErrors}
									label="Arrived at (blank = now)"
									name="deliveredAt"
									type="datetime-local"
								/>
								<InputComp
									form={delivers.form}
									errors={deliverErrors}
									label="Received by"
									name="receivedBy"
								/>
							</div>
							{#if !delivery.paid}
								<div class="rounded-md border border-destructive/30 bg-destructive/5 p-3">
									<p class="mb-2 text-sm">
										Unpaid — the customer owes <strong
											>ETB {Number(delivery.cashToCollect ?? 0).toLocaleString()}</strong
										>. How did they pay?
									</p>
									<InputComp
										form={delivers.form}
										errors={deliverErrors}
										label="Payment method"
										name="paymentMethod"
										type="select"
										items={paymentMethodList}
									/>
								</div>
							{/if}
							<InputComp
								form={delivers.form}
								errors={deliverErrors}
								label="Signed note or photo (optional)"
								name="proof"
								type="file"
							/>
							<InputComp
								form={delivers.form}
								errors={deliverErrors}
								label="Note"
								name="note"
								placeholder="Left with the security guard"
							/>
							<div class="flex justify-end">
								<Button type="submit" disabled={$deliverBusy}>
									{#if $deliverBusy}
										<LoadingBtn name="Saving" />
									{:else}
										<CircleCheckBig /> Confirm {pickup ? 'hand-over' : 'delivery'}
									{/if}
								</Button>
							</div>
						</form>
					</Tabs.Content>

					{#each [{ value: 'fail', action: '?/fail', label: 'What went wrong?', button: 'Mark failed — return stock', hint: 'The items go back into the batches they came from. Put it back in the queue to try again.' }, { value: 'reopen', action: '?/reopen', label: 'Why reopen it?', button: 'Reopen delivery', hint: 'The order goes back to out for delivery and pending. Use it when a confirmation was wrong — the customer tapped too early, or it was marked by mistake.' }].filter( (step) => tabs.some((t) => t.value === step.value) ) as step (step.value)}
						<Tabs.Content value={step.value}>
							<form
								method="post"
								action={step.action}
								use:reasons.enhance
								class="mt-3 flex flex-col gap-3"
							>
								<input type="hidden" name="id" value={delivery.id} />
								<InputComp
									form={reasons.form}
									errors={reasonErrors}
									label={step.label}
									name="reason"
									placeholder={step.value === 'fail'
										? 'Customer not answering, address closed…'
										: ''}
								/>
								<p class="text-xs text-muted-foreground">{step.hint}</p>
								<div class="flex justify-end">
									<Button type="submit" variant="destructive" disabled={$reasonBusy}>
										<RotateCcw />
										{step.button}
									</Button>
								</div>
							</form>
						</Tabs.Content>
					{/each}

					<Tabs.Content value="requeue">
						<form
							method="post"
							action="?/requeue"
							use:requeues.enhance
							class="mt-3 flex flex-col gap-3"
						>
							<input type="hidden" name="id" value={delivery.id} />
							<InputComp
								form={requeues.form}
								errors={requeueErrors}
								label="New expected arrival (optional)"
								name="scheduledFor"
								type="datetime-local"
							/>
							<div class="flex justify-end">
								<Button type="submit" disabled={$requeueBusy}><RotateCcw /> Back to queue</Button>
							</div>
						</form>
					</Tabs.Content>
				</Tabs.Root>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>
