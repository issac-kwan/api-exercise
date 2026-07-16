import { Request } from 'express';

export function getClientId(req: Request): string | undefined {
    return req.clientId ?? req.ip; 
}
