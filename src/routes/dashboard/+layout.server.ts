import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ locals, parent }) => {
	if (locals.user) {
		const roleName = (await parent()).roleName;
		if (roleName !== 'Admin') {
			return error(404, 'Not Allowed');
		}
	} else {
		return redirect(302, '/login');
	}

	const name = locals?.user?.name;

	return {
		name
	};
};
