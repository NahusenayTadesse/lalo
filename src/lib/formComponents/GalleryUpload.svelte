<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input/index';
	import { Label } from '$lib/components/ui/label/index.js';
	import { BrushCleaning, X } from '@lucide/svelte';
	import { fade } from 'svelte/transition';
	import { filesProxy } from 'sveltekit-superforms';
	import { CloudUpload } from '@lucide/svelte';

	let { form, name, errors, title = 'Upload Image', images = $bindable() } = $props();

	let file = filesProxy(form, name);

	function removeFile(index: number) {
		const files = Array.from($file ?? []);
		files.splice(index, 1);
		$file = files;
	}

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

	import { toast } from 'svelte-sonner';
</script>

<div class="my-8 flex w-full flex-col justify-start gap-2">
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
				<CloudUpload class="h-6 w-6 {isDragging ? 'text-primary' : 'text-muted-foreground'}" />
			</div>
			<div class="px-4">
				<p class="text-sm font-medium">
					{isDragging ? 'Drop it here!' : 'Click to upload or drag and drop'}
				</p>
				<p class="text-[12px]! text-muted-foreground">{title}</p>
			</div>
		</div>

		<Input
			id={name}
			type="file"
			class="hidden"
			{name}
			accept="image/*,application/pdf"
			bind:files={$file}
			multiple={true}
		/>
		<!-- <Input type="file" {name} accept="image/*,application/pdf" bind:files={$file} multiple={true} /> -->

		{#if $file.length > 0}
			<div class="space-y-3">
				<div class="flex items-center justify-between gap-2">
					<Label>Uploaded Files ({$file.length})</Label>
					<Button
						variant="destructive"
						size="sm"
						onclick={() => {
							$file = [];
							toast.info('All files removed');
						}}
					>
						<BrushCleaning /> Clear all
					</Button>
				</div>
			</div>
		{/if}

		<div class="flex flex-row gap-2">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each $file as i, index (i.name)}
					<div
						class="group relative flex flex-col overflow-hidden rounded-xl border bg-card p-2 shadow-sm transition-all hover:shadow-md"
					>
						<div class="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
							<img
								src={URL.createObjectURL($file[index])}
								class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
								alt={$file?.item(index)?.name}
								transition:fade
							/>

							<div
								class="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<Button
									variant="destructive"
									size="icon"
									type="button"
									class="h-7 w-7 rounded-full shadow-lg"
									onclick={() => removeFile(index)}
								>
									<X class="h-4 w-4" />
								</Button>
							</div>
						</div>

						<div class="px-1 py-2">
							<p class="truncate text-xs font-medium text-foreground">
								{$file?.item(index)?.name}
							</p>
							<p class="text-[10px] tracking-wider text-muted-foreground uppercase">
								{(i.size / 1024).toFixed(1)} KB
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		{#if images.length}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{#each images as i, index (i)}
					<div
						class="group relative flex flex-col overflow-hidden rounded-xl border bg-card p-2 shadow-sm transition-all hover:shadow-md"
					>
						<div class="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
							<img
								src="/files/{i}"
								class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
								alt="Product Gallery"
								transition:fade
							/>

							<div
								class="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<Button
									variant="destructive"
									size="icon"
									type="button"
									class="h-7 w-7 rounded-full shadow-lg"
									onclick={() => (images = images.filter((_, i) => i !== index))}
								>
									<X class="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if $errors[name]}
			<p class="text-red-500">{$errors[name]._errors.join(', ')}</p>
		{/if}
	</Label>
</div>
