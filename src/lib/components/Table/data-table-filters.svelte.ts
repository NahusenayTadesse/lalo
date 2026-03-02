import { SvelteSet } from "svelte/reactivity";

// utils/discoverFilterSchema.ts
export type FilterMeta = {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  options?: (string | number)[];   // only for enum-like strings
};

export function discoverFilterSchema<T extends Record<string, unknown>>(
  rows: T[],
  sampleSize = 50
): FilterMeta[] {
  const sample = $state(rows.slice(0, sampleSize));
  const keys = new SvelteSet(sample.flatMap(r => Object.keys(r)));
  const schema: FilterMeta[] = $state([]);

  keys.forEach(k => {
    const vals = sample.map(r => r[k]).filter(v => v != null);
    if (vals.length === 0) return;

    const uniq = [...new SvelteSet(vals)];

    // boolean
    if (uniq.every(v => typeof v === 'boolean')) {
      schema.push({ key: k, type: 'boolean' });
      return;
    }
    // number
    if (uniq.every(v => typeof v === 'number')) {
      schema.push({ key: k, type: 'number' });
      return;
    }
    // date (heuristic: string that parses to date)
    if (uniq.every(v => typeof v === 'string' && !isNaN(Date.parse(v)))) {
      schema.push({ key: k, type: 'date' });
      return;
    }
    // enum-like string (≤ 15 unique values)
    if (uniq.length <= 15 && uniq.every(v => typeof v === 'string')) {
      schema.push({ key: k, type: 'enum', options: uniq as string[] });
      return;
    }
    // fallback: free-text
    if (uniq.every(v => typeof v === 'string')) {
      schema.push({ key: k, type: 'string' });
    }
  });

  return schema;
}