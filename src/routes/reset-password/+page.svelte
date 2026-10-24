<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { page } from '$app/stores';
	import { authClient } from '$lib/auth-client';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Input } from '@nahu/admin-kit/components/ui/input/index.js';
	import { Label } from '@nahu/admin-kit/components/ui/label/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Loader2, AlertCircle, CheckCircle2 } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	// Extract token from URL search parameters (?token=xyz)
	const token = $derived($page.url.searchParams.get('token'));

	// Svelte 5 Form Reactive State
	let password = $state('');
	let confirmPassword = $state('');
	let isLoading = $state(false);
	let errorMessage = $state('');
	let isSuccess = $state(false);

	// Basic validation check using Svelte 5 derived state
	const passwordsMatch = $derived(password === confirmPassword);
	const isPasswordValid = $derived(password.length >= 8);
	const canSubmit = $derived(passwordsMatch && isPasswordValid && token && !isLoading);

	async function handleReset(e: SubmitEvent) {
		e.preventDefault();
		if (!canSubmit) return;

		isLoading = true;
		errorMessage = '';

		const { data, error } = await authClient.resetPassword({
			newPassword: password,
			token: token as string
		});

		isLoading = false;

		if (error) {
			errorMessage = error.message || m.reset_failed();
		} else {
			isSuccess = true;
			// Automatically send them to login after 3 seconds
			setTimeout(() => {
				goto('/login');
			}, 3000);
		}
	}
</script>

<div class="container flex h-screen w-screen flex-col items-center justify-center">
	<Card.Root class="w-full max-w-md border-border bg-card text-card-foreground shadow-lg">
		<Card.Header class="space-y-1">
			<Card.Title class="text-2xl font-bold tracking-tight">{m.reset_title()}</Card.Title>
			<Card.Description class="text-muted-foreground">
				{m.reset_description()}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if !token}
				<div
					class="flex items-start gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive"
				>
					<AlertCircle class="h-5 w-5 shrink-0" />
					<p>
						<strong>{m.reset_missing_token_label()}</strong> {m.reset_missing_token()}
					</p>
				</div>
			{:else if isSuccess}
				<div class="flex items-start gap-3 rounded-lg bg-primary/10 p-4 text-sm text-primary">
					<CheckCircle2 class="h-5 w-5 shrink-0" />
					<div>
						<p class="font-medium">{m.reset_updated()}</p>
						<p class="mt-1 text-muted-foreground">
							{m.reset_redirecting()}
						</p>
					</div>
				</div>
			{:else}
				<form onsubmit={handleReset} class="space-y-4">
					{#if errorMessage}
						<div
							class="flex items-center gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive"
						>
							<AlertCircle class="h-4 w-4" />
							<span>{errorMessage}</span>
						</div>
					{/if}

					<div class="space-y-2">
						<Label for="password" class="text-foreground">{m.reset_new_password()}</Label>
						<Input
							id="password"
							type="password"
							bind:value={password}
							required
							disabled={isLoading}
							class="border-input bg-background text-foreground"
						/>
						{#if password && !isPasswordValid}
							<p class="text-xs text-destructive">{m.reset_password_min()}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="confirmPassword" class="text-foreground">{m.reset_confirm_password()}</Label>
						<Input
							id="confirmPassword"
							type="password"
							bind:value={confirmPassword}
							required
							disabled={isLoading}
							class="border-input bg-background text-foreground"
						/>
						{#if confirmPassword && !passwordsMatch}
							<p class="text-xs text-destructive">{m.form_passwords_mismatch()}</p>
						{/if}
					</div>

					<Button
						type="submit"
						class="w-full bg-primary text-primary-foreground hover:bg-primary/90"
						disabled={!canSubmit}
					>
						{#if isLoading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{m.reset_updating()}
						{:else}
														{m.reset_submit()}

						{/if}
					</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
