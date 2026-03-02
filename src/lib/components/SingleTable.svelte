<script lang="ts">
	import Copy from '$lib/Copy.svelte';
	import { LoaderCircle } from '@lucide/svelte';
	import Statuses from './Table/statuses.svelte';
	// import JSPDF from "$lib/JSPDF.svelte"

	type SingleTable = { name: string; value: string };

	let { singleTable }: { singleTable: SingleTable } = $props();
</script>

<!--
 <div class="fixed right-2 top-24">
    <JSPDF {fileName} tableId="#table" {buttonName} />

</div> -->

{#await singleTable}
	<h1 class="m-2 flex flex-row">Loading <LoaderCircle class="animate-spin" /></h1>
{:then table}
	<table id="table" class="w-full table-fixed text-left lg:w-full">
		<thead
			class="bg-gray-100 font-semibold tracking-wider text-gray-700 uppercase dark:bg-gray-700 dark:text-gray-300"
		>
			<tr>
				<th class="px-4 py-3">Detail</th>
				<th class="px-4 py-3">Value</th>
			</tr>
		</thead>
		<tbody class="text-gray-900 dark:text-gray-100">
			{#each singleTable as value}
				<tr>
					<td class="px-4 py-3 font-semibold">{value.name}</td>
					<td class="break-words capitalize">
						{#if value.name === 'Phone'}
							<Copy data={value.value} />
						{:else if value.name === 'Status'}
							<Statuses status={value.value} />
						{:else}
							{value.value}
						{/if}</td
					>
				</tr>
			{/each}
		</tbody>
	</table>
{/await}
