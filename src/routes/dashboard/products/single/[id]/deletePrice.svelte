<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { SquarePen, Save, Trash } from '@lucide/svelte';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { EditPrice } from './schema';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	let {
		data,
		price,
		id,
		amount
	}: {
		data: SuperValidated<Infer<EditPrice>>;
		price: number | string;
		id: number;
	} = $props();
	const { form, errors, enhance, delayed, message } = superForm(data, {});
	import { toast } from 'svelte-sonner';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import { formatETB } from '$lib/global.svelte';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	$form.id = id;
</script>

<DialogComp title="" variant="destructive">
	<div class="flex flex-col items-center justify-center gap-4 pt-4">
		<form
			method="post"
			action="?/deletePrice"
			use:enhance
			class="flex w-full flex-col gap-3"
			enctype="multipart/form-data"
		>
			<input type="hidden" name="id" bind:value={$form.id} />
			<h4 class="text-destructive">
				Are your sure you want to delete Variation: {amount} Price: {formatETB(Number(price))}?
			</h4>
			<p class="text-destructive">This action is irriversable</p>
			<Button type="submit" variant="destructive" size="lg">
				{#if $delayed}
					<LoadingBtn name="Deleting Price" />
				{:else}
					<Trash /> Delete {amount}
				{/if}
			</Button>
		</form>
	</div>
</DialogComp>
