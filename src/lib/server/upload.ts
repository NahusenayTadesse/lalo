// src/lib/server/upload.ts
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { env } from '$env/dynamic/private';
import { randomUUID } from 'crypto';

/**
 * Where uploads are written and served from. Shared with `/files/[name]` — the two
 * used to default to different directories (`.tempFiles` vs `.temp-files`), so
 * without `FILES_DIR` set every upload 404'd.
 */
export const FILES_DIR = env.FILES_DIR ?? '.tempFiles';

/* ensure folder exists once, at module load */
if (!fs.existsSync(FILES_DIR)) {
	fs.mkdirSync(FILES_DIR, { recursive: true });
}

/**
 * Save an uploaded file and return the stored file name.
 * @param file  File object coming from formData (has .name, .stream(), .type, etc.)
 * @returns     The generated file name (with extension) that was written to disk
 * @throws      If the write fails
 */
export async function saveUploadedFile(file: File | undefined): Promise<string> {
	const ext = path.extname(file?.name); // keep original extension
	const fileName = `${randomUUID()}${ext}`;

	const target = path.join(FILES_DIR, fileName);

	const webStream = file.stream(); // Web-stream from File
	const nodeStream = Readable.fromWeb(webStream);

	await pipeline(nodeStream, fs.createWriteStream(target));

	return fileName; // store this string in your DB
}

/**
 * Removes a file written by `saveUploadedFile`. Used to clean up after a save that
 * failed once its files were already on disk. Never throws: a leftover file is
 * better than masking the error that triggered the cleanup.
 */
export async function deleteUploadedFile(fileName: string): Promise<void> {
	// Stored names are bare `<uuid>.<ext>`; refuse anything that could leave the directory.
	if (fileName !== path.basename(fileName)) return;
	await fs.promises.rm(path.join(FILES_DIR, fileName), { force: true }).catch((err) => {
		console.error(`Could not remove uploaded file ${fileName}:`, err);
	});
}
