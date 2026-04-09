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

<svelte:head>
	<title>Recipes & Applications | Lalo Bakery Solutions</title>
	<meta
		name="description"
		content="Expert-crafted recipes and technical guides using Lalo ingredients. Support your creation of products that meet market demands and stand out for excellence."
	/>
	<meta
		name="keywords"
		content="professional bakery recipes, industrial baking guides, technical baking support, commercial bread formulas"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:title" content="Lalo Bakery Solutions | Technical Support & Recipes" />
	<meta
		property="og:description"
		content="Master your production with our industry-tested formulas and specialty product applications."
	/>
	<meta property="og:image" content="/bakery (13).webp" />

	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content="Professional Baking Formulas | Lalo Bakery Solutions" />
	<meta property="twitter:image" content="/bakery (13).webp" />
</svelte:head>

<div class="min-h-dvh bg-background text-foreground transition-colors duration-300">
	<section
		class="relative flex h-96 flex-col items-center justify-center overflow-hidden border-b bg-contain bg-center px-6 py-20 lg:px-8"
		style="background-image: url('/bakery (13).webp')"
	>
		<div class="backdrop-blur-xm absolute inset-0 bg-black/40"></div>

		<div class="relative mx-auto max-w-4xl text-center">
			<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight text-white lg:text-5xl">
				Recipes
			</h1>
			<p class="mt-6 text-2xl leading-8 font-bold text-gray-100 text-shadow-sm">
				Browse our collection of delicious recipes
			</p>
		</div>
	</section>
	<!-- Header -->

	<!-- Main Content -->
	<main class="mx-auto my-4 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Search Section -->
		<div class="mb-8 flex flex-col gap-4">
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
