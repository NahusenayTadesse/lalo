<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input/index';
	import { Label } from '$lib/components/ui/label/index.js';
	import { X, CloudUpload as UploadCloud, FileText, Image as ImageIcon } from '@lucide/svelte';
	import { fileProxy } from 'sveltekit-superforms';

	let { form, name, placeholder = 'PDF or Images (Max 10MB)', image = '' } = $props();

	const file = fileProxy(form, name);
	let isDragging = $state(false);

	// Handle the drop event
	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;

		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			// Update the fileProxy with the dropped files
			file.set(e.dataTransfer.files);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}
</script>

<div class="flex w-full flex-col gap-3">
	<Input
		id={name}
		type="file"
		class="hidden"
		{name}
		accept="image/*,application/pdf"
		bind:files={$file}
		multiple={false}
	/>
	{#if $file?.length === 0 && image === ''}
		<Label
			for={name}
			class="group  relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-2! transition-all
			{isDragging
				? 'border-primary bg-primary/5'
				: 'border-muted-foreground/25 bg-muted/50 hover:border-primary/50 hover:bg-muted'}"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			<div class="flex flex-col items-center justify-center gap-2 text-center">
				<div
					class="rounded-full bg-background p-3 shadow-sm transition-transform group-hover:scale-110"
				>
					<UploadCloud class="h-6 w-6 {isDragging ? 'text-primary' : 'text-muted-foreground'}" />
				</div>
				<div class="px-4">
					<p class="text-sm font-medium">
						{isDragging ? 'Drop it here!' : 'Click to upload or drag and drop'}
					</p>
					<p class="text-[12px]! text-muted-foreground">{placeholder}</p>
				</div>
			</div>
		</Label>
	{:else if image}
		<div
			class="relative animate-in overflow-hidden rounded-xl border bg-card p-4 shadow-sm duration-200 zoom-in-95 fade-in"
		>
			<div class="mb-3 flex items-center justify-between">
				<div class="flex items-center gap-3 overflow-hidden">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
					>
						{#if image.toLowerCase().endsWith('.pdf')}
							<FileText class="h-5 w-5" />
						{:else}
							<ImageIcon class="h-5 w-5" />
						{/if}
					</div>
					<div class="flex flex-col truncate">
						<span class="truncate text-sm font-medium"> {image || 'No file selected'}</span>
					</div>
				</div>
				<Button
					variant="ghost"
					size="icon"
					class="hover:text-destructive-foreground h-8 w-8 rounded-full hover:bg-destructive"
					onclick={() => {
						file.set(undefined);
						image = '';
					}}
				>
					<X class="h-4 w-4" />
				</Button>
			</div>

			<div class="overflow-hidden rounded-lg border bg-muted/30">
				{#if image.toLowerCase().endsWith('.pdf')}
					<iframe src="/files/{image}" class="h-64 w-full" frameborder="0" title="pdf-preview"
					></iframe>
				{:else}
					<img
						src="/files/{image}"
						loading="lazy"
						class="max-h-80 w-full object-contain"
						alt="Preview"
					/>
				{/if}
			</div>
		</div>
	{:else}
		<div
			class="relative animate-in overflow-hidden rounded-xl border bg-card p-4 shadow-sm duration-200 zoom-in-95 fade-in"
		>
			<div class="mb-3 flex items-center justify-between">
				<div class="flex items-center gap-3 overflow-hidden">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
					>
						{#if $file[0]?.type === 'application/pdf'}
							<FileText class="h-5 w-5" />
						{:else}
							<ImageIcon class="h-5 w-5" />
						{/if}
					</div>
					<div class="flex flex-col truncate">
						<span class="truncate text-sm font-medium">{$file[0]?.name || 'No file selected'}</span>
						<span class="text-xs text-muted-foreground">
							{$file[0]?.size
								? ($file[0]?.size / 1024 / 1024).toFixed(2) + ' MB'
								: 'No file selected'}
						</span>
					</div>
				</div>
				<Button
					variant="ghost"
					size="icon"
					class="hover:text-destructive-foreground h-8 w-8 rounded-full hover:bg-destructive"
					onclick={() => file.set(undefined)}
				>
					<X class="h-4 w-4" />
				</Button>
			</div>

			<div class="overflow-hidden rounded-lg border bg-muted/30">
				{#if $file[0]?.type === 'application/pdf'}
					<iframe
						src={`${URL.createObjectURL($file[0])}#toolbar=0`}
						class="h-64 w-full"
						frameborder="0"
						title="pdf-preview"
					></iframe>
				{:else if $file[0]?.type?.startsWith('image')}
					<img
						src={URL.createObjectURL($file[0])}
						class="max-h-80 w-full object-contain"
						alt="Preview"
					/>
				{/if}
			</div>
		</div>
	{/if}
</div>
