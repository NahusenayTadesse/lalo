<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { locales, localizeHref } from '$lib/paraglide/runtime.js';
	import './layout.css';
	import { getFlash } from 'sveltekit-flash-message';
	import { page, updated } from '$app/state';
	import { Toaster } from '@nahu/admin-kit/components/ui/sonner/index.js';
	import { ProgressBar } from '@prgm/sveltekit-progress-bar';
	import { onNavigate } from '$app/navigation';
	import { startReveals } from '$lib/motion';
	import { pwa } from '$lib/pwa.svelte';

	const flash = getFlash(page, { clearAfterMs: 5000 });

	import { ModeWatcher } from 'mode-watcher';
	import { fly } from 'svelte/transition';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';

	async function notifyBrowser(title: string, body: string) {
		if (!('Notification' in window)) return; // Safari iOS etc.

		if (Notification.permission === 'granted') {
			new Notification(title, { body, icon: '/logo192.png' });
		} else if (Notification.permission !== 'denied') {
			const perm = await Notification.requestPermission();

			if (perm === 'granted') new Notification(title, { body, icon: '/logo192.png' });
		}
	}

	import { setCart } from '$lib/hooks/cart.svelte'; // Adjust path
	import Cart from '$lib/components/floating-cart/cart.svelte';
	import Header from '$lib/components/header.svelte';
	import Footer from '$lib/components/footer.svelte';
	import Whatsappchat from '$lib/components/whatsappchat.svelte';

	// This initializes the class and puts it into Svelte's context
	setCart();

	let { data, children } = $props();

	$effect(() => {
		document.documentElement.classList.add('motion-ready');
		pwa.start();
		return startReveals();
	});

	// Cross-fade between pages where the browser supports view transitions. The
	// dashboard keeps instant navigation: it's a working tool, not a showroom.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		if (navigation.to?.url.pathname.startsWith('/dashboard')) return;
		if (navigation.from?.url.pathname === navigation.to?.url.pathname) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// async function requestNotificationPermission() {
	// 	if (!('Notification' in window)) return;
	// 	await Notification.requestPermission();
	// }
	// let iconify = $state('h-6 w-6 animate-ping');
	$effect(() => {
		if (!$flash) return;
		if (page.data.flash?.type === 'success') toast.success($flash.message);
		if (page.data.flash?.type === 'error') toast.error($flash?.message);

		if (Notification.permission === 'granted') {
			notifyBrowser(
				page.data.flash?.type === 'success'
					? m.notify_success()
					: page.data.flash?.type === 'error'
						? m.notify_error()
						: m.notify_message(),
				$flash.message
			);
		}

		$flash = undefined;
	});
</script>

<svelte:head><link rel="icon" href="/logo192.png" /></svelte:head>
<ModeWatcher />
<Toaster position="bottom-right" richColors closeButton />
<ProgressBar color="#bc3d00" zIndex={1000} />

{#if updated.current}
	<div
		class="glass-strong fixed right-4 bottom-24 z-[60] flex max-w-sm items-center gap-3 rounded-2xl px-5 py-3 text-sm font-medium lg:bottom-6"
		transition:fly={{ y: 20, duration: 400 }}
	>
		<span class="relative flex size-2.5 shrink-0">
			<span class="absolute inline-flex size-full animate-ping rounded-full bg-primary/70"></span>
			<span class="relative inline-flex size-2.5 rounded-full bg-primary"></span>
		</span>
		<p class="flex-1">{m.app_update_available()}</p>
		<Button size="sm" class="rounded-full" onclick={() => location.reload()}>{m.app_reload()}</Button>
	</div>
{/if}

{#if !page.url.pathname.startsWith('/dashboard')}
	<!-- The storefront keeps its own typography: the kit's h1–p rules skip this subtree. -->
	<div data-site-type class="contents">
		<Header data={data?.user?.name ?? ''} />
		{@render children()}
		<Footer />
		<Whatsappchat />
		<Cart
			freeDeliveryThreshold={data?.freeData?.threshold}
			suggestionThreshold={data?.freeData?.suggestionThreshold}
		/>
	</div>
{:else}
	{@render children()}
{/if}

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
	{/each}
</div>

