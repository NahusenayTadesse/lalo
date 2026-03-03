<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { ChevronRightIcon, SearchIcon } from '@lucide/svelte';
	import OrderCard from './order-card.svelte';
	import type { Snippet } from 'svelte';
	import Edit from './edit.svelte';
	import type { Item } from '$lib/global.svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import type { Edit as EditOrder } from './schema';

	interface Props {
		orders: any[];
		orderItems?: any[];
		customerList: Item[];
		productList: Item[];
		data: SuperValidated<Infer<EditOrder>>;
		currency?: string;
		isAdmin?: boolean;
	}

	const {
		orders = [],
		orderItems = [],
		currency = 'ETB',
		isAdmin = false,
		productList,
		data,
		customerList
	}: Props = $props();

	let searchQuery = $state('');
	let statusFilter = $state('all');

	const filteredOrders = $derived.by(() => {
		return orders.filter((order) => {
			const matchesSearch =
				order.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				String(order.id).includes(searchQuery);
			const matchesStatus =
				statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase();
			return matchesSearch && matchesStatus;
		});
	});

	const getOrderItems = (orderId: string | number) => {
		return orderItems.filter((item) => Number(item.orderId) === Number(orderId));
	};

	const uniqueStatuses = $derived(['all', ...new Set(orders.map((o) => o.status.toLowerCase()))]);
</script>

<div class="w-full space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4">
		<div>
			<h1 class="text-3xl font-bold">Orders</h1>
			<p class="mt-1 text-muted-foreground">
				{filteredOrders.length} of {orders.length} orders
			</p>
		</div>

		<!-- Filters -->
		<div class="flex flex-col gap-3 sm:flex-row">
			<div class="relative flex-1">
				<SearchIcon class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search by order name or ID..."
					bind:value={searchQuery}
					class="pl-10"
				/>
			</div>
			<Select type="single" bind:value={statusFilter}>
				<SelectTrigger class="w-full sm:w-48">
					{statusFilter === 'all'
						? 'All Statuses'
						: statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
				</SelectTrigger>
				<SelectContent>
					{#each uniqueStatuses as status}
						<SelectItem value={status}>
							{status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
						</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		</div>
	</div>

	<!-- Orders Grid -->
	{#if filteredOrders.length > 0}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredOrders as order (order.id)}
				<OrderCard {order} orderItems={getOrderItems(order.id)} {currency} {isAdmin}>
					{#snippet children({ order: cardOrder })}
						<Edit
							id={order.id}
							customer={Number(order.customerId)}
							{customerList}
							customerName="{order.name},"
							{orderItems}
							{productList}
							{data}
							icon={true}
							status={order.status}
						/>
					{/snippet}
				</OrderCard>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<p class="text-lg font-semibold text-foreground">No orders found</p>
			<p class="mt-1 text-muted-foreground">
				{searchQuery ? 'Try adjusting your search' : 'No orders to display'}
			</p>
		</div>
	{/if}
</div>
