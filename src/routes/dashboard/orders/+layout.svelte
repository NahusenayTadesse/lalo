<script>
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';

	import { Sheet, Loader, CircleCheckBig, OctagonMinus } from '@lucide/svelte';
	let { data, children } = $props();

	import { toast } from 'svelte-sonner';

	function addProduct() {
		$form.selectedProducts = [...$form.selectedProducts, { product: 0, quantity: 1 }];
	}

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	import { superForm } from 'sveltekit-superforms/client';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Plus, X } from '@lucide/svelte';

	const { form, errors, enhance, delayed, message } = superForm(data.form, {
		dataType: 'json'
	});

	import { fly } from 'svelte/transition';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import ComboboxComp from '$lib/formComponents/ComboboxComp.svelte';
</script>

<div class="mb-8 flex flex-row items-center justify-start gap-2">
	<Button
		variant={page.url.pathname === '/dashboard/orders/all-orders' ? 'default' : 'outline'}
		href="/dashboard/orders/all-orders"><Sheet /> All Orders</Button
	>

	<Button
		variant={page.url.pathname === '/dashboard/orders' ? 'default' : 'outline'}
		href="/dashboard/orders"><Loader /> Pending Orders</Button
	>
	<Button
		variant={page.url.pathname === '/dashboard/orders/delivered' ? 'default' : 'outline'}
		href="/dashboard/orders/delivered"><CircleCheckBig /> Delivered Orders</Button
	>

	<Button
		variant={page.url.pathname === '/dashboard/orders/cancelled' ? 'default' : 'outline'}
		href="/dashboard/orders/cancelled"><OctagonMinus /> Cancelled Orders</Button
	>
</div>

<DialogComp title="+ Add New Order" variant="default">
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
							items={data?.fetchedProducts}
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
								? data?.fetchedPrices.filter(
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

		<Button type="submit" form="main">
			{#if $delayed}
				<LoadingBtn name="Adding Order" />
			{:else}
				<Plus /> Add Order
			{/if}
		</Button>
	</form>
</DialogComp>

{@render children?.()}
