/**
 * A fixed-window, in-memory rate limiter.
 *
 * Good enough for one Node process (this app runs on adapter-node): it stops a
 * script hammering a public form, which is the job here. It resets on restart and
 * isn't shared across instances — put a real store behind it if the app is ever
 * scaled out.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
	const hits = new Map<string, { count: number; resetAt: number }>();

	return {
		/** Records a hit for `key`; returns `false` once `key` is over the limit. */
		allow(key: string) {
			const now = Date.now();

			// Drop expired windows as we go so the map can't grow without bound.
			if (hits.size > 10_000) {
				for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
			}

			const entry = hits.get(key);
			if (!entry || entry.resetAt <= now) {
				hits.set(key, { count: 1, resetAt: now + windowMs });
				return true;
			}

			entry.count += 1;
			return entry.count <= limit;
		}
	};
}
