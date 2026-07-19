import multer from 'multer';
import helmet from 'helmet';
import routers from './routers';
import Services from './services/Services';
import InferApiImageClassificationService, { FakeImageClassificationService } from './services/image';
import { imageFileFilter, MAX_FILE_SIZE_BYTES } from './validation/imageValidation';
import { multerErrorHandler } from './validation/multerErrorHandler';
import { errorHandler } from './errors/errorHandler';

const express = require('express')
const app = express()

app.use(helmet()); 

const classifier = 
  process.argv[2] === 'fake'
  ? new FakeImageClassificationService() 
  : new InferApiImageClassificationService();
  
const services = new Services(classifier);

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 }, 
  fileFilter: imageFileFilter,
});

app.use('/image', routers.image(services, upload));

app.use(multerErrorHandler);
app.use(errorHandler); 

export default app;