import { setError, superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { and, asc, eq, getTableName } from 'drizzle-orm';
import { z } from 'zod/v4';
import type { RequestEvent, ServerLoadEvent } from '@sveltejs/kit';
import type { MySqlTable } from 'drizzle-orm/mysql-core';
import { db } from '$lib/server/db';
import { saveUploadedFile } from '$lib/server/upload';

/**
 * Every content table (see schema.ts) is keyed by an `int` autoincrement id.
 * Form values always arrive as strings, so the schema only checks shape —
 * `toId` below converts back to a number before it touches a query.
 */
export const idSchema = z.object({ id: z.coerce.string().min(1) });

/** Reused by every content form: an integer that decides display order. */
export const sortOrderField = z.coerce.number().int().min(0).default(0);

/**
 * MySQL reports a unique-constraint violation as
 * `Duplicate entry '...' for key '<table>.<index>'` (or just `'<index>'` pre-8.0). Drizzle
 * names every unique constraint `<table>_<column>_unique` (see drizzle/*.sql), so the
 * offending column can be recovered from the error without any per-table config. Shared by
 * `contentCrud()` and any hand-written action that wants the same field-level duplicate error.
 */
export function duplicateField(err: unknown, table: MySqlTable): string | undefined {
	if ((err as { code?: string })?.code !== 'ER_DUP_ENTRY') return undefined;
	const match = /for key '(?:.*\.)?(.+)'/.exec((err as { sqlMessage?: string }).sqlMessage ?? '');
	if (!match) return undefined;
	const prefix = `${getTableName(table)}_`;
	const key = match[1].startsWith(prefix) ? match[1].slice(prefix.length) : match[1];
	return key.replace(/_unique$/, '').replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** A content table, plus index access to its columns for the generic helpers. */
type AnyTable = MySqlTable & Record<string, any>;
type AnySchema = z.ZodType<any, any>;
/** Validated form data always carries the row's own columns, and an id on edit. */
type FormData = Record<string, any> & { id: string };

interface CrudOptions<T extends AnyTable, A extends AnySchema, E extends AnySchema> {
	/** The Drizzle table being managed. */
	table: T;
	/** Singular, human-readable name used in toast messages, e.g. "Farm". */
	label: string;
	addSchema: A;
	editSchema: E;
	/** Fields holding an uploaded File; saved to disk and stored as a filename. */
	fileFields?: string[];
	/** Fields entered as one-per-line text and stored as a JSON string array. */
	listFields?: string[];
	/**
	 * `decimal` columns — mysql2 hands these back as strings and expects
	 * strings on the way in; a JS number silently loses precision. Zod
	 * coerces these to numbers for validation, so they're converted back with
	 * `String(...)` before the row is written.
	 */
	decimalFields?: string[];
	/**
	 * Scopes every row to its owner — e.g. a vendor only ever seeing and
	 * editing their own services. `field` is the column name on `table`
	 * (`vendorId`); `resolve` reads the owner's id from `locals` at request
	 * time, since it depends on who's signed in and can't be baked in when
	 * `contentCrud()` is called at module scope. Without this, `edit`/`delete`
	 * only check the row's `id` — anyone signed in could act on any row by
	 * guessing its id.
	 */
	scope?: {
		field: string;
		/** Async because resolving an owner id (e.g. `requireVendor`) usually means a query. */
		resolve: (locals: App.Locals) => number | string | Promise<number | string>;
	};
}

/**
 * Builds the `load` and `actions` for a content table's dashboard page.
 *
 * Every content page needs the same three forms and the same add/edit/delete
 * round trip, so the only thing a route has to supply is its schemas and the
 * handful of fields that need special treatment (files, JSON lists).
 */
export function contentCrud<T extends AnyTable, A extends AnySchema, E extends AnySchema>({
	table,
	label,
	addSchema,
	editSchema,
	fileFields = [],
	listFields = [],
	decimalFields = [],
	scope
}: CrudOptions<T, A, E>) {
	// `table` is typed as `T` so `db.select().from(table)` infers real column
	// types for `rows` — but that makes `table` itself un-indexable by a
	// runtime string. This untyped alias is only for that dynamic lookup.
	const cols = table as Record<string, any>;

	/** Newest content sorts by the admin-chosen order; the rest falls back to id. */
	const orderColumn = cols.sortOrder ?? cols.id;

	/** `id` is always an `int` autoincrement column; form values arrive as strings. */
	const toId = (id: string) => (cols.id.dataType === 'number' ? Number(id) : id);

	/** `undefined` when unscoped, so `and(...)` and `.where()` both no-op cleanly. */
	const ownerCondition = async (locals: App.Locals) =>
		scope ? eq(cols[scope.field], await scope.resolve(locals)) : undefined;

	/** Turns validated form data into a row, minus anything that must not change. */
	const toRow = async (data: Record<string, any>) => {
		const { id, ...values } = data;

		for (const field of fileFields) {
			const file = values[field];
			// No new upload means "keep whatever is already stored".
			if (file instanceof File && file.size > 0) {
				values[field] = await saveUploadedFile(file);
			} else {
				delete values[field];
			}
		}

		for (const field of listFields) {
			const raw = values[field];
			values[field] =
				typeof raw === 'string'
					? raw
							.split('\n')
							.map((line) => line.trim())
							.filter(Boolean)
					: (raw ?? []);
		}

		for (const field of decimalFields) {
			if (values[field] !== undefined && values[field] !== null) {
				values[field] = String(values[field]);
			}
		}

		return values;
	};

	const load = async (event: ServerLoadEvent) => {
		const [addForm, editForm, deleteForm, condition] = await Promise.all([
			superValidate(zod4(addSchema)),
			superValidate(zod4(editSchema)),
			superValidate(zod4(idSchema)),
			ownerCondition(event.locals)
		]);
		const rows = await db.select().from(table).where(condition).orderBy(asc(orderColumn));

		return { addForm, editForm, deleteForm, rows };
	};

	const actions = {
		add: async ({ request, locals }: RequestEvent) => {
			const form = await superValidate(request, zod4(addSchema));
			if (!form.valid) {
				return message(
					form,
					{ type: 'error', text: 'Please check the form for errors' },
					{ status: 400 }
				);
			}

			try {
				const values = await toRow(form.data as unknown as FormData);
				if (scope) values[scope.field] = await scope.resolve(locals);
				// `values` is a dynamic subset of T's columns assembled at runtime —
				// drizzle's insert type wants every column keyed and typed exactly,
				// which a generically-built object can't satisfy statically.
				await db.insert(table).values({ ...values, createdBy: locals.user?.id } as T['$inferInsert']);
				return message(form, { type: 'success', text: `${label} added` });
			} catch (err) {
				const field = duplicateField(err, table);
				if (field) {
					setError(form, field as never, `This ${field} is already in use`);
					return message(
						form,
						{ type: 'error', text: `${label} already exists` },
						{ status: 400 }
					);
				}
				console.error(`Failed to add ${label}:`, err);
				return message(form, { type: 'error', text: `Could not add ${label}` }, { status: 500 });
			}
		},

		edit: async ({ request, locals }: RequestEvent) => {
			const form = await superValidate(request, zod4(editSchema));
			if (!form.valid) {
				return message(
					form,
					{ type: 'error', text: 'Please check the form for errors' },
					{ status: 400 }
				);
			}

			try {
				const data = form.data as unknown as FormData;
				const values = await toRow(data);
				delete values[scope?.field ?? '']; // never let the owner column itself be edited
				const [result] = await db
					.update(table)
					.set({ ...values, updatedBy: locals.user?.id } as Partial<T['$inferInsert']>)
					.where(and(eq(cols.id, toId(data.id)), await ownerCondition(locals)));
				if (scope && result.affectedRows === 0) {
					return message(form, { type: 'error', text: `${label} not found` }, { status: 404 });
				}
				return message(form, { type: 'success', text: `${label} updated` });
			} catch (err) {
				const field = duplicateField(err, table);
				if (field) {
					setError(form, field as never, `This ${field} is already in use`);
					return message(
						form,
						{ type: 'error', text: `${label} already exists` },
						{ status: 400 }
					);
				}
				console.error(`Failed to update ${label}:`, err);
				return message(form, { type: 'error', text: `Could not update ${label}` }, { status: 500 });
			}
		},

		delete: async ({ request, locals }: RequestEvent) => {
			const form = await superValidate(request, zod4(idSchema));
			if (!form.valid) {
				return message(form, { type: 'error', text: 'Invalid request' }, { status: 400 });
			}

			try {
				await db
					.delete(table)
					.where(
						and(eq(cols.id, toId((form.data as FormData).id)), await ownerCondition(locals))
					);
				return message(form, { type: 'success', text: `${label} deleted` });
			} catch (err) {
				console.error(`Failed to delete ${label}:`, err);
				return message(form, { type: 'error', text: `Could not delete ${label}` }, { status: 500 });
			}
		}
	};

	return { load, actions };
}