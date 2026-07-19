import { Request, Response, NextFunction } from 'express';
import { bufferMatchesImageSignature, sanitizeFilename } from './imageValidation';

export function validateImageContent(req: Request, res: Response, next: NextFunction) {
  const file = (req as Request & { file?: Express.Multer.File }).file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded', message: 'No image file uploaded' });
  }

  if (!bufferMatchesImageSignature(file.buffer)) {
    return res.status(400).json({
      error: 'invalid_file_content',
      message: 'Uploaded file is not a valid image',
    });
  }

  file.originalname = sanitizeFilename(file.originalname);
  return next();
}
