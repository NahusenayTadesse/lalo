<script lang="ts">
	import * as Sidebar from '@nahu/admin-kit/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import { appSurface } from '@nahu/admin-kit/global';
	import { useKit } from '@nahu/admin-kit/context';
	import { visibleNavigation } from '@nahu/admin-kit/navigation';

	import NavMain from './NavMain.svelte';

	/**
	 * The kit's menu (from `<KitProvider navigation>`, filtered by `access`) with a count beside
	 * an entry — pending orders, unread messages. The kit's own `AppSidebar` has no counts.
	 */
	let {
		counters = {},
		...restProps
	}: { counters?: Record<string, number> } & ComponentProps<typeof Sidebar.Root> = $props();

	const kit = useKit();
	const items = $derived(
		visibleNavigation(kit.navigation, kit.canOpen).map((item) => ({
			...item,
			counter: counters[item.url]
		}))
	);
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
  {appSurface}
"
	>
		<Sidebar.Group>
			<Sidebar.GroupLabel>
				<a
					class=" flex flex-col items-center gap-4 justify-self-center"
					href="/"
					title="Go to Website Home Page"
					target="_blank"
				>
					<img src="/logo.webp" class=" h-12 w-auto" alt="Logo" />
				</a></Sidebar.GroupLabel
			>
			<Sidebar.GroupContent class="my-4">
				<NavMain {items} />
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer class="flex flex-row border-t bg-sidebar">
		<Sidebar.GroupLabel>
			Powered By <a href="https://nahusenaytadesse.vercel.app" target="_blank" class="ml-1">NT</a>
		</Sidebar.GroupLabel>
	</Sidebar.Footer>
</Sidebar.Root>
