<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input/index';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		X,
		CloudUpload as UploadCloud,
		FileText,
		Image as ImageIcon,
		Loader,
		BrushCleaning
	} from '@lucide/svelte';
	import { fade } from 'svelte/transition';
	import { filesProxy } from 'sveltekit-superforms';
	import imageCompression from 'browser-image-compression';
	import { toast } from 'svelte-sonner';

	let {
		form,
		name,
		title = 'Gallery Upload',
		placeholder = 'Images or PDFs (Max 1MB per image)',
		images = $bindable([])
	} = $props();

	// Use filesProxy for multi-file support with Superforms
	let file = filesProxy(form, name);

	let isDragging = $state(false);
	let isProcessing = $state(false);

	async function handleFileSelection(newFiles: FileList | null) {
		if (!newFiles || newFiles.length === 0) return;

		isProcessing = true;

		const options = {
			maxSizeMB: 1,
			maxWidthOrHeight: 1920,
			useWebWorker: true,
			initialQuality: 0.8
		};

		try {
			const processed = await Promise.all(
				Array.from(newFiles).map(async (f) => {
					// Skip compression for PDFs or non-image types
					if (f.type === 'application/pdf' || !f.type.startsWith('image/')) {
						return f;
					}
					try {
						const compressed = await imageCompression(f, options);
						return new File([compressed], f.name, { type: compressed.type });
					} catch (err) {
						console.error('Compression error:', err);
						return f;
					}
				})
			);

			// Append new files to existing ones in the proxy
			const currentFiles = Array.from($file ?? []);
			const dt = new DataTransfer();
			[...currentFiles, ...processed].forEach((f) => dt.items.add(f));

			$file = Array.from(dt.files);
			toast.success(`${processed.length} file(s) added and optimized`);
		} catch (err) {
			console.error('Selection Error:', err);
			toast.error('Failed to process files');
		} finally {
			isProcessing = false;
		}
	}

	function removeNewFile(index: number) {
		const current = Array.from($file);
		current.splice(index, 1);
		$file = current;
	}

	function removeExistingImage(index: number) {
		images = images.filter((_, i) => i !== index);
	}
</script>

<div class="flex w-full flex-col gap-6">
	<!-- Upload Area -->
	<div class="flex flex-col gap-2">
		<Label
			for={name}
			class="group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 transition-all
			{isDragging
				? 'border-primary bg-primary/5'
				: 'border-muted-foreground/25 bg-muted/50 hover:border-primary/50 hover:bg-muted'}"
			ondragover={(e) => {
				e.preventDefault();
				isDragging = true;
			}}
			ondragleave={() => (isDragging = false)}
			ondrop={(e) => {
				e.preventDefault();
				isDragging = false;
				handleFileSelection(e.dataTransfer?.files);
			}}
		>
			<div class="flex flex-col items-center justify-center gap-3 text-center">
				<div
					class="rounded-full bg-background p-4 shadow-sm transition-transform group-hover:scale-110"
				>
					{#if isProcessing}
						<Loader class="h-6 w-6 animate-spin text-primary" />
					{:else}
						<UploadCloud class="h-6 w-6 {isDragging ? 'text-primary' : 'text-muted-foreground'}" />
					{/if}
				</div>
				<div class="px-4">
					<p class="text-sm font-medium">
						{isProcessing
							? 'Optimizing assets...'
							: isDragging
								? 'Drop them now!'
								: 'Click to upload or drag gallery'}
					</p>
					<p class="text-xs text-muted-foreground">{placeholder}</p>
				</div>
			</div>

			<Input
				id={name}
				type="file"
				class="hidden"
				{name}
				accept="image/*,application/pdf"
				multiple={true}
				onchange={(e) => handleFileSelection(e.currentTarget.files)}
			/>
		</Label>
	</div>

	<!-- Gallery Grid -->
	{#if $file.length > 0 || images.length > 0}
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-semibold tracking-tight">Gallery Preview</h3>
				{#if $file.length > 0}
					<Button
						variant="ghost"
						size="sm"
						class="h-8 text-xs text-muted-foreground hover:text-destructive"
						onclick={() => ($file = [])}
					>
						<BrushCleaning class="mr-2 h-3.5 w-3.5" /> Clear New
					</Button>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
				<!-- Existing Images (Server) -->
				{#each images as img, i}
					<div
						class="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
						transition:fade
					>
						<img src="/files/{img}" class="h-full w-full object-cover" alt="Server asset" />
						<div
							class="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<Button
								variant="destructive"
								size="icon"
								class="absolute top-1 right-1 h-7 w-7 rounded-full"
								onclick={() => removeExistingImage(i)}
							>
								<X class="h-4 w-4" />
							</Button>
						</div>
						<div class="absolute right-0 bottom-0 left-0 bg-background/80 p-1 text-center">
							<span class="text-[10px] font-medium text-muted-foreground uppercase">Existing</span>
						</div>
					</div>
				{/each}

				<!-- New Uploads (Compressed) -->
				{#each $file as f, i}
					<div
						class="group relative aspect-square overflow-hidden rounded-lg border bg-card shadow-sm"
						transition:fade
					>
						{#if f.type.startsWith('image/')}
							<img
								src={URL.createObjectURL(f)}
								class="h-full w-full object-cover"
								alt="Local preview"
							/>
						{:else}
							<div class="flex h-full flex-col items-center justify-center gap-2 bg-muted/50">
								<FileText class="h-8 w-8 text-muted-foreground" />
								<span class="max-w-full truncate px-2 text-[10px]">{f.name}</span>
							</div>
						{/if}

						<div
							class="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<Button
								variant="destructive"
								size="icon"
								class="absolute top-1 right-1 h-7 w-7 rounded-full"
								onclick={() => removeNewFile(i)}
							>
								<X class="h-4 w-4" />
							</Button>
						</div>

						<div class="absolute right-0 bottom-0 left-0 bg-primary/90 p-1 text-center text-white">
							<span class="text-[10px] font-bold">{(f.size / 1024).toFixed(0)} KB</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
