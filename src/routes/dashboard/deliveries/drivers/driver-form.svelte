<script lang="ts">
	import { Plus, Save, SquarePen } from '@lucide/svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import Errors from '@nahu/admin-kit/formComponents/Errors.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import type { driver as driverSchema } from '../schema';

	type Driver = {
		id: number;
		name: string;
		phone: string;
		vehiclePlate: string | null;
		vehicleType: string | null;
		notes: string | null;
		active: boolean;
	};

	/** Adds a driver, or edits `driver` when given. */
	let { data, driver }: { data: SuperValidated<Infer<typeof driverSchema>>; driver?: Driver } =
		$props();

	let open = $state(false);
	const formId = $props.id();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, delayed, allErrors } = superForm(data, {
		id: formId,
		invalidateAll: true,
		onUpdated: ({ form }) => {
			const msg = form.message as { type: string; text: string } | undefined;
			if (!msg) return;
			if (msg.type === 'error') toast.error(msg.text);
			else {
				toast.success(msg.text);
				open = false;
			}
		}
	});

	$effect(() => {
		if (!open) return;
		form.set({
			id: driver?.id ?? 0,
			name: driver?.name ?? '',
			phone: driver?.phone ?? '',
			vehiclePlate: driver?.vehiclePlate ?? '',
			vehicleType: driver?.vehicleType ?? '',
			notes: driver?.notes ?? '',
			active: driver?.active ?? true
		});
	});
</script>

<DialogComp
	bind:open
	title={driver ? '' : 'Add driver'}
	dialogTitle={driver ? `Edit ${driver.name}` : 'Add driver'}
	variant={driver ? 'ghost' : 'default'}
	IconComp={driver ? SquarePen : Plus}
>
	<form method="post" action="?/save" id={formId} use:enhance class="flex flex-col gap-4 p-2">
		<Errors allErrors={$allErrors} />
		<input type="hidden" name="id" value={$form.id} />
		<InputComp {form} {errors} label="Name" name="name" />
		<InputComp {form} {errors} label="Phone" name="phone" type="tel" placeholder="0912345678" />
		<InputComp {form} {errors} label="Plate number" name="vehiclePlate" placeholder="AA 3-12345" />
		<InputComp
			{form}
			{errors}
			label="Vehicle type"
			name="vehicleType"
			placeholder="Isuzu truck, pickup, motorbike"
		/>
		<InputComp {form} {errors} label="Notes" name="notes" />
		<InputComp
			{form}
			{errors}
			label="Status"
			name="active"
			type="checkboxSingle"
			placeholder="Active — offered when dispatching"
		/>
		<Button type="submit" disabled={$delayed}>
			{#if $delayed}<LoadingBtn name="Saving" />{:else}<Save /> Save{/if}
		</Button>
	</form>
</DialogComp>
