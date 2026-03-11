<script lang="ts">
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { SquarePen, Plus, X, Save } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Edit } from './schema';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	import ComboboxComp from '$lib/formComponents/ComboboxComp.svelte';
	import { fly } from 'svelte/transition';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';

	type Item = {
		value: number;
		name: string;
	};

	type OrderItem = {
		id: string | number;
		orderId: string | number;
		product: string;
		amount: number | string;
		productId: string | number;
		quantity: number | string;
		price: string | number;
		total: number;
	};

	let {
		data,
		id,
		customer,
		customerName,
		customerList,
		productList,
		paymentMethod,
		priceList,
		image = '',
		orderItems,
		icon = false,
		status = true,
		paymentMethodList
	}: {
		data: SuperValidated<Infer<Edit>>;
		id: number;
		customer: number;
		customerName: string;
		customerList: Item[];
		productList: Item[];
		priceList: Item[];
		orderItems: OrderItem[];
		icon: boolean;
		paymentMethod?: number;
		status: boolean;
		paymentMethodList: Item[];
		image?: '';
	} = $props();

	const { form, errors, enhance, delayed, message, allErrors } = superForm(data, {
		resetForm: false,
		dataType: 'json'
	});

	let open = $state(false);

	function addProduct() {
		$form.selectedProducts = [...$form.selectedProducts, { product: 0, quantity: 1 }];
	}

	interface SimpleProduct {
		product: number; // This is the productId
		quantity: number;
	}

	const simplifyOrderItems = (items: OrderItem[]): SimpleProduct[] => {
		return items.map((item) => ({
			product: item.productId,
			quantity: item.quantity,
			amount: item.price + ' ' + item.amount
		}));
	};

	$form.id = id;
	$form.customer = customer;

	if (paymentMethod) {
		$form.paymentMethod = paymentMethod;
	}

	$form.selectedProducts = simplifyOrderItems(
		orderItems.filter((item) => Number(item.orderId) === Number(id))
	);
	$form.status = status;

	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
				open = false;
			}
		}
	});
</script>

<!-- <Tooltip.Provider>
    	<Tooltip.Root>
    		<Tooltip.Trigger class="{buttonVariants({ variant: 'ghost' })} justify-self-start p-0!"> -->
<Dialog.Root bind:open>
	<Dialog.Trigger class="flex w-auto flex-row items-center justify-center gap-2 border-0">
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#if icon}
					<SquarePen /> Edit
				{:else}
					{customerName}
				{/if}
			</Tooltip.Trigger>
			<Tooltip.Content>Edit {customerName}</Tooltip.Content>
		</Tooltip.Root>
	</Dialog.Trigger>

	<Dialog.Content class="bg-background px-4">
		<ScrollArea class="h-128 w-full px-2" orientation="both">
			<Dialog.Header>
				<Dialog.Title class="text-center text-4xl">Edit {customerName}</Dialog.Title>
			</Dialog.Header>
			<form
				action="/dashboard/orders/?/edit"
				use:enhance
				method="post"
				id="edit"
				class="mt-4 flex flex-col gap-4"
				enctype="multipart/form-data"
			>
				<Errors allErrors={$allErrors} />
				<input type="hidden" name="id" value={$form.id} />
				<InputComp
					label="Customer"
					name="customer"
					type="combo"
					{form}
					{errors}
					items={customerList}
				/>
				<div class="mb-4 flex justify-end">
					<Button type="button" size="sm" class="gap-2" onclick={() => addProduct()}>
						<Plus class="h-4 w-4" />
						<span>Add Product</span>
					</Button>
				</div>

				{#each $form.selectedProducts as product, i (product)}
					<div
						class="group relative mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all dark:border-white/10 dark:bg-white/5"
						transition:fly={{ y: 20, duration: 200 }}
					>
						<div
							class="mb-4 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-white/5"
						>
							<span class="text-xs font-bold tracking-widest text-muted-foreground uppercase">
								Product Entry #{i + 1}
							</span>

							<Button
								type="button"
								variant="ghost"
								size="sm"
								class="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
								onclick={() => {
									$form.selectedProducts.splice(i, 1);
									$form.selectedProducts = $form.selectedProducts;
								}}
							>
								<X class="h-4 w-4" />
								<span class="sr-only">Remove item</span>
							</Button>
						</div>

						<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<div class="space-y-1.5">
								<Label class="text-xs font-medium text-slate-500">Selling Product</Label>
								<ComboboxComp
									items={productList}
									name="selectedProducts"
									required={true}
									bind:value={$form.selectedProducts[i].product}
								/>
								{#if $errors.selectedProducts?.[i]?.product}
									<p class="text-[11px] font-medium text-destructive">
										{$errors.selectedProducts[i].product}
									</p>
								{/if}
							</div>

							<div class="space-y-1.5">
								<Label class="text-xs font-medium text-slate-500">Price Amount</Label>
								<ComboboxComp
									items={$form.selectedProducts[i].product
										? priceList.filter(
												(p) => Number(p.productId) === $form.selectedProducts[i].product
											)
										: [{ value: '', name: 'Select a product first' }]}
									name="selectedProducts"
									required={true}
									bind:value={$form.selectedProducts[i].amount}
								/>
								{#if $errors.selectedProducts?.[i]?.amount}
									<p class="text-[11px] font-medium text-destructive">
										{$errors.selectedProducts[i].amount}
									</p>
								{/if}
							</div>

							<div class="space-y-1.5 lg:col-span-2">
								<Label class="text-xs font-medium text-slate-500">Quantity</Label>
								<Input
									type="number"
									min="1"
									placeholder="Enter quantity..."
									bind:value={$form.selectedProducts[i].quantity}
								/>
								{#if $errors.selectedProducts?.[i]?.quantity}
									<p class="text-[11px] font-medium text-destructive">
										{$errors.selectedProducts[i].quantity}
									</p>
								{/if}
							</div>
						</div>
					</div>
				{/each}

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

				{#if $form.status === 'delivered'}
					<InputComp
						label="Payment Method"
						name="paymentMethod"
						type="combo"
						{form}
						{errors}
						items={paymentMethodList}
					/>

					<InputComp
						label="Reciept"
						name="reciept"
						type="file"
						{form}
						{image}
						{errors}
						placeholder="Upload Screenshot or PDF of Reciept"
					/>
				{/if}

				<Button type="submit" class="mt-4" form="edit">
					{#if $delayed}
						<LoadingBtn name="Saving Changes" />
					{:else}
						<Save class="h-4 w-4" />

						Save Changes
					{/if}
				</Button>
			</form>
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
