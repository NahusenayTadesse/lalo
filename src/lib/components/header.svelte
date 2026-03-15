<script lang="ts">
	import {  MenuIcon, XIcon } from '@lucide/svelte';
	import DarkMode from './DarkMode.svelte';
		import AvatarSettings from './AvatarSettings.svelte';


	import { Sheet, SheetContent, SheetTrigger } from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';

	let isOpen = $state(false);

	const handleMenuClick = (href: string) => {
		isOpen = false;
	};
	import { page } from '$app/state';

		let { data } = $props();


	const menuItems = [
		{ label: 'Home', href: '/' },

		{ label: 'About Us', href: '/about-us' },
		{ label: 'Recipes', href: '/recipes' },
		{ label: 'Products', href: '/shop' },
		{ label: 'Contact Us', href: '/contact-us' },
		{ label: 'Orders', href: '/orders' }
	];
</script>

<header
	class="sticky top-0 z-50 w-full bg-accent px-2 py-2 backdrop-blur supports-backdrop-filter:bg-accent lg:px-16"
>
	<div class="flex h-14 items-center justify-between px-4 md:px-6">
		<!-- Logo/Title -->
		<div class="flex shrink-0 items-center gap-2">
			<a href="/" class="inline-block">
				<img
					src="/logo.webp"
					width="128"
					height="96"
					class="h-16 w-auto object-contain"
					alt="Amy Bakes Home"
					fetchpriority="high"
				/>
			</a>

			<!-- <span class="text-xl font-bold text-foreground">Lalo Bakery Solution</span> -->
		</div>

		<!-- Desktop Menu -->
		<nav class="hidden items-center gap-1 md:flex">
			{#each menuItems as item (item.href)}
				<Button
					variant={page.url.pathname === item.href ? 'default' : 'ghost'}
					size="sm"
					href={item.href}
					onclick={() => handleMenuClick(item.href)}
				>
					{item.label}
				</Button>
			{/each}
		</nav>
		<div class="flex flex-row gap-4">

				<div class="lg:flex hidden flex-row items-center justify-end">
				
				<div class="m-2">
					{#if data === ''}
						<!-- Search and Auth -->
						<div class="hidden item-end gap-4 md:flex">
							<Button variant="ghost" size="sm">
								<a href="/login" class="text-sm">Sign In</a>
							</Button>
							<Button size="sm">
								<a href="/signup" class="text-sm">Sign Up</a>
							</Button>
						</div>
					{:else}
						<AvatarSettings {data} />
					{/if}
					
				</div>
				<DarkMode />
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
				<SheetContent side="right" class="w-80 p-0 flex flex-col">
    <div class="p-6 border-b bg-muted/20">
        {#if data === ''}
            <div class="space-y-1">
                <h2 class="text-lg font-bold tracking-tight">Welcome</h2>
                <p class="text-xs text-muted-foreground">Sign in to sync your progress</p>
            </div>
        {:else}
            <div class="flex items-center gap-4">
                <div class="ring-2 ring-primary/10 rounded-full p-1 bg-background shadow-sm">
                    <AvatarSettings {data} />
                </div>
                <div class="flex flex-col overflow-hidden">
                    <span class="text-sm font-semibold truncate">
                        {data.user?.name ?? 'Account'}
                    </span>
                    <span class="text-xs text-muted-foreground truncate">
                        {data.user?.email ?? 'Member'}
                    </span>
                </div>
            </div>
        {/if}
    </div>

    <nav class="flex-1 p-4 flex flex-col gap-1">
        {#each menuItems as item (item.href)}
            <Button
                variant="ghost"
                href={item.href}
                class="w-full justify-start gap-3 px-3 py-6 text-base font-medium transition-all active:scale-[0.98]"
                onclick={() => handleMenuClick(item.href)}
            >
                {#if item.icon}
                    <svelte:component this={item.icon} class="h-5 w-5 opacity-60" />
                {/if}
                {item.label}
            </Button>
        {/each}
    </nav>

    <div class="p-4 border-t bg-muted/10 space-y-4">
        <div class="flex items-center justify-between px-2">
            <span class="text-sm font-medium text-muted-foreground">Interface</span>
            <DarkMode />
        </div>

        {#if data === ''}
            <div class="grid grid-cols-2 gap-2">
                <Button variant="outline" class="h-11" href="/login">Log In</Button>
                <Button class="h-11 shadow-sm" href="/signup">Join</Button>
            </div>
        {/if}
    </div>
</SheetContent>
			</Sheet>
		</div>
	</div>
	</div>
</header>