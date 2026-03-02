<script>
	import { Button } from '$lib/components/ui/button/index.js';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js';
	import * as Menubar from '$lib/components/ui/menubar/index.js';
	import { selectItem } from '$lib/global.svelte';
	import { ChevronDown } from '@lucide/svelte';
	import { fly, slide } from 'svelte/transition';

	let { children } = $props();

	let userManagement = [
		{ name: 'Payment Methods', href: '/dashboard/admin-panel/payment-methods' },
		{ name: 'Users', href: '/dashboard/admin-panel/users' },
		{ name: 'Roles', href: '/dashboard/admin-panel/roles' }
	];
</script>

{#snippet menu(trigger = '', array = [{ name: '', href: '' }])}
	<Menubar.Menu>
		<Menubar.Trigger class={selectItem}>{trigger} <ChevronDown /></Menubar.Trigger>

		<div transition:fly={{ y: 20, duration: 300 }}>
			<Menubar.Content>
				{#each array as menu (menu.href)}
					<Menubar.Item class={selectItem}
						><a href={menu.href} class="w-full" transition:slide|global>{menu.name}</a
						></Menubar.Item
					>
					<Menubar.Separator />
				{/each}
			</Menubar.Content>
		</div>
	</Menubar.Menu>
{/snippet}

<Menubar.Root class="sticky mb-8 bg-transparent">
	{@render menu('User Management', userManagement)}
</Menubar.Root>

{@render children?.()}
