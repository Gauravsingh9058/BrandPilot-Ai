import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireBrandAccess } from '../middleware/brand-access.js';
import { requireContentPlanAccess } from '../middleware/content-plan-access.js';
import { getDatabase } from '@vidsnapai/database';
import { createAIProvider } from '@vidsnapai/ai';
import { getConfig } from '@vidsnapai/config';
import { ContentPlanService, ContentPlannerService } from '@vidsnapai/content';
import {
  CreateContentPlanSchema,
  UpdateContentPlanSchema,
  GenerateContentPlanSchema,
  UpdateContentJobSchema,
  UpdateContentJobStatusSchema
} from '@vidsnapai/validation';
import { AppError } from '../middleware/error-handler.js';

export const contentPlanRouter = Router({ mergeParams: true });

const db = getDatabase();
const config = getConfig();
const aiProvider = createAIProvider({ apiKey: config.GEMINI_API_KEY });

const contentPlanService = new ContentPlanService(db);
const contentPlannerService = new ContentPlannerService(db, aiProvider);

// ==========================================
// Content Plan Generation & Management Routes
// ==========================================

// POST /api/brands/:brandId/content-plans/generate
contentPlanRouter.post(
  '/content-plans/generate',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = GenerateContentPlanSchema.safeParse(req.body || {});
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const brand = req.brand!;
      const planWithJobs = await contentPlannerService.generateContentPlan(
        brand.id,
        brand.workspaceId,
        parsed.data
      );

      res.status(201).json({
        success: true,
        data: planWithJobs,
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

// POST /api/brands/:brandId/content-plans
contentPlanRouter.post(
  '/content-plans',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CreateContentPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const brand = req.brand!;
      const plan = await contentPlanService.createPlan(brand.id, brand.workspaceId, parsed.data);

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

// GET /api/brands/:brandId/content-plans
contentPlanRouter.get(
  '/content-plans',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const rawCampaignId = req.query.campaignId as string | undefined;
      const campaignId = Array.isArray(rawCampaignId) ? rawCampaignId[0] : rawCampaignId;

      const plans = await contentPlanService.listPlans(brand.id, brand.workspaceId, campaignId);

      res.json({
        success: true,
        data: plans,
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

// GET /api/brands/:brandId/content-plans/:planId
contentPlanRouter.get(
  '/content-plans/:planId',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']),
  requireContentPlanAccess(['OWNER', 'ADMIN', 'MEMBER']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const plan = req.contentPlan!;
      const planWithJobs = await contentPlanService.getPlanWithJobs(plan.id, brand.id, brand.workspaceId);

      res.json({
        success: true,
        data: planWithJobs,
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

// PATCH /api/brands/:brandId/content-plans/:planId
contentPlanRouter.patch(
  '/content-plans/:planId',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  requireContentPlanAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = UpdateContentPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const brand = req.brand!;
      const plan = req.contentPlan!;
      const updated = await contentPlanService.updatePlan(plan.id, brand.id, brand.workspaceId, parsed.data);

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

// DELETE /api/brands/:brandId/content-plans/:planId
contentPlanRouter.delete(
  '/content-plans/:planId',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  requireContentPlanAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const plan = req.contentPlan!;
      const deleted = await contentPlanService.deletePlan(plan.id, brand.id, brand.workspaceId);

      res.json({
        success: true,
        data: { deleted },
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

// POST /api/brands/:brandId/content-plans/:planId/regenerate
contentPlanRouter.post(
  '/content-plans/:planId/regenerate',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  requireContentPlanAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = GenerateContentPlanSchema.safeParse(req.body || {});
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const brand = req.brand!;
      const plan = req.contentPlan!;

      const newPlanWithJobs = await contentPlannerService.generateContentPlan(
        brand.id,
        brand.workspaceId,
        {
          ...parsed.data,
          campaignId: parsed.data.campaignId ?? plan.campaignId,
          planGroupId: plan.planGroupId,
          previousPlanId: plan.id,
          regenerate: true
        }
      );

      res.status(201).json({
        success: true,
        data: newPlanWithJobs,
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

// GET /api/brands/:brandId/content-plans/:planId/versions
contentPlanRouter.get(
  '/content-plans/:planId/versions',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']),
  requireContentPlanAccess(['OWNER', 'ADMIN', 'MEMBER']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const plan = req.contentPlan!;
      const versions = await contentPlanService.getPlanVersions(plan.planGroupId, brand.id, brand.workspaceId);

      res.json({
        success: true,
        data: versions,
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

// ==========================================
// Content Job Routes
// ==========================================

// GET /api/brands/:brandId/content-plans/:planId/jobs
contentPlanRouter.get(
  '/content-plans/:planId/jobs',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']),
  requireContentPlanAccess(['OWNER', 'ADMIN', 'MEMBER']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const plan = req.contentPlan!;
      const { status, contentType, format, funnelStage } = req.query as Record<string, string>;

      const jobs = await contentPlanService.listJobs(plan.id, brand.id, brand.workspaceId, {
        status: status as any,
        contentType: contentType as any,
        format: format as any,
        funnelStage: funnelStage as any
      });

      res.json({
        success: true,
        data: jobs,
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

// GET /api/brands/:brandId/content-plans/:planId/jobs/:jobId
contentPlanRouter.get(
  '/content-plans/:planId/jobs/:jobId',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']),
  requireContentPlanAccess(['OWNER', 'ADMIN', 'MEMBER']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const plan = req.contentPlan!;
      const rawJobId = req.params.jobId;
      const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;

      const job = await contentPlanService.getJobById(jobId, plan.id, brand.id, brand.workspaceId);
      if (!job) {
        throw new AppError('Content Job not found', 404, 'CONTENT_JOB_NOT_FOUND');
      }

      res.json({
        success: true,
        data: job,
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

// PATCH /api/brands/:brandId/content-plans/:planId/jobs/:jobId
contentPlanRouter.patch(
  '/content-plans/:planId/jobs/:jobId',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  requireContentPlanAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = UpdateContentJobSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const brand = req.brand!;
      const plan = req.contentPlan!;
      const rawJobId = req.params.jobId;
      const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;

      const updated = await contentPlanService.updateJob(
        jobId,
        plan.id,
        brand.id,
        brand.workspaceId,
        parsed.data
      );

      if (!updated) {
        throw new AppError('Content Job not found for updating', 404, 'CONTENT_JOB_NOT_FOUND');
      }

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

// PATCH /api/brands/:brandId/content-plans/:planId/jobs/:jobId/status
contentPlanRouter.patch(
  '/content-plans/:planId/jobs/:jobId/status',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  requireContentPlanAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = UpdateContentJobStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const brand = req.brand!;
      const plan = req.contentPlan!;
      const rawJobId = req.params.jobId;
      const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;

      const updated = await contentPlanService.updateJobStatus(
        jobId,
        plan.id,
        brand.id,
        brand.workspaceId,
        parsed.data.status
      );

      if (!updated) {
        throw new AppError('Content Job not found', 404, 'CONTENT_JOB_NOT_FOUND');
      }

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

// DELETE /api/brands/:brandId/content-plans/:planId/jobs/:jobId
contentPlanRouter.delete(
  '/content-plans/:planId/jobs/:jobId',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  requireContentPlanAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const plan = req.contentPlan!;
      const rawJobId = req.params.jobId;
      const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;

      const deleted = await contentPlanService.deleteJob(jobId, plan.id, brand.id, brand.workspaceId);

      res.json({
        success: true,
        data: { deleted },
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
