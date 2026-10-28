<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { ArrowRightIcon } from '@lucide/svelte';
	import { CheckCircleIcon, ShieldCheckIcon, HeartHandshakeIcon } from '@lucide/svelte';
	import { WheatIcon, BadgeCheckIcon, ToolCase, BookOpenIcon } from '@lucide/svelte';
	import { LeafIcon, Send } from '@lucide/svelte';
	import { PhoneIcon } from '@lucide/svelte';
	import FAQ from '$lib/components/faq.svelte';

	import {
		Coffee,
		Microwave,
		Croissant,
		Globe,
		Utensils,
		WashingMachine,
		Building
	} from '@lucide/svelte';

	import { Card, CardContent, CardHeader, CardTitle } from '@nahu/admin-kit/components/ui/card/index.js';

	import { IconBrandFacebook, IconBrandInstagram, IconBrandTiktok } from '@tabler/icons-svelte';
	import Slider from '$lib/components/slider.svelte';
	import Catalog from '$lib/components/catalog.svelte';

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

	let partners = [
		{
			name: 'Lalo Coffee Exports',
			description: m.aboutus_partner_exp(),
			icon: Coffee,
			short: 'LAL_EXP'
		},
		{
			name: 'Lalo Bakery',
			description: m.aboutus_partner_bak(),
			icon: Croissant,
			short: 'LAL_BAK'
		},

		{
			name: 'Lalo Laundry',
			description: m.aboutus_partner_lau(),
			icon: WashingMachine,
			short: 'LAL_LAU'
		},
		{
			name: 'Lalo Bakery Solutions',
			description: m.aboutus_partner_sol(),
			icon: Microwave,
			short: 'LAL_BAK'
		},
		{
			name: 'Lalo Cafe',
			description: m.aboutus_partner_caf(),
			icon: Utensils,
			short: 'LAL_CAF'
		},
		{
			name: 'Lalo Apartments',
			description: m.aboutus_partner_apt(),
			icon: Building,
			short: 'LAL_APT'
		},
		{
			name: 'Fahem General Trading',
			description: m.aboutus_partner_fah(),
			icon: Globe,
			short: 'FAH_GEN'
		}
	];

	let { data } = $props();
</script>

<svelte:head>
	<title>{m.aboutus_meta_title()}</title>
	<meta
		name="description"
		content={m.home_meta_description()}
	/>
	<meta
		name="keywords"
		content="Lalo Bakery Solutions, professional bakery supplies, wholesale flour, bakery equipment, MasterChef rebranding, industrial baking solutions"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:title" content={m.home_og_title()} />
	<meta
		property="og:description"
		content={m.home_og_description()}
	/>
	<meta property="og:image" content="/logo.webp" />

	<meta property="twitter:card" content="summary_large_image" />
	<meta
		property="twitter:title"
		content={m.home_twitter_title()}
	/>
	<meta
		property="twitter:description"
		content={m.home_twitter_description()}
	/>
	<meta property="twitter:image" content="/logo.webp" />
</svelte:head>

<section
	class="relative isolate z-0 overflow-hidden bg-linear-to-br from-primary/20 via-accent/10 to-background bg-cover bg-center px-4 py-20 sm:py-32"
	style="background-image: url('/bakery (11).webp')"
>
	<div class="absolute inset-0 -z-10 bg-background/50"></div>
	<!-- Decorative elements -->
	<div class="absolute inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-40 -right-40 size-96 animate-blob rounded-full bg-primary/25 blur-3xl"></div>
		<div
			class="absolute -bottom-40 -left-40 size-96 animate-blob rounded-full bg-amber-400/20 blur-3xl [animation-delay:-9s]"
		></div>
	</div>

	<div data-reveal="scale" class="glass relative mx-auto max-w-4xl rounded-[2rem] p-8 sm:p-12">
		<div class="space-y-6 text-center">
			<div
				class="inline-block rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary ring-1 ring-primary/20"
			>
				{m.aboutus_badge()}
			</div>

			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
				{m.hero_tagline_sentence()}
			</h1>

			<p class="mx-auto max-w-2xl text-lg text-foreground/70 sm:text-xl">
				{m.about_intro()}
			</p>

			<div class="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
				<Button
					size="lg"
					href="/shop"
					class="group sheen relative gap-2 overflow-hidden rounded-full px-7 shadow-lg shadow-primary/30"
				>
					{m.aboutus_explore()}
					<ArrowRightIcon class="size-4 transition-transform group-hover:translate-x-1" />
				</Button>
				<Button href="/contact-us" size="lg" variant="outline" class="rounded-full px-7">{m.nav_contact_us()}</Button>
			</div>

			<div class="flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
				<p class="text-sm text-foreground/70">{m.footer_follow_us()}</p>
				<div class="grid grid-cols-4 gap-3">
					{#each socialLinks as social (social.url)}
						<a
							href={social.url}
							target="_blank"
							rel="noopener noreferrer"
							class={[
								'glass flex flex-col items-center gap-2 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg',
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
			<div data-reveal="left" class="group relative">
				<div
					class="aspect-square overflow-hidden rounded-3xl bg-linear-to-br from-primary/20 to-accent/20 shadow-2xl shadow-primary/15"
				>
					<img
						src="/store.webp"
						alt={m.brand_name()}
						class="h-full w-full object-cover transition-transform duration-[1.5s] ease-out-expo group-hover:scale-105"
					/>
				</div>
				<div
					class="absolute -right-2 -bottom-6 max-w-xs animate-float rounded-2xl bg-primary/90 p-6 text-primary-foreground shadow-xl shadow-primary/40 backdrop-blur-md lg:-right-6"
				>
					<p class="text-sm font-semibold">{m.aboutus_trusted_since()}</p>
				</div>
			</div>

			<!-- Right side - Content -->
			<div data-reveal="right" class="space-y-6">
				<div>
					<h2 class="mb-4 text-3xl font-bold sm:text-4xl">{m.about_journey()}</h2>
					<p class="mb-4 text-lg leading-relaxed text-foreground/70">
						{m.aboutus_journey_p1()}
					</p>
					<p class="text-lg leading-relaxed text-foreground/70">
						{m.aboutus_journey_p2()}
					</p>
				</div>

				<Card class="glass rounded-3xl">
					<CardHeader>
						<CardTitle class="text-lg">{m.aboutus_mission()}</CardTitle>
					</CardHeader>
					<CardContent>
						<p class="text-foreground/70">
							{m.aboutus_mission_text()}
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	</div>
</section>

<section class="bg-linear-to-b from-transparent via-primary/5 to-transparent px-4 py-20 sm:py-32">
	<div class="mx-auto max-w-5xl">
		<div data-reveal class="mb-16 text-center">
			<h2 class="mb-4 text-3xl font-bold sm:text-4xl">{m.aboutus_values()}</h2>
			<p class="mx-auto max-w-2xl text-lg text-foreground/70">
				{m.aboutus_values_sub()}
			</p>
		</div>

		<div data-reveal-stagger class="grid gap-8 md:grid-cols-3">
			<Card
				class="glass lift rounded-3xl"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
						<CheckCircleIcon class="size-6 text-primary" />
					</div>
					<CardTitle>{m.aboutus_value_quality()}</CardTitle>
				</CardHeader>
				<CardContent>
					<p class="text-foreground/70">
						{m.aboutus_value_quality_text()}
					</p>
				</CardContent>
			</Card>

			<Card
				class="glass lift rounded-3xl"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
						<ShieldCheckIcon class="size-6 text-primary" />
					</div>
					<CardTitle>{m.aboutus_value_reliability()}</CardTitle>
				</CardHeader>
				<CardContent>
					<p class="text-foreground/70">
						{m.aboutus_value_reliability_text()}
					</p>
				</CardContent>
			</Card>

			<Card
				class="glass lift rounded-3xl"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
						<HeartHandshakeIcon class="size-6 text-primary" />
					</div>
					<CardTitle>{m.aboutus_value_satisfaction()}</CardTitle>
				</CardHeader>
				<CardContent>
					<p class="text-foreground/70">
						{m.aboutus_value_satisfaction_text()}
					</p>
				</CardContent>
			</Card>
		</div>
	</div>
</section>

<section
	class="relative isolate bg-cover bg-center px-4 py-20 sm:py-32 lg:bg-fixed"
	style="background-image: url('/bakery (8).webp')"
>
	<div class="absolute inset-0 -z-10 bg-linear-to-b from-black/75 via-black/55 to-black/75"></div>
	<div class="z-1 mx-auto max-w-5xl">
		<div data-reveal class="mb-16 text-center">
			<h2 class="mb-4 text-3xl font-bold text-white sm:text-4xl">{m.about_portfolio()}</h2>
			<p class="mx-auto max-w-2xl text-lg text-white/70">
				{m.aboutus_portfolio_sub()}
			</p>
		</div>

		<div data-reveal-stagger class="z-1 grid gap-8 md:grid-cols-2">
			<Card
				class="glass lift rounded-3xl"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
						<WheatIcon class="size-6 text-primary" />
					</div>
					<CardTitle>{m.aboutus_ingredients()}</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<p class="text-foreground/70">{m.aboutus_ingredients_lead()}</p>
					<ul class="flex flex-col gap-2 text-sm text-foreground/70">
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>{m.aboutus_ing_flours()}</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>{m.aboutus_ing_yeasts()}</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>{m.aboutus_ing_mixes()}</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>{m.aboutus_ing_halal()}</span>
						</li>
					</ul>
				</CardContent>
			</Card>

			<Card
				class="glass lift rounded-3xl"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
						<ToolCase class="size-6 text-primary" />
					</div>
					<CardTitle>{m.aboutus_equipment()}</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<p class="text-foreground/70">{m.aboutus_equipment_lead()}</p>
					<ul class="flex flex-col gap-2 text-sm text-foreground/70">
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>{m.aboutus_eq_small()}</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>{m.aboutus_eq_industrial()}</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>{m.aboutus_eq_consistent()}</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>{m.aboutus_eq_long()}</span>
						</li>
					</ul>
				</CardContent>
			</Card>

			<Card
				class="glass lift rounded-3xl"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
						<BookOpenIcon class="size-6 text-primary" />
					</div>
					<CardTitle>{m.aboutus_support()}</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<p class="text-foreground/70">{m.aboutus_support_lead()}</p>
					<ul class="flex flex-col gap-2 text-sm text-foreground/70">
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>{m.aboutus_sup_consult()}</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>{m.aboutus_sup_optim()}</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>{m.aboutus_sup_qa()}</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary">•</span>
							<span>{m.aboutus_sup_expertise()}</span>
						</li>
					</ul>
				</CardContent>
			</Card>

			<Card
				class="glass lift rounded-3xl"
			>
				<CardHeader>
					<div class="mb-4 inline-flex rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
						<LeafIcon class="size-6 text-primary" />
					</div>
					<CardTitle>{m.aboutus_dietary()}</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<p class="text-foreground/70">{m.aboutus_dietary_lead()}</p>
					<ul class="flex flex-col gap-2 text-sm text-foreground/70">
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>{m.aboutus_diet_gluten()}</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>{m.aboutus_diet_sugar()}</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>{m.aboutus_diet_vegan()}</span>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-accent">•</span>
							<span>{m.aboutus_diet_health()}</span>
						</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	</div>
</section>

<section class="bg-linear-to-b from-transparent via-accent/5 to-transparent px-4 py-20 sm:py-32">
	<div class="mx-auto max-w-5xl">
		<div data-reveal class="mb-16 text-center">
			<h2 class="mb-4 text-3xl font-bold sm:text-4xl">{m.aboutus_cert()}</h2>
			<p class="mx-auto max-w-2xl text-lg text-foreground/70">
				{m.aboutus_cert_sub()}
			</p>
		</div>

		<div data-reveal-stagger class="grid gap-8 md:grid-cols-2">
			<Card
				class="glass lift rounded-3xl"
			>
				<CardHeader>
					<div class="flex items-center gap-4">
						<div class="rounded-lg bg-accent/10 p-3">
							<BadgeCheckIcon class="size-6 text-primary" />
						</div>
						<div>
							<CardTitle>{m.about_hl_halal()}</CardTitle>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<p class="text-foreground/70">
						{m.aboutus_halal_text()}
					</p>
				</CardContent>
			</Card>

			<Card
				class="glass lift rounded-3xl"
			>
				<CardHeader>
					<div class="flex items-center gap-4">
						<div class="rounded-lg bg-accent/10 p-3">
							<BadgeCheckIcon class="size-6 text-primary" />
						</div>
						<div>
							<CardTitle>{m.aboutus_quality_std()}</CardTitle>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<p class="text-foreground/70">
						{m.aboutus_quality_std_text()}
					</p>
				</CardContent>
			</Card>
		</div>
	</div>
</section>

<section
	class="relative isolate z-0 mx-auto max-w-full overflow-hidden bg-zinc-950 bg-cover bg-center px-6 py-24 md:py-32"
	style="background-image: url('/bakery (8).webp');"
>
	<div class="absolute inset-0 -z-10 bg-linear-to-b from-black/80 via-black/60 to-black/85"></div>
	<div class="mx-auto max-w-7xl">
		<div data-reveal class="mb-16 md:mb-20">
			<h3
				class="mt-4 max-w-4xl text-4xl font-semibold tracking-tighter text-white sm:text-5xl lg:text-6xl"
			>
				{m.home_partners_title_lead()} <span class="text-gradient">{m.aboutus_partners_accent()}</span>
			</h3>
		</div>

		<div
			data-reveal-stagger
			class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:gap-8"
		>
			{#each partners as p (p)}
				<div
					class="glass-dark sheen group relative flex flex-col gap-5 overflow-hidden rounded-3xl p-8 transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20"
				>
					<div
						class="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary to-transparent opacity-0 transition duration-500 group-hover:opacity-100"
					></div>

					<div class="flex items-center justify-between">
						<div
							class="flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary ring-1 ring-primary/30 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-primary group-hover:text-primary-foreground"
						>
							<p.icon class="size-7" />
						</div>
						<span class="text-xs font-bold tracking-widest text-white/50 uppercase"
							>{p.short}</span
						>
					</div>

					<div class="grow space-y-2">
						<p class="text-2xl font-semibold tracking-tight text-white">{p.name}</p>
						<p class="text-sm leading-relaxed text-white/65">
							{p.description}
						</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

{#if data?.imagesList?.length > 0}
	<Slider imagesList={data.imagesList} />
{/if}
{#if data?.files}<Catalog files={data?.files} />{/if}

<FAQ />

<section
	class="relative isolate bg-cover bg-center px-4 py-20 sm:py-32 lg:bg-fixed"
	style="background-image: url('/bakery (7).webp')"
>
	<div class="absolute inset-0 -z-10 bg-black/40"></div>
	<div class="mx-auto max-w-4xl">
		<div
			data-reveal="scale"
			class="glass-dark space-y-8 rounded-[2rem] bg-linear-to-br from-primary/40 to-black/30 p-8 text-center sm:p-12"
		>
			<div class="flex flex-col gap-4">
				<h2 class="text-3xl font-bold text-primary-foreground sm:text-4xl">
					{m.aboutus_cta_title()}
				</h2>
				<p class="mx-auto max-w-2xl text-lg text-primary-foreground/90">
					{m.aboutus_cta_text()}
				</p>
			</div>

			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<Button
					href="/contact-us"
					size="lg"
					variant="secondary"
					class="group gap-2 rounded-full px-7 transition-all hover:-translate-y-0.5"
				>
					{m.why_cta_button()}
					<ArrowRightIcon class="size-4" />
				</Button>
				<Button
					href="tel:+251908454545"
					size="lg"
					variant="ghost"
					class="glass-dark rounded-full px-7 text-white hover:bg-white/15 hover:text-white"
				>
					<PhoneIcon class="size-4" />
					{m.chat_call_us()}
				</Button>
			</div>

			<div class="border-t border-primary-foreground/20 pt-4">
				<p class="text-sm text-primary-foreground/80">
					{m.aboutus_cta_footer()}
				</p>
			</div>
		</div>
	</div>
</section>
