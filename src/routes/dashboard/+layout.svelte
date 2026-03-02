<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import DarkMode from '$lib/components/DarkMode.svelte';
	import Search from '$lib/components/Search.svelte';
	import AvatarSettings from '$lib/components/AvatarSettings.svelte';
	import BottomMenu from '$lib/components/bottomMenu.svelte';

	let { children, data } = $props();
</script>

<Sidebar.Provider>
	<AppSidebar />
	<main class="w-full px-2">
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
			<BottomMenu />
		</div>
	</main>
</Sidebar.Provider>
