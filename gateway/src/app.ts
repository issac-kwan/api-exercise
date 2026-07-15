import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { rateLimiter } from './rateLimiter';

const app = express();

app.use(rateLimiter);

app.use('/', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
}));

export default app;
