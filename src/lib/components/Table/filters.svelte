<script lang="ts">
  import type { FilterMeta } from './data-table-filters.svelte';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Checkbox } from '$lib/components/ui/checkbox/index.js';
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";

  import { ChevronDownIcon } from '@lucide/svelte';

  type Props = {
    schema: FilterMeta[];
    filters: { id: string; value: unknown }[];
    onChange: (f: { id: string; value: unknown }[]) => void;
  };

  let { schema, filters, onChange }: Props = $props();

  function update(key: string, value: unknown) {
    const next = filters.filter(f => f.id !== key);
    if (value !== '' && value != null) next.push({ id: key, value });
    onChange(next);
  }

  function clearAll() {
    onChange([]);
  }

  // Define toggle as a plain function (no need for $state here)
 function toggle(arr: string[], item: string): string[] {
    return arr.includes(item)
      ? arr.filter(i => i !== item)
      : [...arr, item];
  }

  function camelToReadable(text: string) {
    return text
      .replace(/([A-Z])/g, ' $1')    // insert space before capitals
      .replace(/^./, str => str.toUpperCase()); // capitalize first letter
  }

  function toArray(val: unknown): string[] {
    if (Array.isArray(val)) return val as string[];
    if (val === undefined || val === null) return [];
    return [String(val)];
  }


</script>

<div class="flex flex-wrap gap-2 items-end">
  {#each schema as meta}
    <label class="flex flex-col gap-1 text-xs">
      <span class="font-medium capitalize">{camelToReadable(meta.key)}</span>

      {#if meta.type === 'boolean'}
        <Checkbox
          checked={(filters.find(f => f.id === meta.key)?.value as boolean) ?? false}
          onCheckedChange={v => update(meta.key, v)}
        />
      {:else if meta.type === 'enum' }
      
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button
              variant="outline"
              size="sm"
              class="w-36 justify-between"
            >
              {camelToReadable(meta.key)}
              <ChevronDownIcon class="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Content class="w-36">
            {#each meta.options! as opt}
            {@const optStr = String(opt)}
              <DropdownMenu.CheckboxItem
checked={toArray(filters.find(f => f.id === meta.key)?.value).includes(optStr)}           
onCheckedChange={() => {
        // 3. Use toArray here to ensure 'current' is a real array
        const rawValue = $derived(filters.find(f => f.id === meta.key)?.value);
        const current = $derived(toArray(rawValue));
        
        const next = $derived(toggle(current, optStr));
        update(meta.key, next.length ? next : undefined);
      }}
              >               

                {opt}
              </DropdownMenu.CheckboxItem>

             

              
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>

      {:else if meta.type === 'number'}
        <Input
          type="text"
          class=""
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          name="filter-input"
          inputmode="search"
          placeholder="contains..."
          value={(filters.find(f => f.id === meta.key)?.value as string) ?? ''}
          oninput={e => update(meta.key, e.currentTarget.value)}
        />   
      {:else if meta.type === 'date'}
        <Input
          type="date"
          class=""
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          name="filter-input"
          inputmode="search"
          value={(filters.find(f => f.id === meta.key)?.value as string) ?? ''}
          oninput={e => update(meta.key, e.currentTarget.value)}
        />
      {:else if meta.key === 'id'}
        <span></span>
      {:else}
        <Input
          type="text"
          class=""
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          name="filter-input"
          inputmode="search"
          placeholder="contains..."
          value={(filters.find(f => f.id === meta.key)?.value as string) ?? ''}
          oninput={e => update(meta.key, e.currentTarget.value)}
        />
      {/if}
    </label>
  {/each}

  <Button variant="outline" size="sm" onclick={clearAll}>Clear all</Button>
</div>