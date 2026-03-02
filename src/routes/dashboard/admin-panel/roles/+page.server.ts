import { db } from '$lib/server/db';
import { eq, countDistinct, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { user, roles } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const roleList = await db
		.select({
			id: roles.id,
			name: roles.name,
			description: roles.description,
			userCount: countDistinct(user.id),
			status: roles.isActive
		})
		.from(roles)
		.leftJoin(
			user,

			eq(user.roleId, roles.id)
		);

	return {
		roleList
	};
};
