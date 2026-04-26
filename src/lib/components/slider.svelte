<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import Autoplay from 'embla-carousel-autoplay';
	const plugin = Autoplay({ delay: 1000, stopOnInteraction: true });

	let { imagesList = [] }: { imagesList: (string | null)[] } = $props();
</script>

<section
	class="relative z-0 mx-auto max-w-full border-t border-border/50 bg-background bg-cover bg-center py-24 md:py-32 lg:px-6"
>
	<div class="mx-auto lg:max-w-7xl">
		<div class="mb-16 max-w-3xl justify-self-center md:mb-20">
			<h3 class="text-center text-4xl font-semibold tracking-tighter sm:text-5xl lg:text-6xl">
				Our Trusted <span class="text-primary">Partners</span>
			</h3>
			<p class="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">
				We collaborate with forward-thinking organizations to deliver world-class solutions. Our
				network of partners ensures we stay at the cutting edge of innovation and reliability.
			</p>
		</div>

		<Carousel.Root
			class="w-[70%] justify-self-center lg:w-full"
			opts={{
				align: 'center',
				loop: true
			}}
			plugins={[plugin]}
			onmouseenter={plugin.stop}
			onmouseleave={plugin.reset}
		>
			<Carousel.Content>
				{#each imagesList as src (src)}
					<Carousel.Item class="basis-1/2 px-0 md:basis-1/3 lg:basis-1/5 lg:px-4">
						<div class="flex w-full items-center justify-center">
							<img
								src="/files/{src}"
								alt="Partner Logo"
								loading="lazy"
								class="hover: rounded-4xl object-cover transition-all duration-300 ease-in-out hover:scale-110"
							/>
						</div>
					</Carousel.Item>
				{/each}
			</Carousel.Content>
			<Carousel.Previous />
			<Carousel.Next />
		</Carousel.Root>
	</div>
</section>
