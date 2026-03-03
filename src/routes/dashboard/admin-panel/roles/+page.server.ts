import { db } from '$lib/server/db';
import { eq, count, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { user, roles } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const roleList = await db
		.select({
			id: roles.id,
			name: roles.name,
			description: roles.description,
			userCount: count(user.id),
			status: roles.isActive
		})
		.from(roles)
		.leftJoin(user, eq(user.roleId, roles.id))
		.groupBy(roles.id);

	return {
		roleList
	};
};
