import { sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { getLocale } from '$lib/paraglide/runtime.js';

/**
 * Selects the visitor's language for a translated column pair.
 *
 * Amharic visitors get the `*_am` column, falling back to the English one when
 * it was left empty — the translations are optional, so a half-translated
 * catalogue still shows every product. Everyone else gets the English column
 * untouched.
 *
 * Reads the locale from the request, so it must be called inside a load or an
 * action, never at module level.
 */
export function localized(en: AnyColumn, am: AnyColumn): SQL<string> {
	return pick(en, am);
}

/**
 * `localized` for a column that can be NULL — nullable itself, or on the far
 * side of a left join.
 *
 * Two functions rather than one generic: inside `.select({ … })` TypeScript
 * infers a generic's type from drizzle's selection constraint, so every field
 * came out `string | null` whatever was asked for.
 */
export function localizedOrNull(en: AnyColumn, am: AnyColumn): SQL<string | null> {
	return pick(en, am);
}

function pick<T>(en: AnyColumn, am: AnyColumn): SQL<T> {
	if (getLocale() !== 'am') return sql<T>`${en}`;
	return sql<T>`coalesce(nullif(trim(${am}), ''), ${en})`;
}

/**
 * A translation field as it should be stored: trimmed, and NULL when left blank
 * so `localized` falls back to the English text instead of showing nothing.
 */
export const translation = (value: string | null | undefined) => value?.trim() || null;
