<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { edit } from './schema.js';
	let { data } = $props();

	import SingleTable from '$lib/components/SingleTable.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { superForm } from 'sveltekit-superforms/client';
	import { page } from '$app/state';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { ArrowLeft, Pencil, Save, Plus, X } from '@lucide/svelte';
	import type { Snapshot } from '@sveltejs/kit';

	import Delete from '$lib/forms/Delete.svelte';
	import SingleView from '$lib/components/SingleView.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';

	function addIng() {
		$form.ingredients = [...$form.ingredients, { ingredient: '', amount: '1' }];
	}

	let singleTable = $derived([
		{ name: 'Name', value: data.recipe?.title },
		{ name: 'Instructions', value: data.recipe?.instructions },
		{ name: 'Prep Time', value: data.recipe?.prepTime },
		{ name: 'Cook Time', value: data.recipe?.cookTime },
		{ name: 'Description', value: data.recipe?.description }
	]);

	const { form, errors, enhance, delayed, capture, restore, allErrors, message } = superForm(
		data.form,
		{
			validators: zod4Client(edit),
			resetForm: false,
			dataType: 'json'
		}
	);

	$form.title = data.recipe?.title;
	$form.ingredients = data?.ingList;
	$form.instructions = data?.recipe?.instructions;
	$form.prepTime = Number(data.recipe?.prepTime);
	$form.cookTime = Number(data.recipe?.cookTime);
	$form.description = data.recipe?.description;

	export const snapshot: Snapshot = { capture, restore };

	//   let date = $derived(dateProxy(editForm, 'appointmentDate', { format: 'date'}));

	let editForm = $state(false);
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

	import * as Table from '$lib/components/ui/table';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

	let ingList = $derived(data?.ingList);

	let arrParts = `flex flex-col justify-start gap-2 w-full`;
</script>

<svelte:head>
	<title>{data?.recipe?.title} Recipe Details</title>
</svelte:head>

<SingleView title={data?.recipe?.title} photo={String(data?.recipe?.image)} class="w-full! px-4">
	<div class="mt-4 flex w-full flex-row flex-wrap items-start justify-start gap-2 pl-4">
		<Button onclick={() => (editForm = !editForm)}>
			{#if !editForm}
				<Pencil class="h-4 w-4" />
				Edit
			{:else}
				<ArrowLeft class="h-4 w-4" />

				Back
			{/if}
		</Button>

		<Delete redirect="/dashboard/recipes" />
	</div>
	{#if editForm === false}
		<div class="w-full p-4"><SingleTable {singleTable} /></div>
	{/if}
	{#if editForm}
		<div class="w-full p-4">
			<form
				action="?/edit"
				use:enhance
				class="flex w-full flex-col items-start justify-start gap-4 lg:w-1/2"
				id="edit"
				method="post"
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
					image={String(data?.recipe?.image)}
					label="Recipe Featured Image"
					placeholder="Upload Featured Image"
					required
				/>

				<Button form="edit" type="submit" class="mt-4">
					{#if $delayed}
						<LoadingBtn name="Saving Changes" />
					{:else}
						<Save class="h-4 w-4" />
						Save Changes
					{/if}
				</Button>
			</form>
		</div>
	{/if}

	<Card class="my-4 w-full justify-self-start">
		<CardHeader>
			<CardTitle>Ingredients</CardTitle>
		</CardHeader>
		<CardContent>
			{#if ingList.length > 0}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Ingredient</Table.Head>
							<Table.Head class="text-right">Amount</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each ingList as item (item)}
							<Table.Row>
								<Table.Cell class="font-medium capitalize">{item.ingredient}</Table.Cell>
								<Table.Cell class="text-right text-muted-foreground">{item.amount}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				<p class="py-4 text-center text-sm text-muted-foreground">No ingredients found.</p>
			{/if}
		</CardContent>
	</Card>
</SingleView>
