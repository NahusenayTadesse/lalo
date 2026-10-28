import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { customers, orders, transactions } from '$lib/server/db/schema';
import { ADMIN_ROLE, getRoleName } from '$lib/server/authz';
import { FILES_DIR } from '$lib/server/upload';

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

/**
 * Whether the caller may see `name`, and whether it is private.
 *
 * Product images, logos and the catalogue are public. Payment receipts are not:
 * they are bank-transfer screenshots with names and account numbers, and a leaked
 * link used to work for anyone, forever. A receipt is shown only to an admin, or to
 * the signed-in customer whose order it belongs to. Stock-adjustment receipts
 * have no order, so they are admin-only.
 */
async function checkAccess(name: string, locals: App.Locals) {
	const receipt = await db
		.select({ ownerUserId: customers.userId })
		.from(transactions)
		.leftJoin(orders, eq(orders.transactionId, transactions.id))
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.where(eq(transactions.recieptLink, name))
		.limit(1)
		.then((rows) => rows[0]);

	if (!receipt) return { allowed: true, isPrivate: false };
	if (!locals.user) return { allowed: false, isPrivate: true };
	if (receipt.ownerUserId && receipt.ownerUserId === locals.user.id) {
		return { allowed: true, isPrivate: true };
	}

	const roleName = locals.roleName ?? (await getRoleName(locals.user.id));
	return { allowed: roleName === ADMIN_ROLE, isPrivate: true };
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, request, locals }) {
	const file_path = path.resolve(FILES_ROOT, params.name);

	// Same 404 as a missing file, so the response can't be used to probe for
	// paths outside the directory.
	if (!isInsideFilesDir(file_path)) {
		return new Response('not found', { status: 404 });
	}

	if (!fs.existsSync(file_path) || !fs.statSync(file_path).isFile()) {
		return new Response('not found', { status: 404 });
	}

	// Same 404 as a missing file, so receipt names can't be confirmed by probing.
	const access = await checkAccess(params.name, locals);
	if (!access.allowed) {
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
		// A receipt must not sit in a shared cache where the next visitor gets it.
		'Cache-Control': access.isPrivate ? 'private, no-store' : 'max-age=600',
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
