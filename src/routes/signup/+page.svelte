<script lang="ts">
	import Signup from '$lib/forms/Signup.svelte';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Login</title>
</svelte:head>

<div class="flex h-screen w-full items-center justify-center px-4">
	<Signup data={data?.form} action="?/signup" />
</div>
