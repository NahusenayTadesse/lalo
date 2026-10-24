import { createAccess } from '@nahu/admin-kit/access';

/**
 * The dashboard is for admins only, so one rule covers all of it. The hook grants the Admin role
 * super-admin, which holds every permission named here; any other signed-in user is refused.
 */
export const ADMIN_PERMISSION = 'dashboard.admin';

export const access = createAccess({
	root: '/dashboard',
	rules: [{ prefix: '/dashboard', permission: ADMIN_PERMISSION }]
});
