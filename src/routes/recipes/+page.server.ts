import { localized, localizedOrNull } from '$lib/server/localize';
import { db } from '$lib/server/db';
import { recipes, recipeIngredients } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async () => {
	const recipeList = await db
		.select({
			id: recipes.id,
			title: localized(recipes.title, recipes.titleAm),
			description: localizedOrNull(recipes.description, recipes.descriptionAm),
			instructions: localized(recipes.instructions, recipes.instructionsAm),
			prepTime: recipes.prepTime,
			cookTime: recipes.cookTime,
			image: recipes.featuredImage,
			status: recipes.isActive
		})
		.from(recipes)
		.where(eq(recipes.isActive, true));

	const ingList = await db
		.select({
			id: recipeIngredients.id,
			recipeId: recipeIngredients.recipeId,
			ingredient: localized(recipeIngredients.name, recipeIngredients.nameAm),
			amount: localizedOrNull(recipeIngredients.amount, recipeIngredients.amountAm)
		})
		.from(recipeIngredients);

	return {
		ingList,
		recipeList
	};
};
