<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { cn } from 'tailwind-variants';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { sidebarMenuButtonVariants } from './ui/sidebar/sidebar-menu-button.svelte';
	let {
		items
	}: {
		items: {
			title: string;
			url: string;
			// this should be `Component` after @lucide/svelte updates types
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			icon?: any;
			isActive?: boolean;
			items?: {
				title: string;
				url: string;
				icon?: any;
			}[];
		}[];
	} = $props();
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { slide } from 'svelte/transition';

	function variantChecker(url: string) {
		const currentPath = page.url.pathname;

		// Special case for root dashboard
		if (url === '/dashboard') {
			return currentPath === '/dashboard';
		}

		// For other items, check if current path starts with their URL but is not just /dashboard
		return currentPath.startsWith(url) && currentPath !== '/dashboard';
	}
	function variantChecker2(url: string) {
		const currentPath = page.url.pathname;

		// Special case for root dashboard

		// For other items, check if current path starts with their URL but is not just /dashboard
		return currentPath === url;
	}
</script>

<Sidebar.Group>
	<Sidebar.Menu>
		{#each items as item (item.title)}
			{#if item.items}
				<Collapsible.Root open={item.isActive} class="group/collapsible">
					{#snippet child({ props })}
						<Sidebar.MenuItem {...props}>
							<Collapsible.Trigger onclick={() => goto(item.url)}>
								{#snippet child({ props })}
									<Sidebar.MenuButton
										{...props}
										variant={variantChecker(item.url) ? 'outline' : 'default'}
										size="lg"
										title="Goto {item.title}"
										tooltipContent={item.title}
									>
										{#if item.icon}
											<item.icon />
										{/if}
										<span>{item.title}</span>

										<ChevronRightIcon
											class="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
										/>
									</Sidebar.MenuButton>
								{/snippet}
							</Collapsible.Trigger>

							<Collapsible.Content>
								<Sidebar.MenuSub>
									{#each item.items ?? [] as subItem (subItem.title)}
										<Sidebar.MenuSubItem>
											<Sidebar.MenuButton
												{...props}
												variant={variantChecker2(subItem.url) ? 'outline' : 'default'}
												size="sm"
												title="Goto {subItem.title}"
												tooltipContent={subItem.title}
											>
												{#snippet child({ props })}
													<a href={subItem.url} {...props} transition:slide|global>
														{#if subItem.icon}
															<subItem.icon class="h-4 w-4" />
														{/if}
														<span>{subItem.title}</span>
													</a>
												{/snippet}
											</Sidebar.MenuButton>
										</Sidebar.MenuSubItem>
									{/each}
								</Sidebar.MenuSub>
							</Collapsible.Content>
						</Sidebar.MenuItem>
					{/snippet}
				</Collapsible.Root>
			{:else}
				<Sidebar.Menu class="w-full gap-3" title="Goto {item.title}">
					<Sidebar.MenuItem>
						<Sidebar.MenuButton
							size="lg"
							variant={variantChecker(item.url) ? 'outline' : 'default'}
						>
							{#snippet child({ props })}
								<a href={item.url} {...props}>
									<item.icon class="h-5! w-5!" />
									<span>{item.title}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			{/if}
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>
