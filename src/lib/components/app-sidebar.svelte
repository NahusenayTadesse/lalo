<script lang="ts">
	import {
		Users,
		UserRoundCog,
		ChartArea,
		LayoutDashboard,
		Container,
		Banknote,
		Plus,
		Sheet,
		Mail,
		Loader,
		CircleCheckBig,
		OctagonMinus,
		ListOrdered,
		CookingPot,
		Star,
		Building2,
		BookDown
	} from '@lucide/svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import { bgGradient } from '$lib/global.svelte';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';

	import NavMain from './NavMain.svelte';

	let { messageNumber, ordersNumber, ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();

	const navigation = [
		{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
		{ title: 'Customers', url: '/dashboard/customers', icon: Users },
		{
			title: 'Orders',
			url: '/dashboard/orders',
			icon: ListOrdered,
			counter: ordersNumber,
			items: [
				{ title: 'All Orders', url: '/dashboard/orders/all-orders', icon: Sheet },
				{ title: 'Pending Orders', url: '/dashboard/orders', icon: Loader },
				{ title: 'Delivered Orders', url: '/dashboard/orders/delivered', icon: CircleCheckBig },
				{ title: 'Cancelled Orders', url: '/dashboard/orders/cancelled', icon: OctagonMinus }
			]
		},

		{
			title: 'Products',
			url: '/dashboard/products',
			icon: Container,
			items: [
				{ title: 'All Products', url: '/dashboard/products', icon: Sheet },
				{ title: 'Add Product', url: '/dashboard/products/add-products', icon: Plus },
				{ title: 'Suppliers', url: '/dashboard/products/suppliers', icon: Sheet },
				{ title: 'Add Supplier', url: '/dashboard/products/add-supplier', icon: Plus }
			]
		},

		{
			title: 'Recipes ',
			url: '/dashboard/recipes',
			icon: CookingPot,
			items: [
				{ title: 'All Recipes', url: '/dashboard/recipes', icon: Sheet },
				{ title: 'Add Recipe', url: '/dashboard/recipes/add-recipes', icon: Plus }
			]
		},
		{
			title: 'Messages',
			url: '/dashboard/messages',
			icon: Mail,
			counter: messageNumber
		},
		{
			title: 'Testimonials  ',
			url: '/dashboard/testimonials',
			icon: Star
		},

		{
			title: 'Partner Logos  ',
			url: '/dashboard/logos',
			icon: Building2
		},

		{
			title: 'Catalog & Manual',
			url: '/dashboard/catalog',
			icon: BookDown
		},
		{
			title: 'Reports',
			url: '/dashboard/reports',
			icon: ChartArea
		},
		{
			title: 'Admin Panel',
			url: '/dashboard/admin-panel',
			icon: UserRoundCog,
			items: [
				{
					title: 'Payment Methods',
					url: '/dashboard/admin-panel/payment-methods',
					icon: Banknote
				},
				{ title: 'Users', url: '/dashboard/admin-panel/users', icon: Users },
				{ title: 'Roles', url: '/dashboard/admin-panel/roles', icon: Users }
			]
		}
	];

	const on = 'bg-sidebar-primary text-sidebar-primary-foreground';
	const off = 'text-sidebar-foreground';
	// function blacken(url: string) {
	// 	const currentPath = page.url.pathname;

	// 	// Special case for root dashboard
	// 	if (url === '/dashboard') {
	// 		return currentPath === '/dashboard' ? on : off;
	// 	}

	// 	// For other items, check if current path starts with their URL but is not just /dashboard
	// 	return currentPath.startsWith(url) && currentPath !== '/dashboard' ? on : off;
	// }

	// let open = $state(false);

	const sidebar = useSidebar();

	function closeSidebar() {
		if (sidebar.isMobile) {
			sidebar.setOpenMobile(false);
		}
	}
</script>

<Sidebar.Root collapsible="offcanvas" {...restProps}>
	<Sidebar.Content
		class="z-9999! h-full
  overflow-y-scroll pt-4
  [scrollbar-color:#a3a3a3_transparent]
  [scrollbar-width:thin]
  [&::-webkit-scrollbar]:w-2
  [&::-webkit-scrollbar-thumb]:bg-gray-400
  [&::-webkit-scrollbar-thumb:hover]:bg-gray-500 [&::-webkit-scrollbar-track]:bg-transparent
  {bgGradient}
"
	>
		<Sidebar.Group>
			<Sidebar.GroupLabel>
				<a
					class="flex flex-row items-center justify-center gap-4"
					href="/"
					title="Go to Website Home Page"
					target="_blank"
				>
					<img src="/logo.webp" class=" h-16 w-16" alt="Logo" />
					<h4 class="text-center text-[16px]! text-primary">Lalo Bakery Solutions</h4>
				</a></Sidebar.GroupLabel
			>
			<Sidebar.GroupContent class="my-4">
				<NavMain items={navigation} />
				<!-- <Sidebar.Menu class="w-full gap-3">
					{#each navigation as item (item.title)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								class="flex items-center gap-3 rounded-lg px-3 py-5 text-lg
          font-normal transition-colors duration-300 hover:bg-sidebar-accent
          hover:text-sidebar-accent-foreground {selectItem}
          {blacken(item.url)}"
							>
								{#snippet child({ props })}
									<a href={item.url} onclick={closeSidebar} {...props} transition:fade>
										<item.icon class="!h-5 !w-5" />
										<span>{item.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu> -->
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer class="flex flex-row bg-white dark:bg-black">
		<Sidebar.GroupLabel>
			Powered By <a href="https://nahusenaytadesse.vercel.app" target="_blank" class="ml-1">NT</a>
		</Sidebar.GroupLabel>
	</Sidebar.Footer>
</Sidebar.Root>
