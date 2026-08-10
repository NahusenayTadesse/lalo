import { db } from '$lib/server/db';
import { gallery, catalogManual, freeDelivery } from '$lib/server/db/schema';
import { getRoleName } from '$lib/server/authz';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const currentUser = locals?.user;
	let roleName = ''; // Initialize with a default value

	const images = await db.select().from(gallery);

	const imagesList = images.map((img) => img.imageUrl);

	const files = await db
		.select()
		.from(catalogManual)
		.limit(1)
		.then((rows) => rows[0]);

	// 1. Fetch the role name if a user exists. On `/dashboard` the hook has already
	// resolved it, so reuse that rather than repeating the join on every request.
	if (currentUser) {
		roleName = locals.roleName ?? (await getRoleName(currentUser.id));
	}


	const [freeData] = await db
		.select({
			threshold: freeDelivery.threshold,
			suggestionThreshold: freeDelivery.suggestionThreshold
		})
		.from(freeDelivery)
		.limit(1);
	return {
		roleName,
		user: currentUser,
		imagesList,
		files,
		freeData
	};
};
