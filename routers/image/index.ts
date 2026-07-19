import { Router } from 'express';
import Services from '../../services/Services';
import { Multer } from 'multer';
import { validateImageContent } from '../../validation/validateImageContent';

export default function image(services: Services, upload: Multer) {
  const router = Router();

  router.post('/', upload.single('image_file'), validateImageContent, async (req, res) => {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    return res.status(200).json(await services.image.classify(file));
    
  });

  return router;
}
