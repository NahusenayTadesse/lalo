<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';

	let {
		checked,
		indeterminate = false,
		onCheckedChange,
		label
	}: {
		checked: boolean;
		indeterminate?: boolean;
		onCheckedChange: (checked: boolean) => void;
		label: string;
	} = $props();
</script>

<Checkbox
	{checked}
	{indeterminate}
	onCheckedChange={(v) => onCheckedChange(!!v)}
	aria-label={label}
/>
