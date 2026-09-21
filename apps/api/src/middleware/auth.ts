import type { Request, Response, NextFunction } from 'express';
import type { User, WorkspaceRole } from '@vidsnapai/types';
import { AuthService, SESSION_COOKIE_NAME, SESSION_EXPIRY_DAYS } from '../services/auth.service.js';
import { AppError } from './error-handler.js';
import { getConfig } from '@vidsnapai/config';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      rawSessionToken?: string;
      workspaceRole?: WorkspaceRole;
    }
  }
}

const authService = new AuthService();

export function setSessionCookie(res: Response, token: string): void {
  const config = getConfig();
  const maxAge = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge
  });
}

export function clearSessionCookie(res: Response): void {
  const config = getConfig();
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const sessionToken = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');

  if (!sessionToken) {
    return next(new AppError('Authentication required. Please log in.', 401, 'UNAUTHORIZED'));
  }

  try {
    const sessionData = await authService.validateSession(sessionToken);
    if (!sessionData) {
      return next(new AppError('Invalid or expired session. Please log in again.', 401, 'SESSION_EXPIRED'));
    }

    req.user = sessionData.user;
    req.rawSessionToken = sessionToken;
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const sessionToken = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');

  if (!sessionToken) {
    return next();
  }

  try {
    const sessionData = await authService.validateSession(sessionToken);
    if (sessionData) {
      req.user = sessionData.user;
      req.rawSessionToken = sessionToken;
    }
    next();
  } catch {
    next();
  }
}
