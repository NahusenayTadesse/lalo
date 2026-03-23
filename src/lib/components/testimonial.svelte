<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { ChevronLeftIcon, ChevronRightIcon, QuoteIcon } from '@lucide/svelte';

	type Testimonial = {
		name: string;
		position: string;
		testimonial: string;
		avatar?: string;
	};

	type Props = {
		testimonials: Testimonial[];
	};

	let { testimonials }: Props = $props();

	let autoPlayInterval = 5000;

	let currentIndex = $state(0);
	let isPaused = $state(false);
	let direction = $state<'left' | 'right'>('right');

	// Auto-play functionality
	$effect(() => {
		if (isPaused || testimonials.length <= 1) return;

		const interval = setInterval(() => {
			direction = 'right';
			currentIndex = (currentIndex + 1) % testimonials.length;
		}, autoPlayInterval);

		return () => clearInterval(interval);
	});

	const goToSlide = (index: number) => {
		direction = index > currentIndex ? 'right' : 'left';
		currentIndex = index;
	};

	const goToPrevious = () => {
		direction = 'left';
		currentIndex = currentIndex === 0 ? testimonials.length - 1 : currentIndex - 1;
	};

	const goToNext = () => {
		direction = 'right';
		currentIndex = (currentIndex + 1) % testimonials.length;
	};

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	const currentTestimonial = $derived(testimonials[currentIndex]);
</script>

<div
	class="relative mx-auto w-full max-w-3xl px-4"
	role="region"
	aria-label="Testimonials"
	onmouseenter={() => (isPaused = true)}
	onmouseleave={() => (isPaused = false)}
>
	<!-- Main Card -->
	<Card
		class="shadow-lg-xl relative overflow-hidden border-primary/10 bg-gradient-to-br from-card via-card to-primary/5 pt-0"
	>
		<!-- Decorative Quote Icon -->
		<div class="absolute top-6 right-6 text-primary/10">
			<QuoteIcon class="size-16" />
		</div>

		<!-- Content Container -->
		<div class="relative flex min-h-[280px] items-center justify-center p-8 md:p-12">
			{#key currentIndex}
				<div
					class="flex flex-col items-center gap-6 text-center"
					in:fly={{ x: direction === 'right' ? 100 : -100, duration: 400, delay: 200 }}
					out:fade={{ duration: 200 }}
				>
					<!-- Testimonial Text -->
					<blockquote
						class="max-w-2xl text-lg leading-relaxed text-foreground/90 italic md:text-xl"
					>
						"{currentTestimonial.testimonial}"
					</blockquote>

					<!-- Author Info -->
					<div class="mt-2 flex items-center gap-4">
						<!-- Avatar -->
						<div class="relative">
							{#if currentTestimonial.avatar}
								<img
									src="/files/{currentTestimonial.avatar}"
									alt={currentTestimonial.name}
									class="size-14 rounded-full object-cover ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
								/>
							{:else}
								<div
									class="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-lg font-semibold text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
								>
									{getInitials(currentTestimonial.name)}
								</div>
							{/if}
						</div>

						<!-- Name & Position -->
						<div class="text-left">
							<p class="font-semibold text-foreground">{currentTestimonial.name}</p>
							<p class="text-sm text-muted-foreground">{currentTestimonial.position}</p>
						</div>
					</div>
				</div>
			{/key}
		</div>

		<!-- Navigation Arrows -->
		{#if testimonials.length > 1}
			<div class="absolute inset-y-0 left-2 flex items-center">
				<Button
					variant="ghost"
					size="icon"
					class="shadow-lg-md size-10 rounded-full bg-background/80 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-background"
					onclick={goToPrevious}
					aria-label="Previous testimonial"
				>
					<ChevronLeftIcon class="size-5" />
				</Button>
			</div>

			<div class="absolute inset-y-0 right-2 flex items-center">
				<Button
					variant="ghost"
					size="icon"
					class="shadow-lg-md size-10 rounded-full bg-background/80 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-background"
					onclick={goToNext}
					aria-label="Next testimonial"
				>
					<ChevronRightIcon class="size-5" />
				</Button>
			</div>
		{/if}
	</Card>

	<!-- Indicator Dots -->
	{#if testimonials.length > 1}
		<div class="mt-6 flex justify-center gap-2">
			{#each testimonials as _, index}
				<button
					class={[
						'size-2.5 rounded-full transition-all duration-300',
						index === currentIndex ? 'w-8 bg-primary' : 'bg-primary/30 hover:bg-primary/50'
					]}
					onclick={() => goToSlide(index)}
					aria-label={`Go to testimonial ${index + 1}`}
					aria-current={index === currentIndex ? 'true' : 'false'}
				></button>
			{/each}
		</div>
	{/if}

	<!-- Progress Bar (shows auto-play progress) -->
	{#if testimonials.length > 1 && !isPaused}
		<div class="absolute right-0 bottom-0 left-0 h-1 overflow-hidden rounded-b-xl bg-primary/10">
			{#key currentIndex}
				<div
					class="animate-progress h-full bg-primary/50"
					style="animation-duration: {autoPlayInterval}ms"
				></div>
			{/key}
		</div>
	{/if}
</div>

<style>
	@keyframes progress {
		from {
			width: 0%;
		}
		to {
			width: 100%;
		}
	}

	.animate-progress {
		animation: progress linear forwards;
	}
</style>
