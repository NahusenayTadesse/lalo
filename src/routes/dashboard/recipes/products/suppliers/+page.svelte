<script>
	import DataTable from '$lib/components/Table/data-table.svelte';
	import { columns } from './columns';
	let { data } = $props();
</script>

<svelte:head>
	<title>Suppliers</title>
</svelte:head>

<div class="mb-4 flex items-center justify-between">
	<h2 class="text-2xl font-bold">Suppliers: {data?.allData.length}</h2>
</div>

{#key data?.allData}
	<DataTable {columns} data={data?.allData} search={true} fileName="Suppliers" />
{/key}
