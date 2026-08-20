import { z } from 'zod/v4';

/**
 * Ethiopian phone numbers, in every shape a customer actually types them.
 *
 * The national significant number is always nine digits. Mobiles start with 9
 * (Ethio Telecom) or 7 (Safaricom Ethiopia); landlines start with the area code,
 * whose first digit is 1–5 — `11` Addis Ababa, `22` Adama/Dire Dawa, `25` Bahir
 * Dar, `33`/`34` the north-east, `46`/`47` the south, `57`/`58` the north-west.
 * The unassigned leading digits `0`, `6` and `8` are the ones this rejects.
 *
 * In front of the nine digits people write the trunk prefix `0`, the country
 * code `251`, or `+251`, so all four forms below are the same number and all
 * four are accepted:
 *
 *   +251912345678   251912345678   0912345678   912345678
 *
 * The same four forms work for a landline: `0111234567`, `+251111234567`, and
 * so on.
 */
export const ETHIOPIAN_PHONE_REGEX = /^(?:\+251|251|0)?([1-579]\d{8})$/;

/** Anything a human might use as a separator, and which carries no meaning. */
const SEPARATORS = /[\s()./-]/g;

/**
 * Returns the number in canonical `+251XXXXXXXXX` form, or `undefined` when it
 * is not a valid Ethiopian number. Separators are stripped first, so
 * `0912 345 678` and `+251-91-234-5678` both pass.
 */
export function normalizeEthiopianPhone(value: string | null | undefined): string | undefined {
	if (!value) return undefined;
	const match = value.replace(SEPARATORS, '').match(ETHIOPIAN_PHONE_REGEX);
	return match ? `+251${match[1]}` : undefined;
}

/** Convenience predicate for the places that only need a yes/no. */
export function isEthiopianPhone(value: string | null | undefined): boolean {
	return normalizeEthiopianPhone(value) !== undefined;
}

export const INVALID_PHONE_MESSAGE =
	'Enter a valid Ethiopian phone number, e.g. 0912345678 or 0111234567';

/**
 * A required Ethiopian phone field.
 *
 * Validation only — deliberately no `.transform()`. A transform makes the
 * field's *output* type unrepresentable in JSON Schema, and superforms builds
 * its form defaults and its FormData parser from that schema: the field comes
 * back as `{}` with no type, so it loses its `''` default. Normalising is the
 * action's job instead — call `normalizeEthiopianPhone` there before storing.
 */
export function ethiopianPhone(message: string = INVALID_PHONE_MESSAGE) {
	return z.string(message).trim().refine(isEthiopianPhone, message);
}
