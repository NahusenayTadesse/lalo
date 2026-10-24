<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import {
		LayoutDashboard,
		PackageCheck,
		History,
		CreditCard,
		Headset,
		Settings,
		LogOut,
		Truck,
		User
	} from '@lucide/svelte';
	import * as Sidebar from '@nahu/admin-kit/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import { useSidebar } from '@nahu/admin-kit/components/ui/sidebar/index.js';
	import CustomerNav from './customerNav.svelte';

	import Logout from '$lib/forms/Logout.svelte';

	// Simplified parameters focused entirely on the customer
	let { name, ...restProps }: { name?: string } & ComponentProps<typeof Sidebar.Root> = $props();

	// Restructured navigation focusing on clear, immediate customer goals
	const navItems = [
		{
			title: m.account_nav_overview(),
			url: '/account',
			icon: LayoutDashboard
		},

		{
			title: m.account_nav_track_orders(),
			url: '/account/orders',
			icon: Truck
		},
		{
			title: m.account_nav_order_history(),
			url: '/account/history',
			icon: History
		},
		{
			title: m.account_nav_profile(),
			url: '/account/settings',
			icon: User
		}
	];

	const sidebar = useSidebar();
	function closeSidebar() {
		if (sidebar.isMobile) sidebar.setOpenMobile(false);
	}
</script>

<Sidebar.Root collapsible="offcanvas" {...restProps}>
	<Sidebar.Content class="lg:pt-16">
		<div class="z-10 border-b border-border/60 bg-sidebar px-5 py-4">
			<a href="/account" title={m.account_nav_home_title()} class="flex items-center gap-3">
				<div>
					<div class="text-4xl! font-bold tracking-tight text-foreground">{name}</div>
					<div class="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
						{m.account_nav_portal()}
					</div>
				</div>
			</a>
		</div>

		<div class="flex-1 py-3">
			<CustomerNav {closeSidebar} sections={navItems} />
		</div>
	</Sidebar.Content>

	<Sidebar.Footer
		class="flex flex-row items-center justify-between border-t border-border/60 bg-sidebar px-5 py-4 text-[10px] text-muted-foreground"
	>
		<Logout />
	</Sidebar.Footer>
</Sidebar.Root>
