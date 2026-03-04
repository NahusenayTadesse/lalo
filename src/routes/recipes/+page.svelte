<script lang="ts">
	import RecipeCard from './recipe-card.svelte';
	import RecipeModal from './recipe-modal.svelte';
	import { Input } from '$lib/components/ui/input';
	import { ChefHat, SearchIcon } from '@lucide/svelte';

	type Recipe = {
		id: string;
		title: string;
		description: string;
		instructions: string;
		prepTime: number;
		cookTime: number;
		image: string;
		status: boolean;
	};
	let { data } = $props();
	// State
	let searchQuery = $state('');
	let selectedRecipe: Recipe | null = $state(null);
	let modalOpen = $state(false);

	// Derived
	const filteredRecipes = $derived(
		data?.recipeList.filter(
			(recipe) =>
				recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				recipe.description.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	const selectedRecipeIngredients = $derived(
		selectedRecipe ? data?.ingList.filter((ing) => ing.recipeId === selectedRecipe.id) : []
	);

	// Handlers
	const openRecipe = (recipe: Recipe) => {
		selectedRecipe = recipe;
		modalOpen = true;
	};
</script>

<div class="min-h-dvh bg-background text-foreground transition-colors duration-300">
	<!-- Header -->
	<header class="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
		<div
			class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"
		>
			<div class="flex items-center gap-2">
				<div class="rounded-lg bg-primary p-2">
					<ChefHat class="size-6 text-primary-foreground" />
				</div>
				<h1 class="text-2xl font-bold">RecipeHub</h1>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Search Section -->
		<div class="mb-8 flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<h2 class="text-3xl font-bold">Discover Recipes</h2>
				<p class="text-muted-foreground">Browse our collection of delicious recipes</p>
			</div>
			<div class="relative">
				<SearchIcon class="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
				<Input type="text" placeholder="Search recipes..." bind:value={searchQuery} class="pl-10" />
			</div>
		</div>

		<!-- Recipes Grid -->
		{#if filteredRecipes.length > 0}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredRecipes as recipe (recipe.id)}
					<RecipeCard {recipe} onclick={() => openRecipe(recipe)} />
				{/each}
			</div>
		{:else}
			<div
				class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 py-12"
			>
				<ChefHat class="size-12 text-muted-foreground" />
				<div class="flex flex-col items-center gap-2 text-center">
					<h3 class="text-lg font-semibold">No recipes found</h3>
					<p class="text-sm text-muted-foreground">Try adjusting your search query</p>
				</div>
			</div>
		{/if}
	</main>

	<!-- Recipe Modal -->
	<RecipeModal
		bind:open={modalOpen}
		recipe={selectedRecipe}
		ingredients={selectedRecipeIngredients}
	/>
</div>
