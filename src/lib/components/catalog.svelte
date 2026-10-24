<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Download } from '@lucide/svelte';
	import Button from '@nahu/admin-kit/components/ui/button/button.svelte';

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
					{m.catalog_title()}
				</h1>
				<p class="text-xl text-muted-foreground">
					{m.catalog_subtitle()}
				</p>
			</div>

			<div class="flex flex-col items-center justify-center gap-4 pt-6 sm:flex-row">
				{#if files.catalog}
					<Button
						download={m.catalog_file_name({ year: new Date().getFullYear() })}
						href="/files/{files.catalog}"
						size="lg"
					>
						<Download />
						{m.catalog_download({ year: new Date().getFullYear() })}
					</Button>
				{/if}
				{#if files.manual}
					<Button size="lg" download={m.catalog_manual_file_name()} href="/files/{files.manual}" variant="outline"
						><Download />{m.catalog_manual()}</Button
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
