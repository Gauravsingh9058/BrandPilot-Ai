import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireBrandAccess } from '../middleware/brand-access.js';
import { getDatabase, WorkspaceRepository } from '@vidsnapai/database';
import { createAIProvider } from '@vidsnapai/ai';
import { getConfig } from '@vidsnapai/config';
import { ContentJobRepository, ContentPlanRepository } from '@vidsnapai/content';
import {
  ReelPlannerService,
  ReelProductionPlanRepository,
  VideoRenderService,
  ApprovalService,
  SocialPublishingService
} from '@vidsnapai/video';
import { QueueService } from '../services/queue.service.js';
import {
  GenerateReelPlanSchema,
  RegenerateReelPlanSchema,
  UpdateReelPlanSchema,
  UpdateReelStatusSchema,
  RegenerateSceneSchema,
  BatchGenerateReelsSchema
} from '@vidsnapai/validation';
import { AppError } from '../middleware/error-handler.js';

export const reelRouter = Router({ mergeParams: true });
export const contentJobReelRouter = Router({ mergeParams: true });
export const contentPlanReelRouter = Router({ mergeParams: true });
export const standaloneReelRouter = Router({ mergeParams: true });

const db = getDatabase();
const config = getConfig();
const aiProvider = createAIProvider({ apiKey: config.GEMINI_API_KEY });

const jobRepo = new ContentJobRepository(db);
const planRepo = new ContentPlanRepository(db);
const reelRepo = new ReelProductionPlanRepository(db);
const workspaceRepo = new WorkspaceRepository(db);
const reelPlannerService = new ReelPlannerService(db, aiProvider, {
  jobRepo,
  planRepo,
  reelRepo
});

/**
 * Helper to authenticate and verify user's access to a ContentJob's workspace.
 */
async function verifyJobAccess(jobId: string, userId: string, allowedRoles = ['OWNER', 'ADMIN', 'MEMBER']) {
  const job = await jobRepo.findById(jobId);
  if (!job) {
    throw new AppError('ContentJob not found', 404, 'CONTENT_JOB_NOT_FOUND');
  }

  const role = await workspaceRepo.getUserRole(job.workspaceId, userId);
  if (!role) {
    throw new AppError('Access denied: You do not belong to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
  }

  if (!allowedRoles.includes(role)) {
    throw new AppError(
      `Insufficient permissions. Required role: [${allowedRoles.join(', ')}], your role: ${role}`,
      403,
      'INSUFFICIENT_PERMISSIONS'
    );
  }

  return { job, role, workspaceId: job.workspaceId };
}

/**
 * Helper to authenticate and verify user's access to a ContentPlan's workspace.
 */
async function verifyPlanAccess(planId: string, userId: string, allowedRoles = ['OWNER', 'ADMIN', 'MEMBER']) {
  const plan = await planRepo.findById(planId);
  if (!plan) {
    throw new AppError('ContentPlan not found', 404, 'CONTENT_PLAN_NOT_FOUND');
  }

  const role = await workspaceRepo.getUserRole(plan.workspaceId, userId);
  if (!role) {
    throw new AppError('Access denied: You do not belong to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
  }

  if (!allowedRoles.includes(role)) {
    throw new AppError(
      `Insufficient permissions. Required role: [${allowedRoles.join(', ')}], your role: ${role}`,
      403,
      'INSUFFICIENT_PERMISSIONS'
    );
  }

  return { plan, role, workspaceId: plan.workspaceId };
}

// ====================================================
// ContentJob-Scoped Reel Routes (/api/content-jobs/:jobId/reel)
// ====================================================

// POST /api/content-jobs/:jobId/reel/generate
contentJobReelRouter.post(
  '/:jobId/reel/generate',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawJobId = req.params.jobId;
      const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;
      const { workspaceId } = await verifyJobAccess(jobId, req.user!.id, ['OWNER', 'ADMIN']);

      const parsed = GenerateReelPlanSchema.safeParse(req.body || {});
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const plan = await reelPlannerService.generateReelForJob(jobId, workspaceId, parsed.data);

      res.status(201).json({
        success: true,
        data: plan,
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

// GET /api/content-jobs/:jobId/reel
contentJobReelRouter.get(
  '/:jobId/reel',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawJobId = req.params.jobId;
      const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;
      const { workspaceId } = await verifyJobAccess(jobId, req.user!.id);

      const plan = await reelPlannerService.getLatestForJob(jobId, workspaceId);
      if (!plan) {
        throw new AppError('Reel production plan not found for this ContentJob', 404, 'REEL_PLAN_NOT_FOUND');
      }

      res.json({
        success: true,
        data: plan,
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

// POST /api/content-jobs/:jobId/reel/regenerate
contentJobReelRouter.post(
  '/:jobId/reel/regenerate',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawJobId = req.params.jobId;
      const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;
      const { workspaceId } = await verifyJobAccess(jobId, req.user!.id, ['OWNER', 'ADMIN']);

      const parsed = RegenerateReelPlanSchema.safeParse(req.body || {});
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const plan = await reelPlannerService.regenerateReelForJob(jobId, workspaceId, parsed.data);

      res.status(201).json({
        success: true,
        data: plan,
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

// GET /api/content-jobs/:jobId/reel/history (and /versions)
contentJobReelRouter.get(
  ['/:jobId/reel/history', '/:jobId/reel/versions'],
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawJobId = req.params.jobId;
      const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;
      const { workspaceId } = await verifyJobAccess(jobId, req.user!.id);

      const history = await reelPlannerService.getHistoryForJob(jobId, workspaceId);

      res.json({
        success: true,
        data: history,
        meta: {
          total: history.length,
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/content-jobs/:jobId/reel
contentJobReelRouter.patch(
  '/:jobId/reel',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawJobId = req.params.jobId;
      const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;
      const { workspaceId } = await verifyJobAccess(jobId, req.user!.id, ['OWNER', 'ADMIN']);

      const latest = await reelPlannerService.getLatestForJob(jobId, workspaceId);
      if (!latest) {
        throw new AppError('Reel production plan not found for this ContentJob', 404, 'REEL_PLAN_NOT_FOUND');
      }

      const parsed = UpdateReelPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const updated = await reelPlannerService.updateReelPlan(latest.id, workspaceId, parsed.data);

      res.json({
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

// PATCH /api/content-jobs/:jobId/reel/status
contentJobReelRouter.patch(
  '/:jobId/reel/status',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawJobId = req.params.jobId;
      const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;
      const { workspaceId } = await verifyJobAccess(jobId, req.user!.id, ['OWNER', 'ADMIN']);

      const latest = await reelPlannerService.getLatestForJob(jobId, workspaceId);
      if (!latest) {
        throw new AppError('Reel production plan not found for this ContentJob', 404, 'REEL_PLAN_NOT_FOUND');
      }

      const parsed = UpdateReelStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const updated = await reelPlannerService.updateStatus(latest.id, workspaceId, parsed.data.status);

      res.json({
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

// ====================================================
// ContentPlan-Scoped Batch Reel Routes (/api/content-plans/:planId/reels)
// ====================================================

// POST /api/content-plans/:planId/reels/generate (and /generate-batch)
contentPlanReelRouter.post(
  ['/:planId/reels/generate', '/:planId/reels/generate-batch'],
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawPlanId = req.params.planId;
      const planId = Array.isArray(rawPlanId) ? rawPlanId[0] : rawPlanId;
      const { workspaceId } = await verifyPlanAccess(planId, req.user!.id, ['OWNER', 'ADMIN']);

      const parsed = BatchGenerateReelsSchema.safeParse(req.body || {});
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const result = await reelPlannerService.batchGenerateReelsForPlan(
        planId,
        workspaceId,
        parsed.data
      );

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

// GET /api/content-plans/:planId/reels
contentPlanReelRouter.get(
  '/:planId/reels',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawPlanId = req.params.planId;
      const planId = Array.isArray(rawPlanId) ? rawPlanId[0] : rawPlanId;
      const { workspaceId } = await verifyPlanAccess(planId, req.user!.id);

      const plans = await reelPlannerService.listForPlan(planId, workspaceId);

      res.json({
        success: true,
        data: plans,
        meta: {
          total: plans.length,
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ====================================================
// Brand-Scoped Reel Routes (/api/brands/:brandId/reels)
// ====================================================

// GET /api/brands/:brandId/reels
reelRouter.get(
  '/reels',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const plans = await reelPlannerService.listForBrand(brand.id, brand.workspaceId);

      res.json({
        success: true,
        data: plans,
        meta: {
          total: plans.length,
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/brands/:brandId/reels/:reelId
reelRouter.get(
  '/reels/:reelId',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const rawReelId = req.params.reelId;
      const reelId = Array.isArray(rawReelId) ? rawReelId[0] : rawReelId;

      const plan = await reelPlannerService.getById(reelId, brand.workspaceId);
      if (!plan || plan.brandId !== brand.id) {
        throw new AppError('Reel production plan not found', 404, 'REEL_PLAN_NOT_FOUND');
      }

      res.json({
        success: true,
        data: plan,
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

// PATCH /api/brands/:brandId/reels/:reelId
reelRouter.patch(
  '/reels/:reelId',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const rawReelId = req.params.reelId;
      const reelId = Array.isArray(rawReelId) ? rawReelId[0] : rawReelId;

      const parsed = UpdateReelPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const updated = await reelPlannerService.updateReelPlan(reelId, brand.workspaceId, parsed.data);

      res.json({
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

// POST /api/brands/:brandId/reels/:reelId/regenerate-scene
reelRouter.post(
  '/reels/:reelId/regenerate-scene',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const rawReelId = req.params.reelId;
      const reelId = Array.isArray(rawReelId) ? rawReelId[0] : rawReelId;

      const plan = await reelPlannerService.getById(reelId, brand.workspaceId);
      if (!plan || plan.brandId !== brand.id) {
        throw new AppError('Reel production plan not found', 404, 'REEL_PLAN_NOT_FOUND');
      }

      const parsed = RegenerateSceneSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const updated = await reelPlannerService.regenerateScene(
        plan.contentJobId,
        brand.workspaceId,
        parsed.data
      );

      res.json({
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

// ====================================================
// Standalone Reel Routes (/api/reels/:id)
// ====================================================
standaloneReelRouter.get(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const reel = await reelRepo.findById(id);
      if (!reel) {
        throw new AppError('Reel production plan not found', 404, 'REEL_PLAN_NOT_FOUND');
      }

      const role = await workspaceRepo.getUserRole(reel.workspaceId, req.user!.id);
      if (!role) {
        throw new AppError('Access denied: You do not belong to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      res.json({
        success: true,
        data: reel,
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

// POST /api/reels/:id/render - Phase 8 Video Rendering
standaloneReelRouter.post(
  '/:id/render',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const reel = await reelRepo.findById(id);
      if (!reel) {
        throw new AppError('Reel production plan not found', 404, 'REEL_PLAN_NOT_FOUND');
      }

      const role = await workspaceRepo.getUserRole(reel.workspaceId, req.user!.id);
      if (!role) {
        throw new AppError('Access denied: You do not belong to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      const isAsync = req.query.async === 'true';
      if (isAsync) {
        const queueService = new QueueService();
        const jobId = `render_${reel.id}_${Date.now()}`;
        await reelRepo.updateStatus(reel.id, 'IN_PRODUCTION');

        await queueService.enqueueRenderJob({
          id: jobId,
          action: 'RENDER_REEL_VIDEO',
          reelPlanId: reel.id,
          workspaceId: reel.workspaceId,
          brandId: reel.brandId,
          triggeredBy: req.user!.id,
          timestamp: Date.now()
        });

        res.status(202).json({
          success: true,
          data: {
            jobId,
            status: 'QUEUED',
            message: 'Video rendering queued successfully.'
          },
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Synchronous render
      const renderService = new VideoRenderService(db);
      const renderOutput = await renderService.renderReelVideo(reel.id, reel.workspaceId);

      res.status(200).json({
        success: true,
        data: renderOutput,
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

// GET /api/reels/:id/render - Fetch render status and output
standaloneReelRouter.get(
  '/:id/render',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const reel = await reelRepo.findById(id);
      if (!reel) {
        throw new AppError('Reel production plan not found', 404, 'REEL_PLAN_NOT_FOUND');
      }

      const role = await workspaceRepo.getUserRole(reel.workspaceId, req.user!.id);
      if (!role) {
        throw new AppError('Access denied: You do not belong to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      const renderOutput = reel.renderOutput || reel.productionMetadata?.renderOutput || null;

      res.json({
        success: true,
        data: {
          reelId: reel.id,
          status: reel.status,
          renderOutput,
          outputVideoUrl: reel.outputVideoUrl || renderOutput?.outputVideoUrl || null
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

// POST /api/reels/:id/approve - Approve a generated/rendered reel
standaloneReelRouter.post(
  '/:id/approve',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const reel = await reelRepo.findById(id);
      if (!reel) {
        throw new AppError('Reel production plan not found', 404, 'REEL_PLAN_NOT_FOUND');
      }

      const role = await workspaceRepo.getUserRole(reel.workspaceId, req.user!.id);
      if (!role || !['OWNER', 'ADMIN', 'MEMBER'].includes(role)) {
        throw new AppError('Access denied: You do not have permission to approve reels in this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      const approvalService = new ApprovalService(db);
      const updated = await approvalService.approveReel({
        reelPlanId: reel.id,
        workspaceId: reel.workspaceId,
        approvedBy: req.user!.id,
        notes: req.body?.notes
      });

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

// POST /api/reels/:id/reject - Reject a generated reel with feedback
standaloneReelRouter.post(
  '/:id/reject',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const reel = await reelRepo.findById(id);
      if (!reel) {
        throw new AppError('Reel production plan not found', 404, 'REEL_PLAN_NOT_FOUND');
      }

      const role = await workspaceRepo.getUserRole(reel.workspaceId, req.user!.id);
      if (!role || !['OWNER', 'ADMIN', 'MEMBER'].includes(role)) {
        throw new AppError('Access denied: You do not have permission to reject reels in this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      const reason = req.body?.reason;
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new AppError('Rejection reason is required', 400, 'VALIDATION_ERROR');
      }

      const approvalService = new ApprovalService(db);
      const updated = await approvalService.rejectReel({
        reelPlanId: reel.id,
        workspaceId: reel.workspaceId,
        reason: reason.trim(),
        rejectedBy: req.user!.id
      });

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

// POST /api/reels/:id/schedule - Schedule reel publishing
standaloneReelRouter.post(
  '/:id/schedule',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const reel = await reelRepo.findById(id);
      if (!reel) {
        throw new AppError('Reel production plan not found', 404, 'REEL_PLAN_NOT_FOUND');
      }

      const role = await workspaceRepo.getUserRole(reel.workspaceId, req.user!.id);
      if (!role || !['OWNER', 'ADMIN'].includes(role)) {
        throw new AppError('Access denied: You do not have permission to schedule publishing', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      const { platform = 'INSTAGRAM', scheduledAt, caption, hashtags } = req.body || {};
      if (!scheduledAt) {
        throw new AppError('scheduledAt ISO string is required for scheduling', 400, 'VALIDATION_ERROR');
      }

      const scheduleDate = new Date(scheduledAt);
      if (isNaN(scheduleDate.getTime())) {
        throw new AppError('Invalid scheduledAt timestamp', 400, 'VALIDATION_ERROR');
      }

      const publishingService = new SocialPublishingService(db);
      const publication = await publishingService.schedulePublication({
        reelPlanId: reel.id,
        workspaceId: reel.workspaceId,
        brandId: reel.brandId,
        platform,
        scheduledAt: scheduleDate,
        caption,
        hashtags
      });

      res.status(201).json({
        success: true,
        data: publication,
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

// POST /api/reels/:id/publish - Publish a reel immediately or via queue
standaloneReelRouter.post(
  '/:id/publish',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const reel = await reelRepo.findById(id);
      if (!reel) {
        throw new AppError('Reel production plan not found', 404, 'REEL_PLAN_NOT_FOUND');
      }

      const role = await workspaceRepo.getUserRole(reel.workspaceId, req.user!.id);
      if (!role || !['OWNER', 'ADMIN'].includes(role)) {
        throw new AppError('Access denied: You do not have permission to publish reels', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      const { platform = 'INSTAGRAM', caption, hashtags } = req.body || {};
      const publishingService = new SocialPublishingService(db);

      const result = await publishingService.publishReel({
        reelPlanId: reel.id,
        workspaceId: reel.workspaceId,
        brandId: reel.brandId,
        platform,
        caption,
        hashtags
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

// GET /api/reels/:id/publishing - List publishing records for a reel
standaloneReelRouter.get(
  '/:id/publishing',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const reel = await reelRepo.findById(id);
      if (!reel) {
        throw new AppError('Reel production plan not found', 404, 'REEL_PLAN_NOT_FOUND');
      }

      const role = await workspaceRepo.getUserRole(reel.workspaceId, req.user!.id);
      if (!role) {
        throw new AppError('Access denied: You do not belong to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      const publishingService = new SocialPublishingService(db);
      const publications = await publishingService.getPublications(reel.id, reel.workspaceId);

      res.json({
        success: true,
        data: publications,
        meta: {
          total: publications.length,
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);


