<script lang="ts">
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Save } from '@lucide/svelte';

	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { EditGallery } from './schema';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import GalleryField from '$lib/formComponents/GalleryField.svelte';

	let {
		data,
		images = $bindable()
	}: {
		data: SuperValidated<Infer<EditGallery>>;
		images: string[];
	} = $props();
	const { form, errors, enhance, delayed, message } = superForm(data, {});
	import { toast } from 'svelte-sonner';
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
</script>

<div class="flex flex-col items-center justify-center gap-4 pt-4">
	<form
		method="post"
		action="?/editGallery"
		use:enhance
		class="flex w-full flex-col gap-3"
		enctype="multipart/form-data"
	>
		<InputComp label="" name="existing" type="hidden" {form} {errors} required={true} />
		<GalleryField
			{form}
			{errors}
			
			name="gallery"
			label="Product Gallery"
			placeholder="Edit and Upload New Product Gallery"
			required
			bind:images
		/>
		<Button type="submit" size="lg">
			{#if $delayed}
				<LoadingBtn name="Saving New Gallery" />
			{:else}
				<Save /> Save Changes
			{/if}
		</Button>
	</form>
</div>
