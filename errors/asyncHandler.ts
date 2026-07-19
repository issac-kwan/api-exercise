import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler so a rejected promise is forwarded to
 * Express's error-handling middleware via next(err), instead of being
 * silently swallowed. Without this, a rejected promise inside an async
 * handler just hangs the request — Express 4 doesn't catch it on its own.
 */
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
