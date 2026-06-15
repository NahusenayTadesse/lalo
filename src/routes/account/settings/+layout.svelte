<script>
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import Logout from '$lib/forms/Logout.svelte';
	// import DialogComp from "$lib/formComponents/DialogComp.svelte";
	// import AddCustomer from "$lib/forms/AddCustomer.svelte";
	import { Plus, Sheet, SquarePen, User } from '@lucide/svelte';
	let { children } = $props();
</script>

<div class="mb-8 flex flex-row flex-wrap items-center justify-start gap-2">
	<Button
		href="/account/settings"
		variant={page.url.pathname === '/account/settings' ? 'default' : 'outline'}
		><User /> Profile Details</Button
	>

	<Button
		href="/account/settings/change-password"
		variant={page.url.pathname === '/account/settings/change-password' ? 'default' : 'outline'}
		><SquarePen /> Change Password</Button
	>

	<Logout />
</div>

{@render children?.()}
