<script lang="ts">
	import { page } from '$app/state';
	import { scale } from 'svelte/transition';
	import { cn } from '$lib/utils';
	import type { Component } from 'svelte';
	import type { IconProps } from '@lucide/svelte';

	// 1. Strictly define the type contract for your new nav data structure
	interface NavItem {
		title: string;
		url: string;
		icon: Component<IconProps>;
		counter?: number;
	}

	// 2. Correctly type the incoming Svelte 5 Rune Props
	let {
		closeSidebar,
		sections
	}: {
		closeSidebar: () => void;
		sections: NavItem[];
	} = $props();

	// Pure Svelte 5 reactive check for active paths
	let currentPath = $derived(page.url.pathname);
</script>

<nav class="space-y-2 px-3">
	{#each sections as item (item.url)}
		{@const isActive = currentPath === item.url}
		<a
			href={item.url}
			onclick={closeSidebar}
			class={cn(
				'group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
				isActive
					? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
					: 'text-muted-foreground hover:bg-muted hover:text-foreground'
			)}
		>
			<item.icon
				class={cn(
					'h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105',
					isActive
						? 'text-primary-foreground'
						: 'text-muted-foreground/70 group-hover:text-foreground'
				)}
			/>

			<span class="flex-1">{item.title}</span>

			{#if item.counter && item.counter > 0}
				<span
					class={cn(
						'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ring-2',
						isActive
							? 'bg-primary-foreground text-primary ring-primary'
							: 'bg-primary text-primary-foreground ring-background'
					)}
					in:scale={{ duration: 150 }}
				>
					{item.counter}
				</span>
			{/if}
		</a>
	{/each}
</nav>
