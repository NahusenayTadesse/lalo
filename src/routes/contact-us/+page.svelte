<script lang="ts">
	import { z } from 'zod';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { IconBrandFacebook, IconBrandInstagram, IconBrandTiktok } from '@tabler/icons-svelte';
	import { MailIcon, MessageCircleIcon, SendIcon, PhoneIcon } from '@lucide/svelte';

	// Set app hook

	// Form state
	let formData = $state({
		name: '',
		email: '',
		subject: '',
		message: ''
	});

	let isSubmitting = $state(false);
	let errors = $state<Record<string, string>>({});

	// Validation schema
	const contactSchema = z.object({
		name: z.string().min(2, 'Name must be at least 2 characters'),
		email: z.string().email('Invalid email address'),
		subject: z.string().min(3, 'Subject must be at least 3 characters'),
		message: z.string().min(10, 'Message must be at least 10 characters')
	});

	// Handle form submission
	// const handleSubmit = async (e: Event) => {
	// 	e.preventDefault();
	// 	errors = {};

	// 	try {
	// 		contactSchema.parse(formData);
	// 		isSubmitting = true;

	// 		// Simulate API call
	// 		await new Promise((resolve) => setTimeout(resolve, 1500));

	// 		toast.success("Message sent successfully! We'll get back to you soon.");
	// 		formData = { name: '', email: '', subject: '', message: '' };
	// 	} catch (error) {
	// 		if (error instanceof z.ZodError) {
	// 			error.errors.forEach((err) => {
	// 				const path = err.path[0] as string;
	// 				errors[path] = err.message;
	// 			});
	// 			toast.error('Please fix the errors in the form');
	// 		}
	// 	} finally {
	// 		isSubmitting = false;
	// 	}
	// };

	// Social links
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

	// Contact info
	const contactInfo = [
		{
			icon: MailIcon,
			label: 'Email',
			value: 'info@mohammedlaloie.com',
			href: 'mailto:info@mohammedlaloie.com'
		},
		{
			icon: PhoneIcon,
			label: 'WhatsApp',
			value: 'Contact us on WhatsApp',
			href: 'https://wa.me/'
		}
	];
</script>

<div class="min-h-dvh w-full bg-background text-foreground transition-colors">
	<!-- Main Content -->
	<main class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
		<!-- Hero Section -->
		<div class="mb-12 text-center">
			<h2 class="mb-4 text-4xl font-bold sm:text-5xl">Get in Touch</h2>
			<p class="mx-auto max-w-2xl text-lg text-muted-foreground">
				Have questions about our delicious baked goods? We'd love to hear from you! Reach out
				through any of our channels.
			</p>
		</div>

		<div class="grid gap-8 lg:grid-cols-3">
			<!-- Contact Form -->
			<div class="lg:col-span-2">
				<Card class="border-2">
					<CardHeader>
						<CardTitle>Send us a Message</CardTitle>
						<CardDescription
							>Fill out the form below and we'll get back to you as soon as possible.</CardDescription
						>
					</CardHeader>
					<CardContent>
						<form class="space-y-6">
							<!-- Name -->
							<div class="space-y-2">
								<Label for="name">Full Name</Label>
								<Input
									id="name"
									type="text"
									placeholder="Your name"
									bind:value={formData.name}
									disabled={isSubmitting}
									class={errors.name ? 'border-destructive' : ''}
								/>
								{#if errors.name}
									<p class="text-sm text-destructive">{errors.name}</p>
								{/if}
							</div>

							<!-- Email -->
							<div class="space-y-2">
								<Label for="email">Email Address</Label>
								<Input
									id="email"
									type="email"
									placeholder="your@email.com"
									bind:value={formData.email}
									disabled={isSubmitting}
									class={errors.email ? 'border-destructive' : ''}
								/>
								{#if errors.email}
									<p class="text-sm text-destructive">{errors.email}</p>
								{/if}
							</div>

							<!-- Subject -->
							<div class="space-y-2">
								<Label for="subject">Subject</Label>
								<Input
									id="subject"
									type="text"
									placeholder="What is this about?"
									bind:value={formData.subject}
									disabled={isSubmitting}
									class={errors.subject ? 'border-destructive' : ''}
								/>
								{#if errors.subject}
									<p class="text-sm text-destructive">{errors.subject}</p>
								{/if}
							</div>

							<!-- Message -->
							<div class="space-y-2">
								<Label for="message">Message</Label>
								<Textarea
									id="message"
									placeholder="Tell us more about your inquiry..."
									bind:value={formData.message}
									disabled={isSubmitting}
									class={['min-h-32', errors.message && 'border-destructive']}
								/>
								{#if errors.message}
									<p class="text-sm text-destructive">{errors.message}</p>
								{/if}
							</div>

							<!-- Submit Button -->
							<Button type="submit" class="w-full gap-2" disabled={isSubmitting} size="lg">
								{#if isSubmitting}
									<div
										class="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
									></div>
									Sending...
								{:else}
									<SendIcon class="h-4 w-4" />
									Send Message
								{/if}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>

			<!-- Contact Info & Social -->
			<div class="space-y-6">
				<!-- Direct Contact -->
				<Card class="border-2">
					<CardHeader>
						<CardTitle class="text-lg">Contact Info</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						{#each contactInfo as info (info.href)}
							<a
								href={info.href}
								class="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent/10"
							>
								<div class="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
									<info.icon class="h-4 w-4 text-primary" />
								</div>
								<div class="flex-1">
									<p class="text-sm font-medium text-muted-foreground">{info.label}</p>
									<p class="text-sm font-semibold">{info.value}</p>
								</div>
							</a>
						{/each}
					</CardContent>
				</Card>

				<!-- Social Media -->
				<Card class="border-2">
					<CardHeader>
						<CardTitle class="text-lg">Follow Us</CardTitle>
					</CardHeader>
					<CardContent>
						<div class="grid grid-cols-2 gap-3">
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
									<span class="text-xs font-medium">{social.name}</span>
								</a>
							{/each}
						</div>
					</CardContent>
				</Card>

				<!-- Hours -->
				<Card class="border-2 bg-linear-to-br from-primary/5 to-accent/5">
					<CardHeader>
						<CardTitle class="text-lg">Business Hours</CardTitle>
					</CardHeader>
					<CardContent class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">Monday - Friday</span>
							<span class="font-semibold">8:00 AM - 8:00 PM</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Saturday</span>
							<span class="font-semibold">9:00 AM - 9:00 PM</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Sunday</span>
							<span class="font-semibold">10:00 AM - 6:00 PM</span>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	</main>
</div>
