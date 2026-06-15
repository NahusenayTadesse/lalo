<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Loader2, AlertCircle, CheckCircle2 } from '@lucide/svelte';

	// Svelte 5 Runes for local state management
	let email = $state('');
	let isLoading = $state(false);
	let errorMessage = $state('');
	let isSuccess = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		isLoading = true;
		errorMessage = '';
		isSuccess = false;

		const { data, error } = await authClient.requestPasswordReset({
			email,
			// Make sure this points exactly to your reset page route
			redirectTo: '/reset-password'
		});

		isLoading = false;

		if (error) {
			errorMessage = error.message || 'Something went wrong. Please try again.';
		} else {
			isSuccess = true;
		}
	}
</script>

<div class="container flex h-screen w-screen flex-col items-center justify-center">
	<Card.Root class="w-full max-w-md border-border bg-card text-card-foreground shadow-lg">
		<Card.Header class="space-y-1">
			<Card.Title class="text-2xl font-bold tracking-tight">Forgot password?</Card.Title>
			<Card.Description class="text-muted-foreground">
				Enter your email address and we'll send you a link to reset your password.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if isSuccess}
				<div class="flex items-start gap-3 rounded-lg bg-primary/10 p-4 text-sm text-primary">
					<CheckCircle2 class="h-5 w-5 shrink-0" />
					<div>
						<p class="font-medium">Check your email</p>
						<p class="mt-1 text-muted-foreground">
							We have sent a password reset link to <strong>{email}</strong>.
						</p>
					</div>
				</div>
			{:else}
				<form onsubmit={handleSubmit} class="space-y-4">
					{#if errorMessage}
						<div
							class="flex items-center gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive"
						>
							<AlertCircle class="h-4 w-4" />
							<span>{errorMessage}</span>
						</div>
					{/if}

					<div class="space-y-2">
						<Label for="email" class="text-foreground">Email address</Label>
						<Input
							id="email"
							type="email"
							placeholder="name@example.com"
							bind:value={email}
							required
							disabled={isLoading}
							class="border-input bg-background text-foreground focus-visible:ring-ring"
						/>
					</div>

					<Button
						type="submit"
						class="w-full bg-primary text-primary-foreground hover:bg-primary/90"
						disabled={isLoading}
					>
						{#if isLoading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Sending link...
						{:else}
							Send reset link
						{/if}
					</Button>
				</form>
			{/if}
		</Card.Content>
		<Card.Footer class="flex justify-center border-t border-border pt-4">
			<a href="/login" class="text-sm text-muted-foreground transition-colors hover:text-primary">
				Back to sign in
			</a>
		</Card.Footer>
	</Card.Root>
</div>
