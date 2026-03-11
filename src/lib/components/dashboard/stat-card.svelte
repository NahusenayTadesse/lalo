<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		value: string | number;
		icon: Snippet;
		description?: string;
		className?: string;
		measure?: string;
	}

	const { title, value, icon, description, className = '', measure = '' }: Props = $props();
</script>

<Card
	class={[
		'group border-0 bg-linear-to-br from-card to-card/80 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
		className
	]}
>
	<CardContent class="p-6">
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<p class="mb-2 text-sm font-medium text-muted-foreground">{title}</p>
				<p class="mb-2 text-3xl font-bold text-card-foreground">
					{value}
					<span class="text-2xl!">
						{measure}
					</span>
				</p>
				{#if description}
					<p class="text-xs text-muted-foreground">{description}</p>
				{/if}
			</div>
			<div
				class="shrink-0 rounded-lg bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary/20"
			>
				{@render icon()}
			</div>
		</div>
	</CardContent>
</Card>
