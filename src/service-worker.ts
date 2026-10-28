/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

/**
 * Offline support for the installed app. SvelteKit registers this file itself.
 *
 * - The app's built JS/CSS and the shell's static assets are precached per version.
 * - Public pages are network-first, saved as they're visited, so a customer who lost
 *   signal still sees the shop they last browsed; anything else falls back to
 *   /offline.html. Signed-in pages (orders, account, dashboard) are never cached, so a
 *   shared phone doesn't hand one customer's orders to the next.
 * - Uploaded product photos (/files/…) are stale-while-revalidate; other static
 *   images are cache-first.
 */
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const SHELL = `shell-${version}`;
const PAGES = 'pages-v1';
const MEDIA = 'media-v1';
const OFFLINE_URL = '/offline.html';

/** Small enough to fetch on install; the bakery photos are cached when first seen. */
const SHELL_FILES = files.filter(
	(f) => !/\.(webp|jpe?g|gz)$/i.test(f) || f === '/logo.webp' || f === '/logoWhite.webp'
);
const PRECACHE = [...build, ...SHELL_FILES];
const PRECACHED = new Set(PRECACHE);

const PUBLIC_PAGES = /^\/(shop(\/.*)?|recipes|about-us|contact-us)?\/?$/;

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(SHELL)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key.startsWith('shell-') && key !== SHELL) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	if (request.mode === 'navigate') {
		event.respondWith(page(request, url));
		return;
	}

	if (PRECACHED.has(url.pathname)) {
		event.respondWith(cacheFirst(request, SHELL));
		return;
	}

	if (url.pathname.startsWith('/files/')) {
		event.respondWith(staleWhileRevalidate(request, MEDIA));
		return;
	}

	if (/\.(webp|png|jpe?g|svg|ico|woff2?)$/i.test(url.pathname)) {
		event.respondWith(cacheFirst(request, MEDIA));
	}
	// Everything else (__data.json, endpoints, auth) goes straight to the network.
});

async function page(request: Request, url: URL): Promise<Response> {
	const cacheable = PUBLIC_PAGES.test(url.pathname);
	try {
		const response = await fetch(request);
		if (cacheable && response.ok && response.type === 'basic') {
			const cache = await caches.open(PAGES);
			await cache.put(url.pathname, response.clone());
		}
		return response;
	} catch {
		const cached = cacheable ? await caches.match(url.pathname, { cacheName: PAGES }) : undefined;
		return cached ?? (await caches.match(OFFLINE_URL)) ?? Response.error();
	}
}

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok) cache.put(request, response.clone());
	return response;
}

async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	const network = fetch(request)
		.then((response) => {
			if (response.ok) cache.put(request, response.clone());
			return response;
		})
		.catch(() => cached ?? Response.error());
	return cached ?? network;
}
