<script lang="ts">
	import ProductDetail from '$lib/components/product-detail.svelte';
	import Gallery from '$lib/components/gallery.svelte';
		import ProductCard from '$lib/components/product-card.svelte';
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import { ArrowBigRight } from '@lucide/svelte';
	import Button from '$lib/components/ui/button/button.svelte';


	// Set app hook

	let { data } = $props();

	const jsonLd = {
		'@context': 'https://schema.org/',
		'@type': 'Product',
		name: data?.product.productName,
		image: [data?.product.image, ...(data?.images ?? [])],
		description: data?.product.description,
		brand: {
			'@type': 'Brand',
			name: 'Lalo Bakery Solutions'
		},
		offers: {
			'@type': 'AggregateOffer',
			lowPrice: data?.product.price,
			priceCurrency: 'ETB',
			offerCount: data?.priceList?.length
		}
	};
</script>

<svelte:head>
	<title>{data?.product.productName} | Lalo Bakery Solutions</title>
	<meta name="description" content={data?.product.description?.substring(0, 160)} />

	<meta property="og:type" content="product" />
	<meta property="og:title" content="{data?.product.productName} - Lalo Bakery Solutions" />
	<meta property="og:description" content={data?.product.description} />
	<meta property="og:image" content="/files/{data?.product.image}" />
	<meta property="product:price:amount" content={data?.product.price} />
	<meta property="product:price:currency" content="ETB" />

	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content={data?.product.productName} />
	<meta property="twitter:image" content="/files/{data?.product.image}" />

	<!-- {@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>`} -->
</svelte:head>

<div class="min-h-screen w-full pb-16">
	<section class="border-b shadow-sm">
		<ProductDetail {...data?.product} priceList={data?.priceList} images={data?.images} />
	</section>
	{#if data?.images?.length}
		<div class="mx-auto mt-12 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="mb-8 flex items-end justify-between border-b pb-4">
				<div>
					<h2 class="text-3xl font-bold tracking-tight text-slate-900">Product Gallery</h2>
					<p class="mt-2 text-sm text-slate-500">
						A detailed look at the {data?.product?.productName || 'product'} features.
					</p>
				</div>
				<span class="text-xs font-medium tracking-widest text-slate-400 uppercase">
					{data?.images?.length || 0} Images
				</span>
			</div>

			<div class="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
				<Gallery images={data?.images} title={data?.product?.productName} />
			</div>
		</div>
	{/if}
</div>

{#if data?.catProducts?.length}
<section
	class="relative mx-auto flex max-w-7xl flex-col items-center justify-center overflow-hidden px-4 py-16 sm:px-6 lg:px-8"
>
	<div
		class="absolute top-0 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/5 opacity-60 blur-3xl"
	></div>

	<div class="mb-12 flex flex-col items-center gap-3 text-center">
		
		<h2
			class="bg-linear-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl"
		>
				Related Products
		</h2>
	
	</div>

	<div class="relative w-full px-2 sm:px-8">
		<Carousel.Root
			opts={{
				align: 'start',
				loop: true
			}}
			class="mx-auto w-full max-w-6xl"
		>
			<Carousel.Content class="-ml-4 pb-6">
				{#each data?.catProducts as product (product.productId)}
					<Carousel.Item class="pl-4 sm:basis-1/2 lg:basis-1/3 xl:basis-1/3">
						<div
							class="group h-full rounded-2xl border border-primary/5 bg-card/40 p-1 backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:border-primary/20 hover:bg-card/70 hover:shadow-[0_12px_30px_rgba(var(--primary),0.08)]"
						>
							<ProductCard {...product} />
						</div>
					</Carousel.Item>
				{/each}
			</Carousel.Content>

			<div class="hidden sm:block">
				<Carousel.Previous
					class="absolute top-1/2 -left-4 h-11 w-11 -translate-y-1/2 border-primary/10 bg-background/80 text-foreground shadow-md backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-primary/30 hover:bg-primary hover:text-primary-foreground"
				/>
				<Carousel.Next
					class="absolute top-1/2 -right-4 h-11 w-11 -translate-y-1/2 border-primary/10 bg-background/80 text-foreground shadow-md backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-primary/30 hover:bg-primary hover:text-primary-foreground"
				/>
			</div>
		</Carousel.Root>
	</div>
	<Button href="/shop" size="lg" class="justify-self-center!">
		See All Products
		<ArrowBigRight />
	</Button>
</section>
{/if}