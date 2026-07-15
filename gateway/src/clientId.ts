import { Request } from 'express';

export function getClientId(req: Request): string {
    return req.ip ?? '127.0.0.1';
}
