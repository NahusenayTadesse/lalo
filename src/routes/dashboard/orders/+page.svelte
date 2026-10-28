<script lang="ts">
	import { rowNumber } from '@nahu/admin-kit/components/Table/row-number';
	import { navigateWithQuery } from '@nahu/admin-kit/queryFilters';
	import { renderComponent } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import DataTableSort from '@nahu/admin-kit/components/Table/data-table-sort.svelte';
	import Statuses from '@nahu/admin-kit/components/Table/statuses.svelte';
	import Edit from './edit.svelte';
	import Delete from './delete.svelte';
	import DeliveryCell from './delivery-cell.svelte';
	import OrderFormFields from './order-form-fields.svelte';
	import OrderItems from '$lib/components/order-items.svelte';
	import Copy from '@nahu/admin-kit/Copy.svelte';
	import DataTableLinks from '@nahu/admin-kit/components/Table/data-table-links.svelte';
	import { FileText } from '@lucide/svelte';
	import { formatEthiopianDate } from '$lib/global.svelte.js';

	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Sheet, Loader, CircleCheckBig, OctagonMinus, Plus } from '@lucide/svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import AddCustomer from '$lib/forms/AddCustomer.svelte';
	import Errors from '@nahu/admin-kit/formComponents/Errors.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
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

	const statusPresets = [
		{ value: 'pending', label: 'Pending', icon: Loader },
		{ value: 'delivered', label: 'Delivered', icon: CircleCheckBig },
		{ value: 'cancelled', label: 'Cancelled', icon: OctagonMinus },
		{ value: 'all', label: 'All', icon: Sheet }
	];

	const columns = [
		{
			accessorKey: 'index',
			header: '#',
			cell: rowNumber,
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
					status: row.original.status ?? 'pending',
					paymentConfirmed: row.original.paymentStatus === 'paid'
				});
			}
		},
		{
			accessorKey: 'phone',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Phone',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => renderComponent(Copy, { data: row.original.phone })
		},
		{
			accessorKey: 'email',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Email',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => renderComponent(Copy, { data: row.original.email })
		},
		{
			accessorKey: 'deliveryAddress',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Delivery Address',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => renderComponent(Copy, { data: row.original.deliveryAddress })
		},
		{
			accessorKey: 'fee',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Fee',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => 'ETB ' + Number(row.original.fee ?? 0)
		},
		{
			accessorKey: 'paymentMethodName',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Payment Method',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => renderComponent(Copy, { data: row.original.paymentMethodName ?? '—' })
		},
		{
			// Whether staff have confirmed the money arrived, apart from the order's own
			// status: confirming it is what queues the order for delivery.
			accessorKey: 'paymentStatus',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Payment',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) =>
				row.original.paymentStatus
					? renderComponent(Statuses, { status: row.original.paymentStatus })
					: '—'
		},
		{
			// Bank-transfer receipts need checking before the order is confirmed, so
			// they're one click away rather than inside the "delivered" dialog.
			accessorKey: 'recieptLink',
			header: 'Receipt',
			sortable: false,
			cell: ({ row }) =>
				row.original.recieptLink
					? renderComponent(DataTableLinks, {
							link: '/files',
							id: row.original.recieptLink,
							name: 'View',
							target: '_blank',
							IconComp: FileText
						})
					: '—'
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
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Created At',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => formatEthiopianDate(new Date(row.original.createdAt))
		},
		{
			accessorKey: 'status',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Status',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => renderComponent(Statuses, { status: row.original.status })
		},
		{
			accessorKey: 'deliveryStatus',
			header: 'Delivery',
			sortable: false,
			cell: ({ row }) =>
				renderComponent(DeliveryCell, {
					orderId: row.original.id,
					orderStatus: row.original.status,
					deliveryStatus: row.original.deliveryStatus
				})
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
					status: row.original.status ?? 'pending',
					paymentConfirmed: row.original.paymentStatus === 'paid'
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
					variant={data.status === preset.value ? 'default' : 'outline'}
					onclick={() => navigateWithQuery({ status: preset.value, page: 1 })}
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
						Save the order, then confirm its payment under Edit — or queue it for cash on delivery
						from the Delivery column. It is dispatched and delivered from the Deliveries page.
					</p>
				</form>
			</DialogComp>
		</div>
	</div>
</div>

<DataTable
	{columns}
	data={data.allData}
	fileName="Orders"
	server={data.table}
	facetKeys={['paymentMethodName', 'paymentStatus']}
	facetLabels={{ paymentMethodName: 'Payment Method', paymentStatus: 'Payment' }}
	dateFilter="Created"
/>
