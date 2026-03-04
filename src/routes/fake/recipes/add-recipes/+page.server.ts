import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { add } from './schema';
import { db } from '$lib/server/db';
import { recipeIngredients, recipes } from '$lib/server/db/schema';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types.js';
import { setFlash } from 'sveltekit-flash-message/server';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));

	return {
		form
	};
};

import { saveUploadedFile } from '$lib/server/upload.js';

export const actions: Actions = {
	add: async ({ request, cookies, locals }) => {
		const form = await superValidate(request, zod4(add));
		console.log(form);

		if (!form.valid) {
			// Stay on the same page and set a flash message
			setFlash({ type: 'error', message: 'Please check your form data.' }, cookies);
			return message(form, { type: 'error', text: 'Please check your form data.' });
		}

		const { title, cookTime, prepTime, description, ingredients, instructions, image } = form.data;

		try {
			await db.transaction(async (tx) => {
				// 1. Upload images first (usually done before the DB transaction starts
				// to avoid keeping a DB connection open during slow network I/O)
				const featuredImage = await saveUploadedFile(image);

				// 2. Insert the main product
				const [recipe] = await tx
					.insert(recipes)
					.values({
						title,
						cookTime,
						prepTime,
						description,
						instructions,
						featuredImage
					})
					.$returningId();

				const newRecipeId = recipe.id;

				// 3. Prepare and insert the gallery images
				if (ingredients.length > 0) {
					const imageRecords = ingredients.map((url) => ({
						recipeId: newRecipeId,
						name: url.ingredient,
						amount: url.amount
					}));

					await tx.insert(recipeIngredients).values(imageRecords);
				}

				// Return the ID or the full object if needed
				return newRecipeId;
			});

			// Stay on the same page and set a flash message
			setFlash({ type: 'success', message: 'New Recipe Successuflly Added' }, cookies);

			return message(form, { type: 'success', text: 'New Recipe Successfully Added' });
		} catch (err) {
			console.error(err);
			setFlash(
				{ type: 'error', message: 'An error occurred while adding the recipe.' + err?.message },
				cookies
			);

			return message(
				form,
				{
					type: 'error',
					text: 'An error occurred while adding the product.' + err?.message
				},
				{ status: 500 }
			);
		}
	}
};
