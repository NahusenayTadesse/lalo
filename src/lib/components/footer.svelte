<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { MailIcon, PhoneIcon, MapPinIcon, MessageCircleIcon } from '@lucide/svelte';
	let email = $state('');

	const handleNewsletterSubmit = (e: Event) => {
		e.preventDefault();
		console.log('Newsletter signup:', email);
		email = '';
	};

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
			icon: MessageCircleIcon,
			color: 'hover:text-blue-400'
		}
	];
</script>

<footer class="border-t bg-card text-card-foreground">
	<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
		<!-- Newsletter Section -->

		<!-- Footer Links Grid -->
		<div class="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
			<!-- Company Info -->
			<div>
				<img src="/logo.webp" class="w-30" alt="Lalo Logo" />
				<h4 class="mb-4 font-semibold">Lalo Bakery Solution</h4>

				<div class="flex flex-col gap-2 text-sm">
					<a
						href="https://maps.app.goo.gl/KMrgwGNNbsE2SAeV7"
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-2 text-foreground/70"
					>
						<MapPinIcon class="size-4 shrink-0" />
						<span>Diplomat Building, Mozambique St, Addis Ababa</span>
					</a>
					<a
						href="tel:+251908454545"
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-2 text-foreground/70"
					>
						<PhoneIcon class="size-4 shrink-0" />
						<span>+251908454545</span>
					</a>
					<a
						href="tel:+251908454545"
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-2 text-foreground/70"
					>
						<PhoneIcon class="size-4 shrink-0" />
						<span>+251908454545</span>
					</a>
					<a
						href="mailto:info@mohammedlaloie.com"
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-2 text-foreground/70"
					>
						<MailIcon class="size-4 shrink-0" />
						<span>info@mohammedlaloie.com</span>
					</a>
				</div>
			</div>

			<!-- Quick Links -->
			<div>
				<h4 class="mb-4 font-semibold">Quick Links</h4>
				<ul class="flex flex-col gap-2 text-sm">
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground">Home</a>
					</li>
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground">Shop</a>
					</li>
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground"
							>About Us</a
						>
					</li>
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground"
							>Contact Us</a
						>
					</li>
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground">Orders</a
						>
					</li>
				</ul>
			</div>

			<!-- Customer Service -->
			<div>
				<h4 class="mb-4 font-semibold">Customer Service</h4>
				<ul class="flex flex-col gap-2 text-sm">
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground">FAQ</a>
					</li>
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground"
							>Shipping Info</a
						>
					</li>
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground"
							>Returns</a
						>
					</li>
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground"
							>Track Order</a
						>
					</li>
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground"
							>Support</a
						>
					</li>
				</ul>
			</div>

			<!-- Legal -->
			<div>
				<h4 class="mb-4 font-semibold">Legal</h4>
				<ul class="flex flex-col gap-2 text-sm">
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground"
							>Privacy Policy</a
						>
					</li>
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground"
							>Terms of Service</a
						>
					</li>
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground"
							>Cookie Policy</a
						>
					</li>
					<li>
						<a href="#" class="text-foreground/70 transition-colors hover:text-foreground"
							>Accessibility</a
						>
					</li>
				</ul>
			</div>
		</div>

		<!-- Social Links -->
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

		<!-- Copyright -->
		<div class="mt-8 border-t pt-8 text-center text-sm text-foreground/70">
			<p>&copy; {new Date().getFullYear()} Lalo Bakery. All rights reserved.</p>
		</div>
	</div>
</footer>
