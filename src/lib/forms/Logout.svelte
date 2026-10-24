<script>
	import { m } from '$lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import { Button, buttonVariants } from '@nahu/admin-kit/components/ui/button/index.js';
	import { LogOut } from '@lucide/svelte';
	import * as Dialog from '@nahu/admin-kit/components/ui/dialog/index.js';
	import { ScrollArea } from '@nahu/admin-kit/components/ui/scroll-area/index.js';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	let open = $state(false);

	let deleting = $state(false);

	import { toast } from 'svelte-sonner';
	import { useCart } from '$lib/hooks/cart.svelte';

	const cart = useCart();
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: 'destructive' })}
		><LogOut /> {m.logout_button()}
	</Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>{m.logout_button()}</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="h-auto rounded-md border p-2">
			<h5 class="text-center">{m.logout_confirm()}</h5>
			<div class="flex flex-row items-center justify-center gap-4 pt-4">
				<form
					method="post"
					action="/logout"
					use:enhance={() => {
						deleting = true; // 1. start spinner

						return async ({ result, update }) => {
							await update(); // 2. apply action result to page
							deleting = false; // 3. stop spinner
							// The cart is stored per browser, not per account: without this the
							// next person on a shared computer saw — and could order — it.
							if (result.type === 'redirect') cart.clearCart();
							// The action always redirects; the success toast comes from the
							// flash message. Only surface a toast when it *didn't* redirect.
							if (result.type === 'error' || result.type === 'failure') {
								toast.error(m.logout_failed());
							}
						};
					}}
				>
					<Button type="submit" disabled={deleting} variant="destructive" size="lg">
						{#if deleting}
							<LoadingBtn name={m.logout_logging_out()} />
						{:else}
							<LogOut /> {m.logout_button()}
						{/if}
					</Button>
				</form>

				<Button onclick={() => (open = false)} size="lg">{m.common_cancel()}</Button>
			</div>
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
