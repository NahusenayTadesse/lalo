<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/customerSidebar.svelte';

	let { children, data } = $props();
</script>

<Sidebar.Provider>
	<AppSidebar name={data.name} />
	<main class="flex w-full min-w-0 flex-1 flex-col">
		<Sidebar.Trigger class="rounded-lg bg-white p-4 dark:bg-black" />
		<div class="flex-1 px-6 py-6">
			{@render children?.()}
		</div>
	</main>
</Sidebar.Provider>
