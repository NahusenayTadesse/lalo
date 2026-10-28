<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { pwa } from '$lib/pwa.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import * as Dialog from '@nahu/admin-kit/components/ui/dialog/index.js';
	import { DownloadIcon, ShareIcon, SquarePlusIcon, CheckIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	type Props = {
		/** `icon` for tight headers, `button` for a labelled button, `card` for the footer promo. */
		variant?: 'icon' | 'button' | 'card';
		class?: string;
	};

	let { variant = 'button', class: className = '' }: Props = $props();

	let iosOpen = $state(false);

	$effect(() => pwa.start());

	async function install() {
		if (!pwa.native) {
			iosOpen = true;
			return;
		}
		if (await pwa.install()) toast.success(m.install_success());
	}
</script>

{#if pwa.canInstall}
	{#if variant === 'icon'}
		<Button
			variant="outline"
			size="icon"
			onclick={install}
			class="relative {className}"
			title={m.install_app()}
		>
			<DownloadIcon class="size-[1.1rem]" />
			<span class="absolute -top-0.5 -right-0.5 flex size-2.5">
				<span class="absolute inline-flex size-full animate-ping rounded-full bg-primary/70"></span>
				<span class="relative inline-flex size-2.5 rounded-full bg-primary"></span>
			</span>
			<span class="sr-only">{m.install_app()}</span>
		</Button>
	{:else if variant === 'button'}
		<Button onclick={install} class="group gap-2 {className}">
			<DownloadIcon class="size-4 transition-transform group-hover:translate-y-0.5" />
			{m.install_app()}
		</Button>
	{:else}
		<div
			class="relative isolate flex flex-col items-start gap-4 overflow-hidden rounded-3xl glass p-6 sm:flex-row sm:items-center {className}"
		>
			<div
				class="pointer-events-none absolute -top-16 -right-16 -z-10 size-48 rounded-full bg-primary/25 blur-3xl"
			></div>
			<img
				src="/apple-touch-icon.png"
				alt=""
				class="size-14 shrink-0 animate-float rounded-2xl shadow-lg ring-1 ring-black/5"
			/>
			<div class="flex-1 space-y-1">
				<p class="font-semibold">{m.install_card_title()}</p>
				<p class="text-sm text-muted-foreground">{m.install_card_desc()}</p>
			</div>
			<Button onclick={install} class="group shrink-0 gap-2 rounded-full px-5">
				<DownloadIcon class="size-4 transition-transform group-hover:translate-y-0.5" />
				{m.install_app()}
			</Button>
		</div>
	{/if}
{/if}

<Dialog.Root bind:open={iosOpen}>
	<Dialog.Content class="rounded-3xl glass-strong sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>{m.install_ios_title()}</Dialog.Title>
			<Dialog.Description>{m.install_card_desc()}</Dialog.Description>
		</Dialog.Header>
		<ol class="space-y-3 text-sm">
			<li class="flex items-center gap-3">
				<span
					class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
				>
					<ShareIcon class="size-4" />
				</span>
				{m.install_ios_step_share()}
			</li>
			<li class="flex items-center gap-3">
				<span
					class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
				>
					<SquarePlusIcon class="size-4" />
				</span>
				{m.install_ios_step_add()}
			</li>
			<li class="flex items-center gap-3">
				<span
					class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
				>
					<CheckIcon class="size-4" />
				</span>
				{m.install_ios_step_confirm()}
			</li>
		</ol>
		<Dialog.Footer>
			<Button onclick={() => (iosOpen = false)} class="w-full">{m.install_got_it()}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
