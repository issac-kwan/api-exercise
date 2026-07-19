import { Router } from 'express';
import Services from '../../services/Services';
import { Multer } from 'multer';
import { validateImageContent } from '../../validation/validateImageContent';
import { asyncHandler } from '../../errors/asyncHandler';
import { sendError } from '../../errors/sendError';
import { logger } from '../../logging/logger';

export default function image(services: Services, upload: Multer) {
  const router = Router();

  router.post(
    '/',
    upload.single('image_file'),
    validateImageContent,
    asyncHandler(async (req, res) => {
      const file = req.file;
      if (!file) {
        return sendError(res, 400, 'no_file', 'No file uploaded');
      }

      const result = await services.image.classify(file);
      logger.info('Image classified', { filename: file.originalname, size: file.size });

      return res.status(200).json(result);
    })
  );

  return router;
}
