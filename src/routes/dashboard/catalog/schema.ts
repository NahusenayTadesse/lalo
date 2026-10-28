import { z } from 'zod/v4';

const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const documentFile = z
	.file()
	.max(100_000_000, 'Max file size is 100MB.')
	.refine((file) => DOCUMENT_TYPES.includes(file.type), 'Please upload a PDF or an image.')
	.optional();

export const editGallery = z.object({
	manual: documentFile,
	catalog: documentFile
});
