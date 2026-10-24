<script>
	import { m } from '$lib/paraglide/messages.js';
	import { page } from '$app/state';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
</script>

<div class="flex h-full w-full flex-col items-center justify-center">
	<h1 class="text-5xl text-red-600">{page.status}</h1>

	<h3 class="font-head text-2xl text-red-600">{page.error?.message}</h3>

	<Button href="/account">{m.error_back_overview()}</Button>
</div>
