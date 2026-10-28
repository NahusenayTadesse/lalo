import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, '/login');
	}

	// This layout used to also return the shop-wide pending-order and unread-message
	// counts (copied from the dashboard layout), which sent business figures to every
	// signed-in customer. Nothing under /account displayed them.
	return {
		name: locals.user.name
	};
};
