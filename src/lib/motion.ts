/**
 * Scroll reveals for the storefront. Elements marked `data-reveal` (or a parent marked
 * `data-reveal-stagger`) start hidden — see layout.css — and get `is-revealed` the first
 * time they enter the viewport. One observer watches the whole document, and a
 * MutationObserver picks up anything rendered later (navigation, `{#if}` blocks, new
 * pages of products), so components only need the attribute.
 *
 * Returns a cleanup function; call it from the root layout's `$effect`.
 */
export function startReveals(root: HTMLElement = document.body): () => void {
	const selector = '[data-reveal], [data-reveal-stagger]';
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

	const show = (el: Element) => {
		if (el.hasAttribute('data-reveal-stagger')) {
			Array.from(el.children).forEach((child, i) =>
				(child as HTMLElement).style.setProperty('--i', String(i))
			);
		}
		el.classList.add('is-revealed');
	};

	if (reduced || !('IntersectionObserver' in window)) {
		const revealAll = () => root.querySelectorAll(selector).forEach(show);
		revealAll();
		const mo = new MutationObserver(revealAll);
		mo.observe(root, { childList: true, subtree: true });
		return () => mo.disconnect();
	}

	const io = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				show(entry.target);
				io.unobserve(entry.target);
			}
		},
		{ rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
	);

	const watch = (node: ParentNode) => {
		node.querySelectorAll(selector).forEach((el) => {
			if (!el.classList.contains('is-revealed')) io.observe(el);
		});
	};

	watch(root);

	const mo = new MutationObserver((mutations) => {
		for (const m of mutations) {
			// A stagger parent re-rendered with new children (the next page of products)
			// shows them too, rather than leaving them at the hidden starting state.
			const parent = m.target;
			if (parent instanceof Element && parent.matches('[data-reveal-stagger].is-revealed')) {
				show(parent);
			}
			m.addedNodes.forEach((n) => {
				if (!(n instanceof Element)) return;
				if (n.matches(selector) && !n.classList.contains('is-revealed')) io.observe(n);
				watch(n);
			});
		}
	});
	mo.observe(root, { childList: true, subtree: true });

	return () => {
		io.disconnect();
		mo.disconnect();
	};
}
