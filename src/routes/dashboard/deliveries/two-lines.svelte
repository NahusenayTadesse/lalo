<script lang="ts">
	/** A main value with a smaller one under it — a time and who did it, a name and a phone. */
	let {
		main,
		sub = null,
		href = null
	}: { main: string | null | undefined; sub?: string | null; href?: string | null } = $props();
</script>

<div class="flex flex-col leading-tight whitespace-nowrap">
	<span>{main || '—'}</span>
	{#if sub}
		{#if href}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- tel: links, not app routes -->
			<a {href} class="text-xs text-muted-foreground underline-offset-2 hover:underline">{sub}</a>
		{:else}
			<span class="text-xs text-muted-foreground">{sub}</span>
		{/if}
	{/if}
</div>
