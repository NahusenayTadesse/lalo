/**
 * A delivery note for the driver to carry: where it goes, what is in it (with
 * the batch numbers that left the shop), what to collect, and a line for the
 * customer to sign. Built in the browser, so it needs no extra route.
 */
export type NoteDelivery = {
	orderId: number;
	method: string;
	recipientName: string | null;
	recipientPhone: string | null;
	area: string | null;
	address: string | null;
	driverName: string | null;
	driverPhone: string | null;
	vehiclePlate: string | null;
	vehicleType: string | null;
	scheduledFor: string | null;
	dispatchedAt: string | null;
	paid: boolean;
	cashToCollect: string | null;
	notes: string | null;
	items: { product: string | null; amount: string; quantity: number }[];
	batches: {
		product: string | null;
		variant: string;
		batchNumber: string;
		expiresAt: string | null;
		quantity: number;
	}[];
};

export async function downloadDeliveryNote(d: NoteDelivery) {
	const [{ jsPDF }, { default: autoTable }] = await Promise.all([
		import('jspdf'),
		import('jspdf-autotable')
	]);
	const doc = new jsPDF();
	const left = 14;
	let y = 18;

	doc.setFontSize(18);
	doc.text('Lalo Bakery Solutions — Delivery Note', left, y);
	doc.setFontSize(11);
	y += 8;
	doc.text(`Order #${d.orderId}`, left, y);
	doc.text(`Printed ${new Date().toLocaleString('en-GB')}`, 200 - left, y, { align: 'right' });

	const rows: [string, string][] = [
		['Customer', [d.recipientName, d.recipientPhone].filter(Boolean).join(' — ') || '—'],
		[
			d.method === 'pickup' ? 'Collection' : 'Deliver to',
			d.method === 'pickup' ? 'Store pickup' : [d.area, d.address].filter(Boolean).join(', ') || '—'
		],
		['Driver', [d.driverName, d.driverPhone].filter(Boolean).join(' — ') || '—'],
		['Vehicle', [d.vehicleType, d.vehiclePlate].filter(Boolean).join(' · ') || '—'],
		['Expected', d.scheduledFor ?? '—'],
		['Left the shop', d.dispatchedAt ?? '—'],
		['Payment', d.paid ? 'Paid' : `COLLECT ETB ${Number(d.cashToCollect ?? 0).toFixed(2)}`]
	];
	if (d.notes) rows.push(['Notes', d.notes]);

	autoTable(doc, {
		startY: y + 6,
		body: rows,
		theme: 'plain',
		columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
	});

	autoTable(doc, {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		startY: (doc as any).lastAutoTable.finalY + 6,
		head: [['Product', 'Package', 'Qty']],
		body: d.items.map((i) => [i.product ?? '—', i.amount, String(i.quantity)])
	});

	if (d.batches.length) {
		autoTable(doc, {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			startY: (doc as any).lastAutoTable.finalY + 6,
			head: [['Product', 'Package', 'Batch', 'Expires', 'Qty']],
			body: d.batches.map((b) => [
				b.product ?? '—',
				b.variant,
				b.batchNumber,
				b.expiresAt ?? '—',
				String(b.quantity)
			])
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	y = (doc as any).lastAutoTable.finalY + 24;
	doc.text('Received in good condition by: ______________________________', left, y);
	doc.text('Signature: ________________   Date & time: ________________', left, y + 12);

	doc.save(`delivery-note-order-${d.orderId}.pdf`);
}
