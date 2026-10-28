import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		// Poll for new deploys so the "new version available" toast (root layout) can fire.
		version: { pollInterval: 5 * 60 * 1000 }
	}
};

export default config;
