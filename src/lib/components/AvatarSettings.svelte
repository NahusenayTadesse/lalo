<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import * as DropdownMenu from '@nahu/admin-kit/components/ui/dropdown-menu/index.js';
	import * as Avatar from '@nahu/admin-kit/components/ui/avatar/index.js';

	import { LogOut, KeyRound, User } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { goto } from '$app/navigation';
	let { data }: { data: string | undefined } = $props();

	let deleting = $state(false);

	import { useCart } from '$lib/hooks/cart.svelte';
	const cart = useCart();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<Avatar.Root>
			<Avatar.Fallback
				class="flex items-center justify-center  rounded-full border-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 font-medium text-white dark:from-indigo-800 dark:via-purple-700 dark:to-pink-800"
			>
				{data?.[0]?.toUpperCase() ?? 'N'}
			</Avatar.Fallback>
		</Avatar.Root>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="p-2">
		<DropdownMenu.Group>
			<DropdownMenu.Label>{m.avatar_my_account()}</DropdownMenu.Label>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={() => goto('/account')}>
				<User /> {m.avatar_my_account()}
			</DropdownMenu.Item>

			<DropdownMenu.Item onclick={() => goto('/change-password')}>
				<KeyRound /> {m.avatar_change_password()}
			</DropdownMenu.Item>
			<DropdownMenu.Item>
				<form
					method="post"
					action="/logout"
					use:enhance={() => {
						deleting = true; // 1. start spinner

						return async ({ result, update }) => {
							await update(); // 2. apply action result to page
							deleting = false; // 3. stop spinner
							// The cart is per browser, not per account — clear it on the way out.
							if (result.type === 'redirect') cart.clearCart();
						};
					}}
				>
					<button
						type="submit"
						disabled={deleting}
						class="flex flex-row items-center justify-center gap-2"
					>
						{#if deleting}
							<LoadingBtn name={m.logout_logging_out()} />
						{:else}
							<LogOut class="" /> {m.logout_button()}
						{/if}
					</button>
				</form></DropdownMenu.Item
			>
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
