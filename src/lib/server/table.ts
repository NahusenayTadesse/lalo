/**
 * The app's entry point to admin-kit's server-side table filtering
 * (`@nahu/admin-kit/server/queryFilters`), plus the few builders this app's lists share.
 *
 * Every dashboard list hands the admin-kit `DataTable` a `server` prop, so search, column filters,
 * sorting and paging all happen in SQL and the table only renders the page it was given.
 */
import { eq, sql } from 'drizzle-orm';
import type { MySqlColumn } from 'drizzle-orm/mysql-core';
import * as kit from '@nahu/admin-kit/server/queryFilters';

export {
	buildWhere,
	facetCounts,
	orderBy,
	parseTableQuery,
	type Facet,
	type TableQuery,
	type WhereSpec
} from '@nahu/admin-kit/server/queryFilters';

/**
 * A `LIKE` pattern matching `term` anywhere. Drizzle parameterises the value, so this isn't about
 * injection — but an unescaped `%` or `_` still acts as a wildcard, and searching for `%` would
 * return every row.
 */
export const contains = (term: string) => `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** What the table's `server` prop wants: the page it is on, the facet tallies and the URL's state. */
export function serverTable<F extends string>(
	query: kit.TableQuery<F>,
	total: number | string,
	facets: Record<string, kit.Facet[]> = {}
) {
	return {
		pagination: kit.pagination(query, total),
		facets,
		filters: kit.currentQuery(query)
	};
}

/** Facets for a column whose values are a fixed set (a status enum), with readable labels. */
export const enumFacet = (rows: { value: string | null; count: number | string }[]) =>
	rows.map((r) => ({
		value: r.value,
		label: r.value ? r.value.charAt(0).toUpperCase() + r.value.slice(1) : r.value,
		count: r.count
	}));

/** A yes/no column (`isActive`) as a filter: `active` or `inactive`. */
export const activeFilter = (column: MySqlColumn) => (value: string) =>
	value === 'active' ? eq(column, true) : value === 'inactive' ? eq(column, false) : undefined;

/** The same column as the value its facet is tallied by. */
export const activeState = (column: MySqlColumn) =>
	sql<string>`CASE WHEN ${column} THEN 'active' ELSE 'inactive' END`;
