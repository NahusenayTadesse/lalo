<script lang="ts">
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
			title: 'Our Product Range',
			description:
				'A wide selection of bakery and pastry essentials, including premium butter, yeast, chocolate, flavorings, and professional cake decorations.',
			icon: WheatIcon
		},
		{
			id: 'bulk-retail',
			title: 'Wholesale & Retail',
			description:
				'Flexible purchasing options to suit everyone. We provide both bulk wholesale supplies for businesses and small quantities for home bakers.',
			icon: PackageIcon
		},
		{
			id: 'professional-grade',
			title: 'Professional Quality',
			description:
				'Our ingredients are carefully curated to meet the high standards of professional pastry chefs while remaining accessible for home use.',
			icon: AwardIcon
		},
		{
			id: 'expert-advice',
			title: 'Baking Consultation',
			description:
				'Not sure what you need? Our expert team provides personalized guidance to help you select the perfect ingredients for your specific recipes.',
			icon: MessageCircleQuestionMark
		},
		{
			id: 'delivery-services',
			title: 'Delivery Options',
			description:
				'Convenient delivery is available based on your location and order size. Contact us to find the best shipping method for your needs.',
			icon: TruckIcon
		},
		{
			id: 'advance-orders',
			title: 'Advance Ordering',
			description:
				'Plan ahead for your big projects. We accept advance orders, which is especially recommended for large bulk purchases.',
			icon: CalendarCheckIcon
		},
		{
			id: 'payment-methods',
			title: 'Secure Payments',
			description:
				'We offer flexible payment solutions including cash, mobile banking, and direct bank transfers for your convenience.',
			icon: WalletIcon
		},
		{
			id: 'contact-us',
			title: 'Get In Touch',
			description:
				'Reach out via phone, social media, or visit our shop directly to explore our inventory and place your order.',
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
			<h1 class="mb-4 text-4xl font-bold text-foreground sm:text-5xl">FAQ</h1>
			<p class="text-lg text-muted-foreground">
				Frequently asked questions about our products and services.
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
