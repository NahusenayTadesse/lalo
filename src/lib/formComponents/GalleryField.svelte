<script lang="ts">
	import { Label } from '@nahu/admin-kit/components/ui/label/index.js';
	import { CircleAlert } from '@lucide/svelte';
	import GalleryUpload from './GalleryUpload.svelte';

	/**
	 * A labelled gallery input: several new images plus the record's existing ones (`images`),
	 * which can be removed. The kit's `GalleryUpload` only takes new files, so the products and
	 * logos screens keep this one.
	 */
	// `required` is accepted for parity with `InputComp`; the server schema enforces it.
	let {
		label,
		form,
		errors,
		name,
		placeholder = '',
		required: _required = false,
		images = $bindable()
	} = $props();
</script>

<div class="flex w-full max-w-full flex-col justify-start gap-2 p-1">
	<Label for={name} class="capitalize">{label}</Label>
	<GalleryUpload {name} {form} title={placeholder} bind:images />

	{#if $errors[name]}
		{#if $errors[name]._errors}
			{#each $errors[name]._errors as error (error)}
				<p class="flex items-center gap-2 text-red-500"><CircleAlert /> {error}</p>
			{/each}
		{:else}
			<p class="text-red-500">{$errors[name]}</p>
		{/if}
	{/if}
</div>
