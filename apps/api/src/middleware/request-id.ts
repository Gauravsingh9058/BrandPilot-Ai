import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'];
  const id = typeof existingId === 'string' && existingId.length > 0 ? existingId : randomUUID();
  req.id = id;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', id);
  next();
}
