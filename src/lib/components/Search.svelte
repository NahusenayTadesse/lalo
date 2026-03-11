<script>
	import * as Command from '$lib/components/ui/command/index.js';
	import { Disc, Search } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	let isOpen = $state(false);
	let list = [
		{ label: 'Dashboard', path: '/dashboard' },

		// Admin Panel

		// Customers
		{ label: 'Customers', path: '/dashboard/customers' },

		// Orders
		{ label: 'All Orders', path: '/dashboard/orders/all-orders' },
		{ label: 'Cancelled Orders', path: '/dashboard/orders/cancelled' },
		{ label: 'Delivered Orders', path: '/dashboard/orders/delivered' },

		// Products
		{ label: 'Products', path: '/dashboard/products' },
		{ label: 'Add Products', path: '/dashboard/products/add-products' },
		{ label: 'Product Categories', path: '/dashboard/products/categories' },

		// Recipes
		{ label: 'Recipes', path: '/dashboard/recipes/recipes' },
		{ label: 'Add Recipe', path: '/dashboard/recipes/add-recipes' },

		{ label: 'Reports', path: '/dashboard/reports' },

		{ label: 'Payment Methods', path: '/dashboard/admin-panel/payment-methods' },
		{ label: 'Roles', path: '/dashboard/admin-panel/roles' },
		{ label: 'Add Roles', path: '/dashboard/admin-panel/roles/add-roles' },
		{ label: 'Users', path: '/dashboard/admin-panel/users' },
		{ label: 'Add Users', path: '/dashboard/admin-panel/users/add-users' }
	];
</script>

<Dialog.Root bind:open={isOpen}>
	<Dialog.Trigger class="w-auto px-4" title="Search for Pages"><Search /></Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>Search the whole site</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="h-auto rounded-md border p-2">
			<h5 class="text-center">Search Anything</h5>
			<Command.Root class="rounded-lg shadow-md md:min-w-[450px]">
				<Command.Input placeholder="Type a command or search..." type="search" />
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>
					<Command.Group heading="Suggestions">
						{#each list as item (item.path)}
							<Command.Item>
								<Disc />
								<a href={item.path} onclick={() => (isOpen = false)}>{item.label}</a>
							</Command.Item>
						{/each}
					</Command.Group>
				</Command.List>
			</Command.Root>
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
