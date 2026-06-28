<script lang="ts">
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Truck, Save, Plus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Free } from './schema';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';

	let {
		data,
		action = '?/free',
		threshold,
		suggestionThreshold
	}: {
		data: SuperValidated<Infer<Free>>;
		action: string;
		threshold?: number | string;
		suggestionThreshold?: number | string;
	} = $props();

	const { form, errors, enhance, delayed, message, allErrors } = superForm(data, {
		resetForm: false
	});

	$form.threshold = threshold;
	$form.suggestionThreshold = suggestionThreshold;

	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});
</script>

<DialogComp title="Edit Free Delivery" variant="default" IconComp={Truck}>
	<form {action} use:enhance method="post" id="free" class="flex w-full flex-col gap-4 p-4">
		<Errors allErrors={$allErrors} />

		<InputComp
			{form}
			{errors}
			label="Free Delivery Starts On"
			type="number"
			name="threshold"
			placeholder="Free Delivery Starts On"
			required={true}
			rows={10}
		/>

		<InputComp
			{form}
			{errors}
			label="Free Delivery Suggestion Threshold"
			type="number"
			name="suggestionThreshold"
			placeholder="Free Delivery Suggestion Threshold"
			required={true}
			rows={10}
		/>
	

		<Button type="submit" class="mt-4" form="free">
			{#if $delayed}
				<LoadingBtn name="Saving Changes" />
			{:else}
				<Save class="h-4 w-4" />

				Save Changes
			{/if}
		</Button>
	</form>
</DialogComp>
