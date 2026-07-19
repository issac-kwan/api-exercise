import { Request } from 'express';
import { FileFilterCallback } from 'multer';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Multer's fileFilter — an early, cheap rejection based on what the client
 * *claims* the file is. NOT trustworthy on its own (a client can lie about
 * both the extension and Content-Type), but it avoids buffering an
 * obviously-wrong upload into memory. The real check is
 * bufferMatchesImageSignature, run after the file is fully buffered.
 */
export function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return callback(new Error('UNSUPPORTED_FILE_TYPE'));
  }
  callback(null, true);
}

/**
 * Real file signatures ("magic bytes") for the types we accept, checked
 * against the actual uploaded bytes — not anything the client claims.
 */
const FIXED_SIGNATURES: { bytes: number[] }[] = [
  { bytes: [0xff, 0xd8, 0xff] },                                  // JPEG
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },      // PNG
  { bytes: [0x47, 0x49, 0x46, 0x38] },                              // GIF
];

export function bufferMatchesImageSignature(buffer: Buffer): boolean {
  const matchesFixed = FIXED_SIGNATURES.some(({ bytes }) =>
    bytes.every((byte, index) => buffer[index] === byte)
  );
  if (matchesFixed) return true;

  // WEBP's signature is two separate chunks: "RIFF" at byte 0, "WEBP" at
  // byte 8 (bytes 4-7 are a file-size field that varies per file).
  return (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  );
}

/**
 * Strips anything that isn't a safe filename character and discards any
 * directory segments — defends against a malicious filename like
 * "../../etc/passwd" ever being used to build a file path. This service
 * doesn't currently write files to disk, so this isn't exploitable today,
 * but it's a cheap guard against that becoming true later without anyone
 * remembering to re-add this check.
 */
export function sanitizeFilename(originalName: string): string {
  const base = originalName.split(/[\\/]/).pop() || 'upload';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}
