<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowRightIcon } from '@lucide/svelte';
	import { CheckCircleIcon, ShieldCheckIcon, HeartHandshakeIcon } from '@lucide/svelte';
	import { WheatIcon, BadgeCheckIcon, ToolCase, BookOpenIcon } from '@lucide/svelte';
	import { LeafIcon, Send } from '@lucide/svelte';
	import { PhoneIcon } from '@lucide/svelte';
	import FAQ from '$lib/components/faq.svelte';
	import { Coffee, Cog, Globe, Utensils, WashingMachine, Building } from '@lucide/svelte';

	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

	import { IconBrandFacebook, IconBrandInstagram, IconBrandTiktok } from '@tabler/icons-svelte';

	const socialLinks = [
		{
			name: 'Instagram',
			url: 'https://www.instagram.com/lalobakerysolution?igsh=MTZ1eDNldHl3OW9iNw%3D%3D&utm_source=qr',
			icon: IconBrandInstagram,
			color: 'hover:text-pink-500'
		},
		{
			name: 'TikTok',
			url: 'https://www.tiktok.com/@lalobakerysolution?_r=1&_t=ZM-91WtG5hY5VY',
			icon: IconBrandTiktok,
			color: 'hover:text-black dark:hover:text-white'
		},
		{
			name: 'Facebook',
			url: 'https://facebook.com',
			icon: IconBrandFacebook,
			color: 'hover:text-blue-600'
		},
		{
			name: 'Telegram',
			url: 'https://t.me/LaloBakery',
			icon: Send,
			color: 'hover:text-blue-400'
		}
	];

	const partners = [
		{
			name: 'Lalo Coffee Exports',
			description:
				'Leading global commodity supply chain coordination specializing in premium coffee sourcing. We manage end-to-end international logistics, ensuring quality control and traceability from farm-gate to global markets.',
			icon: Coffee,
			short: 'LAL_EXP'
		},
		{
			name: 'Fahem General Trading',
			description:
				'A powerhouse in diversified international trade, managing complex import-export operations across key industrial, material, and consumer sectors. We leverage a robust global network to bridge supply gaps in emerging markets.',
			icon: Globe,
			short: 'FAH_GEN'
		},
		{
			name: 'Lalo Laundry',
			description:
				'High-capacity commercial textile solutions utilizing state-of-the-art cleaning technology. We provide specialized linen management and garment care for the hospitality, healthcare, and industrial sectors with a focus on hygiene and longevity.',
			icon: WashingMachine,
			short: 'LAL_LAU'
		},
		{
			name: 'Lalo Fixtec',
			description:
				'A premier distributor of professional-grade mechanical tools and heavy-duty equipment. We provide bulk supply solutions and technical support for large-scale infrastructure, manufacturing, and industrial construction projects.',
			icon: Cog,
			short: 'LAL_FIX'
		},
		{
			name: 'Lalo Cafe',
			description:
				'Elevating the corporate hospitality experience through curated beverage and artisanal food services. Our locations serve as high-end communal hubs integrated within commercial environments to foster networking and productivity.',
			icon: Utensils,
			short: 'LAL_CAF'
		},
		{
			name: 'Lalo Apartment',
			description:
				'A full-service residential property management firm dedicated to optimizing asset value. We oversee the entire lifecycle of multi-family units, including strategic leasing, preventative maintenance, and premium tenant relations.',
			icon: Building,
			short: 'LAL_APT'
		}
	];
</script>

<svelte:head>
	<title>About Us | Professional Bakery Supplies & Equipment</title>
	<meta
		name="description"
		content="From MasterChef to Industry Leader. Lalo Bakery Solutions delivers excellence with a comprehensive portfolio of flours, yeasts, mixes, and equipment for professional bakeries."
	/>
	<meta
		name="keywords"
		content="Lalo Bakery Solutions, professional bakery supplies, wholesale flour, bakery equipment, MasterChef rebranding, industrial baking solutions"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:title" content="Lalo Bakery Solutions: From MasterChef to Industry Leader" />
	<meta
		property="og:description"
		content="Delivering excellence across every stage of production with premium ingredients and technical support."
	/>
	<meta property="og:image" content="/logo.webp" />

	<meta property="twitter:card" content="summary_large_image" />
	<meta
		property="twitter:title"
		content="Lalo Bakery Solutions | Industry-Leading Bakery Supplies"
	/>
	<meta
		property="twitter:description"
		content="Reliable supply chains and technical expertise for the modern bakery. Explore our journey from MasterChef to Lalo."
	/>
	<meta property="twitter:image" content="/logo.webp" />
</svelte:head>

<section
	class="relative -z-2 overflow-hidden bg-linear-to-br from-primary/20 via-accent/10 to-background bg-cover bg-center px-4 py-20 sm:py-32"
	style="background-image: url('/bakery (11).webp')"
>
	<div class="absolute inset-0 -z-1 bg-background/60"></div>
	<!-- Decorative elements -->
	<div class="absolute inset-0 overflow-hidden">
		<div class="absolute -top-40 -right-40 size-80 rounded-full bg-primary/10 blur-3xl"></div>
		<div class="absolute -bottom-40 -left-40 size-80 rounded-full bg-accent/10 blur-3xl"></div>
	</div>

	<div class="backdrop-blur-sm/10 relative z-1 mx-auto max-w-4xl shadow-lg">
		<div class="space-y-6 text-center">
			<div
				class="inline-block rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
			>
				Since 2011 • Trusted by Bakeries Worldwide
			</div>

			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
				Ingredients that deliver.
			</h1>

			<p class="mx-auto max-w-2xl text-lg text-foreground/70 sm:text-xl">
				Established in 2011, we've grown from MasterChef into a comprehensive bakery ingredient and
				equipment supplier serving both small bakeries and large-scale producers.
			</p>

			<div class="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
				<Button size="lg" href="/shop" class="gap-2">
					Explore Our Solutions
					<ArrowRightIcon class="size-4" />
				</Button>
				<Button href="/contact-us" size="lg" variant="outline">Contact Us</Button>
			</div>

			<div class="flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
				<p class="text-sm text-foreground/70">Follow us on social media</p>
				<div class="grid grid-cols-4 gap-3">
					{#each socialLinks as social (social.url)}
						<a
							href={social.url}
							target="_blank"
							rel="noopener noreferrer"
							class={[
								'flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:border-primary hover:shadow-lg',
								social.color
							]}
							title={social.name}
						>
							<social.icon class="h-6 w-6" />
						</a>
					{/each}
				</div>
			</div>
		</div>
	</div>
</section>

<section class="px-4 py-20 sm:py-32">
	<div class="mx-auto max-w-5xl">
		<div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
			<!-- Left side - Image placeholder -->
			<div class="relative">
				<div
					class="aspect-square overflow-hidden rounded-2xl bg-linear-to-br from-primary/20 to-accent/20"
				>
					<img
						src="/files/demo.webp"
						alt="Lalo Bakery Solution"
						class="h-full w-full object-cover"
					/>
				</div>
				<div
					class="shadow-lg-lg absolute -right-2 -bottom-6 max-w-xs rounded-xl bg-primary p-6 text-primary-foreground lg:-right-6"
				>
					<p class="text-sm font-semibold">Trusted by bakeries across the region since 2011</p>
				</div>
			</div>

			<!-- Right side - Content -->
			<div class="space-y-6">
				<div>
					<h2 class="mb-4 text-3xl font-bold sm:text-4xl">Our Journey</h2>
					<p class="mb-4 text-lg leading-relaxed text-foreground/70">
						Lalo Bakery Solution was founded in 2011 as MasterChef under the esteemed Lalo General
						Trading. In response to our evolving mission and growing capabilities, we recently
						rebranded to better reflect our vision of delivering excellence in baking across every
						stage of production.
					</p>
					<p class="text-lg leading-relaxed text-foreground/70">
						Today, we are a trusted supplier of high-quality bakery ingredients, equipment, and
						technical support tailored to the needs of both small-scale and industrial bakeries.
					</p>
				</div>

				<Card class="border-primary/20 bg-primary/5">
					<CardHeader>
						<CardTitle class="text-lg">Our Mission</CardTitle>
					</CardHeader>
					<CardContent>
						<p class="text-foreground/70">
							Guided by our core values of quality, reliability, and customer satisfaction, we
							deliver comprehensive solutions that help our clients succeed in a competitive market.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	</div>
</section>

<section class="bg-linear-to-b from-transparent via-primary/5 to-transparent px-4 py-20 sm:py-32">
	<div class="mx-auto max-w-5xl">
		<div class="mb-16 text-center">
			<h2 class="mb-4 text-3xl font-bold sm:text-4xl">Our Core Values</h2>
			<p class="mx-auto max-w-2xl text-lg text-foreground/70">
				These principles guide every decision we make and every product we deliver
			</p>
		</div>

		<div class="grid gap-8 md:grid-cols-3">
			<Card
				class="hover:shadow-lg-lg hover:shadow-lg-primary/10 border-primary/20 transition-all duration-300"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
						<CheckCircleIcon class="size-6 text-primary" />
					</div>
					<CardTitle>Quality</CardTitle>
				</CardHeader>
				<CardContent>
					<p class="text-foreground/70">
						We maintain the highest standards in every ingredient and equipment we supply, ensuring
						consistent excellence in your baking operations.
					</p>
				</CardContent>
			</Card>

			<Card
				class="hover:shadow-lg-lg hover:shadow-lg-primary/10 border-primary/20 transition-all duration-300"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
						<ShieldCheckIcon class="size-6 text-primary" />
					</div>
					<CardTitle>Reliability</CardTitle>
				</CardHeader>
				<CardContent>
					<p class="text-foreground/70">
						Our consistent supply chain and technical expertise ensure you can depend on us for all
						your bakery needs, every single time.
					</p>
				</CardContent>
			</Card>

			<Card
				class="hover:shadow-lg-lg hover:shadow-lg-primary/10 border-primary/20 transition-all duration-300"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
						<HeartHandshakeIcon class="size-6 text-primary" />
					</div>
					<CardTitle>Customer Satisfaction</CardTitle>
				</CardHeader>
				<CardContent>
					<p class="text-foreground/70">
						Your success is our success. We provide dedicated support and tailored solutions to help
						your bakery thrive and grow.
					</p>
				</CardContent>
			</Card>
		</div>
	</div>
</section>

<section
	class="relative bg-cover bg-center px-4 py-20 sm:py-32"
	style="background-image: url('/bakery (8).webp')"
>
	<div class="absolute inset-0 -z-1 bg-black/60"></div>
	<div class="z-1 mx-auto max-w-5xl">
		<div class="mb-16 text-center">
			<h2 class="mb-4 text-3xl font-bold text-white sm:text-4xl">Our Product Portfolio</h2>
			<p class="mx-auto max-w-2xl text-lg text-white/70">
				Comprehensive solutions for every stage of your baking production
			</p>
		</div>

		<div class="z-1 grid gap-8 md:grid-cols-2">
			<Card
				class="hover:shadow-lg-lg hover:shadow-lg-primary/10 border-primary/20 transition-all duration-300"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
						<WheatIcon class="size-6 text-primary" />
					</div>
					<CardTitle>Premium Ingredients</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<p class="text-foreground/70">High-quality bakery ingredients including:</p>
					<ul class="flex flex-col gap-2 text-sm text-foreground/70">
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>Flours and specialty flour blends</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>Yeasts and improvers</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>Mixes and specialty products</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>Halal-certified options</span>
						</li>
					</ul>
				</CardContent>
			</Card>

			<Card
				class="hover:shadow-lg-lg hover:shadow-lg-primary/10 border-primary/20 transition-all duration-300"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
						<ToolCase class="size-6 text-primary" />
					</div>
					<CardTitle>Bakery Equipment</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<p class="text-foreground/70">Durable, professional-grade equipment designed for:</p>
					<ul class="flex flex-col gap-2 text-sm text-foreground/70">
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>Small-scale bakeries</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>Industrial production</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>Consistent quality output</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>Long-lasting performance</span>
						</li>
					</ul>
				</CardContent>
			</Card>

			<Card
				class="hover:shadow-lg-lg hover:shadow-lg-primary/10 border-primary/20 transition-all duration-300"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
						<BookOpenIcon class="size-6 text-primary" />
					</div>
					<CardTitle>Technical Support</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<p class="text-foreground/70">Expert guidance and support including:</p>
					<ul class="flex flex-col gap-2 text-sm text-foreground/70">
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>Product consultation</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>Production optimization</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>Quality assurance</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>Industry expertise</span>
						</li>
					</ul>
				</CardContent>
			</Card>

			<Card
				class="hover:shadow-lg-lg hover:shadow-lg-primary/10 border-primary/20 transition-all duration-300"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
						<LeafIcon class="size-6 text-primary" />
					</div>
					<CardTitle>Dietary & Specialty Options</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<p class="text-foreground/70">Meet diverse consumer demands with:</p>
					<ul class="flex flex-col gap-2 text-sm text-foreground/70">
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>Gluten-free options</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>Sugar-free alternatives</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>Vegan-friendly products</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>Health-conscious solutions</span>
						</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	</div>
</section>

<section class="bg-linear-to-b from-transparent via-accent/5 to-transparent px-4 py-20 sm:py-32">
	<div class="mx-auto max-w-5xl">
		<div class="mb-16 text-center">
			<h2 class="mb-4 text-3xl font-bold sm:text-4xl">Certifications & Compliance</h2>
			<p class="mx-auto max-w-2xl text-lg text-foreground/70">
				Meeting the highest standards for quality and compliance
			</p>
		</div>

		<div class="grid gap-8 md:grid-cols-2">
			<Card
				class="hover:shadow-lg-lg hover:shadow-lg-accent/10 border-accent/20 transition-all duration-300"
			>
				<CardHeader>
					<div class="flex items-center gap-4">
						<div class="rounded-lg bg-accent/10 p-3">
							<BadgeCheckIcon class="size-6 text-primary" />
						</div>
						<div>
							<CardTitle>Halal Certified</CardTitle>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<p class="text-foreground/70">
						Our wide range of Halal-certified ingredients ensures your bakery can meet diverse
						consumer demands while maintaining the highest standards of compliance and quality.
					</p>
				</CardContent>
			</Card>

			<Card
				class="hover:shadow-lg-lg hover:shadow-lg-accent/10 border-accent/20 transition-all duration-300"
			>
				<CardHeader>
					<div class="flex items-center gap-4">
						<div class="rounded-lg bg-accent/10 p-3">
							<BadgeCheckIcon class="size-6 text-primary" />
						</div>
						<div>
							<CardTitle>Quality Standards</CardTitle>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<p class="text-foreground/70">
						All our products undergo rigorous quality testing and comply with international food
						safety standards, ensuring excellence in every batch.
					</p>
				</CardContent>
			</Card>
		</div>
	</div>
</section>

<!-- <section
	class="relative z-0 px-4 py-20 sm:py-32"
	style="background-image: url('/bakery (10).webp'); background-size: cover; background-position: center;"
>
	<div class="absolute inset-0 -z-1 bg-black/40"></div>
	<div class="z-1 mx-auto max-w-5xl">
		<div class="mb-16 text-center">
			<h2 class="mb-4 text-3xl font-bold text-white sm:text-4xl">Part of a Diversified Group</h2>
			<p class="mx-auto max-w-2xl text-lg text-white/90">
				Integrated solutions from our sister companies to support your business growth
			</p>
		</div>

		<div class="mb-8">
			<p class="mb-12 text-center text-white/90">
				As part of a diversified trading group, we work alongside industry leaders to deliver
				integrated, cross-industry solutions that support business growth from the ground up.
			</p>
		</div>

		<div class="grid gap-8 md:grid-cols-3">
			<Card
				class="hover:shadow-lg-lg hover:shadow-lg-primary/10 border-primary/20 transition-all duration-300"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
						<BuildingIcon class="size-6 text-primary" />
					</div>
					<CardTitle>Lalo General Trading</CardTitle>
					<CardDescription>Parent Company</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-sm text-foreground/70">
						The esteemed foundation of our group, providing strategic direction and comprehensive
						business solutions across multiple industries.
					</p>
				</CardContent>
			</Card>

			<Card
				class="hover:shadow-lg-lg hover:shadow-lg-primary/10 border-primary/20 transition-all duration-300"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
						<BuildingIcon class="size-6 text-primary" />
					</div>
					<CardTitle>Fixtec</CardTitle>
					<CardDescription>Hand & Bar Tools</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-sm text-foreground/70">
						Specializing in high-quality hand and bar tools, providing the equipment needed for
						precision work across various industries.
					</p>
				</CardContent>
			</Card>

			<Card
				class="hover:shadow-lg-lg hover:shadow-lg-primary/10 border-primary/20 transition-all duration-300"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
						<CoffeeIcon class="size-6 text-primary" />
					</div>
					<CardTitle>Fahem General Trading</CardTitle>
					<CardDescription>Coffee & Agrochemicals</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-sm text-foreground/70">
						A leading name in coffee export, agrochemical, veterinary products, tires, inner tubes,
						and coffee drying mesh imports.
					</p>
				</CardContent>
			</Card>
		</div>
	</div>
</section> -->

<section
	class="relative z-0 mx-auto max-w-full border-t border-border/50 bg-background bg-cover bg-center px-6 py-24 md:py-32"
	style="background-image: url('/bakery (8).webp');"
>
	<div class="absolute inset-0 -z-1 bg-black/60"></div>
	<div class="mx-auto max-w-7xl">
		<div class="mb-16 md:mb-20">
			<h3
				class="mt-4 max-w-4xl text-4xl font-semibold tracking-tighter text-white sm:text-5xl lg:text-6xl"
			>
				Our <span class="text-primary">Varied Partners</span>
			</h3>
		</div>

		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:gap-8">
			{#each partners as p (p)}
				<div
					class="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30 hover:shadow-xl"
				>
					<div
						class="absolute inset-x-0 top-0 h-1 bg-primary opacity-0 transition group-hover:opacity-100"
					></div>

					<div class="flex items-center justify-between">
						<div
							class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
						>
							<p.icon class="size-7" />
						</div>
						<span class="text-xs font-bold tracking-widest text-muted-foreground/80 uppercase"
							>{p.short}</span
						>
					</div>

					<div class="grow space-y-2">
						<p class="text-2xl font-semibold tracking-tight text-foreground">{p.name}</p>
						<p
							class=" text-sm leading-relaxed text-muted-foreground transition-all duration-300 ease-in-out"
						>
							{p.description}
						</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<FAQ />

<section
	class="bg-linear-to-r from-primary/15 via-accent/10 to-primary/15 bg-cover bg-center px-4 py-20 sm:py-32"
	style="background-image: url('/bakery (7).webp')"
>
	<div class="mx-auto max-w-4xl">
		<div
			class="space-y-8 rounded-2xl bg-linear-to-br from-primary/40 to-accent/40 p-8 text-center sm:p-12"
		>
			<div class="flex flex-col gap-4">
				<h2 class="text-3xl font-bold text-primary-foreground sm:text-4xl">
					Ready to Transform Your Bakery?
				</h2>
				<p class="mx-auto max-w-2xl text-lg text-primary-foreground/90">
					Let us help you achieve excellence with our premium ingredients, equipment, and expert
					support.
				</p>
			</div>

			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<Button href="/about" size="lg" variant="secondary" class="gap-2">
					Get Started Today
					<ArrowRightIcon class="size-4" />
				</Button>
				<Button href="tel:+251908454545" size="lg" variant="outline">
					<PhoneIcon class="size-4" />
					Call Us
				</Button>
			</div>

			<div class="border-t border-primary-foreground/20 pt-4">
				<p class="text-sm text-primary-foreground/80">
					Have questions? Our team is ready to help you find the perfect solution.
				</p>
			</div>
		</div>
	</div>
</section>
