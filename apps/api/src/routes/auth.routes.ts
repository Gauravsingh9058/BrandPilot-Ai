import { Router, type Request, type Response, type NextFunction } from 'express';
import { SignupSchema, LoginSchema } from '@vidsnapai/validation';
import { AuthService } from '../services/auth.service.js';
import { WorkspaceService } from '../services/workspace.service.js';
import { setSessionCookie, clearSessionCookie, requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rate-limiter.js';
import type { ApiResponse } from '@vidsnapai/types';

export const authRouter: Router = Router();
const authService = new AuthService();
const workspaceService = new WorkspaceService();

// Rate limit: 20 requests per 15 minutes for auth endpoints
const authRateLimiter = createRateLimiter({
  maxRequests: 20,
  windowMs: 15 * 60 * 1000
});

// POST /api/auth/signup
authRouter.post('/signup', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedInput = SignupSchema.parse(req.body);
    const { user, rawToken, workspace } = await authService.signup(validatedInput);

    setSessionCookie(res, rawToken);

    const response: ApiResponse = {
      success: true,
      data: {
        user,
        workspace
      },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
authRouter.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedInput = LoginSchema.parse(req.body);
    const { user, rawToken } = await authService.login(validatedInput);

    setSessionCookie(res, rawToken);

    const response: ApiResponse = {
      success: true,
      data: { user },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.rawSessionToken) {
      await authService.logout(req.rawSessionToken);
    }
    clearSessionCookie(res);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Logged out successfully' },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const workspaces = await workspaceService.listWorkspacesForUser(user.id);

    const response: ApiResponse = {
      success: true,
      data: {
        user,
        workspaces
      },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});
