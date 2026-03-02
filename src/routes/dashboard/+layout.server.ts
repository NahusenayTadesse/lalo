import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const name = locals?.user?.name;

	return {
		name
	};
};
