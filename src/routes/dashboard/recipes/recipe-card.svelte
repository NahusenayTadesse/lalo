<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Clock, ChefHat } from '@lucide/svelte';
	import type { Recipe } from '$lib/data/recipes';

	const { recipe, onclick }: Props = $props();

	type Props = {
		recipe: Recipe;
		onclick: () => void;
	};
</script>

<Card
	class="group hover:shadow-lg-xl cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02]"
	{onclick}
>
	<div class="relative h-48 overflow-hidden bg-muted">
		<img
			src={recipe.image}
			alt={recipe.title}
			class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
		/>
		{#if recipe.status}
			<Badge class="absolute top-3 right-3 bg-primary text-primary-foreground">Active</Badge>
		{/if}
	</div>

	<CardContent class="flex flex-col gap-3 p-4">
		<div class="flex flex-col gap-1">
			<h3 class="line-clamp-2 text-lg font-semibold text-card-foreground">{recipe.title}</h3>
			<p class="line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
		</div>

		<div class="flex gap-4 text-sm text-muted-foreground">
			<div class="flex items-center gap-1">
				<Clock class="size-4" />
				<span>{recipe.prepTime}m prep</span>
			</div>
			<div class="flex items-center gap-1">
				<ChefHat class="size-4" />
				<span>{recipe.cookTime}m cook</span>
			</div>
		</div>
	</CardContent>
</Card>
