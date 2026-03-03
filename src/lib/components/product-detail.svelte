<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { fly } from 'svelte/transition';
	import {
		ShareIcon,
		PlusIcon,
		CheckIcon,
		SparklesIcon,
		TrendingUpIcon,
		AwardIcon
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	type Props = {
		productId: number;
		productName: string;
		price: number | string;
		description: string;
		image?: string;
		category?: string;
		images?: string[];
	};

	const { productId, productName, price, description, image, category, images }: Props = $props();

	let quantity = $state(1);

	import { useCart } from '$lib/hooks/cart.svelte.js';

	const cart = useCart();

	let justAdded = $state(false);

	// Reusable formatter (performance friendly)
	const formatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'ETB'
	});

	// Derived values for clarity
	const numericPrice = $derived(typeof price === 'string' ? parseFloat(price) : price);
	const formattedPrice = $derived(formatter.format(numericPrice));
	const quantityInCart = $derived(cart.items.find((i) => i.productId === productId)?.quantity ?? 0);

	function addToCart() {
		if (justAdded) return; // Prevent double-clicks during animation

		cart.addItem({ productId, productName, price: numericPrice });
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

	const highlights = [
		{ icon: AwardIcon, label: 'Halal Certified', description: 'All products meet Halal standards' },
		{
			icon: SparklesIcon,
			label: 'Specialty Options',
			description: 'Gluten-free, sugar-free & vegan'
		},
		{ icon: TrendingUpIcon, label: 'Since 2011', description: 'Over a decade of excellence' },
		{ icon: CheckIcon, label: 'Quality Assured', description: 'Consistent standards guaranteed' }
	];

	let displayImage = $state(image);
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
					{#each images as image, i (image)}
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

				<!-- Actions Section -->

				<!-- Trust Badges -->
				<div
					transition:fly={{ y: 20, duration: 600, delay: 200 }}
					class="mt-8 flex flex-row flex-wrap gap-4"
				>
					{#each highlights as highlight (highlight.label)}
						<Card
							class="shadow-lg-md shadow-lg-primary/5 hover:shadow-lg-lg hover:shadow-lg-primary/10 w-28 border-primary/20 transition-all duration-300"
						>
							<CardContent class="flex flex-col gap-2">
								<div class="shrink-0">
									<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10">
										<highlight.icon class="size-6 text-primary" />
									</div>
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-semibold text-foreground">{highlight.label}</p>
									<p class="mt-1 text-xs text-foreground/60">{highlight.description}</p>
								</div>
							</CardContent>
						</Card>
					{/each}
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
