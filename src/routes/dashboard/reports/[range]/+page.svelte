<script lang="ts">
	import { columns } from './columns';

	let { data } = $props();

	import DataTable from '$lib/components/Table/data-table.svelte';

	import { Frown } from '@lucide/svelte';
	import DateMonth from '$lib/formComponents/DateMonth.svelte';
	import FilterMenu from '$lib/components/Table/FilterMenu.svelte';

	let filteredList = $derived(data?.allReports);
</script>

<svelte:head>
	<title>Reports</title>
</svelte:head>

{#if data.allReports.length === 0}
	<div class="flex h-96 w-full flex-col items-center justify-center lg:w-5xl">
		<p class="justify-self-cente mt-4 flex flex-row gap-4 text-center text-4xl">
			<Frown class="h-12 w-16  animate-bounce" />

			Reports is Empty for this Date Range Choose Another Range
		</p>
		<DateMonth start={data?.start} end={data?.end} link="/dashboard/reports" />
	</div>
{:else}
	<div class="flex flex-col gap-4">
		<h2 class="my-4 text-2xl">No of Reports {data.allReports?.length}</h2>

		<DateMonth start={data?.start} end={data?.end} link="/dashboard/reports" />

		<FilterMenu
			bind:filteredList
			data={data?.allReports}
			filterKeys={['status', 'quantityPurchased', 'lineTotal']}
		/>

		<DataTable data={filteredList} {columns} fileName="Reports from {data?.start} - {data?.end}" />
	</div>
{/if}
