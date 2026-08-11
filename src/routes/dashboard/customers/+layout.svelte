<script>
	import Button from '$lib/components/ui/button/button.svelte';
	import { Sheet } from '@lucide/svelte';
	let { children } = $props();
</script>

<!-- The add-customer dialog lives on the pages themselves (customers, orders),
     since it needs the superValidated form off their own `load`. -->
<div class="mb-8 flex flex-row items-center justify-start gap-2">
	<Button href="/dashboard/customers"><Sheet /> All Customers</Button>
</div>

{@render children?.()}
