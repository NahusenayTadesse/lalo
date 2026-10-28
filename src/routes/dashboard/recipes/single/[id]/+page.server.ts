import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { edit } from './schema';

import { db } from '$lib/server/db';
import { user, recipeIngredients, recipes } from '$lib/server/db/schema';

import { eq, and, sql, isNotNull, desc } from 'drizzle-orm';
import { fail, message } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';

import { saveUploadedFile } from '$lib/server/upload';
import type { Actions } from './$types';

export const actions: Actions = {
	edit: async ({ request, cookies, locals, params }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(edit));

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

				if (image) {
					const featuredImage = await saveUploadedFile(image);

					await tx
						.update(recipes)
						.set({
							title,
							cookTime,
							prepTime,
							description,
							instructions,
							featuredImage
						})
						.where(eq(recipes.id, Number(id)));
				} else {
					await tx
						.update(recipes)
						.set({
							title,
							cookTime,
							prepTime,
							description,
							instructions
						})
						.where(eq(recipes.id, Number(id)));
				}

				// Replace the ingredient list. The delete runs even when the new list is
				// empty — it used to be skipped, so clearing every ingredient kept them all.
				await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, Number(id)));
				if (ingredients.length > 0) {
					await tx.insert(recipeIngredients).values(
						ingredients.map((item) => ({
							recipeId: Number(id),
							name: item.ingredient,
							amount: item.amount
						}))
					);
				}

				// Return the ID or the full object if needed
			});

			// Stay on the same page and set a flash message
			setFlash({ type: 'success', message: 'Recipe Successfully Updated' }, cookies);

			return message(form, { type: 'success', text: 'Recipe Successfully Updated' });
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
