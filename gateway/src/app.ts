import express from 'express';
import helmet from 'helmet';
import http from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticate } from './auth';
import { rateLimiter } from './rateLimiter';

const keepAliveAgent = new http.Agent({ keepAlive: true });

const app = express();
app.set('trust proxy', 1);
app.use(helmet());

app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use(authenticate);
app.use(rateLimiter);

app.use('/', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  agent: keepAliveAgent,
}));

export default app;
