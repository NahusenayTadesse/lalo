<script lang="ts">
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { MapPinIcon } from '@lucide/svelte';

	type Address = {
		subcity?: string | null;
		street?: string | null;
		kebele?: string | null;
		buildingNumber?: string | null;
		floor?: string | null;
		houseNumber?: string | null;
	};

	interface Props {
		subcity?: string | null;
		street?: string | null;
		kebele?: string | null;
		buildingNumber?: string | null;
		floor?: string | null;
		houseNumber?: string | null;
		children?: import('svelte').Snippet;
	}

	const { subcity, street, kebele, buildingNumber, floor, houseNumber, children }: Props = $props();

	let concatenatedAddress = $derived(
		`${subcity ? `${subcity}, ` : ''}${street ? `${street}, ` : ''}${kebele ? `${kebele}, ` : ''}${buildingNumber ? `${buildingNumber}, ` : ''}${floor ? `${floor}, ` : ''}${houseNumber ? `${houseNumber}` : ''}`
	);

	// Filter out empty address fields
	const addressFields = $derived.by(() => {
		const fields: { label: string; value: string }[] = [];
		if (subcity) fields.push({ label: 'Subcity', value: subcity });
		if (street) fields.push({ label: 'Street', value: street });
		if (kebele) fields.push({ label: 'Kebele', value: kebele });
		if (buildingNumber) fields.push({ label: 'Building', value: buildingNumber });
		if (floor) fields.push({ label: 'Floor', value: floor });
		if (houseNumber) fields.push({ label: 'House Number', value: houseNumber });
		return fields;
	});

	const hasAddress = $derived(addressFields.length > 0);
	let open = $state(false);
</script>

<Popover bind:open>
	<PopoverTrigger>
		<button
			onmouseenter={() => (open = true)}
			onmouseleave={() => (open = false)}
			class="inline-flex items-center gap-2 text-primary hover:underline"
		>
			{#if children}
				{@render children()}
			{:else}
				<MapPinIcon class="size-4" />
				<span>{concatenatedAddress}</span>
			{/if}
		</button>
	</PopoverTrigger>
	<PopoverContent class="w-72 p-4" onmouseenter={() => (open = true)}>
		{#if hasAddress}
			<div class="space-y-3">
				<h4 class="text-sm font-semibold">Address Details</h4>
				<div class="flex flex-col gap-2">
					{#each addressFields as field (field.label)}
						<div class="flex flex-col gap-1">
							<span class="text-xs font-medium text-muted-foreground">{field.label}</span>
							<span class="text-sm text-foreground">{field.value}</span>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="text-sm text-muted-foreground">No address information available</div>
		{/if}
	</PopoverContent>
</Popover>
