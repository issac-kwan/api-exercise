import { Request, Response, NextFunction } from 'express';
import { logger } from '../logging/logger';
import { sendError } from './sendError';

/**
 * The last line of defense — any error that reaches here (via next(err))
 * gets full detail logged server-side, but the client only ever sees a
 * generic message. Stack traces, file paths, and library internals are
 * genuinely useful for debugging, but also genuinely useful to an
 * attacker probing for what's running underneath — they never leave
 * the server.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const error = err instanceof Error ? err : new Error('Unknown error');

  logger.error('Unhandled request error', {
    path: req.path,
    method: req.method,
    message: error.message,
    stack: error.stack,
  });

  if (res.headersSent) {
    return; // Express requires this check — can't send two responses
  }

  return sendError(res, 500, 'internal_error', 'Something went wrong. Please try again.');
}
