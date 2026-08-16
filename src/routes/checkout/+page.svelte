<script lang="ts">
	import { useCart, cartKey } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import {
		ShoppingCartIcon,
		CreditCard,
		Package,
		ArrowLeft,
		UserRoundPlus,
		User
	} from '@lucide/svelte';
	import CartItem from '$lib/components/floating-cart/cart-item.svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import Signup from '$lib/forms/Signup.svelte';
	import Login from '$lib/forms/Login.svelte';
	import { onMount } from 'svelte';

	const cart = useCart();
	let { data } = $props();

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'ETB'
		}).format(price);
	};
	let saveInfo = $state(false);
	let freeDelivery = $derived(cart.totalPrice >= Number(data?.freeData?.threshold));
	const fee = $derived(
		freeDelivery ? 0 : data?.placeList?.find((item) => item.name === $form.address)?.fee
	);

	/**
	 * The fee as a usable number.
	 *
	 * `fee` is `undefined` until a delivery area is chosen, and `Number(undefined)`
	 * is `NaN` — which `??` does not catch, so the old `Number(fee) ?? 0` left
	 * `NaN` in the form and rendered "Delivery Fee: NaN" and "ETBNaN".
	 */
	const feeAmount = $derived(Number.isFinite(Number(fee)) ? Number(fee) : 0);

	/** Whether we can quote a fee yet, as opposed to defaulting it to zero. */
	const feeKnown = $derived(
		freeDelivery || Boolean(data?.placeList?.some((item) => item.name === $form.address))
	);

	/** What the customer will actually be charged: goods plus delivery. */
	const orderTotal = $derived(cart.totalPrice + feeAmount);


	/** Unique per instance — see the note in `Signup.svelte`; a shared `id="main"`
	 *  had the signup dialog's button submitting this order form. */
	const formId = $props.id();

	const { form, errors, enhance, allErrors, delayed, message } = superForm(data.form, {
		dataType: 'json',
		resetForm: true,
		onChange: (event) => {
			if (event.paths.includes('address') || event.paths.includes('deliveryAddress')) {
				saveInfo = true;
				$form.fee = feeAmount;
			}
		},

		onResult: ({ result }) => {
			// 2. Only clear cart if the server actually says 'success'
			if (result.type === 'success') {
				cart.clearCart();
				
			}
		}
	});

	const formattedData = $derived(
		cart?.items.map((item) => ({
			priceId: item.priceId,
			product: item.productId,
			quantity: item.quantity,
			amount: item.amount,
			price: item.price
		})) || []
	);

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') toast.error($message.text);
			else {
				toast.success($message.text);
			}
		}
	});


	/**
	 * Tells the schema whether to demand contact details.
	 *
	 * Only a validation switch — the action ignores what is posted here and
	 * decides from the session, so it cannot be flipped to skip the checks.
	 */
	$effect(() => {
		$form.guest = !data?.user;
	});

	onMount(() => {
		if (data?.user) {
			$form.address = data?.customerInfo?.address ?? '';
			$form.deliveryAddress = data?.customerInfo?.deliveryAddress ?? '';
			$form.fee = feeAmount;
		}

		reconcileCart();
	});




	$effect(() => {
		$form.selectedProducts = formattedData;
	});

	/**
	 * Bring the cart in line with the catalogue before anything can be submitted.
	 *
	 * Cart lines are a snapshot: price and label are stored when the item is added
	 * and never revisited, while the checkout action prices the order from the
	 * database. Without this the page can quote one figure and the order — and the
	 * confirmation email — record another, with nothing said to the customer.
	 */
	let reconciled = $state(false);
	let repricedItems = $state<{ name: string; from: number; to: number }[]>([]);
	let removedItems = $state<string[]>([]);

	async function reconcileCart() {
		repricedItems = [];
		removedItems = [];

		const priceIds = cart.items.map((item) => item.priceId);
		if (!priceIds.length) {
			reconciled = true;
			return;
		}

		let current: { id: number; price: string; amount: string }[];
		try {
			const res = await fetch('/checkout/prices', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ priceIds })
			});
			if (!res.ok) throw new Error(`Price check failed: ${res.status}`);
			current = await res.json();
		} catch (err) {
			// Leave the cart untouched and let the customer through — the server
			// prices the order regardless, so the worst case is the old behaviour.
			console.error('Could not re-check cart prices:', err);
			reconciled = true;
			return;
		}

		for (const item of [...cart.items]) {
			const row = current.find((c) => c.id === item.priceId);

			if (!row) {
				removedItems.push(item.productName);
				cart.removeItem(item.priceId);
				continue;
			}

			const price = Number(row.price);
			if (price !== item.price) {
				repricedItems.push({ name: item.productName, from: item.price, to: price });
			}
			cart.syncVariant(item.priceId, price, row.amount);
		}

		reconciled = true;
	}
</script>

<svelte:head>
	<title>Checkout - Lalo Bakery</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 md:py-12">
	<div class="mb-8 flex items-center gap-3">
		<div class="rounded-full bg-primary/10 p-2 text-primary">
			<ShoppingCartIcon class="size-6" />
		</div>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Checkout</h1>
			<p class="text-muted-foreground">Review your items and provide shipping details.</p>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-12 lg:grid-cols-12">
		<div class="lg:col-span-7">
			<section class="rounded-xl border bg-card p-6 shadow-sm">
				<div class="mb-6 flex items-center gap-2 border-b pb-4">
					<CreditCard class="size-5 text-muted-foreground" />
					<h2 class="text-xl font-semibold">Contact Information</h2>
				</div>

				{#if !data?.user}
					<!-- Guests order without an account: the details below become a
					     standalone `customers` row. Signing up is offered, not required. -->
					<div class="mb-6 rounded-lg border border-dashed bg-muted/40 p-4">
						<p class="text-sm text-muted-foreground">
							You can check out as a guest — just fill in your details below. Already have an
							account, or want to save your details for next time?
						</p>
						<div class="mt-3 flex flex-wrap gap-2">
							<DialogComp title="Sign Up" variant="default" IconComp={UserRoundPlus}>
								<Signup data={data?.signupForm} action="/signup?/signup" placeList={data?.placeList} />
							</DialogComp>

							<DialogComp title="Log In" variant="outline" IconComp={User}>
								<Login data={data?.loginForm} action="/login?/login" />
							</DialogComp>
						</div>
					</div>

					<form
						action="?/add"
						use:enhance
						id={formId}
						class="space-y-5"
						method="post"
						enctype="multipart/form-data"
					>
						<Errors allErrors={$allErrors} />

						<InputComp
							label="Full Name"
							name="guestName"
							type="text"
							{form}
							{errors}
							required
							placeholder="John Doe"
						/>

						<InputComp
							label="Email Address"
							name="guestEmail"
							type="email"
							{form}
							{errors}
							required
							placeholder="john@example.com"
						/>

						<InputComp
							label="Phone Number"
							name="guestPhone"
							type="tel"
							{form}
							{errors}
							required
							placeholder="+251 9-11-00-00-00"
						/>

						<InputComp
							label="Delivery Area"
							name="address"
							type="select"
							items={data?.placeList}
							{form}
							{errors}
							placeholder="Select your area"
						/>

						<InputComp
							label="Delivery Address"
							name="deliveryAddress"
							type="text"
							{form}
							{errors}
							required
							placeholder="Enter your specific delivery address"
						/>

						<InputComp
							label="Delivery Fee"
							name="fee"
							type="text"
							{form}
							disabled
							{errors}
							placeholder="Choose a delivery area"
						/>

						<InputComp
							label=""
							name="selectedProducts"
							type="hidden"
							{form}
							{errors}
							placeholder=""
						/>

						<div
							class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
						>
							<div>
								<p class="text-xs font-bold tracking-wider text-gray-500 uppercase">Your Cart</p>
								<p class="text-sm text-gray-600">{cart.totalItems} items</p>
							</div>
							<div class="text-right">
								<p class="text-lg font-bold text-gray-900">{formatPrice(orderTotal)}</p>
							</div>
						</div>

						<div class="pt-4">
							<Button
								type="submit"
								form={formId}
								class="h-12 w-full text-lg shadow-md"
								disabled={cart.items.length === 0 || $delayed || !reconciled}
							>
								{#if $delayed}
									<LoadingBtn name="Processing..." />
								{:else if !reconciled}
									<LoadingBtn name="Checking prices..." />
								{:else}
									Complete Order — {formatPrice(orderTotal)}
								{/if}
							</Button>
						</div>
					</form>
				{:else if data?.user}
					<form
						action="?/add"
						use:enhance
						id={formId}
						class="space-y-5"
						method="post"
						enctype="multipart/form-data"
					>
							
						<InputComp
							label="Address"
							name="address"
							type="select"
							items={data?.placeList}
							{form}
							{errors}
							placeholder="Enter your delivery address"
							/>

							<InputComp
							label="Delivery Address"
							name="deliveryAddress"
							type="text"
							{form}
							{errors}
							placeholder="Enter your specific delivery address"
							/>

							<InputComp
							label="Delivery Fee"
							name="fee"
							type="text"
							{form}
							disabled
							{errors}
							placeholder="Enter delivery fee"
							/>
                         {#if saveInfo}
							<InputComp
							label="Save Information"
							name="saveInfo"
							type="checkboxSingle"
							{form}
							disabled
							{errors}
							placeholder="Save this information for future orders."
							/>
                        {/if}

						<InputComp
							label=""
							name="selectedProducts"
							type="hidden"
							{form}
							{errors}
							placeholder=""
						/>
						<div
							class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
						>
							<div>
								<p class="text-xs font-bold tracking-wider text-gray-500 uppercase">Your Cart</p>
								<p class="text-sm text-gray-600">{cart.totalItems} items</p>
							</div>
							<div class="text-right">
								<p class="text-lg font-bold text-gray-900">{formatPrice(orderTotal)}</p>
							</div>
						</div>

						<div class="pt-4">
							<Button
								type="submit"
								form={formId}
								class="h-12 w-full text-lg shadow-md"
								disabled={cart.items.length === 0 || $delayed || !reconciled}
							>
								{#if $delayed}
									<LoadingBtn name="Processing..." />
								{:else if !reconciled}
									<LoadingBtn name="Checking prices..." />
								{:else}
									Complete Order — {formatPrice(orderTotal)}
								{/if}
							</Button>
						</div>
					</form>
				{/if}
			</section>
		</div>

		<div class="lg:col-span-5">
			<div class="sticky top-8 space-y-6">
				<div class="rounded-xl border bg-muted/30 p-6">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-semibold">Order Summary</h2>
						<span
							class="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground"
						>
							{cart.totalItems} Items
						</span>
					</div>

					{#if cart.items.length > 0}
						<ScrollArea class="max-h-100 pr-4">
							<div class="divide-y divide-border">
								<!-- Keyed on the variant, not the product: the cart holds one line per
								     variant, so keying on `productId` alone produced duplicate keys and
								     a fatal `each_key_duplicate` as soon as someone picked two
								     packages of the same product. -->
								{#each cart.items as item (cartKey(item))}
									<div class="py-3">
										<CartItem {item} />
									</div>
								{/each}
							</div>
						</ScrollArea>

						<div class="mt-6 space-y-3 border-t pt-4">
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">Subtotal</span>
								<span>{formatPrice(cart.totalPrice)}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">Shipping</span>
								<!-- Guests choose a delivery area too, so the quote no longer
								     depends on being signed in. -->
								{#if feeKnown}
									<span class="font-medium text-green-600">
										{feeAmount !== 0 ? formatPrice(feeAmount) : 'Free'}
									</span>
								{:else}
									<span class="text-muted-foreground">Select a delivery area</span>
								{/if}
							</div>
							<!-- Delivery is part of what gets charged, so it belongs in the total.
							     This used to repeat the subtotal, quoting the customer a figure
							     that was short by the whole delivery fee. -->
							<div class="flex justify-between border-t pt-3 text-lg font-bold">
								<span>Total</span>
								<span class="text-primary">{formatPrice(orderTotal)}</span>
							</div>
						</div>

						{#if repricedItems.length || removedItems.length}
							<div
								class="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
								role="status"
							>
								<p class="font-medium">Your cart was updated</p>
								<ul class="mt-1 space-y-0.5 text-muted-foreground">
									{#each repricedItems as change (change.name + change.to)}
										<li>
											{change.name} is now {formatPrice(change.to)} (was {formatPrice(change.from)})
										</li>
									{/each}
									{#each removedItems as name (name)}
										<li>{name} is no longer available and was removed</li>
									{/each}
								</ul>
								<p class="mt-2 text-xs text-muted-foreground">
									The total above is what you will be charged.
								</p>
							</div>
						{/if}
					{:else}
						<div class="py-12 text-center">
							<Package class="mx-auto mb-3 size-10 text-muted-foreground/40" />
							<p class="text-sm font-medium">Your cart is empty</p>
							<Button href="/shop" variant="outline"><ArrowLeft /> Browse Products</Button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
