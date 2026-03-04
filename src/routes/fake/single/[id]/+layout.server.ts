import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { edit, adjust, damaged, editGallery } from './schema';

import { db } from '$lib/server/db';
import { user, recipeIngredients, recipes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	const { id } = params;
	const form = await superValidate(zod4(edit));

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
		.from(recipes)
		.where(eq(recipes.id, Number(id)))
		.then((rows) => rows[0]);

	const ingList = await db
		.select({
			ingredient: recipeIngredients.name,
			amount: recipeIngredients.amount
		})
		.from(recipeIngredients)
		.where(eq(recipeIngredients.recipeId, Number(id)));

	return {
		form,
		recipe: recipeList,
		ingList
	};
};
