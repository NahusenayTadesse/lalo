<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { SquarePen, Save, Plus } from '@lucide/svelte';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { AddPrice } from './schema';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	let {
		data
	}: {
		data: SuperValidated<Infer<AddPrice>>;
	} = $props();
	const { form, errors, enhance, delayed, message } = superForm(data, {});
	import { toast } from 'svelte-sonner';
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

<DialogComp title="Add New Variant Pricing" variant="default" IconComp={Plus}>
	<div class="flex flex-col items-center justify-center gap-4 pt-4">
		<form
			method="post"
			action="?/addPrice"
			use:enhance
			class="flex w-full flex-col gap-3"
			enctype="multipart/form-data"
		>
			<InputComp label="Price" name="price" type="number" {form} {errors} required={true} />
			<InputComp
				{form}
				{errors}
				type="text"
				name="amount"
				label="Variation of Product"
				placeholder="Enter Product Variation"
				required
			/>
			<Button type="submit" variant="destructive" size="lg">
				{#if $delayed}
					<LoadingBtn name="Saving Price" />
				{:else}
					<Save /> Save Changes
				{/if}
			</Button>
		</form>
	</div>
</DialogComp>
