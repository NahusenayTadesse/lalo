<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { X, Send, Phone } from '@lucide/svelte';
	import Button from './ui/button/button.svelte';

	let {
		phones = ["+251908454545","+251911234567"],
		email,
		countryCode = '251',
		businessName = 'Lalo Bakery Solutions',
		greeting = 'Hello! 👋 How can we help you today? Send us a message and our team will reply on WhatsApp.',
		replyTime = 'Typically replies within an hour',
		quickReplies = [
			'I would like to place an order',
			'I need a price quote',
			'Where are you located?'
		],
		/** Appends the page the visitor was on, so staff have context. */
		includePageContext = true
	}: {
		phones?: string[] | null;
		email?: string;
		countryCode?: string;
		businessName?: string;
		greeting?: string;
		replyTime?: string;
		quickReplies?: string[];
		includePageContext?: boolean;
	} = $props();

	/**
	 * Settings store phones as free text ("+251 91 234 5678", "0911234567"),
	 * but wa.me only accepts bare international digits.
	 */
	function toWaNumber(raw: string) {
		const trimmed = raw.trim();
		const digits = trimmed.replace(/\D/g, '');

		if (trimmed.startsWith('+')) return digits;
		if (digits.startsWith('00')) return digits.slice(2);
		if (digits.startsWith('0')) return countryCode + digits.slice(1);
		if (digits.startsWith(countryCode)) return digits;
		return countryCode + digits;
	}

	const lines = $derived(
		(phones ?? [])
			.filter((p) => p && p.replace(/\D/g, '').length >= 7)
			.map((p) => ({ label: p, number: toWaNumber(p) }))
	);

	let open = $state(false);
	let teasing = $state(false);
	let selected = $state(0);
	let message = $state('');
	let textarea = $state<HTMLTextAreaElement | null>(null);
	let sendLink = $state<HTMLAnchorElement | null>(null);

	const active = $derived(lines[selected] ?? lines[0]);
	const ready = $derived(message.trim().length > 0 && Boolean(active));

	const waUrl = $derived.by(() => {
		if (!active) return '#';

		const body = includePageContext
			? `${message.trim()}\n\n— sent from ${page.url.origin}${page.url.pathname}`
			: message.trim();

		return `https://wa.me/${active.number}?text=${encodeURIComponent(body)}`;
	});

	/**
	 * The handoff leaves the page, so clear the draft once it has gone out —
	 * a visitor coming back to a pre-filled box would resend the same thing.
	 */
	function handoff() {
		message = '';
		open = false;
	}

	/** Enter sends, Shift+Enter makes a new line — the usual chat convention. */
	function onComposerKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey && ready) {
			event.preventDefault();
			sendLink?.click();
		}
	}

	function toggle() {
		open = !open;
		teasing = false;
		if (open) queueMicrotask(() => textarea?.focus());
	}

	onMount(() => {
		if (!lines.length) return;

		// One nudge per browsing session, so returning visitors aren't nagged.
		if (sessionStorage.getItem('fahem-chat-teased')) return;

		const timer = setTimeout(() => {
			if (!open) {
				teasing = true;
				sessionStorage.setItem('fahem-chat-teased', '1');
			}
		}, 6000);

		return () => clearTimeout(timer);
	});
</script>

{#snippet whatsappGlyph(cls: string)}
	<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class={cls}>
		<path
			d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.99 2.896 9.83 9.83 0 0 1 2.892 6.994c-.003 5.45-4.437 9.886-9.885 9.886m8.413-18.297A11.8 11.8 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413"
		/>
	</svg>
{/snippet}

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && open) open = false;
	}}
/>

{#if lines.length}
	<div class="fixed left-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:left-6 sm:bottom-6">
		{#if open}
			<div
				class="chat-panel flex w-[calc(100vw-2rem)] max-w-sm flex-col border border-border bg-card shadow-2xl"
			>
				<header class="flex items-start gap-3 bg-primary px-4 py-4 text-primary-foreground">
					<span class="flex size-10 shrink-0 items-center justify-center bg-primary-foreground/15">
						{@render whatsappGlyph('size-5')}
					</span>
					<div class="min-w-0 flex-1">
						<p class="font-heading text-base leading-tight font-semibold">{businessName}</p>
						<p class="mt-1 flex items-center gap-1.5 text-xs text-primary-foreground/80">
							<span class="size-1.5 shrink-0 rounded-full bg-emerald-400"></span>
							{replyTime}
						</p>
					</div>
					<Button
						type="button"
						onclick={() => (open = false)}
						aria-label="Close chat"
						class="-ml-1 shrink-0 p-1 text-primary-foreground/70 transition-colors hover:text-primary-foreground"
					>
						<X class="size-4" />
					</Button>
				</header>

				<div class="space-y-3 bg-muted/40 px-4 py-4">
					<div class="max-w-[85%] border border-border bg-card px-3 py-2 shadow-sm">
						<p class="text-sm leading-relaxed text-foreground">{greeting}</p>
					</div>

					{#if quickReplies.length}
						<div class="flex flex-wrap gap-1.5">
							{#each quickReplies as reply (reply)}
								<Button
									type="button"
									onclick={() => {
										message = reply;
										textarea?.focus();
									}}
									variant="outline"
									size="sm"
									class="bg-white! dark:bg-black!"
								>
									{reply}
								</Button>
							{/each}
						</div>
					{/if}
				</div>

				{#if lines.length > 1}
					<div class="flex flex-wrap items-center gap-1.5 border-t border-border px-4 py-3">
						<span class="mr-1 text-[0.65rem] tracking-widest text-muted-foreground uppercase">
							Send to
						</span>
						{#each lines as line, i (line.number)}
							<Button
								type="button"
								onclick={() => (selected = i)}
								aria-pressed={selected === i}
								class="border px-2 py-1 text-xs transition-colors {selected === i
									? 'border-primary bg-primary text-background hover:bg-primary/90'
									: 'border-border bg-transparent text-primary hover:text-background/90'}"
							>
								{line.label}
							</Button>
						{/each}
					</div>
				{/if}

				<div class="border-t border-border p-3">
					<textarea
						bind:this={textarea}
						bind:value={message}
						onkeydown={onComposerKeydown}
						rows="3"
						maxlength="1000"
						placeholder="Type your message…"
						aria-label="Your message"
						class="w-full resize-none border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
					></textarea>

					<a
						bind:this={sendLink}
						href={ready ? waUrl : undefined}
						target="_blank"
						rel="noreferrer noopener"
						onclick={handoff}
						aria-disabled={!ready}
						class="mt-2 flex h-11 w-full items-center justify-center gap-2 bg-[#25D366] text-xs font-semibold tracking-widest text-white uppercase transition-all hover:bg-[#1eb355] aria-disabled:pointer-events-none aria-disabled:opacity-50"
					>
						<Send class="size-3.5" />
						Send via WhatsApp
					</a>

					<p class="mt-2 text-center text-[0.65rem] text-muted-foreground">
						Opens WhatsApp with your message ready to send.
					</p>
				</div>

				<div
					class="flex items-center justify-center gap-4 border-t border-border bg-muted/30 px-4 py-2.5 text-xs"
				>
					<a
						href="tel:{active.label.replace(/\s/g, '')}"
						class="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
					>
						<Phone class="size-3" />
						Call us
					</a>
					{#if email}
						<span class="text-border">|</span>
						<a
							href="mailto:{email}"
							class="text-muted-foreground transition-colors hover:text-primary"
						>
							Email us
						</a>
					{/if}
				</div>
			</div>

		{/if}

		<Button
			type="button"
			onclick={toggle}
			aria-expanded={open}
			aria-label={open ? 'Close chat' : 'Chat with us on WhatsApp'}
			class="lift flex size-14 items-center justify-center bg-primary text-primary-foreground shadow-xl transition-colors hover:bg-primary/90"
		>
			{#if open}
				<X class="size-6" />
			{:else}
				{@render whatsappGlyph('size-7')}
			{/if}
		</Button>
	</div>
{/if}

<style>
	.chat-panel {
		animation: chat-in 320ms var(--ease-premium) both;
		transform-origin: bottom right;
	}

	.chat-teaser {
		animation: chat-in 320ms var(--ease-premium) both;
		transform-origin: bottom right;
	}

	@keyframes chat-in {
		from {
			opacity: 0;
			transform: translateY(12px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.chat-panel,
		.chat-teaser {
			animation: none;
		}
	}
</style>