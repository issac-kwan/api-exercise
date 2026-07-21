import { Request, Response, NextFunction } from 'express';
import { logger } from '../logging/logger';
import { sendError } from './sendError';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const error = err instanceof Error ? err : new Error('Unknown error');

  logger.error('Unhandled request error', {
    path: req.path,
    method: req.method,
    message: error.message,
    stack: error.stack,
  });

  if (res.headersSent) {
    return;
  }

  return sendError(res, 500, 'internal_error', 'Something went wrong. Please try again.');
}
