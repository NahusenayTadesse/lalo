<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { columns } from './columns';

	let { data } = $props();

	import DataTable from '$lib/components/Table/data-table.svelte';
	import { Button } from '$lib/components/ui/button/index';

	import { Frown, ArrowLeft } from '@lucide/svelte';
	import DateMonth from '$lib/date-month.svelte';
	import { CalendarDate, type CalendarDate as CalendarDateType } from '@internationalized/date';

	function toCalendarDate(str: string) {
		const d = new Date(str);
		return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
	}

	function handleDateChange(dates: { start: CalendarDateType; end: CalendarDateType }) {
		const url = new URL(page.url);
		url.searchParams.set('start', dates.start.toString());
		url.searchParams.set('end', dates.end.toString());
		goto(url, { keepFocus: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Quantity Change History</title>
</svelte:head>
<Button href="/dashboard/products/single/{page.params.id}" class="justify-self-start"
	><ArrowLeft /> Back</Button
>

{#if data.allTransactions.length === 0}
	<div class="flex h-96 w-5xl flex-col items-center justify-center">
		<p class="justify-self-cente mt-4 flex flex-row gap-4 text-center text-4xl">
			<Frown class="h-12 w-16  animate-bounce" />

			Change History is Empty for this Date Range Choose Another Range
		</p>
		<DateMonth
			start={toCalendarDate(data.start)}
			end={toCalendarDate(data.end)}
			onDateChange={handleDateChange}
		/>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		<h2 class="my-4 text-2xl">No of Changes {data.allTransactions?.length}</h2>

		<DateMonth
			start={toCalendarDate(data.start)}
			end={toCalendarDate(data.end)}
			onDateChange={handleDateChange}
		/>

		<DataTable data={data.allTransactions} {columns} search={false} />
	</div>
{/if}
