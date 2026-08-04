<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button, type ButtonVariant } from '$lib/components/ui/button/index.js';
	import { Trash } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { Component } from 'svelte';
	import type { IconProps } from '@lucide/svelte';

	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';

	let {
		title,
		dialogTitle = title,
		children,
		variant,
		IconComp,
		open = $bindable(false),

		class: className = ''
	}: {
		title: string;
		/** Header shown inside the dialog; defaults to `title` (the trigger button's label). */
		dialogTitle?: string;
		children: Snippet;
		variant: ButtonVariant;
		IconComp?: Component<IconProps>;
		/** Bindable so a caller can close the dialog itself, e.g. after a successful form submit. */
		open?: boolean;
		class?: string;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class="w-auto border-0">
		{#snippet child({ props })}
			<Button size="sm" class="border-0" {variant} {...props}>
				{#if variant === 'destructive'}
					<Trash />
				{/if}
				{#if IconComp}
					<IconComp />
				{/if}
				{title}
			</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content class="w-lg! {className}">
		<Dialog.Header>
			<Dialog.Title>{dialogTitle}</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="h-auto w-full! min-w-0!  px-2 pr-4" orientation="both">
			<div class="h-auto max-h-96 w-full lg:max-h-[calc(100vh-10rem)]">
				{@render children()}
			</div>
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
