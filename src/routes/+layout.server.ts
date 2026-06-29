import { db } from '$lib/server/db';
import { user, roles, gallery, catalogManual, freeDelivery } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
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

	// 1. Fetch the role name if a user exists
	if (currentUser) {
		const roleData = await db
			.select({ name: roles.name })
			.from(user)
			.leftJoin(roles, eq(user.roleId, roles.id))
			.where(eq(user.id, currentUser.id))
			.then((rows) => rows[0]);

		roleName = roleData?.name ?? '';
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
