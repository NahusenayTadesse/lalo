<script lang="ts">
	import Lightbox from './lightbox.svelte';

	/* 1.  each image has thumb + full -------------------------------------- */

	let { images, title }: { images: string[]; title: string } = $props();

	/* 3.  light-box state -------------------------------------------------- */
	let lightboxOpen = $state(false);
	let currentIndex = $state(0);

	/* 4.  keyboard nav ----------------------------------------------------- */
	const openLightbox = (index: number) => {
		currentIndex = index;
		lightboxOpen = true;
	};
</script>

<!-- 5.  thumbnail grid ---------------------------------------------------- -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#each images as image, index (image)}
		<div
			class="group cursor-pointer overflow-hidden rounded-lg bg-secondary"
			role="button"
			tabindex="0"
			onclick={() => openLightbox(index)}
			onkeydown={(e) => e.key === 'Enter' && openLightbox(index)}
		>
			<img
				src="/files/{image}"
				alt="{title} gallery image"
				loading="lazy"
				class="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-110"
			/>
		</div>
	{/each}
</div>

<!-- 6.  light-box : send ONLY full-size images ---------------------------- -->
<Lightbox {images} {title} bind:isOpen={lightboxOpen} bind:currentIndex />
