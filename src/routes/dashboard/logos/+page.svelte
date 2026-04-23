<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Save, Video, Image as ImageIcon, AlertCircle } from '@lucide/svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { superForm } from 'sveltekit-superforms';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import { toast } from 'svelte-sonner';
	import FormCard from '$lib/formComponents/FormCard.svelte';

	let { data } = $props();

	let images: string[] = $derived(data?.gallery ?? []);

	const { form, errors, enhance, delayed, message } = superForm(data.form, {});

	$effect(() => {
		$form.existing = images;
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	let videoId = $derived.by(() => {
		const regex =
			/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
		const match = rawUrl?.match(regex);
		return match ? match[1] : null;
	});
</script>

<svelte:head>
	<title>Gallery</title>
</svelte:head>

<main class="container mx-auto w-full! space-y-8 p-4">
	<div class="border-b pb-4">
		<h1 class="text-3xl font-bold tracking-tight">Partner Company Logos</h1>
		<p class="text-muted-foreground">Manage Partner Company Logos</p>
	</div>

	<section class="space-y-4 lg:col-span-7">
		<div class="flex items-center gap-2 text-lg font-semibold">
			<ImageIcon class="h-5 w-5 text-primary" />
			<h2>Logo Images</h2>
		</div>

		<FormCard title="Logo Images: ({images.length})" className="w-full shadow-sm border">
			<form method="post" action="?/editGallery" use:enhance enctype="multipart/form-data">
				<InputComp label="" name="existing" type="hidden" {form} {errors} required={true} />

				<div class="rounded-lg border bg-muted/10 p-2">
					<InputComp
						{form}
						{errors}
						type="gallery"
						name="images"
						label=""
						placeholder="Drop images here or click to upload"
						required
						bind:images
					/>
				</div>

				<div class="flex justify-end pt-2">
					<Button type="submit" class="w-full px-8 sm:w-auto" size="lg">
						{#if $delayed}
							<LoadingBtn name="Saving Changes..." />
						{:else}
							<Save class="mr-2 h-4 w-4" /> Save Gallery
						{/if}
					</Button>
				</div>
			</form>
		</FormCard>
	</section>
</main>
