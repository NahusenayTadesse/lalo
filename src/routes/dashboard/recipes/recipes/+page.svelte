<script lang="ts">
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import ImageViewer from '$lib/components/Table/image-viewer.svelte';
	import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
	let { data } = $props();
	const columns = [
		{
			accessorKey: 'index',
			header: '#',
			cell: (info) => info.row.index + 1,
			sortable: false
		},
		{
			accessorKey: 'image',
			header: 'Image',
			sortable: true,
			cell: ({ row }) => {
				// You can pass whatever you need from `row.original` to the component
				return renderComponent(ImageViewer, {
					src: row.original.image,
					alt: row.original.title
				});
			}
		},
		{
			accessorKey: 'title',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Title',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => {
				// You can pass whatever you need from `row.original` to the component
				return renderComponent(DataTableLinks, {
					id: row.original.id,
					name: row.original.title,
					link: '/dashboard/recipes/single'
				});
			}
		},

		{
			accessorKey: 'items',
			header: 'Items',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(RecipeItems, {
					items:
						data?.ingList.filter((item) => Number(item.recipeId) === Number(row.original.id)) ?? [],
					label: row.original.title
				});
			}
		},

		{
			accessorKey: 'prepTime  ',
			header: 'Prep Time',
			sortable: true,
			cell: ({ row }) => {
				return row.original.prepTime + ' mins';
			}
		},
		{
			accessorKey: 'cookTime  ',
			header: 'Cook Time',
			sortable: true,
			cell: ({ row }) => {
				return row.original.cookTime + ' mins';
			}
		},

		{
			accessorKey: 'status',
			header: 'Status',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(Statuses, {
					status: row.original.status ? 'Active' : 'Inactive'
				});
			}
		}
	];

	import DataTable from '$lib/components/Table/data-table.svelte';

	import Loading from '$lib/components/Loading.svelte';
	import { Frown, Plus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import FilterMenu from '$lib/components/Table/FilterMenu.svelte';
	import RecipeItems from './recipe-items.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';

	let filteredList = $derived(data?.recipeList);
</script>

<svelte:head>
	<title>Recipes List</title>
</svelte:head>

{#await data}
	<Loading name="Customers" />
{:then customerList}
	{#if data.recipeList.length === 0}
		<div class="flex h-96 w-full flex-col items-center justify-center lg:w-5xl">
			<p class="justify-self-cente mt-4 flex flex-row gap-4 text-center text-4xl">
				<Frown class="h-12 w-16  animate-bounce" />
				Recipes List is Empty
			</p>
			<Button href="/dashboard/recipes/add-recipes"><Plus />Add New Recipes</Button>
		</div>
	{:else}
		<h2 class="my-4 text-2xl">No of Recipes {data.recipeList?.length}</h2>

		<div class="mt-8 mb-4 w-6xl p-0 pt-4 lg:w-full lg:p-0">
			<FilterMenu
				bind:filteredList
				data={data?.recipeList}
				filterKeys={['status', 'prepTime', 'cookTime']}
			/>
			<DataTable data={filteredList} {columns} fileName="Recipes List" />
		</div>
	{/if}
{:catch}
	<div class="flex h-screen w-screen flex-col items-center justify-center">
		<h1 class="text-red-500">Unexpected Error: Reload</h1>
	</div>
{/await}
