<script lang="ts">
	import { columns } from './columns';

	let { data } = $props();

	import DataTable from '$lib/components/Table/data-table.svelte';

	import Loading from '$lib/components/Loading.svelte';
	import { Frown, Plus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import FilterMenu from '$lib/components/Table/FilterMenu.svelte';

	let filteredList = $derived(data?.productList);
</script>

<svelte:head>
	<title>Products List</title>
</svelte:head>

{#await data}
	<Loading name="Customers" />
{:then customerList}
	{#if data.productList.length === 0}
		<div class="flex h-96 w-full flex-col items-center justify-center lg:w-5xl">
			<p class="justify-self-cente mt-4 flex flex-row gap-4 text-center text-4xl">
				<Frown class="h-12 w-16  animate-bounce" />
				Products List is Empty
			</p>
			<Button href="/dashboard/products/add-products"><Plus />Add New Products</Button>
		</div>
	{:else}
		<h2 class="my-4 text-2xl">No of Products {data.productList?.length}</h2>

		<div class="mt-8 mb-4 w-6xl p-0 pt-4 lg:w-full lg:p-0">
			<FilterMenu
				bind:filteredList
				data={data?.productList}
				filterKeys={['category', 'commission', 'quantity', 'supplier']}
			/>
			<DataTable data={filteredList} {columns} fileName="Product List" />
		</div>
	{/if}
{:catch}
	<div class="flex h-screen w-screen flex-col items-center justify-center">
		<h1 class="text-red-500">Unexpected Error: Reload</h1>
	</div>
{/await}
