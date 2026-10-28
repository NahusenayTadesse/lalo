<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import RecipeCard from './recipe-card.svelte';
	import RecipeModal from './recipe-modal.svelte';
	import { Input } from '@nahu/admin-kit/components/ui/input/index.js';
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
	<title>{m.recipes_meta_title()}</title>
	<meta
		name="description"
		content={m.recipes_meta_description()}
	/>
	<meta
		name="keywords"
		content="professional bakery recipes, industrial baking guides, technical baking support, commercial bread formulas"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:title" content={m.recipes_og_title()} />
	<meta
		property="og:description"
		content={m.recipes_og_description()}
	/>
	<meta property="og:image" content="/bakery (13).webp" />

	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content={m.recipes_twitter_title()} />
	<meta property="twitter:image" content="/bakery (13).webp" />
</svelte:head>

<div class="min-h-dvh bg-background text-foreground transition-colors duration-300">
	<section
		class="relative isolate flex h-96 flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 py-20 lg:px-8"
	>
		<div
			class="absolute inset-0 -z-10 animate-ken-burns bg-cover bg-center"
			style="background-image: url('/bakery (13).webp'); animation-duration: 12s"
		></div>
		<div class="absolute inset-0 -z-10 bg-linear-to-t from-black/75 via-black/40 to-black/30"></div>

		<div data-reveal="scale" class="glass-dark relative mx-auto max-w-4xl rounded-3xl px-8 py-10 text-center">
			<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight text-white lg:text-5xl">
				{m.nav_recipes()}

			</h1>
			<p class="mt-6 text-2xl leading-8 font-bold text-gray-100 text-shadow-sm">
				{m.recipes_subtitle()}
			</p>
		</div>
	</section>
	<!-- Header -->

	<!-- Main Content -->
	<main class="mx-auto my-4 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Search Section -->
		<div class="mb-8 flex flex-col gap-4">
			<div class="relative">
				<SearchIcon class="absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					placeholder={m.recipes_search_placeholder()}
					bind:value={searchQuery}
					class="glass h-12 rounded-2xl pl-12"
				/>
			</div>
		</div>

		<!-- Recipes Grid -->
		{#if filteredRecipes.length > 0}
			<div data-reveal-stagger class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
					<h3 class="text-lg font-semibold">{m.recipes_none()}</h3>
					<p class="text-sm text-muted-foreground">{m.recipes_none_hint()}</p>
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
