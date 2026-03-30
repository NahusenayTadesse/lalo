<script lang="ts">
	import {
		Accordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent
	} from '$lib/components/ui/accordion';
	import {
		CheckCircleIcon,
		TruckIcon,
		HeartHandshakeIcon,
		ShoppingBagIcon,
		SparklesIcon,
		UsersIcon,
		NetworkIcon,
		PackageIcon,
		CookingPotIcon
	} from '@lucide/svelte';
	import Button from './ui/button/button.svelte';

	const features = [
		{
			id: 'halal',
			title: '100% Halal Certified Products',
			description:
				'Fully halal-certified ingredients and products, catering to diverse markets with uncompromised integrity.',
			icon: CheckCircleIcon
		},
		{
			id: 'multi-diet',
			title: 'Multi-Diet Ingredients',
			description:
				'Carefully selected ingredients suitable for various dietary needs, including gluten-free, vegan, and allergen-friendly options.',
			icon: CookingPotIcon
		},
		{
			id: 'imported',
			title: 'Refined Imported Ingredients',
			description:
				'Finest imported ingredients, refined for consistent taste and superior baking performance.',
			icon: SparklesIcon
		},
		{
			id: 'tailored',
			title: 'Tailored Bakery Solutions',
			description:
				'Customized solutions designed to meet your unique baking and business requirements.',
			icon: HeartHandshakeIcon
		},
		{
			id: 'delivery',
			title: 'Reliable Delivery',
			description:
				'Timely and secure delivery ensuring fresh products reach you without compromise.',
			icon: TruckIcon
		},
		{
			id: 'affordable',
			title: 'Affordable and Accessible',
			description:
				'High-quality bakery solutions offered at competitive prices, making exceptional standards accessible to all.',
			icon: ShoppingBagIcon
		},
		{
			id: 'support',
			title: 'Hands-On Support',
			description:
				'Dedicated expert assistance available whenever you need guidance or troubleshooting.',
			icon: UsersIcon
		},
		{
			id: 'network',
			title: 'Sister Company Network',
			description:
				'Lalo and Fahem General Trading handle imports and exports across coffee, agriculture, veterinary, tires, wire mesh, and tools.',
			icon: NetworkIcon
		},
		{
			id: 'onestop',
			title: 'One Stop Shop',
			description:
				'All your bakery needs met under one roof, from ingredients to equipment to delivery.',
			icon: PackageIcon
		}
	];
</script>

<div
	class="min-h-dvh bg-linear-to-br from-primary/5 via-background to-accent/5 px-4 py-12 sm:px-6 lg:px-8"
>
	<div class="mx-auto w-full">
		<!-- Header -->
		<div class="mb-12 text-center">
			<h1 class="mb-4 text-4xl font-bold text-foreground sm:text-5xl">Why Us</h1>
			<p class="text-lg text-muted-foreground">
				Discover what makes our bakery solutions exceptional
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

		<!-- Footer CTA -->
		<div class="mt-12 text-center">
			<p class="mb-4 text-muted-foreground">Ready to elevate your bakery business?</p>
			<Button href="/contact-us">Get Started Today</Button>
		</div>
	</div>
</div>
