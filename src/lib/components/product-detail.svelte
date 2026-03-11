<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { ShareIcon, PlusIcon, CheckIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	type Props = {
		productId: number;
		productName: string;
		price: number | string;
		description: string;
		image?: string;
		category?: string;
		images?: string[];
		priceList?: { price: number | string; amount: number | string }[];
	};

	const { productId, productName, price, description, image, category, images, priceList }: Props =
		$props();

	let quantity = $state(1);

	import { useCart } from '$lib/hooks/cart.svelte.js';

	const cart = useCart();

	let justAdded = $state(false);

	let currentPrice = $state(typeof price === 'string' ? parseFloat(price) : price);
	let currentAmount = $state(priceList?.[0]?.amount ?? '');

	// Reusable formatter (performance friendly)
	const formatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'ETB'
	});

	// Derived values for clarity
	const numericPrice = $derived(
		typeof price === 'string' ? parseFloat(currentPrice) : currentPrice
	);
	const formattedPrice = $derived(formatter.format(numericPrice));
	const quantityInCart = $derived(cart.items.find((i) => i.productId === productId)?.quantity ?? 0);

	function addToCart() {
		if (justAdded) return; // Prevent double-clicks during animation

		cart.addItem({ productId, productName, price: numericPrice, amount: currentAmount });
		justAdded = true;

		toast.success(`${productName} added to cart`, {
			description: `Total in cart: ${quantityInCart + quantity - 1}`
		});

		setTimeout(() => {
			justAdded = false;
		}, 1500);
	}

	const handleShare = () => {
		toast.success('Link copied to clipboard');
	};

	const incrementQuantity = () => {
		quantity += 1;
	};

	const decrementQuantity = () => {
		if (quantity > 1) {
			quantity -= 1;
		}
	};

	let displayImage = $state(image);

	function changePrice(product: { price: number | string; amount: number | string }) {
		currentPrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
		currentAmount = product.amount;
	}
</script>

<div class="min-h-dvh bg-linear-to-b from-background via-background to-muted/20">
	<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="grid gap-8 lg:grid-cols-2 lg:gap-12">
			<!-- Product Image Section -->
			<div class="flex flex-col gap-4">
				<div class="shadow-lg-lg relative overflow-hidden rounded-2xl bg-muted/50">
					<img
						src="/files/{displayImage}"
						alt={productName}
						class="aspect-square w-full object-cover transition-transform duration-300 hover:scale-105"
					/>
					{#if category}
						<Badge class="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm">
							{category}
						</Badge>
					{/if}
				</div>
				<!-- Thumbnail placeholder -->
				<div class="flex gap-2">
					{#each images as image, i (i)}
						<button
							class="aspect-square w-20 overflow-hidden rounded-lg border-2 border-transparent bg-muted/50 transition-all duration-200 hover:border-primary"
							aria-label="View image {i + 1}"
							onclick={() => (displayImage = image)}
						>
							<img
								src="/files/{image}"
								alt="Product thumbnail {i + 1}"
								class="h-full w-full object-cover"
							/>
						</button>
					{/each}
				</div>
			</div>

			<!-- Product Info Section -->
			<div class="flex flex-col">
				<div class="space-y-6">
					<!-- Header -->
					<div class="space-y-3">
						<h1 class="text-4xl font-bold tracking-tight text-foreground">
							{productName}
						</h1>
						<div class="flex items-baseline gap-3">
							<span class="text-3xl font-bold text-primary">
								{formattedPrice}
							</span>
						</div>
					</div>

					<!-- Description -->
					<div class="flex flex-col gap-2">
						<p class="text-base leading-relaxed text-muted-foreground">
							{description}
						</p>
					</div>
				</div>

				<div class="max-w-xl p-4">
					<h3 class="mb-4 text-sm font-semibold tracking-wider text-gray-500 uppercase">
						Select Package
					</h3>

					<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{#each priceList as product (product)}
							{@const numericPrice =
								typeof product.price === 'string' ? parseFloat(product.price) : product.price}
							{@const isActive = currentPrice === numericPrice}

							<button
								onclick={() => changePrice(product)}
								class="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-foreground p-5 transition-all duration-200 ease-out
								{isActive
									? 'scale-[1.02] border-primary shadow-md'
									: 'border-foreground hover:border-accent hover:shadow-sm'}"
							>
								<span
									class="text-xl font-black tracking-tight transition-colors {isActive
										? 'text-foreground'
										: 'text-foreground/80'}"
								>
									{product.amount}
								</span>

								<span
									class="text-xs font-medium tracking-wider uppercase transition-colors {isActive
										? 'text-foreground'
										: 'text-foreground/80'}"
								>
									{product.price} ETB
								</span>

								{#if isActive}
									<Badge
										class="absolute -top-2 px-4 text-[10px] font-bold tracking-widest  uppercase"
									>
										Selected
									</Badge>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<div class="mt-8 flex flex-col gap-4">
					<!-- Quantity Selector -->
					<div class="flex items-center gap-4">
						<span class="text-sm font-medium text-muted-foreground">Quantity</span>
						<div class="flex items-center gap-2 rounded-lg border border-input bg-background p-1">
							<button
								onclick={decrementQuantity}
								class="flex size-8 items-center justify-center rounded transition-colors hover:bg-muted"
								aria-label="Decrease quantity">−</button
							>
							<span class="w-8 text-center font-semibold">{quantity}</span>
							<button
								onclick={incrementQuantity}
								class="flex size-8 items-center justify-center rounded transition-colors hover:bg-muted"
								aria-label="Increase quantity">+</button
							>
						</div>
					</div>

					<!-- Main Buttons -->
					<div class="flex gap-3">
						<Button
							class="w-full transition-all active:scale-95"
							onclick={addToCart}
							variant={justAdded ? 'outline' : 'default'}
							disabled={justAdded}
						>
							{#if justAdded}
								<CheckIcon class="mr-2 size-4 text-green-500" />
								Added to Cart
							{:else}
								<PlusIcon class="mr-2 size-4" />
								Add to Cart
							{/if}
						</Button>
					</div>

					<!-- Share Button -->
					<Button variant="outline" class="w-full gap-2" onclick={handleShare}>
						<ShareIcon size={18} />
						Share Product
					</Button>
				</div>
			</div>
		</div>
	</div>
</div>
