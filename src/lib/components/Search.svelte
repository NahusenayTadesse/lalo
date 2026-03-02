<script>
	import * as Command from '$lib/components/ui/command/index.js';
	import { Disc, Search } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	let isOpen = $state(false);
	let list = [
		{ label: 'Dashboard', path: '/dashboard' },

		{ label: 'Add Positions', path: '/dashboard/admin-panel/add-positions' },
		{ label: 'Add Product Category', path: '/dashboard/admin-panel/add-product-category' },
		{ label: 'Add Roles', path: '/dashboard/admin-panel/add-roles' },
		{ label: 'Add Services (Admin Panel)', path: '/dashboard/admin-panel/add-services' },
		{ label: 'Add Users', path: '/dashboard/admin-panel/add-users' },

		{ label: 'Add Appointment', path: '/dashboard/appointments/add-appointment' },
		{ label: 'All Appointments', path: '/dashboard/appointments/all-appointments' },

		{ label: 'Add Inventory', path: '/dashboard/inventory/add-inventory' },

		{ label: 'Add Products', path: '/dashboard/products/add-products' },

		{ label: 'Reports', path: '/dashboard/reports' },
		{ label: 'Sales', path: '/dashboard/sales' },

		{ label: 'Add Services', path: '/dashboard/services/add-services' },

		{ label: 'Add Staff', path: '/dashboard/staff/add-staff' },

		{ label: 'Add Supplies', path: '/dashboard/supplies/add-supplies' },

		{ label: 'Login', path: '/login' }
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
