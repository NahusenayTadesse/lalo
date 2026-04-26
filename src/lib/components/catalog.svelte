<script lang="ts">
	import { Download } from '@lucide/svelte';
	import Button from './ui/button/button.svelte';

	// Svelte 5 uses runes for state

	interface Props {
		files?: {
			catalog?: string | null;
			manual?: string | null;
		};
	}

	let { files }: Props = $props();
</script>

{#if files}
	<section class="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
		<div class="max-w-3xl space-y-6">
			<div class="space-y-2">
				<h1 class="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">
					Resources & Documentation
				</h1>
				<p class="text-xl text-muted-foreground">
					Access our latest product specifications and comprehensive technical guides. Everything
					you need to get started with our ecosystem.
				</p>
			</div>

			<div class="flex flex-col items-center justify-center gap-4 pt-6 sm:flex-row">
				{#if files.catalog}
					<Button
						download="{new Date().getFullYear()} Catalog"
						href="/files/{files.catalog}"
						size="lg"
					>
						<Download />
						Download {new Date().getFullYear()} Catalog
					</Button>
				{/if}
				{#if files.manual}
					<Button size="lg" download="Manual" href="/files/{files.manual}" variant="outline"
						><Download />Technical Manual (PDF)</Button
					>
				{/if}
			</div>
		</div>
	</section>
{/if}

<style>
	/* Optional: Add a subtle radial gradient background to the section */
	section {
		background-image: radial-gradient(
			circle at center,
			hsl(var(--secondary) / 0.2) 0%,
			transparent 70%
		);
	}
</style>
