import type { Request, Response, NextFunction } from 'express';

export interface LogPayload {
  timestamp?: string;
  level: 'info' | 'warn' | 'error';
  requestId?: string;
  workspaceId?: string;
  userId?: string;
  jobId?: string;
  method?: string;
  url?: string;
  status?: number;
  durationMs?: number;
  operation?: string;
  message?: string;
  errorCode?: string;
  context?: Record<string, unknown>;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'access_token',
  'rawsessiontoken',
  'sessionsecret',
  'session_secret',
  'secret',
  'clientsecret',
  'client_secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'gemini_api_key',
  'pexels_api_key',
  'meta_access_token',
  'meta_app_secret'
]);

export function sanitizeLogValue(val: unknown, depth = 0): unknown {
  if (depth > 6) return '[DeeplyNested]';
  if (val === null || val === undefined) return val;

  if (typeof val === 'string') {
    // Redact postgresql/mysql credentials from connection strings
    return val.replace(/:\/\/([^:]+):([^@]+)@/g, '://$1:****@');
  }

  if (Array.isArray(val)) {
    return val.map((item) => sanitizeLogValue(item, depth + 1));
  }

  if (typeof val === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      const lowerKey = k.toLowerCase().replace(/[-_]/g, '');
      if (SENSITIVE_KEYS.has(lowerKey) || SENSITIVE_KEYS.has(k.toLowerCase())) {
        sanitizedObj[k] = '[REDACTED]';
      } else {
        sanitizedObj[k] = sanitizeLogValue(v, depth + 1);
      }
    }
    return sanitizedObj;
  }

  return val;
}

export function structuredLog(payload: LogPayload): void {
  // Never log sensitive data like passwords or tokens
  const safePayload = {
    ...payload,
    timestamp: payload.timestamp || new Date().toISOString(),
    message: payload.message ? (sanitizeLogValue(payload.message) as string) : undefined,
    context: payload.context ? (sanitizeLogValue(payload.context) as Record<string, unknown>) : undefined
  };

  const line = JSON.stringify(safePayload);
  if (payload.level === 'error') {
    console.error(line);
  } else if (payload.level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    const durationMs = req.startTime ? Date.now() - req.startTime : 0;
    const isError = res.statusCode >= 400;

    structuredLog({
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'error' : isError ? 'warn' : 'info',
      requestId: req.id,
      workspaceId: req.headers['x-workspace-id'] as string | undefined,
      userId: req.user?.id,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs
    });
  });

  next();
}
