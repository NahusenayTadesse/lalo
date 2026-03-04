<script lang="ts">
	import { SearchIcon, MenuIcon, XIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import AvatarSettings from './AvatarSettings.svelte';
	import DarkMode from './DarkMode.svelte';
	let mobileMenuOpen = $state(false);

	let { data } = $props();

	const navLinks = [
		{ label: 'Home', href: '/' },

		{ label: 'About Us', href: '/about-us' },
		{ label: 'Recipes', href: '/recipes' },
		{ label: 'Products', href: '/shop' },
		{ label: 'Contact Us', href: '/contact-us' },
		{ label: 'Orders', href: '/orders' }
	];
</script>

<header
	class="sticky top-0 z-50 w-full bg-background backdrop-blur supports-backdrop-filter:bg-background/10"
>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo -->
			<div class="flex shrink-0 items-center gap-2">
				<a href="/"><img src="/logo.webp" loading="lazy" class="my-2 h-12 w-16" alt="Logo" /></a>

				<!-- <span class="text-xl font-bold text-foreground">Lalo Bakery Solution</span> -->
			</div>

			<!-- Desktop Navigation -->
			<nav class="hidden items-center gap-8 md:flex">
				{#each navLinks as link (link.href)}
					<a
						href={link.href}
						class="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
					>
						{link.label}
					</a>
				{/each}
			</nav>
			<div class="flex flex-row items-center justify-end">
				<div class="m-2">
					{#if data === ''}
						<!-- Search and Auth -->
						<div class="hidden items-center gap-4 md:flex">
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

			<!-- Mobile Menu Button -->
			<button class="p-2 md:hidden" onclick={() => (mobileMenuOpen = !mobileMenuOpen)}>
				{#if mobileMenuOpen}
					<XIcon class="size-6" />
				{:else}
					<MenuIcon class="size-6" />
				{/if}
			</button>
		</div>

		<!-- Mobile Navigation -->
		{#if mobileMenuOpen}
			<div class="flex flex-col gap-4 border-t py-4 md:hidden">
				<div class="relative">
					<Input type="text" placeholder="Search products..." class="pr-4 pl-10" />
					<SearchIcon
						class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
				</div>
				<nav class="flex flex-col gap-3">
					{#each navLinks as link (link.href)}
						<a
							href={link.href}
							class="py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
						>
							{link.label}
						</a>
					{/each}
				</nav>
				<div class="flex gap-2 border-t pt-4">
					<Button variant="outline" class="flex-1" size="sm">
						<a href="#" class="text-sm">Sign In</a>
					</Button>
					<Button class="flex-1" size="sm">
						<a href="#" class="text-sm">Sign Up</a>
					</Button>
				</div>
			</div>
		{/if}
	</div>
</header>
