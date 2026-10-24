<script lang="ts">
	import { Languages } from '@lucide/svelte';
	import * as DropdownMenu from '@nahu/admin-kit/components/ui/dropdown-menu/index.js';
	import { buttonVariants } from '@nahu/admin-kit/components/ui/button/index.js';
	import { getLocale, locales, setLocale, type Locale } from '$lib/paraglide/runtime.js';
	import { m } from '$lib/paraglide/messages.js';

	// Each language is named in itself, so a visitor can find theirs whatever is showing.
	const names: Record<Locale, string> = { en: 'English', am: 'አማርኛ' };

	const current = getLocale();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class={buttonVariants({ variant: 'outline', size: 'icon' })}>
		<Languages class="h-[1.2rem] w-[1.2rem]" />
		<span class="sr-only">{m.language_switch()}</span>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		{#each locales as locale (locale)}
			<DropdownMenu.Item
				onclick={() => setLocale(locale)}
				class={locale === current ? 'font-semibold' : ''}
				lang={locale}
			>
				{names[locale]}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
