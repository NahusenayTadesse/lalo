<script lang="ts">
	let {
		id,
		name,
		link,
		target = ''
	}: { id: string; name: string; link: string; target?: string } = $props();
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { buttonVariants } from '../ui/button/index.js';
</script>

<Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger class={buttonVariants({ variant: 'ghost' })}>
			{#snippet child({ props })}
				<a
					href="{link}/{id}"
					{target}
					{...props}
					class="wrap-break-words flex flex-row items-start! justify-start! capitalize transition-all duration-600 ease-in-out hover:scale-110"
				>
					{name}
				</a>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content class="left-0 justify-self-start">
			<p class="text-[13px]!">See {name}'s page</p>
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
