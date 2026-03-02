<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { XIcon, ChevronLeftIcon, ChevronRightIcon } from '@lucide/svelte';

	// Props
	let {
		images,
		currentIndex = $bindable(0),
		isOpen = $bindable(false),
		title = 'Gallery'
	}: {
		images: string[];
		currentIndex?: number;
		isOpen?: boolean;
		title?: string;
	} = $props();

	// Derived values
	let currentImage = $derived(images[currentIndex]);
	let hasNext = $derived(currentIndex < images.length - 1);
	let hasPrev = $derived(currentIndex > 0);

	/** Close the lightbox */
	const close = () => {
		isOpen = false;
	};

	/** Go to next image */
	const next = () => {
		if (hasNext) {
			currentIndex++;
		}
	};

	/** Go to previous image */
	const prev = () => {
		if (hasPrev) {
			currentIndex--;
		}
	};

	/** Handle keyboard navigation */
	const handleKeydown = (e: KeyboardEvent) => {
		if (!isOpen) return;

		switch (e.key) {
			case 'Escape':
				close();
				break;
			case 'ArrowRight':
				next();
				break;
			case 'ArrowLeft':
				prev();
				break;
		}
	};

	/** Handle backdrop click */
	const handleBackdropClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget) {
			close();
		}
	};
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Image lightbox"
		transition:fade={{ duration: 200 }}
		onclick={handleBackdropClick}
		tabindex="-1"
	>
		<!-- Close button -->
		<Button
			variant="ghost"
			size="icon"
			class="absolute top-4 right-4 z-10 text-white hover:bg-white/20 hover:text-white"
			onclick={close}
		>
			<XIcon class="size-6" />
			<span class="sr-only">Close lightbox</span>
		</Button>

		<!-- Image counter -->
		<div
			class="absolute top-4 left-4 z-10 rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium text-white"
		>
			{currentIndex + 1} of {images.length}
		</div>

		<!-- Previous button -->
		{#if hasPrev}
			<Button
				variant="ghost"
				size="icon"
				class="absolute top-1/2 left-4 z-10 size-12 -translate-y-1/2 rounded-full text-white hover:bg-white/20 hover:text-white"
				onclick={prev}
			>
				<ChevronLeftIcon class="size-8" />
				<span class="sr-only">Previous image</span>
			</Button>
		{/if}

		<!-- Next button -->
		{#if hasNext}
			<Button
				variant="ghost"
				size="icon"
				class="absolute top-1/2 right-4 z-10 size-12 -translate-y-1/2 rounded-full text-white hover:bg-white/20 hover:text-white"
				onclick={next}
			>
				<ChevronRightIcon class="size-8" />
				<span class="sr-only">Next image</span>
			</Button>
		{/if}

		<!-- Image container -->
		<div class="flex max-h-[85vh] max-w-[90vw] items-center justify-center">
			{#key currentIndex}
				<img
					src="/files/{currentImage}"
					alt="{title} - Image {currentIndex + 1}"
					class="shadow-lg-2xl max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
					transition:scale={{ duration: 200, start: 0.95 }}
				/>
			{/key}
		</div>

		<!-- Thumbnail strip -->
		{#if images.length > 1}
			<div
				class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-lg bg-black/50 p-2"
			>
				{#each images as image, index (image)}
					<button
						class={[
							'size-12 overflow-hidden rounded-md border-2 transition-all duration-200',
							index === currentIndex
								? 'border-white opacity-100'
								: 'border-transparent opacity-50 hover:opacity-80'
						]}
						onclick={() => (currentIndex = index)}
					>
						<img src="/files/{image}" alt="Thumbnail {index + 1}" class="size-full object-cover" />
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}
