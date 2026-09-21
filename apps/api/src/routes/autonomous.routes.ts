import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDatabase, AutonomousRepository } from '@vidsnapai/database';
import { createAIProvider } from '@vidsnapai/ai';
import { getConfig } from '@vidsnapai/config';
import {
  AutonomousPolicyService,
  AutonomousOperationsService
} from '@vidsnapai/video';
import {
  UpdateAutonomousPolicySchema,
  TriggerAutonomousRunSchema,
  AutonomousQuerySchema,
  EmergencyPauseSchema
} from '@vidsnapai/validation';
import { getVerifiedWorkspaceId } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';

export const autonomousRouter = Router();

const db = getDatabase();
const config = getConfig();
const aiProvider = createAIProvider({ apiKey: config.GEMINI_API_KEY });
const autonRepo = new AutonomousRepository(db);
const policyService = new AutonomousPolicyService(db, { autonRepo });
const operationsService = new AutonomousOperationsService(db, aiProvider, { autonRepo, policyService });


// GET /api/autonomous/status
autonomousRouter.get(
  '/status',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const status = await policyService.getOperationsStatus(workspaceId);

      res.status(200).json({
        success: true,
        data: status,
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

// GET /api/autonomous/policy
autonomousRouter.get(
  '/policy',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const policy = await policyService.getPolicy(workspaceId);

      res.status(200).json({
        success: true,
        data: policy,
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

// PATCH /api/autonomous/policy
autonomousRouter.patch(
  '/policy',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const user = (req as any).user;
      const parsed = UpdateAutonomousPolicySchema.safeParse(req.body);

      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(msg, 400, 'VALIDATION_ERROR');
      }

      const updated = await policyService.updatePolicy(
        workspaceId,
        parsed.data as any,
        user?.email || user?.id || 'USER'
      );

      res.status(200).json({
        success: true,
        data: updated,
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

// POST /api/autonomous/enable
autonomousRouter.post(
  '/enable',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const user = (req as any).user;
      const updated = await policyService.setOperatingMode(
        workspaceId,
        'AUTONOMOUS',
        user?.email || user?.id || 'USER'
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Workspace switched to AUTONOMOUS mode.',
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

// POST /api/autonomous/disable
autonomousRouter.post(
  '/disable',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const user = (req as any).user;
      const updated = await policyService.setOperatingMode(
        workspaceId,
        'CONTROLLED',
        user?.email || user?.id || 'USER'
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Workspace switched to CONTROLLED mode.',
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

// POST /api/autonomous/pause (Emergency Pause)
autonomousRouter.post(
  '/pause',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const user = (req as any).user;
      const parsed = EmergencyPauseSchema.safeParse(req.body);
      const reason = parsed.success ? parsed.data.reason : 'Emergency pause requested by user';

      const updated = await policyService.emergencyPause(
        workspaceId,
        reason,
        user?.email || user?.id || 'USER'
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: 'ALL autonomous operations have been PAUSED immediately.',
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

// POST /api/autonomous/resume
autonomousRouter.post(
  '/resume',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const user = (req as any).user;
      const updated = await policyService.resumeOperations(
        workspaceId,
        user?.email || user?.id || 'USER'
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Autonomous operations resumed to ACTIVE.',
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

// POST /api/autonomous/run (Trigger immediate run)
autonomousRouter.post(
  '/run',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const parsed = TriggerAutonomousRunSchema.safeParse(req.body);

      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(msg, 400, 'VALIDATION_ERROR');
      }

      // Execute synchronous autonomous run
      const run = await operationsService.executeAutonomousRun(workspaceId, {
        brandId: parsed.data.brandId,
        campaignId: parsed.data.campaignId,
        triggerType: 'MANUAL',
        forceAutonomousMode: parsed.data.forceAutonomousMode,
        skipPublish: parsed.data.skipPublish,
        daysToPlan: parsed.data.daysToPlan
      });

      res.status(200).json({
        success: true,
        data: run,
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

// GET /api/autonomous/runs
autonomousRouter.get(
  '/runs',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const parsed = AutonomousQuerySchema.safeParse(req.query);
      const query = parsed.success ? parsed.data : { limit: 20, offset: 0 };

      const runs = await autonRepo.listRuns(workspaceId, query);

      res.status(200).json({
        success: true,
        data: runs,
        meta: {
          requestId: req.id,
          count: runs.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/autonomous/runs/:id
autonomousRouter.get(
  '/runs/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const runId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const run = await autonRepo.getRunById(runId, workspaceId);

      if (!run) {
        throw new AppError(`Autonomous run "${runId}" not found in this workspace`, 404, 'NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: run,
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

// GET /api/autonomous/activity
autonomousRouter.get(
  '/activity',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const parsed = AutonomousQuerySchema.safeParse(req.query);
      const query = parsed.success ? parsed.data : { limit: 50, offset: 0 };

      const history = await autonRepo.listExecutionHistory(workspaceId, query);

      res.status(200).json({
        success: true,
        data: history,
        meta: {
          requestId: req.id,
          count: history.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/autonomous/safety-events
autonomousRouter.get(
  '/safety-events',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const parsed = AutonomousQuerySchema.safeParse(req.query);
      const query = parsed.success ? parsed.data : { limit: 50 };

      const events = await autonRepo.listSafetyEvents(workspaceId, query);

      res.status(200).json({
        success: true,
        data: events,
        meta: {
          requestId: req.id,
          count: events.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/autonomous/budget
autonomousRouter.get(
  '/budget',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const policy = await policyService.getPolicy(workspaceId);
      const todayLimits = await autonRepo.getOrCreateLimits(workspaceId);
      const budgetEvents = await autonRepo.listBudgetEvents(workspaceId, { limit: 20 });

      res.status(200).json({
        success: true,
        data: {
          date: todayLimits.date,
          dailySpend: todayLimits.dailySpend,
          maxDailySpend: policy.advertising.maxDailySpend,
          maxCampaignSpend: policy.advertising.maxCampaignSpend,
          dailySpendRemaining: Math.max(0, policy.advertising.maxDailySpend - todayLimits.dailySpend),
          budgetStatus:
            todayLimits.dailySpend >= policy.advertising.maxDailySpend
              ? 'LIMIT_REACHED'
              : todayLimits.dailySpend >= policy.advertising.maxDailySpend * 0.8
              ? 'NEAR_LIMIT'
              : 'HEALTHY',
          events: budgetEvents
        },
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
