import { db } from '$lib/server/db';
import { recipes, recipeIngredients } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async () => {
	const recipeList = await db
		.select({
			id: recipes.id,
			title: recipes.title,
			description: recipes.description,
			instructions: recipes.instructions,
			prepTime: recipes.prepTime,
			cookTime: recipes.cookTime,
			image: recipes.featuredImage,
			status: recipes.isActive
		})
		.from(recipes);

	const ingList = await db
		.select({
			id: recipeIngredients.id,
			recipeId: recipeIngredients.recipeId,
			ingredient: recipeIngredients.name,
			amount: recipeIngredients.amount
		})
		.from(recipeIngredients);

	return {
		ingList,
		recipeList
	};
};
