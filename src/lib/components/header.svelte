<script lang="ts">
	import { MenuIcon, XIcon } from '@lucide/svelte';
	import DarkMode from '@nahu/admin-kit/components/shell/DarkMode.svelte';
	import AvatarSettings from './AvatarSettings.svelte';
	import LanguageSwitcher from './LanguageSwitcher.svelte';
	import InstallApp from './InstallApp.svelte';
	import { m } from '$lib/paraglide/messages.js';

	import { Sheet, SheetContent, SheetTrigger } from '@nahu/admin-kit/components/ui/sheet/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';

	let isOpen = $state(false);
	let scrolled = $state(false);

	const handleMenuClick = () => {
		isOpen = false;
	};
	import { page } from '$app/state';

	let { data } = $props();

	const menuItems = [
		{ label: m.nav_home(), href: '/' },

		{ label: m.nav_products(), href: '/shop' },
		{ label: m.nav_recipes(), href: '/recipes' },

		{ label: m.nav_about_us(), href: '/about-us' },
		{ label: m.nav_contact_us(), href: '/contact-us' },
		{ label: m.nav_orders(), href: '/orders' }
	];
</script>

<svelte:window onscroll={() => (scrolled = window.scrollY > 12)} />

<header
	class={[
		'site-header sticky top-0 z-50 w-full px-2 transition-[padding] duration-500 ease-out-expo lg:px-8',
		scrolled ? 'py-2' : 'py-3'
	]}
>
	<div
		class={[
			'mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-3 transition-all duration-500 ease-out-expo md:px-5',
			scrolled ? 'glass-strong h-16' : 'glass h-18'
		]}
	>
		<!-- Logo/Title -->
		<div class="flex shrink-0 items-center gap-2">
			<a href="/" class="inline-block transition-transform duration-300 hover:scale-105">
				<img
					src="/logo.webp"
					width="128"
					height="96"
					class={['w-auto object-contain transition-all duration-500', scrolled ? 'h-11' : 'h-13']}
					alt={m.header_logo_alt()}
					fetchpriority="high"
				/>
			</a>
		</div>

		<!-- Desktop Menu -->
		<nav class="hidden items-center gap-1 rounded-full p-1 md:flex">
			{#each menuItems as item (item.href)}
				{@const active = page.url.pathname === item.href}
				<a
					href={item.href}
					onclick={handleMenuClick}
					aria-current={active ? 'page' : undefined}
					class={[
						'group relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-300',
						active
							? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
							: 'text-foreground/75 hover:bg-primary/10 hover:text-foreground'
					]}
				>
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="flex flex-row gap-4">
			<div class="hidden flex-row items-center justify-end lg:flex">
				<div class="m-2">
					{#if data === ''}
						<!-- Search and Auth -->
						<div class="item-end hidden gap-4 md:flex">
							<Button href="/login" variant="ghost" size="sm">{m.auth_sign_in()}</Button>
							<Button href="/signup" size="sm" class="rounded-full px-4 shadow-md shadow-primary/25"
								>{m.auth_sign_up()}</Button
							>
						</div>
					{:else}
						<AvatarSettings {data} />
					{/if}
				</div>
				<div class="flex gap-2">
					<InstallApp variant="icon" />
					<LanguageSwitcher />
					<DarkMode />
				</div>
			</div>

			<!-- Mobile Menu -->
			<div class="md:hidden">
				<Sheet bind:open={isOpen}>
					<SheetTrigger>
						{#snippet child({ props: triggerProps })}
							<Button variant="default" size="icon" {...triggerProps}>
								{#if isOpen}
									<XIcon class="size-5" />
								{:else}
									<MenuIcon class="size-5" />
								{/if}
							</Button>
						{/snippet}
					</SheetTrigger>
					<SheetContent side="right" class="glass-strong flex w-80 flex-col p-0">
						<div class="border-b border-border/50 bg-primary/5 p-6">
							{#if data === ''}
								<div class="space-y-1">
									<h2 class="text-lg font-bold tracking-tight">{m.header_welcome()}</h2>
									<p class="text-xs text-muted-foreground">{m.header_sign_in_hint()}</p>
								</div>
							{:else}
								<div class="flex items-center gap-4">
									<div class="rounded-full bg-background p-1 shadow-sm ring-2 ring-primary/10">
										<AvatarSettings {data} />
									</div>
									<div class="flex flex-col overflow-hidden">
										<span class="truncate text-sm font-semibold">
											{data.user?.name ?? m.header_account()}
										</span>
										<span class="truncate text-xs text-muted-foreground">
											{data.user?.email ?? m.header_member()}
										</span>
									</div>
								</div>
							{/if}
						</div>

						<nav class="flex flex-1 flex-col gap-1 p-4" data-reveal-stagger>
							{#each menuItems as item (item.href)}
								<Button
									variant={page.url.pathname === item.href ? 'default' : 'ghost'}
									href={item.href}
									class="w-full justify-start gap-3 rounded-xl px-3 py-6 text-base font-medium transition-all active:scale-[0.98]"
									onclick={handleMenuClick}
								>
									{#if item.icon}
										<item.icon class="h-5 w-5 opacity-60" />
									{/if}
									{item.label}
								</Button>
							{/each}
						</nav>

						<div class="space-y-4 border-t border-border/50 bg-muted/10 p-4">
							<InstallApp variant="button" class="h-11 w-full rounded-xl" />
							<div class="flex items-center justify-between px-2">
								<span class="text-sm font-medium text-muted-foreground">{m.header_interface()}</span>
								<div class="flex gap-2">
									<LanguageSwitcher />
									<DarkMode />
								</div>
							</div>

							{#if data === ''}
								<div class="grid grid-cols-2 gap-2">
									<Button onclick={handleMenuClick} variant="outline" class="h-11" href="/login"
										>{m.auth_log_in()}</Button
									>
									<Button onclick={handleMenuClick} class="h-11 shadow-sm" href="/signup"
										>{m.header_join()}</Button
									>
								</div>
							{/if}
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</div>
	</div>
</header>
