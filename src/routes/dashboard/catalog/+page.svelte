<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Save, BookCopy } from '@lucide/svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { superForm } from 'sveltekit-superforms';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import { toast } from 'svelte-sonner';
	import FormCard from '$lib/formComponents/FormCard.svelte';

	let { data } = $props();

	const { form, errors, enhance, delayed, message } = superForm(data.form, {});
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});
	let image = $derived(data?.files?.catalog ?? '');
	let image2 = $derived(data?.files?.manual ?? '');
</script>

<svelte:head>
	<title>Gallery</title>
</svelte:head>

<main class="container mx-auto w-full! space-y-8 p-4">
	<section class="space-y-4 lg:col-span-7">
		<div class="flex items-center gap-2 text-lg font-semibold">
			<BookCopy class="h-5 w-5 text-primary" />
			<h2>Catalog and Manual</h2>
		</div>

		<FormCard title="Catalog and Manual" className="w-full shadow-sm border">
			<form method="post" action="?/editGallery" use:enhance enctype="multipart/form-data">
				<InputComp label="" name="existing" type="hidden" {form} {errors} required={true} />

				<div class="rounded-lg border bg-muted/10 p-2">
					<InputComp
						{form}
						{errors}
						type="file"
						name="catalog"
						label="Catalog"
						placeholder="Upload a pdf catalog here Max(100MB)"
						required
						{image}
					/>

					<InputComp
						{form}
						{errors}
						type="file"
						name="manual"
						label="Manual"
						placeholder="Upload a pdf manual here Max(100MB)"
						required
						image={image2}
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
