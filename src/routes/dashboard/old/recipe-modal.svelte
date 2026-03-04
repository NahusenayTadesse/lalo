<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription
	} from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Clock, ChefHat } from '@lucide/svelte';
	import type { Recipe, Ingredient } from '$lib/data/recipes';

	let { open = $bindable(false), recipe, ingredients }: Props = $props();

	type Props = {
		open?: boolean;
		recipe: Recipe | null;
		ingredients: Ingredient[];
	};
</script>

{#if recipe}
	<Dialog bind:open>
		<DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-2xl">{recipe.title}</DialogTitle>
				<DialogDescription>{recipe.description}</DialogDescription>
			</DialogHeader>

			<div class="flex flex-col gap-6">
				<!-- Image -->
				<div class="relative h-64 overflow-hidden rounded-lg bg-muted">
					<img src={recipe.image} alt={recipe.title} class="h-full w-full object-cover" />
					{#if recipe.status}
						<Badge class="absolute top-3 right-3 bg-primary text-primary-foreground">Active</Badge>
					{/if}
				</div>

				<!-- Time Info -->
				<div class="flex gap-6">
					<div class="flex items-center gap-2">
						<Clock class="size-5 text-primary" />
						<div class="flex flex-col">
							<span class="text-sm font-medium text-muted-foreground">Prep Time</span>
							<span class="text-lg font-semibold">{recipe.prepTime} minutes</span>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<ChefHat class="size-5 text-primary" />
						<div class="flex flex-col">
							<span class="text-sm font-medium text-muted-foreground">Cook Time</span>
							<span class="text-lg font-semibold">{recipe.cookTime} minutes</span>
						</div>
					</div>
				</div>

				<Separator />

				<!-- Ingredients -->
				<div class="flex flex-col gap-3">
					<h3 class="text-lg font-semibold">Ingredients</h3>
					<ul class="flex flex-col gap-2">
						{#each ingredients as ingredient (ingredient.id)}
							<li class="flex items-center justify-between rounded-lg bg-muted/50 p-3">
								<span class="font-medium">{ingredient.ingredient}</span>
								<Badge variant="outline">{ingredient.amount}</Badge>
							</li>
						{/each}
					</ul>
				</div>

				<Separator />

				<!-- Instructions -->
				<div class="flex flex-col gap-3">
					<h3 class="text-lg font-semibold">Instructions</h3>
					<div
						class="flex flex-col gap-2 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground"
					>
						{recipe.instructions}
					</div>
				</div>
			</div>
		</DialogContent>
	</Dialog>
{/if}
