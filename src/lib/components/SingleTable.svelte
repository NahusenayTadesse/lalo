<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Copy from '$lib/Copy.svelte';
	import { LoaderCircle } from '@lucide/svelte';
	import Statuses from './Table/statuses.svelte';
	// import JSPDF from "$lib/JSPDF.svelte"

	// `kind` picks the special rendering when `name` is a translated label rather than
	// the literal 'Phone' / 'Status' the dashboard pages pass.
	type SingleTable = {
		name: string;
		value: string | number | null | undefined;
		kind?: 'phone' | 'status';
	}[];

	let { singleTable }: { singleTable: SingleTable } = $props();
</script>

<!--
 <div class="fixed right-2 top-24">
    <JSPDF {fileName} tableId="#table" {buttonName} />

</div> -->

{#await singleTable}
	<h1 class="m-2 flex flex-row">{m.common_loading()} <LoaderCircle class="animate-spin" /></h1>
{:then table}
	<table id="table" class="w-full table-fixed text-left lg:w-full">
		<thead
			class="bg-gray-100 font-semibold tracking-wider text-gray-700 uppercase dark:bg-gray-700 dark:text-gray-300"
		>
			<tr>
				<th class="px-4 py-3">{m.table_detail()}</th>
				<th class="px-4 py-3">{m.table_value()}</th>
			</tr>
		</thead>
		<tbody class="text-gray-900 dark:text-gray-100">
			{#each singleTable as value}
				<tr>
					<td class="px-4 py-3 font-semibold">{value.name}</td>
					<td class="break-words capitalize">
						{#if value.kind === 'phone' || value.name === 'Phone'}
							<Copy data={value.value} />
						{:else if value.kind === 'status' || value.name === 'Status'}
							<Statuses status={String(value.value)} />
						{:else}
							{value.value}
						{/if}</td
					>
				</tr>
			{/each}
		</tbody>
	</table>
{/await}
