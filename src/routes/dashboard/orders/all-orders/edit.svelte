<script lang="ts">
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { SquarePen, Plus, X } from '@lucide/svelte';
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
		orderItems,
		icon = false,
		status = true
	}: {
		data: SuperValidated<Infer<Edit>>;
		id: number;
		customer: number;
		customerName: string;
		customerList: Item[];
		productList: Item[];
		orderItems: OrderItem[];
		icon: boolean;
		status: boolean;
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
			quantity: item.quantity
		}));
	};

	$form.id = id;
	$form.customer = customer;

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

	let arrParts = `flex flex-col justify-start gap-2 w-full`;
</script>

<Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger class="{buttonVariants({ variant: 'ghost' })} justify-self-start p-0!">
			<Dialog.Root bind:open>
				<Dialog.Trigger class="flex w-auto flex-row items-center justify-center gap-2 border-0">
					{#if icon}
						<SquarePen /> Edit
					{:else}
						{customerName}
					{/if}
				</Dialog.Trigger>

				<Dialog.Content class="bg-background">
					<ScrollArea class="h-128 w-full px-2 pr-4" orientation="both">
						<Dialog.Header>
							<Dialog.Title class="text-center text-4xl">Edit {customerName}</Dialog.Title>
						</Dialog.Header>
						<form
							action="?/edit"
							use:enhance
							method="post"
							id="edit"
							class="flex w-full flex-col gap-4 p-4"
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
							{#each $form.selectedProducts as product, i}
								<div
									class="flex w-full flex-col items-end gap-3
 rounded-lg border
 border-white/20 bg-white/10 p-3 shadow-lg
  backdrop-blur-lg lg:flex-row dark:border-black/20 dark:bg-gray-700"
									transition:fly={{ x: -200, duration: 200 }}
								>
									<div class={arrParts}>
										<Label for="product">Selling Product</Label>

										<ComboboxComp
											items={productList}
											name="selectedProducts"
											required={true}
											bind:value={$form.selectedProducts[i].product}
										/>

										{#if $errors.selectedProducts?.[i]?.product}
											<p class="text-sm text-red-500">{$errors.selectedProducts[i].product}</p>
										{/if}
									</div>

									<div class={arrParts}>
										<Label for="quantity">Number of Product</Label>

										<Input
											type="number"
											min="1"
											name="quantity"
											bind:value={$form.selectedProducts[i].quantity}
										/>

										{#if $errors.selectedProducts?.[i]?.quantity}
											<p class="text-sm text-red-500">{$errors.selectedProducts[i].quantity}</p>
										{/if}
									</div>
									<Button
										type="button"
										variant="outline"
										title="Remove this product from list"
										onclick={() => {
											$form.selectedProducts.splice(i, 1);
											$form.selectedProducts = $form.selectedProducts;
										}}
									>
										<X class="h-8 w-8" />
									</Button>
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

							<Button type="submit" class="mt-4" form="edit">
								{#if $delayed}
									<LoadingBtn name="Saving Changes" />
								{:else}
									<Plus class="h-4 w-4" />

									Save Changes
								{/if}
							</Button>
						</form>
					</ScrollArea>
				</Dialog.Content>
			</Dialog.Root>
		</Tooltip.Trigger>
		<Tooltip.Content>
			<p>Edit {customerName}</p>
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
