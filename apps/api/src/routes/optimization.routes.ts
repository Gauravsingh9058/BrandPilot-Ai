import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDatabase } from '@vidsnapai/database';
import { createAIProvider } from '@vidsnapai/ai';
import { getConfig } from '@vidsnapai/config';
import {
  OptimizationExecutionService,
  AutonomousCampaignLoopService
} from '@vidsnapai/video';
import {
  OptimizationActionQuerySchema,
  RejectOptimizationActionSchema,
  ApplyOptimizationActionSchema,
  AutonomousLoopRunRequestSchema
} from '@vidsnapai/validation';
import { AppError } from '../middleware/error-handler.js';
import { getVerifiedWorkspaceId } from '../middleware/workspace.js';

export const optimizationRouter = Router();

const db = getDatabase();
const config = getConfig();
const aiProvider = createAIProvider({ apiKey: config.GEMINI_API_KEY });
const executionService = new OptimizationExecutionService(db);
const autonomousLoopService = new AutonomousCampaignLoopService(db, aiProvider);

// GET /api/optimization/actions
optimizationRouter.get(
  '/actions',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const parsedQuery = OptimizationActionQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        const msg = parsedQuery.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(msg, 400, 'VALIDATION_ERROR');
      }

      const actions = await executionService.listActions(workspaceId, parsedQuery.data);

      res.status(200).json({
        success: true,
        data: actions,
        meta: {
          requestId: req.id,
          count: actions.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/optimization/actions/:id
optimizationRouter.get(
  '/actions/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const actionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const action = await executionService.getAction(actionId, workspaceId);

      if (!action) {
        throw new AppError(`Optimization action "${actionId}" not found in this workspace`, 404, 'NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: action,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/optimization/actions/:id/approve
optimizationRouter.post(
  '/actions/:id/approve',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req, ['OWNER', 'ADMIN']);
      const actionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const notes = req.body?.notes as string | undefined;

      const approved = await executionService.approveAction(actionId, workspaceId, notes);

      res.status(200).json({
        success: true,
        data: approved,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/optimization/actions/:id/reject
optimizationRouter.post(
  '/actions/:id/reject',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req, ['OWNER', 'ADMIN']);
      const actionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const parsed = RejectOptimizationActionSchema.safeParse(req.body);
      const reason = parsed.success ? parsed.data.reason : undefined;

      const rejected = await executionService.rejectAction(actionId, workspaceId, reason);

      res.status(200).json({
        success: true,
        data: rejected,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/optimization/actions/:id/apply
optimizationRouter.post(
  '/actions/:id/apply',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req, ['OWNER', 'ADMIN']);
      const actionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const parsed = ApplyOptimizationActionSchema.safeParse(req.body);
      const force = parsed.success ? parsed.data.force : false;
      const user = (req as any).user;

      const result = await executionService.applyAction(actionId, workspaceId, {
        force,
        executedBy: user?.email || user?.id || 'USER'
      });

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/optimization/autonomous-loop
optimizationRouter.post(
  '/autonomous-loop',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req, ['OWNER', 'ADMIN']);
      const parsed = AutonomousLoopRunRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(msg, 400, 'VALIDATION_ERROR');
      }

      const loopResult = await autonomousLoopService.runAutonomousLoop(workspaceId, parsed.data);

      res.status(200).json({
        success: true,
        data: loopResult,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
