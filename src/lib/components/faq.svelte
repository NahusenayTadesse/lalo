<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import {
		Accordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent
	} from '$lib/components/ui/accordion';
	import {
		TruckIcon,
		PackageIcon,
		AwardIcon,
		MessageCircleQuestionMark,
		CalendarCheckIcon,
		WalletIcon,
		StoreIcon,
		WheatIcon
	} from '@lucide/svelte';

	const features = [
		{
			id: 'product-range',
			title: m.faq_product_range_title(),
			description: m.faq_product_range_desc(),
			icon: WheatIcon
		},
		{
			id: 'bulk-retail',
			title: m.faq_bulk_retail_title(),
			description: m.faq_bulk_retail_desc(),
			icon: PackageIcon
		},
		{
			id: 'professional-grade',
			title: m.faq_professional_grade_title(),
			description: m.faq_professional_grade_desc(),
			icon: AwardIcon
		},
		{
			id: 'expert-advice',
			title: m.faq_expert_advice_title(),
			description: m.faq_expert_advice_desc(),
			icon: MessageCircleQuestionMark
		},
		{
			id: 'delivery-services',
			title: m.faq_delivery_services_title(),
			description: m.faq_delivery_services_desc(),
			icon: TruckIcon
		},
		{
			id: 'advance-orders',
			title: m.faq_advance_orders_title(),
			description: m.faq_advance_orders_desc(),
			icon: CalendarCheckIcon
		},
		{
			id: 'payment-methods',
			title: m.faq_payment_methods_title(),
			description: m.faq_payment_methods_desc(),
			icon: WalletIcon
		},
		{
			id: 'contact-us',
			title: m.faq_contact_us_title(),
			description: m.faq_contact_us_desc(),
			icon: StoreIcon
		}
	];
</script>

<div
	class="min-h-dvh bg-linear-to-br from-primary/5 via-background to-accent/5 px-4 py-12 sm:px-6 lg:px-8"
>
	<div class="mx-auto w-full">
		<!-- Header -->
		<div class="mb-12 text-center">
			<h1 class="mb-4 text-4xl font-bold text-foreground sm:text-5xl">{m.faq_title()}</h1>
			<p class="text-lg text-muted-foreground">
				{m.faq_subtitle()}
			</p>
		</div>

		<!-- Accordion -->
		<Accordion
			type="single"
			collapsible
			class="grid w-9/10 grid-cols-1 items-center gap-3 space-y-3 justify-self-center lg:grid-cols-2"
		>
			{#each features as feature (feature.id)}
				<AccordionItem
					value={feature.id}
					class="hover:shadow-lg-md transition-shadow-lg overflow-hidden rounded-lg border border-border shadow-lg duration-200"
				>
					<AccordionTrigger
						class="px-6 py-4 transition-colors duration-200 hover:bg-accent/5 [&[data-state=open]]:bg-primary/5"
					>
						<div class="flex items-center gap-4 text-left">
							<div class="shrink-0 rounded-lg bg-primary/10 p-2">
								<svelte:component this={feature.icon} class="size-5 text-primary" />
							</div>
							<h3 class="text-lg font-semibold text-foreground">{feature.title}</h3>
						</div>
					</AccordionTrigger>
					<AccordionContent class="border-t border-border bg-card/50 px-6 py-4">
						<p class="leading-relaxed text-muted-foreground">{feature.description}</p>
					</AccordionContent>
				</AccordionItem>
			{/each}
		</Accordion>
	</div>
</div>
