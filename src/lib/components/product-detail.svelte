<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ShareIcon, PlusIcon, CheckIcon, Plus, Minus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	type Props = {
		productId: number;
		productName: string;
		price: number | string | null;
		description: string | null;
		image?: string | null;
		category?: string | null;
		images?: string[];
		priceList?: { id: number; price: number | string; amount: string }[];
	};

	const { productId, productName, price, description, image, category, images, priceList }: Props =
		$props();

	

	import { useCart } from '$lib/hooks/cart.svelte.js';
	import Input from './ui/input/input.svelte';

	const cart = useCart();

	let justAdded = $state(false);

	/**
	 * The selected variant, tracked by `prices.id`.
	 *
	 * Previously the price came from the `price` prop — `MIN(prices.price)` — while
	 * the amount came from `priceList[0]`, an unordered row. The two were different
	 * variants often enough to matter, so the page displayed one price and added
	 * another to the cart. Everything shown and added now comes from one row.
	 */
	const variants = $derived(priceList ?? []);
	let currentPriceId = $state<number | undefined>(undefined);
	const selected = $derived(variants.find((v) => v.id === currentPriceId) ?? variants[0]);

	// Reusable formatter (performance friendly)
	const formatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'ETB'
	});

	// Derived values for clarity
	const numericPrice = $derived(Number(selected?.price ?? 0));
	const formattedPrice = $derived(formatter.format(numericPrice));
	const quantityInCart = $derived(
		cart.items.find((i) => i.priceId === selected?.id)?.quantity ?? 0
	);

	let quantity = $state(1);

	/**
	 * `min="1"` on a number input only styles the spinner — it does not stop the
	 * customer typing `-5` or clearing the box, either of which binds to `null`.
	 * That used to reach the cart as `quantity: null`, showing a line with a blank
	 * quantity and a zero total.
	 */
	const safeQuantity = $derived(Math.max(1, Math.floor(Number(quantity)) || 1));

	function addToCart() {
		if (justAdded || !selected) return; // Prevent double-clicks during animation

		cart.addItem(
			{
				priceId: selected.id,
				productId,
				productName,
				price: numericPrice,
				amount: selected.amount
			},
			safeQuantity
		);
		justAdded = true;

		toast.success(`${productName} added to cart`, {
			// `quantityInCart` is the value from before this add, so the new total is
			// the two summed. The old `- 1` here was simply wrong.
			description: `Total in cart: ${quantityInCart + safeQuantity}`
		});

		setTimeout(() => {
			justAdded = false;
		}, 1500);
	}

	const handleShare = () => {
		toast.success('Link copied to clipboard');
	};

	// These choose *how many to add*; they must not touch the cart. Writing to it
	// here meant nudging the stepper silently overwrote the quantity of a line
	// already in the cart, and then "Add to Cart" added that number again on top —
	// setting the stepper to 3 and pressing Add once ended up with six. The cart's
	// own +/- controls in `cart-item.svelte` are the place to edit a cart line.
	const incrementQuantity = () => {
		quantity = safeQuantity + 1;
	};

	const decrementQuantity = () => {
		quantity = Math.max(1, safeQuantity - 1);
	};



	let displayImage = $derived(image);

	function changePrice(product: { id: number }) {
		currentPriceId = product.id;
	}

</script>

<div class="min-h-dvh bg-background">
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
							<!-- A product with no variants has no price to show; the old markup
							     printed "ETB 0.00", which is not the same thing. -->
							{#if selected}
								<span class="text-3xl font-bold text-primary">{formattedPrice}</span>
							{:else}
								<span class="text-lg font-medium text-muted-foreground">
									Currently unavailable
								</span>
							{/if}
						</div>
					</div>

					<!-- Description -->
					<div class="flex flex-col gap-2">
						<p class="text-base leading-relaxed text-muted-foreground">
							{description}
						</p>
					</div>
				</div>

				<div class="max-w-xl p-4" class:hidden={!variants.length}>
					<h3 class="mb-4 text-sm font-semibold tracking-wider text-gray-500 uppercase">
						Select Package
					</h3>

					<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{#each variants as product (product.id)}
							<!-- Compared by variant id, not by price: two variants at the same
							     price used to both render as selected. -->
							{@const isActive = selected?.id === product.id}

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
							<Button
								onclick={decrementQuantity}
								size="icon"
								aria-label="Decrease quantity"><Minus class="size-4" /></Button
							>
							<!-- <span class="w-8 text-center font-semibold">{quantity}</span> -->
							<!-- Snapped on blur so the box can't keep showing a value that isn't
							     the one being added. `min` alone is not enforcement. -->
							<Input
								type="number"
								class="w-12 text-center font-semibold text-black dark:text-white"
								bind:value={quantity}
								onblur={() => (quantity = safeQuantity)}
								min="1"
								aria-label="Quantity"
							/>
							<Button
								onclick={incrementQuantity}
								size="icon"
								aria-label="Increase quantity"><Plus  class="size-4" /></Button
							>
						</div>
					</div>

					<!-- Main Buttons -->
					<div class="flex gap-3">
						<!-- `addToCart` already refuses to act without a variant; without
						     `!selected` here the button stayed enabled and did nothing at all. -->
						<Button
							class="w-full transition-all active:scale-95"
							onclick={addToCart}
							variant={justAdded ? 'outline' : 'default'}
							disabled={justAdded || !selected}
						>
							{#if justAdded}
								<CheckIcon class="mr-2 size-4 text-green-500" />
								Added to Cart
							{:else if !selected}
								Unavailable
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
