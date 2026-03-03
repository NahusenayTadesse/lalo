import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCurrentMonthRange } from '$lib/global.svelte';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;
	redirect(303, `/dashboard/products/${id}/damaged/${getCurrentMonthRange()}`);
};
