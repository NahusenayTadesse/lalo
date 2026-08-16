// Single source of truth for the signup shape, so the checkout page's signup
// dialog validates against exactly what this route's action does.
export { addUser as add } from '$lib/ZodSchema';
