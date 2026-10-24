<script lang="ts">
	import * as Sidebar from '@nahu/admin-kit/components/ui/sidebar/index.js';
	import KitProvider from '@nahu/admin-kit/components/KitProvider.svelte';
	import DarkMode from '@nahu/admin-kit/components/shell/DarkMode.svelte';
	import Search from '@nahu/admin-kit/components/shell/Search.svelte';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import AvatarSettings from '$lib/components/AvatarSettings.svelte';
	import { access } from '$lib/access';
	import { ENTITIES, NAVIGATION, SEARCH_EXTRA } from '$lib/navigation';

	let { children, data } = $props();

	const counters = $derived({
		'/dashboard/orders': data?.ordersNumber ?? 0,
		'/dashboard/messages': data?.messageNumber ?? 0
	});
</script>

<KitProvider
	{access}
	navigation={NAVIGATION}
	searchExtra={SEARCH_EXTRA}
	entities={ENTITIES}
	permList={data?.permList}
	isSuperAdmin={data?.isSuperAdmin}
>
	<Sidebar.Provider>
		<AppSidebar {counters} />
		<main class="min-w-0 flex-1 px-2">
			<div
				class="absolute top-2 left-2 z-10 flex w-[95%] flex-row
			justify-between rounded-lg p-2 pr-4 align-middle
		 shadow-lg backdrop-blur-md lg:sticky lg:w-full lg:pr-0"
			>
				<Sidebar.Trigger class="rounded-lg bg-white p-4 dark:bg-black" />
				<div class="flex flex-row items-center gap-4">
					<Search />
					<DarkMode />
					<AvatarSettings data={data?.name} />
				</div>
			</div>
			<div class="p-2 pt-24 pb-24 lg:pt-4 lg:pb-4">
				{@render children?.()}
			</div>
		</main>
	</Sidebar.Provider>
</KitProvider>
