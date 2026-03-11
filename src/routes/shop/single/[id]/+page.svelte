<script lang="ts">
	import ProductDetail from '$lib/components/product-detail.svelte';
	import Gallery from '$lib/components/gallery.svelte';

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
			name: 'Amy Bakes'
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
	<title>{data?.product.productName} | Amy Bakes</title>
	<meta name="description" content={data?.product.description?.substring(0, 160)} />

	<meta property="og:type" content="product" />
	<meta property="og:title" content="{data?.product.productName} - Amy Bakes" />
	<meta property="og:description" content={data?.product.description} />
	<meta property="og:image" content="/files/{data?.product.image}" />
	<meta property="product:price:amount" content={data?.product.price} />
	<meta property="product:price:currency" content="ETB" />

	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content={data?.product.productName} />
	<meta property="twitter:image" content="/files/{data?.product.image}" />

	<!-- {@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>`} -->
</svelte:head>

<div class="min-h-screen w-full bg-slate-50 pb-16 text-slate-900">
	<section class="border-b bg-white shadow-sm">
		<ProductDetail {...data?.product} priceList={data?.priceList} images={data?.images} />
	</section>
	{#if data?.images?.length}
		<div class="mx-auto mt-12 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="mb-8 flex items-end justify-between border-b border-slate-200 pb-4">
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
