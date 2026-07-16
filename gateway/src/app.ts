import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticate } from './auth';
import { rateLimiter } from './rateLimiter';

const app = express();

app.use(authenticate);
app.use(rateLimiter);

app.use('/', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
}));

export default app;
