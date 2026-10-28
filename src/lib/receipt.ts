import { z } from 'zod/v4';

const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;

/** Screenshots from any phone, plus PDFs. */
const RECEIPT_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/heic',
	'image/heif',
	'application/pdf'
];

/** A photo or PDF of a signed paper (a delivery note, a receipt), up to 10MB. */
export const receiptFile = z
	.instanceof(File)
	.refine((file) => file.size <= MAX_RECEIPT_SIZE, 'Max file size is 10MB.')
	.refine((file) => RECEIPT_TYPES.includes(file.type), 'Upload an image or PDF.');
