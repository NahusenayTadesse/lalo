<script lang="ts">
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter
	} from '$lib/components/ui/card';

	import pluralize from 'pluralize';
	import { Label } from '$lib/components/ui/label/index';
	import { Badge } from '$lib/components/ui/badge/index';
	import Button from '../ui/button/button.svelte';
	import { RotateCcw, SlidersHorizontal, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { fly } from 'svelte/transition';

	interface Props {
		data: any[];
		filterKeys: string[];
		filteredList?: any[];
	}

	let { data, filterKeys, filteredList = $bindable(data) }: Props = $props();
	import { buttonVariants } from '../ui/button/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	// Create a map of filterKey -> selectedValue
	let selectedFilters = $state<Record<string, string>>({});

	let open = $state(false);

	// Initialize selectedFilters for each filterKey
	$effect(() => {
		filterKeys.forEach((key) => {
			if (!(key in selectedFilters)) {
				selectedFilters[key] = '';
			}
		});
	});

	// Get distinct values for each filter key
	const getDistinctValues = (key: string) => {
		return Array.from(
			new Set(data.map((item: any) => item[key]).filter((v) => v !== undefined && v !== null))
		).sort();
	};

	const getCountForValue = (filterKey: string, value: string) => {
		return data.filter((item: any) => {
			return filterKeys.every((key) => {
				if (key === filterKey) {
					return String(item[key]) === value;
				}
				const selectedValue = selectedFilters[key];
				if (selectedValue === '') return true;
				return String(item[key]) === selectedValue;
			});
		}).length;
	};

	// Filter data based on all active filters
	$effect(() => {
		filteredList = data.filter((item: any) => {
			return filterKeys.every((key) => {
				const selectedValue = selectedFilters[key];
				if (selectedValue === '') return true;
				return String(item[key]) === selectedValue;
			});
		});
	});
	let isResetting = $state(false);
	const resetFilters = () => {
		isResetting = true;
		selectedFilters = { category: '', status: '', priority: '' };
		filteredList = data;
		toast.success('Filters reset');
		isResetting = false;
	};

	const activeFilterCount = $derived(Object.values(selectedFilters).filter((v) => v !== '').length);

	let Icon = $derived(open ? X : SlidersHorizontal);
</script>

<Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger class={buttonVariants({ variant: 'outline' })}>
			{#snippet child(props)}
				<Button onclick={() => (open = !open)} class="w-32" {...props}>
					<Icon />Filters {activeFilterCount > 0 ? `${activeFilterCount} active` : ''}
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content>
			<p>Filter Table</p>
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>

{#if open}
	<div
		class="mt-4 flex w-full items-center justify-center text-foreground"
		transition:fly={{ x: -100, duration: 300 }}
	>
		<Card class="w-full">
			<CardHeader>
				<CardTitle>Filter Table</CardTitle>
				<CardDescription>Filter table using the below parameters</CardDescription>
			</CardHeader>
			<CardContent class="">
				<div
					class="space-y-2 rounded-xl border border-border/50 bg-background bg-linear-to-br from-card to-card/50 p-6 shadow-sm"
				>
					<!-- Filter Header -->
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<SlidersHorizontal class="size-5 text-primary" />
							<h3 class="text-base font-semibold text-foreground">Filters</h3>
							{#if activeFilterCount > 0}
								<Badge variant="secondary" class="ml-2">{activeFilterCount} active</Badge>
							{/if}
						</div>
						<Button
							variant="outline"
							size="sm"
							class="gap-2 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
							onclick={resetFilters}
							title="Reset all filters"
						>
							<RotateCcw
								class="size-4 {isResetting ? 'animate-[spin_1s_linear_infinite_reverse' : ''}"
							/>
							<span class="hidden sm:inline">Reset {isResetting ? '...' : ''}</span>
						</Button>
					</div>

					<!-- Filter Controls -->
					<div class="flex flex-row flex-wrap gap-2">
						{#each filterKeys as filterKey (filterKey)}
							<div class="space-y-2">
								<Label for={filterKey} class="text-sm font-medium text-foreground capitalize">
									{pluralize(filterKey)}
								</Label>
								<Select type="single" bind:value={selectedFilters[filterKey]}>
									<SelectTrigger
										id={filterKey}
										class="capitalize transition-all duration-200 hover:border-primary/50 focus:ring-primary"
									>
										{#if selectedFilters[filterKey] === ''}
											<span class="text-muted-foreground"
												>All {pluralize(filterKey).replace(/([a-z])([A-Z])/g, '$1 $2')}</span
											>
										{:else}
											<span class="font-medium">{selectedFilters[filterKey]}</span>
										{/if}
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="" class="capitalize">All {pluralize(filterKey)}</SelectItem>
										{#each getDistinctValues(filterKey) as value}
											<SelectItem class="capitalize" value={String(value)}>
												{value}
											</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
						{/each}
					</div>
				</div>

				<!-- Results Info -->
				<div class="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
					<p class="text-sm text-muted-foreground">
						Showing <span class="font-semibold text-foreground">{filteredList.length}</span> results
					</p>
				</div>
			</CardContent>
			<CardFooter></CardFooter>
		</Card>
	</div>
{/if}
<!-- <div class="mt-3 flex flex-col gap-3 rounded-lg bg-background p-3">
	<h4 class="text-sm font-medium text-muted-foreground">Filters</h4>

	<div class="flex flex-row flex-wrap gap-2">
		<Button
			variant="ghost"
			size="icon"
			class="active:animate-[spin_1s_linear_infinite_reverse]"
			onclick={() => (filteredList = data)}
			title="Reset Filters"><RotateCcw /></Button
		>
		{#each filterKeys as filterKey (filterKey)}
			<div class="flex flex-col gap-2">
				<Label class="capitalize">{pluralize(filterKey)}</Label>
				<Select type="single" bind:value={selectedFilters[filterKey]}>
					<SelectTrigger class="capitalize">
						{#if selectedFilters[filterKey] === ''}
							All {pluralize(filterKey)}
						{:else}
							{selectedFilters[filterKey]}
						{/if}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="" class="capitalize">All {pluralize(filterKey)}</SelectItem>
						{#each getDistinctValues(filterKey) as value}
							<SelectItem class="capitalize" value={String(value)}>{value}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>
		{/each}
	</div>
</div> -->
