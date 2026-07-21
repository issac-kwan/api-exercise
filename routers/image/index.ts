import { Router } from 'express';
import { Multer } from 'multer';
import Services from '../../services/Services';
import { validateImageContent } from '../../validation/validateImageContent';
import { 
  hashFileContent, 
  getCachedClassification, 
  setCachedClassification 
} from '../../cache/classificationCache';
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

    // 1. Validate file existence
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // 2. Check cache using file content hash
      const contentHash = hashFileContent(file.buffer);
      const cached = await getCachedClassification(contentHash);
      
      if (cached) {
        logger.info('Classification cache hit', { filename: file.originalname });
        return res.status(200).json(JSON.parse(cached));
      }

      // 3. Process new image if cache misses
      const result = await services.image.classify(file);
      
      // 4. Save result to cache and respond
      await setCachedClassification(contentHash, result);
      logger.info('Image classified', { filename: file.originalname, size: file.size });
      
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error during image classification', { error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

