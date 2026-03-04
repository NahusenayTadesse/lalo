// import type { LayoutServerLoad } from '../$types';
// import { error } from '@sveltejs/kit';

// export const load: LayoutServerLoad = async ({ parent }) => {
// 	const layoutData = await parent();
// 	const permList = layoutData?.permList;
// 	const perm = 'view:products';

// 	const hasPerm = permList?.some((p) => p.name === perm);

// 	if (!hasPerm) {
// 		error(
// 			403,
// 			'Not Allowed! You do not have permission to see products. <br /> Talk to an admin to change it.'
// 		);
// 	}
// };
