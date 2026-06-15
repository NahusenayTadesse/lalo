<script lang="ts">
	import { Input } from '$lib/components/ui/input/index';
	import { Label } from '$lib/components/ui/label/index';

	import { Button } from '$lib/components/ui/button/index';
	import type { Snapshot } from '@sveltejs/kit';
	import * as Card from '$lib/components/ui/card/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { goto } from '$app/navigation';

	import { Eye, Plus, EyeClosed } from '@lucide/svelte';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { changePasswordSchema } from './schema';
	import { superForm } from 'sveltekit-superforms/client';
	import Errors from '$lib/formComponents/Errors.svelte';
	let { data } = $props();
	import { updateFlash } from 'sveltekit-flash-message';
	import { page } from '$app/state';

	const { form, errors, enhance, delayed, capture, restore, allErrors, message } = superForm(
		data.form,
		{
			onResult({ result }) {
				if (result.type === 'success') {
					goto('/login');
				}
				updateFlash(page);
			},
			onError() {
				updateFlash(page);
			},

			validators: zod4Client(changePasswordSchema)
		}
	);

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

	export const snapshot: Snapshot = { capture, restore };
	let eye = $state(false);
	let EyeIcon = $derived(eye ? Eye : EyeClosed);
</script>

<svelte:head>
	<title>Change Password</title>
</svelte:head>
{#snippet fe(label = '', name = '', placeholder = '', required = false, min = '', max = '')}
	<div class="relative flex w-full flex-col justify-start gap-2">
		<Label for={name}>{label}</Label>

		<div class="relative">
			<Input
				type={eye ? 'text' : 'password'}
				{name}
				{placeholder}
				{required}
				{min}
				{max}
				class="pr-10"
				bind:value={$form[name]}
				aria-invalid={$errors[name] ? 'true' : undefined}
			/>

			<button
				type="button"
				onclick={() => (eye = !eye)}
				title="Toggle Password Visibility"
				class="absolute inset-y-0 right-2 flex items-center pr-3 text-gray-500 hover:text-gray-700"
			>
				<EyeIcon
					class="h-5 w-5 transition-transform duration-300 ease-in-out {eye ? 'scale-110' : ''}"
				/>
			</button>
		</div>

		{#if $errors[name]}
			{#each $errors[name] as error}
				<span class="text-sm text-red-500">{error}</span>
			{/each}
		{/if}
	</div>
{/snippet}

<Card.Root class="my-8 flex w-full flex-col gap-4 justify-self-center lg:w-lg">
	<Card.Header>
		<Card.Title class="text-2xl">Change Password</Card.Title>
	</Card.Header>
	<Card.Content>
		<form use:enhance action="?/changePassword" id="main" class="flex flex-col gap-4" method="POST">
			<Errors allErrors={$allErrors} />
			{@render fe('Current Password', 'currentPassword', 'Enter your current password', true)}
			{@render fe('New Password', 'newPassword', 'Enter your new password', true)}
			{@render fe(
				'Confirm New Password',
				'confirmPassword',

				'Confirm New password',
				true
			)}

			{#if $form.newPassword !== $form.confirmPassword && $form.confirmPassword.length > 0}
				<span class="text-red-500">Passwords do not match</span>
			{/if}

			<Button
				type="submit"
				disabled={$form.newPassword !== $form.confirmPassword}
				class="mt-4"
				form="main"
			>
				{#if $delayed}
					<LoadingBtn name="Changing Password" />
				{:else}
					<Plus class="h-4 w-4" />

					Change Password
				{/if}
			</Button>
		</form>
	</Card.Content>
</Card.Root>
