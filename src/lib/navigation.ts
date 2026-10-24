import {
	Banknote,
	BookDown,
	Building2,
	ChartArea,
	Container,
	CookingPot,
	LayoutDashboard,
	ListOrdered,
	Mail,
	MapPin,
	Plus,
	Sheet,
	Star,
	UserRoundCog,
	Users
} from '@lucide/svelte';
import type { NavItem, SearchEntry } from '@nahu/admin-kit/navigation';

/** The sidebar and the search palette. */
export const NAVIGATION: NavItem[] = [
	{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
	{ title: 'Customers', url: '/dashboard/customers', icon: Users },
	{ title: 'Orders', url: '/dashboard/orders', icon: ListOrdered },
	{
		title: 'Products',
		url: '/dashboard/products',
		icon: Container,
		items: [
			{ title: 'All Products', url: '/dashboard/products', icon: Sheet },
			{ title: 'Add Product', url: '/dashboard/products/add-products', icon: Plus },
			{ title: 'Suppliers', url: '/dashboard/products/suppliers', icon: Sheet },
			{ title: 'Add Supplier', url: '/dashboard/products/suppliers/add-suppliers', icon: Plus }
		]
	},
	{
		title: 'Recipes',
		url: '/dashboard/recipes',
		icon: CookingPot,
		items: [
			{ title: 'All Recipes', url: '/dashboard/recipes', icon: Sheet },
			{ title: 'Add Recipe', url: '/dashboard/recipes/add-recipes', icon: Plus }
		]
	},
	{ title: 'Delivery Address', url: '/dashboard/delivery-address', icon: MapPin },
	{ title: 'Messages', url: '/dashboard/messages', icon: Mail },
	{ title: 'Testimonials', url: '/dashboard/testimonials', icon: Star },
	{ title: 'Partner Logos', url: '/dashboard/logos', icon: Building2 },
	{ title: 'Catalog & Manual', url: '/dashboard/catalog', icon: BookDown },
	{ title: 'Reports', url: '/dashboard/reports', icon: ChartArea },
	{
		title: 'Admin Panel',
		url: '/dashboard/admin-panel',
		icon: UserRoundCog,
		items: [
			{ title: 'Payment Methods', url: '/dashboard/admin-panel/payment-methods', icon: Banknote },
			{ title: 'Users', url: '/dashboard/admin-panel/users', icon: Users },
			{ title: 'Roles', url: '/dashboard/admin-panel/roles', icon: Users }
		]
	}
];

/** Pages the search palette offers that the sidebar leaves out. */
export const SEARCH_EXTRA: SearchEntry[] = [
	{ label: 'Product Categories', url: '/dashboard/products/categories' },
	{ label: 'Inactive Products', url: '/dashboard/products/inactive' },
	{ label: 'Add Roles', url: '/dashboard/admin-panel/roles/add-roles' },
	{ label: 'Add Users', url: '/dashboard/admin-panel/users/add-users' }
];

/** Where each kind of record's page lives, so table cells can link to it. */
export const ENTITIES: Record<string, string> = {
	customer: '/dashboard/customers',
	product: '/dashboard/products/single',
	supplier: '/dashboard/products/suppliers',
	user: '/dashboard/admin-panel/users',
	role: '/dashboard/admin-panel/roles'
};
