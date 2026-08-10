import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';

const FILES_DIR = env.FILES_DIR ?? '.temp-files';

/** Absolute path of the directory files may be served from. */
const FILES_ROOT = path.resolve(FILES_DIR);

if (!fs.existsSync(FILES_ROOT)) {
	fs.mkdirSync(FILES_ROOT, { recursive: true });
}

/**
 * Whether `candidate` sits inside `FILES_ROOT`.
 *
 * SvelteKit URL-decodes route params, so `%2F` arrives as a real `/` and
 * `params.name` can contain `../` segments. Resolving and then asserting
 * containment is what stops `/files/..%2F.env` from serving the env file.
 *
 * @param candidate absolute, already-resolved path
 */
function isInsideFilesDir(candidate: string) {
	return candidate === FILES_ROOT || candidate.startsWith(FILES_ROOT + path.sep);
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, request }) {
	const file_path = path.resolve(FILES_ROOT, params.name);

	// Same 404 as a missing file, so the response can't be used to probe for
	// paths outside the directory.
	if (!isInsideFilesDir(file_path)) {
		return new Response('not found', { status: 404 });
	}

	if (!fs.existsSync(file_path) || !fs.statSync(file_path).isFile()) {
		return new Response('not found', { status: 404 });
	}

	const stats = fs.statSync(file_path);
	const etag = `W/"${stats.size}-${stats.mtime.getTime()}"`;

	if (request.headers.get('if-none-match') === etag) {
		return new Response(null, { status: 304 });
	}

	const headers = {
		ETag: etag,
		'Content-Type': mimes.lookup(file_path),
		'Content-Length': stats.size,
		'Cache-Control': 'max-age=600',
		'Last-Modified': stats.mtime.toUTCString()
	};

	const nodejs_rstream = fs.createReadStream(file_path);

	const web_rstream = Readable.toWeb(nodejs_rstream, {
		// See: https://github.com/nodejs/node/issues/46347#issuecomment-1416310527
		strategy: new CountQueuingStrategy({ highWaterMark: 100 })
	});

	return new Response(web_rstream, { headers });
}

const mimes = {
	// Text
	txt: 'text/plain',
	pdf: 'application/pdf',
	// Images
	webp: 'image/webp',
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	avif: 'image/avif',
	// Audio
	mp3: 'audio/mp3',
	// Video
	webm: 'video/webm',
	mp4: 'video/mp4',

	/** @param {string} string */
	lookup(string) {
		const ext = string.toLowerCase().split('.').at(-1);
		return (ext && this[/** @type {keyof typeof mimes} */ ext]) ?? 'application/octet-stream';
	}
};
