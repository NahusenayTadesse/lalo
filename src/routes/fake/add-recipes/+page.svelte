<script lang="ts">
	import type { Snapshot } from '@sveltejs/kit';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { fly } from 'svelte/transition';
	import { Plus, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { add as schema } from './schema';
	import { superForm } from 'sveltekit-superforms/client';
	import Errors from '$lib/formComponents/Errors.svelte';
	import FormCard from '$lib/formComponents/FormCard.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	let { data } = $props();

	const { form, errors, enhance, delayed, allErrors, capture, restore, message } = superForm(
		data.form,
		{
			taintedMessage: () => {
				return new Promise((resolve) => {
					resolve(window.confirm('Do you want to leave?\nChanges you made may not be saved.'));
				});
			},
			validators: zod4Client(schema),
			dataType: 'json'
		}
	);
	function addIng() {
		$form.ingredients = [...$form.ingredients, { ingredient: '', amount: '1' }];
	}
	export const snapshot: Snapshot = { capture, restore };

	import { toast } from 'svelte-sonner';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	let arrParts = `flex flex-col justify-start gap-2 w-full`;
</script>

<svelte:head>
	<title>Add New Recipe</title>
</svelte:head>
<FormCard
	title="Add A Product Item"
	description="Add New Inventory Items to track the how many have"
>
	<form
		use:enhance
		action="?/add"
		id="main"
		class="flex flex-col gap-4"
		method="POST"
		enctype="multipart/form-data"
	>
		<Errors allErrors={$allErrors} />

		<InputComp
			{form}
			{errors}
			type="text"
			name="title"
			label="Title"
			placeholder="Enter Recipe Title"
			required
		/>

		<InputComp
			{form}
			{errors}
			type="textarea"
			name="description"
			label="Recipe Discription"
			placeholder="Enter Recipe Description"
			required
		/>

		<InputComp
			{form}
			{errors}
			type="textarea"
			name="instructions"
			label="Recipe Instructions"
			placeholder="Enter Recipe Instructions"
			required
		/>

		<div class="mb-4 flex justify-end">
			<Button type="button" size="sm" class="gap-2" onclick={() => addIng()}>
				<Plus class="h-4 w-4" />
				<span>Add Ingredients</span>
			</Button>
		</div>
		{#each $form.ingredients as ing, i (ing)}
			<div
				class="flex w-full flex-col items-end gap-3
 rounded-lg border
 border-white/20 bg-white/10 p-3 shadow-lg
  backdrop-blur-lg lg:flex-row dark:border-black/20 dark:bg-gray-700"
			>
				<div class={arrParts}>
					<Label for="ingredient">Ingredient</Label>

					<Input
						type="text"
						min="1"
						name="ingredient"
						placeholder="Enter Ingredient"
						bind:value={$form.ingredients[i].ingredient}
					/>

					{#if $errors.ingredients?.[i]?.ingredient}
						<p class="text-sm text-red-500">{$errors.ingredients[i].ingredient}</p>
					{/if}
				</div>

				<div class={arrParts}>
					<Label for="amount">Amount</Label>

					<Input
						type="text"
						name="amount"
						placeholder="Amount of Ingredient"
						bind:value={$form.ingredients[i].amount}
					/>

					{#if $errors.ingredients?.[i]?.amount}
						<p class="text-sm text-red-500">{$errors.ingredients[i].amount}</p>
					{/if}
				</div>
				<Button
					type="button"
					variant="outline"
					title="Remove this product from list"
					onclick={() => {
						$form.ingredients.splice(i, 1);
						$form.ingredients = $form.ingredients;
					}}
				>
					<X class="h-8 w-8" />
				</Button>
			</div>
		{/each}

		<InputComp
			{form}
			{errors}
			type="number"
			name="prepTime"
			label="Prep Time"
			placeholder="Enter the prep time in minutes"
			required
		/>

		<InputComp
			{form}
			{errors}
			type="number"
			name="cookTime"
			label="Cook Time"
			placeholder="Enter the cook time in minutes"
			required
		/>

		<InputComp
			{form}
			{errors}
			type="file"
			name="image"
			label="Recipe Featured Image"
			placeholder="Upload Featured Image"
			required
		/>

		<Button type="submit" class="mt-4" form="main">
			{#if $delayed}
				<LoadingBtn name="Adding Product" />
			{:else}
				<Plus class="h-4 w-4" />

				Add Recipe
			{/if}
		</Button>
	</form>
</FormCard>
