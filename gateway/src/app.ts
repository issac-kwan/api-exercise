import express from 'express';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticate } from './auth';
import { rateLimiter } from './rateLimiter';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());


app.use(authenticate);
app.use(rateLimiter);

app.use('/', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
}));

export default app;
