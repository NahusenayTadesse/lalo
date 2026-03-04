<script lang="ts">
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { CookingPotIcon, ChevronDownIcon, UtensilsIcon } from '@lucide/svelte';

	type RecipeItem = {
		id: string | number | null;
		recipeId: string | number | null;
		ingredient: string | null;
		amount: number | string | null;
	};

	type Props = {
		items: RecipeItem[];
		label?: string;
	};

	const { items, label = 'Ingredients' }: Props = $props();

	// Derived state for the summary
	const itemCount = $derived(items.length);
	const previewText = $derived(items.length > 0 ? `${items[0].amount} ${items[0].ingredient}` : '');
</script>

{#if items.length === 0}
	<span class="text-sm text-muted-foreground italic">No ingredients listed</span>
{:else if items.length === 1}
	<div class="flex items-center gap-2 px-2 py-1">
		<UtensilsIcon class="size-4 text-muted-foreground" />
		<div class="flex flex-col">
			<span class="text-sm font-medium">{items[0].ingredient}</span>
			<span class="text-xs text-muted-foreground">{items[0].amount}</span>
		</div>
	</div>
{:else}
	<Popover>
		<PopoverTrigger>
			{#snippet child({ props })}
				<Button variant="outline" size="sm" class="h-auto gap-2 px-2 py-1.5" {...props}>
					<CookingPotIcon class="size-4 text-primary" />
					<div class="flex flex-col items-start">
						<span class="text-sm font-semibold">{itemCount} {label}</span>
						<span class="max-w-30 truncate text-xs text-muted-foreground">
							{previewText}...
						</span>
					</div>
					<ChevronDownIcon class="size-4 opacity-50" />
				</Button>
			{/snippet}
		</PopoverTrigger>

		<PopoverContent class="w-72 p-0" align="start">
			<div class="bg-muted/30 p-3">
				<h4 class="text-sm leading-none font-bold">{label} List</h4>
				<p class="mt-1 text-xs text-muted-foreground">
					{itemCount} items required for this recipe
				</p>
			</div>
			<Separator />
			<div class="max-h-60 overflow-y-auto">
				{#each items as item (item.id)}
					<div
						class="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/20"
					>
						<span class="text-sm font-medium text-foreground">{item.ingredient}</span>
						<span class="rounded-full bg-secondary px-2 py-0.5 font-mono text-xs">
							{item.amount}
						</span>
					</div>
				{/each}
			</div>
			<Separator />
			<div class="bg-muted/10 p-2 text-center">
				<p class="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
					End of List
				</p>
			</div>
		</PopoverContent>
	</Popover>
{/if}
