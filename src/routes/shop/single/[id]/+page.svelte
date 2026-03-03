<script lang="ts">
	import ProductDetail from '$lib/components/product-detail.svelte';
	import Gallery from '$lib/components/gallery.svelte';

	// Set app hook

	let { data } = $props();

	// Sample product data
</script>

<div class="min-h-screen w-full bg-slate-50 pb-16 text-slate-900">
	<section class="border-b bg-white shadow-sm">
		<ProductDetail {...data?.product} images={data?.images} />
	</section>
	{#if data?.images?.length}
		<div class="mx-auto mt-12 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="mb-8 flex items-end justify-between border-b border-slate-200 pb-4">
				<div>
					<h2 class="text-3xl font-bold tracking-tight text-slate-900">Product Gallery</h2>
					<p class="mt-2 text-sm text-slate-500">
						A detailed look at the {data?.product?.name || 'product'} features.
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
