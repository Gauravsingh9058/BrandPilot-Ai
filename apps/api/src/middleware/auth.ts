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

export function extractSessionToken(req: Request): string | null {
  // 1. Check signed cookies if validated by cookie-parser
  const signedCookie = req.signedCookies?.[SESSION_COOKIE_NAME];
  if (typeof signedCookie === 'string' && signedCookie.trim().length > 0) {
    return signedCookie.trim();
  }

  // 2. Check standard cookies
  const rawCookie = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof rawCookie === 'string' && rawCookie.trim().length > 0) {
    const cleanCookie = rawCookie.trim();
    // Handle URL-encoded or raw 's:token.sig' signed format gracefully
    if (cleanCookie.startsWith('s:')) {
      const match = cleanCookie.match(/^s:([^.]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return cleanCookie;
  }

  // 3. Check Authorization header (Bearer <token>)
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token.length > 0) {
      return token;
    }
  }

  return null;
}

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

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionToken = extractSessionToken(req);

  if (!sessionToken) {
    return next(new AppError('Authentication required. Please log in.', 401, 'UNAUTHORIZED'));
  }

  try {
    const sessionData = await authService.validateSession(sessionToken);
    if (!sessionData) {
      clearSessionCookie(res);
      return next(new AppError('Invalid or expired session. Please log in again.', 401, 'SESSION_EXPIRED'));
    }

    req.user = sessionData.user;
    req.rawSessionToken = sessionToken;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    clearSessionCookie(res);
    return next(new AppError('Authentication verification failed. Please log in again.', 401, 'UNAUTHORIZED'));
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const sessionToken = extractSessionToken(req);

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

