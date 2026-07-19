import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

/**
 * Express error-handling middleware — the 4-argument signature is what
 * tells Express "this one handles errors," and it must be registered
 * after every route, which is why it's last in app.ts.
 */
export function multerErrorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'file_too_large', message: 'Image exceeds the 5MB limit' });
    }
    return res.status(400).json({ error: 'upload_error', message: err.message });
  }
  if (err instanceof Error && err.message === 'UNSUPPORTED_FILE_TYPE') {
    return res.status(400).json({
      error: 'unsupported_file_type',
      message: 'Only JPEG, PNG, GIF, or WEBP images are supported',
    });
  }
  return next(err);
}
