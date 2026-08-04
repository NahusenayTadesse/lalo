<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import RangeCalendar from '$lib/components/ui/range-calendar/range-calendar.svelte';
	import { CalendarIcon, SlidersHorizontal } from '@lucide/svelte';
	import { getLocalTimeZone, type CalendarDate, type DateValue } from '@internationalized/date';
	import type { DateRange } from 'bits-ui';
	import { formatEthiopianDate, isMobile } from './global.svelte';

	interface Props {
		start?: CalendarDate | null;
		end?: CalendarDate | null;
		onDateChange?: (dates: { start: CalendarDate; end: CalendarDate }) => void;
	}

	let { start = null, end = null, onDateChange }: Props = $props();

	let value = $state<DateRange>({ start: start ?? undefined, end: end ?? undefined });
	let open = $state(false);

	// `value` only seeds from `start`/`end` at mount; keep it in sync when the
	// caller clears/changes the filter externally (e.g. a "Clear all" button).
	// Skipped while the popover is open so it doesn't clobber an in-progress pick.
	$effect(() => {
		if (!open) {
			value = { start: start ?? undefined, end: end ?? undefined };
		}
	});

	function formatDate(date: DateValue | undefined) {
		if (!date) return null;
		return formatEthiopianDate(new Date(date.toDate(getLocalTimeZone()).toISOString()));
	}

	function apply() {
		if (!value.start || !value.end) return;
		open = false;
		onDateChange?.({ start: value.start as CalendarDate, end: value.end as CalendarDate });
	}
</script>

<Popover bind:open>
	<PopoverTrigger>
		{#snippet child({ props })}
			<Button variant="outline" class="min-w-64 justify-start text-left font-normal" {...props}>
				<CalendarIcon class="mr-2 size-4 text-muted-foreground" />
				{formatDate(value.start) ?? 'Start date'} - {formatDate(value.end) ?? 'End date'}
			</Button>
		{/snippet}
	</PopoverTrigger>
	<PopoverContent class="w-auto p-0">
		<RangeCalendar
			bind:value
			class="relative w-auto rounded-lg border pb-16 shadow-sm"
			numberOfMonths={isMobile() ? 1 : 2}
		/>
		<Button disabled={!value.start || !value.end} class="absolute right-2 bottom-2" onclick={apply}>
			<SlidersHorizontal /> Apply
		</Button>
	</PopoverContent>
</Popover>
