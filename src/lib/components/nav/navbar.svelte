<script lang="ts">
	import Navbar from '$lib/components/nav/navbar.svelte';
	import Hero from '$lib/components/hero.svelte';
	import Categories from '$lib/components/categories.svelte';
	import Products from '$lib/components/products.svelte';
	import About from '$lib/components/about.svelte';
	import Testimonials from '$lib/components/testimonials.svelte';
	import Newsletter from '$lib/components/newsletter.svelte';
	import Footer from '$lib/components/footer.svelte';

	// Set app hook
</script>

<div class="min-h-screen bg-background text-foreground">
	<Navbar />
	<main>
		<Hero />
		<Categories />
		<Products />
		<About />
		<Testimonials />
		<Newsletter />
	</main>
	<Footer />
</div>
