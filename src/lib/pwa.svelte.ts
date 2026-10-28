/**
 * "Install the app" state, shared by every install button.
 *
 * Chromium browsers fire `beforeinstallprompt` when the site is installable; app.html
 * stashes it on `window.__installPrompt` in case that happens before hydration. Safari
 * on iOS has no prompt at all, so there the button opens instructions instead
 * (Share → Add to Home Screen). Once running as an installed app, buttons hide.
 */
interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
	interface Window {
		__installPrompt?: BeforeInstallPromptEvent;
	}
}

class Pwa {
	#prompt = $state<BeforeInstallPromptEvent | undefined>();
	standalone = $state(false);
	ios = $state(false);
	/** Set when the app has just been installed from this page. */
	installed = $state(false);

	/** True when a button would do something here. */
	readonly canInstall = $derived(
		!this.standalone && !this.installed && (!!this.#prompt || this.ios)
	);
	/** True when the browser can show its own install dialog (vs. iOS instructions). */
	readonly native = $derived(!!this.#prompt);

	#started = false;

	start() {
		if (this.#started || typeof window === 'undefined') return;
		this.#started = true;

		const standaloneQuery = matchMedia('(display-mode: standalone)');
		this.standalone =
			standaloneQuery.matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true;
		standaloneQuery.addEventListener('change', (e) => (this.standalone = e.matches));

		const ua = navigator.userAgent;
		this.ios =
			/iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);

		this.#prompt = window.__installPrompt;
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			this.#prompt = e as BeforeInstallPromptEvent;
		});
		window.addEventListener('appinstalled', () => {
			this.installed = true;
			this.#prompt = window.__installPrompt = undefined;
		});
	}

	/** Shows the browser's install dialog; resolves to whether the user accepted. */
	async install(): Promise<boolean> {
		const prompt = this.#prompt;
		if (!prompt) return false;
		await prompt.prompt();
		const { outcome } = await prompt.userChoice;
		// A prompt can only be used once.
		this.#prompt = window.__installPrompt = undefined;
		if (outcome === 'accepted') this.installed = true;
		return outcome === 'accepted';
	}
}

export const pwa = new Pwa();
