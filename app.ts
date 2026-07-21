import express from 'express'; 
import multer from 'multer';
import helmet from 'helmet';
import routers from './routers';
import Services from './services/Services';
import InferApiImageClassificationService, { FakeImageClassificationService } from './services/image';
import { imageFileFilter, MAX_FILE_SIZE_BYTES } from './validation/imageValidation';
import { multerErrorHandler } from './validation/multerErrorHandler';
import { errorHandler } from './errors/errorHandler';

const app = express();

// 1. Service Instantiation
const classifier = 
  process.argv[2] === 'fake'
  ? new FakeImageClassificationService() 
  : new InferApiImageClassificationService();
  
const services = new Services(classifier);

// 2. Middleware Configurations (Multer)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 }, 
  fileFilter: imageFileFilter,
});

// 3. Unauthenticated Public Endpoints (Must be above routers)
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));

// 4. Application Routes
app.use('/image', routers.image(services, upload));

// 5. Error Handling Middleware (Must be last)
app.use(multerErrorHandler);
app.use(errorHandler); 

// 6. Export Statement (Must be at the very bottom)
export default app;
