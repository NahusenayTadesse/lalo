<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import Edit from './edit.svelte';
	import Delete from './delete.svelte';
	import ProductLineItem from './product-line-item.svelte';
	import OrderItems from '$lib/components/order-items.svelte';
	import Copy from '$lib/Copy.svelte';
	import { formatEthiopianDate } from '$lib/global.svelte.js';

	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import QueryBuilder from '$lib/QueryBuilder.svelte';
	import FilterMenu from '$lib/components/Table/FilterMenu.svelte';
	import type { CalendarDate } from '@internationalized/date';
	import { Sheet, Loader, CircleCheckBig, OctagonMinus, Plus, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	const { form, errors, enhance, delayed, message } = superForm(data.form, {
		dataType: 'json'
	});

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	function addProduct() {
		$form.selectedProducts = [...$form.selectedProducts, { product: 0, quantity: 1, amount: '' }];
	}

	const grandTotal = $derived(
		$form.selectedProducts.reduce((sum, item) => {
			const price = parseFloat(String(item.amount ?? '').split(' ')[0]);
			return sum + (Number.isFinite(price) ? price * (item.quantity ?? 0) : 0);
		}, 0)
	);

	// ---------------------------------------------------------------------
	// Query builder — every control writes to the URL, +page.server.ts reads
	// it back and does the filtering/pagination server-side.
	// ---------------------------------------------------------------------

	function updateFilters(params: Record<string, string | number | undefined>) {
		const url = new URL(page.url);
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== '') {
				url.searchParams.set(key, String(value));
			} else {
				url.searchParams.delete(key);
			}
		}
		if (!('page' in params)) url.searchParams.set('page', '1');
		goto(url, { keepFocus: true, noScroll: true });
	}

	const statusPresets = [
		{ value: 'pending', label: 'Pending', icon: Loader },
		{ value: 'delivered', label: 'Delivered', icon: CircleCheckBig },
		{ value: 'cancelled', label: 'Cancelled', icon: OctagonMinus },
		{ value: 'all', label: 'All', icon: Sheet }
	];

	type OrderFilters = { paymentMethod: string };

	function handleQueryChange(payload: {
		search: string;
		pageSize: number;
		dateRange: { start: CalendarDate; end: CalendarDate } | null;
		customFilters: OrderFilters;
	}) {
		updateFilters({
			search: payload.search,
			pageSize: payload.pageSize === 20 ? undefined : payload.pageSize,
			start: payload.dateRange?.start?.toString(),
			end: payload.dateRange?.end?.toString(),
			paymentMethod: payload.customFilters.paymentMethod || undefined
		});
	}

	const goToPage = (p: number) => updateFilters({ page: p });

	// ---- client-side (no round trip) filter over the current page's rows,
	// handy while eyeballing a mixed "All" status page ----
	let filteredList = $derived(data.allData);

	// ---------------------------------------------------------------------

	const columns = [
		{
			accessorKey: 'index',
			header: '#',
			cell: (info) => info.row.index + 1,
			sortable: false
		},
		{
			accessorKey: 'name',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Name',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(Edit, {
					id: row.original.id,
					customer: row.original.customerId,
					customerList: data?.fetchedCustomers,
					customerName: row.original.name,
					orderItems: data?.allItems,
					priceList: data?.fetchedPrices,
					productList: data?.fetchedProducts,
					paymentMethodList: data?.paymentMethodList,
					data: data?.editForm,
					icon: false,
					status: row.original.status
				});
			}
		},
		{
			accessorKey: 'phone',
			header: 'Phone',
			sortable: true,
			cell: ({ row }) => renderComponent(Copy, { data: row.original.phone })
		},
		{
			accessorKey: 'email',
			header: 'Email',
			sortable: true,
			cell: ({ row }) => renderComponent(Copy, { data: row.original.email })
		},
		{
			accessorKey: 'deliveryAddress',
			header: 'Delivery Address',
			sortable: true,
			cell: ({ row }) => renderComponent(Copy, { data: row.original.deliveryAddress })
		},
		{
			accessorKey: 'fee',
			header: 'Fee',
			sortable: true,
			cell: ({ row }) => 'ETB ' + Number(row.original.fee ?? 0)
		},
		{
			accessorKey: 'paymentMethodName',
			header: 'Payment Method',
			sortable: true,
			cell: ({ row }) => renderComponent(Copy, { data: row.original.paymentMethodName ?? '—' })
		},
		{
			accessorKey: 'items',
			header: 'Items',
			sortable: false,
			cell: ({ row }) => {
				return renderComponent(OrderItems, {
					items:
						data?.allItems?.filter((item) => Number(item.orderId) === Number(row.original.id)) ??
						[],
					currency: 'ETB'
				});
			}
		},
		{
			accessorKey: 'createdAt',
			header: 'Created At',
			sortable: true,
			cell: ({ row }) => formatEthiopianDate(new Date(row.original.createdAt))
		},
		{
			accessorKey: 'status',
			header: 'Status',
			sortable: true,
			cell: ({ row }) => renderComponent(Statuses, { status: row.original.status })
		},
		{
			accessorKey: 'edit',
			header: 'Edit',
			sortable: false,
			cell: ({ row }) => {
				return renderComponent(Edit, {
					id: row.original.id,
					customer: row.original.customerId,
					customerList: data?.fetchedCustomers,
					customerName: row.original.name,
					orderItems: data?.allItems,
					priceList: data?.fetchedPrices,
					paymentMethodList: data?.paymentMethodList,
					productList: data?.fetchedProducts,
					data: data?.editForm,
					icon: true,
					status: row.original.status
				});
			}
		},
		{
			accessorKey: 'delete',
			header: 'Delete',
			sortable: false,
			cell: ({ row }) => {
				return renderComponent(Delete, {
					id: row.original.id,
					data: data?.deleteForm
				});
			}
		}
	];
</script>

<svelte:head>
	<title>Orders</title>
</svelte:head>

<div class="mb-6 flex flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex flex-row flex-wrap items-center gap-2">
			{#each statusPresets as preset (preset.value)}
				<Button
					variant={data.filters.status === preset.value ? 'default' : 'outline'}
					onclick={() => updateFilters({ status: preset.value })}
				>
					<preset.icon />
					{preset.label}
				</Button>
			{/each}
		</div>

		<DialogComp title="+ Add New Order" dialogTitle="Add New Order" variant="default">
			<form
				action="/dashboard/orders/?/add"
				use:enhance
				id="main"
				class="flex flex-col gap-4"
				method="post"
				enctype="multipart/form-data"
			>
				<InputComp
					label="Customer"
					name="customer"
					type="combo"
					{form}
					{errors}
					items={data?.fetchedCustomers}
				/>

				<div class="flex items-center justify-between">
					<Label class="text-sm font-semibold">Order Items</Label>
					<Button type="button" size="sm" class="gap-2" onclick={() => addProduct()}>
						<Plus class="h-4 w-4" />
						<span>Add Product</span>
					</Button>
				</div>

				{#if $form.selectedProducts.length === 0}
					<p class="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
						No products added yet. Click "Add Product" to start building this order.
					</p>
				{/if}

				{#each $form.selectedProducts as _, i (i)}
					<ProductLineItem
						index={i}
						bind:item={$form.selectedProducts[i]}
						productList={data?.fetchedProducts}
						priceList={data?.fetchedPrices}
						errors={$errors.selectedProducts?.[i]}
						onremove={() => {
							$form.selectedProducts.splice(i, 1);
							$form.selectedProducts = $form.selectedProducts;
						}}
					/>
				{/each}

				{#if grandTotal > 0}
					<p class="text-right text-sm text-muted-foreground">
						Order Total: <span class="font-semibold text-foreground">ETB {grandTotal.toLocaleString()}</span>
					</p>
				{/if}

				<InputComp label="Delivery Address" name="deliveryAddress" type="text" {form} {errors} />

				<InputComp
					label="Status"
					name="status"
					type="select"
					{form}
					{errors}
					items={[
						{ value: 'pending', name: 'Pending' },
						{ value: 'delivered', name: 'Delivered' },
						{ value: 'cancelled', name: 'Cancelled' }
					]}
				/>

				<Button type="submit" form="main">
					{#if $delayed}
						<LoadingBtn name="Adding Order" />
					{:else}
						<Plus /> Add Order
					{/if}
				</Button>
			</form>
		</DialogComp>
	</div>

	<QueryBuilder
		title="Order Filters"
		description="Search, filter by date, payment method, and page size — applied server-side"
		showDate={true}
		showSearch={true}
		showPageSize={true}
		initialSearch={data.filters.search}
		initialPageSize={data.filters.pageSize}
		initialStart={data.filters.start ?? undefined}
		initialEnd={data.filters.end ?? undefined}
		initialCustomFilters={{ paymentMethod: data.filters.paymentMethod ?? '' }}
		searchPlaceholder="Customer name, phone, email or delivery address..."
		totalResults={data.pagination.totalCount}
		onQueryChange={handleQueryChange}
	>
		{#snippet children(filters, update)}
			<div class="flex flex-col gap-2">
				<Label class="text-sm font-medium text-foreground">Payment Method</Label>
				<Select
					type="single"
					value={String(filters.paymentMethod ?? '')}
					onValueChange={(v) => update('paymentMethod', v)}
				>
					<SelectTrigger class="w-full">
						{data.paymentMethodList.find((p) => String(p.value) === filters.paymentMethod)
							?.name ?? 'Any'}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">Any</SelectItem>
						{#each data.paymentMethodList as method (method.value)}
							<SelectItem value={String(method.value)}>{method.name}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>
		{/snippet}
	</QueryBuilder>
</div>

<div class="mt-4">
	<FilterMenu bind:filteredList data={data.allData} filterKeys={['status', 'paymentMethodName']} />
</div>

{#key filteredList}
	<DataTable {columns} data={filteredList} search={true} />
{/key}

{#if data.pagination.totalPages > 1}
	<div class="mt-6 flex items-center justify-center gap-2">
		<Button
			variant="outline"
			size="sm"
			disabled={!data.pagination.hasPrevPage}
			onclick={() => goToPage(data.pagination.currentPage - 1)}
		>
			<ChevronLeft size={16} />
		</Button>

		{#each Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1) as p (p)}
			<Button
				variant={p === data.pagination.currentPage ? 'default' : 'outline'}
				size="sm"
				onclick={() => goToPage(p)}
			>
				{p}
			</Button>
		{/each}

		<Button
			variant="outline"
			size="sm"
			disabled={!data.pagination.hasNextPage}
			onclick={() => goToPage(data.pagination.currentPage + 1)}
		>
			<ChevronRight size={16} />
		</Button>
	</div>
{/if}
