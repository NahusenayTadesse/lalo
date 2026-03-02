<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { PackageX as Minus } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { DamagedForm } from '$lib/ZodSchema';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	let isOpen = $state(false);

	let {
		data,
		name = 'item',
		employees
	}: {
		data: SuperValidated<Infer<DamagedForm>>;
		name: string;
		employees?: Item[];
	} = $props();
	const { form, errors, enhance, delayed, message } = superForm(data, {});
	import { toast } from 'svelte-sonner';
	import type { Item } from '$lib/global.svelte';
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

<Dialog.Root bind:open={isOpen}>
	<Dialog.Trigger
		class={buttonVariants({ variant: 'destructive' })}
		title="Add Damaged Item of {name}"
	>
		<Minus /> Damaged Item
	</Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>{name} Damaged</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="h-auto max-h-[calc(100vh-200px)] rounded-md border p-2">
			<div class="flex flex-col items-center justify-center gap-4 pt-4">
				<form method="post" action="?/damaged" use:enhance class="flex w-full flex-col gap-3">
					<InputComp
						label="Damaged Quantity"
						name="quantity"
						type="number"
						{form}
						{errors}
						placeholder="Enter number of items damaged"
						required={true}
					/>
					<InputComp
						label="Reason"
						name="reason"
						type="textarea"
						{form}
						{errors}
						placeholder="Enter explanation for the damage"
						required={true}
					/>
					<InputComp
						label="Employee Responsible for the damage"
						name="damagedBy"
						type="combo"
						{form}
						{errors}
						placeholder="Enter Quantity"
						required={true}
						items={employees}
					/>

					<InputComp
						label="Deductable"
						name="deductable"
						type="checkboxSingle"
						placeholder="Yes, deduct the cost from Employee"
						{form}
						{errors}
						required={false}
					/>
					<Button type="submit" variant="destructive" size="lg">
						{#if $delayed}
							<LoadingBtn name="Entering Damaged Item" />
						{:else}
							<Minus /> Enter Damaged Item
						{/if}
					</Button>
				</form>
			</div>
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
