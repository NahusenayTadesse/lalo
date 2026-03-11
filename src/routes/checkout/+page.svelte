<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import {
		ShoppingCartIcon,
		CreditCard,
		ShieldCheck,
		Package,
		ArrowLeft,
		UserRoundPlus,
		User2,
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

	const cart = useCart();
	let { data } = $props();

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	};

	const { form, errors, enhance, allErrors, delayed, message } = superForm(data.form, {
		dataType: 'json',
		resetForm: true,

		onResult: ({ result }) => {
			// 2. Only clear cart if the server actually says 'success'
			if (result.type === 'success') {
				cart.clearCart();
				// Optional: Add a toast notification here
			}
		}
	});

	const formattedData = $derived(
		cart?.items.map((item) => ({
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

	$effect(() => {
		$form.selectedProducts = formattedData;
	});
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
					<DialogComp title="Sign Up" variant="default" IconComp={UserRoundPlus}>
						<Signup data={data?.signupForm} action="/signup/?/signup" />
					</DialogComp>

					<DialogComp title="Log In" variant="default" IconComp={User}>
						<Login data={data?.loginForm} action="/login/?/login" />
					</DialogComp>
					<form
						action="?/add"
						use:enhance
						id="main"
						class="space-y-5"
						method="post"
						enctype="multipart/form-data"
					>
						<Errors allErrors={$allErrors} />
						<InputComp
							label=""
							name="selectedProducts"
							type="hidden"
							{form}
							{errors}
							placeholder=""
						/>

						<div class="pt-4">
							<Button
								type="submit"
								form="main"
								class="h-12 w-full text-lg shadow-md"
								disabled={cart.items.length === 0 || $delayed}
							>
								{#if $delayed}
									<LoadingBtn name="Processing..." />
								{:else}
									Complete Order — {formatPrice(cart.totalPrice)}
								{/if}
							</Button>
						</div>
					</form>
				{:else if data?.user}
					<form
						action="?/add"
						use:enhance
						id="main"
						class="space-y-5"
						method="post"
						enctype="multipart/form-data"
					>
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
								<p class="text-lg font-bold text-gray-900">{formatPrice(cart.totalPrice)}</p>
							</div>
						</div>

						<div class="pt-4">
							<Button
								type="submit"
								form="main"
								class="h-12 w-full text-lg shadow-md"
								disabled={cart.items.length === 0 || $delayed}
							>
								{#if $delayed}
									<LoadingBtn name="Processing..." />
								{:else}
									Complete Order — {formatPrice(cart.totalPrice)}
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
								{#each cart.items as item (item.productId)}
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
								<span class="font-medium text-green-600">Free</span>
							</div>
							<div class="flex justify-between border-t pt-3 text-lg font-bold">
								<span>Total</span>
								<span class="text-primary">{formatPrice(cart.totalPrice)}</span>
							</div>
						</div>
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
