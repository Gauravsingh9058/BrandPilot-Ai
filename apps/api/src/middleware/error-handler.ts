import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ApiResponse } from '@vidsnapai/types';
import { structuredLog } from './logger.js';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      requestId: req.id
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  };
  res.status(404).json(response);
}

export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected server error occurred';
  let details: unknown = undefined;

  if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = err.message || 'Authentication required';
  } else if (err instanceof Error) {
    // Provide human-readable message while masking passwords/credentials
    const rawMessage = err.message || 'An error occurred while processing your request';
    // Ensure database passwords/secrets are never leaked in response message
    message = rawMessage.replace(/:\/\/([^:]+):([^@]+)@/g, '://$1:****@');
  }

  // Structured logging for errors
  structuredLog({
    timestamp: new Date().toISOString(),
    level: statusCode >= 500 ? 'error' : 'warn',
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    status: statusCode,
    message: err.message,
    context: {
      code,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });

  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      requestId: req.id
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  };

  res.status(statusCode).json(response);
}
