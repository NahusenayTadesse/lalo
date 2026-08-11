<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import Edit from './edit.svelte';
	import Delete from './delete.svelte';
	import OrderFormFields from './order-form-fields.svelte';
	import OrderItems from '$lib/components/order-items.svelte';
	import Copy from '$lib/Copy.svelte';
	import { formatEthiopianDate } from '$lib/global.svelte.js';

	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import QueryBuilder from '$lib/QueryBuilder.svelte';
	import FilterMenu from '$lib/components/Table/FilterMenu.svelte';
	import type { CalendarDate } from '@internationalized/date';
	import {
		Sheet,
		Loader,
		CircleCheckBig,
		OctagonMinus,
		Plus,
		ChevronLeft,
		ChevronRight
	} from '@lucide/svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import AddCustomer from '$lib/forms/AddCustomer.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	let addOpen = $state(false);

	const { form, errors, enhance, delayed, message, allErrors } = superForm(data.form, {
		dataType: 'json',
		id: 'add-order'
	});

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
				// The dialog used to stay open on success, so a second click on
				// "Add Order" happily created the same order again.
				addOpen = false;
			}
		}
	});

	const hasItems = $derived($form.selectedProducts.length > 0);
	let addOrderTotal = $state(0);

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
					paymentMethodList: data?.paymentMethodList,
					placeList: data?.placeList,
					freeDeliveryThreshold: data?.freeDeliveryThreshold,
					address: row.original.address,
					deliveryAddress: row.original.deliveryAddress,
					paymentMethod: row.original.paymentMethod ?? undefined,
					image: row.original.recieptLink,
					data: data?.editForm,
					icon: false,
					status: row.original.status ?? 'pending'
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
					placeList: data?.placeList,
					freeDeliveryThreshold: data?.freeDeliveryThreshold,
					address: row.original.address,
					deliveryAddress: row.original.deliveryAddress,
					paymentMethod: row.original.paymentMethod ?? undefined,
					image: row.original.recieptLink,
					data: data?.editForm,
					icon: true,
					status: row.original.status ?? 'pending'
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

		<div class="flex flex-row flex-wrap items-center gap-2">
			<AddCustomer data={data.addCustomerForm} />

			<DialogComp
				bind:open={addOpen}
				wide
				title="+ Add New Order"
				dialogTitle="Add New Order"
				variant="default"
			>
				{#snippet footer()}
					<div class="flex items-center justify-between gap-4">
						<div class="text-sm">
							<span class="text-muted-foreground">Total</span>
							<span class="ml-2 text-base font-semibold tabular-nums">
								ETB {addOrderTotal.toLocaleString()}
							</span>
						</div>
						<Button type="submit" form="main" disabled={!hasItems || $delayed}>
							{#if $delayed}
								<LoadingBtn name="Adding Order" />
							{:else}
								<Plus /> Add Order
							{/if}
						</Button>
					</div>
				{/snippet}

				<form
					action="/dashboard/orders/?/add"
					use:enhance
					id="main"
					class="flex flex-col gap-4"
					method="post"
					enctype="multipart/form-data"
				>
					<Errors allErrors={$allErrors} />

					<OrderFormFields
						{form}
						{errors}
						customerList={data?.fetchedCustomers}
						priceList={data?.fetchedPrices}
						placeList={data?.placeList}
						addCustomerForm={data?.addCustomerForm}
						freeDeliveryThreshold={data?.freeDeliveryThreshold}
						bind:total={addOrderTotal}
						statusItems={[
							{ value: 'pending', name: 'Pending' },
							{ value: 'cancelled', name: 'Cancelled' }
						]}
					/>

					<p class="text-xs text-muted-foreground">
						To mark an order delivered, save it first and use Edit — that is where the payment
						method, receipt and stock adjustment are handled.
					</p>
				</form>
			</DialogComp>
		</div>
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
						{data.paymentMethodList.find((p) => String(p.value) === filters.paymentMethod)?.name ??
							'Any'}
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
