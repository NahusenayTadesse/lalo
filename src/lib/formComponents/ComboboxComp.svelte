<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { tick } from 'svelte';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import { selectItem } from '$lib/global.svelte';

	let {
		items,
		name,
		value = $bindable(),
		required = false,
		/** Overrides the label derived from `name`, which reads badly when several
		 *  fields post under one array name (e.g. "Select Selected Products"). */
		placeholder = '',
		/** Fired after `value` is set, for callers that derive other fields from the
		 *  chosen row (e.g. a variant that sets both a product and its price). */
		onselect
	}: {
		items: Item[];
		name: string;
		value: string | number | undefined;
		required: boolean;
		placeholder?: string;
		onselect?: (item: Item) => void;
	} = $props();
	let open = $state(false);
	let triggerRef = $state<HTMLButtonElement>(null!);
	type Item = {
		value: string | number;
		name: string;
		/** Extra search terms, for when the visible label omits something people
		 *  type — a variant labelled "500g" still needs to be findable by product. */
		keywords?: string[];
	};

	const selectedValue = $derived(items.find((f) => f.value === value)?.name);

	// const triggerContent = $derived(
	// 	items.find((f: Item) => f.value === value)?.name ??
	// 		'Select ' + name.replace(/([a-z])([A-Z])/g, '$1 $2')
	// );
	//
	const fallbackLabel = $derived(
		placeholder || 'Select ' + name.replace(/([a-z])([A-Z])/g, '$1 $2')
	);

	const triggerContent = $derived(
		// Use String coercion to ensure "1" matches 1
		items.find((f: Item) => String(f.value) === String(value))?.name ?? fallbackLabel
	);

	function getNameByValue(items: Item[], value: string | number): string | undefined {
		return items.find((item) => item.value === value)?.name.replace(/([a-z])([A-Z])/g, '$1 $2');
	}
	// We want to refocus the trigger button when the user selects
	// an item from the list so users can continue navigating the
	// rest of the form with the keyboard.
	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef.focus();
		});
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				title={selectedValue}
				class="w-full min-w-0 justify-between capitalize"
				role="combobox"
				aria-expanded={open}
			>
				<span class="truncate">{triggerContent}</span>
				<ChevronsUpDownIcon class="shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<input type="hidden" bind:value {name} {required} />

	<Popover.Content class="w-full min-w-64 p-0">
		<Command.Root>
			<Command.Input placeholder="Search..." aria-label={fallbackLabel} />
			<Command.List>
				<Command.Empty>Nothing found.</Command.Empty>
				<Command.Group>
					{#each items as item}
						<Command.Item
							value={item.name}
							keywords={[item.name, ...(item.keywords ?? [])]}
							onSelect={() => {
								value = item.value;
								onselect?.(item);
								closeAndFocusTrigger();
							}}
							title={item.name}
							class={cn(selectItem, 'gap-2')}
						>
							<!-- String-compared for the same reason as triggerContent above: a
							     value round-tripped through a hidden input comes back as "1", which
							     never strictly equals the numeric 1 the list holds.
							     Hidden with opacity, not `text-transparent`: Command.Item carries
							     `data-selected:*:[svg]:text-foreground`, which re-colours child svgs on
							     the highlighted row and made an unselected item look checked. -->
							<CheckIcon
								class={cn('shrink-0', String(value) !== String(item.value) && 'opacity-0')}
							/>
							<span class="truncate">{item.name}</span>
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
