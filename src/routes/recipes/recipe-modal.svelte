<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription
	} from '@nahu/admin-kit/components/ui/dialog/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { Separator } from '@nahu/admin-kit/components/ui/separator/index.js';
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
					<img
						src="/files/{recipe.image}"
						loading="lazy"
						alt={recipe.title}
						class="h-full w-full object-cover"
					/>
				</div>

				<!-- Time Info -->
				<div class="flex gap-6">
					<div class="flex items-center gap-2">
						<Clock class="size-5 text-primary" />
						<div class="flex flex-col">
							<span class="text-sm font-medium text-muted-foreground">{m.recipes_prep_time()}</span>
							<span class="text-lg font-semibold">{m.recipes_minutes({ minutes: recipe.prepTime })}</span>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<ChefHat class="size-5 text-primary" />
						<div class="flex flex-col">
							<span class="text-sm font-medium text-muted-foreground">{m.recipes_cook_time()}</span>
							<span class="text-lg font-semibold">{m.recipes_minutes({ minutes: recipe.cookTime })}</span>
						</div>
					</div>
				</div>

				<Separator />

				<!-- Ingredients -->
				<div class="flex flex-col gap-3">
					<h3 class="text-lg font-semibold">{m.recipes_ingredients()}</h3>
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
					<h3 class="text-lg font-semibold">{m.recipes_instructions()}</h3>
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
