<script lang="ts">
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { PackageSearch } from '@lucide/svelte';

	let { orderId, onclick }: { orderId: number; onclick: () => void } = $props();
</script>

<Button size="sm" variant="ghost" {onclick} title="Manage this delivery">
	<PackageSearch />
	#{orderId}
</Button>
