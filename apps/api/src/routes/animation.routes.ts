import { Router, type Request, type Response, type NextFunction } from 'express';
import { getDatabase, WorkspaceRepository } from '@vidsnapai/database';
import { getConfig } from '@vidsnapai/config';
import { requireAuth } from '../middleware/auth.js';
import { AnimationService } from '@vidsnapai/animation';
import { ReelProductionPlanRepository, ProductionPackageService } from '@vidsnapai/video';
import { DnaRepository } from '@vidsnapai/brand';
import { MarketingStrategyRepository, CampaignRepository } from '@vidsnapai/campaign';
import { GeminiProvider } from '@vidsnapai/ai';
import { QueueService } from '../services/queue.service.js';
import {
  GenerateAnimationPlanInputSchema,
  UpdateAnimationPlanSchema,
  UpdateAnimationStatusSchema,
  RegenerateSceneAnimationInputSchema
} from '@vidsnapai/validation';
import { AppError } from '../middleware/error-handler.js';

export const animationRouter: Router = Router();

const db = getDatabase();
const workspaceRepo = new WorkspaceRepository(db);
const reelRepo = new ReelProductionPlanRepository(db);
const packageService = new ProductionPackageService(db);
const dnaRepo = new DnaRepository(db);
const marketingRepo = new MarketingStrategyRepository(db);
const campaignRepo = new CampaignRepository(db);
const queueService = new QueueService();

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0];
  return param || '';
}

async function resolveActiveWorkspaceId(req: Request): Promise<string> {
  const headerWs = req.headers['x-workspace-id'];
  if (typeof headerWs === 'string' && headerWs.length > 0) {
    const role = await workspaceRepo.getUserRole(headerWs, req.user!.id);
    if (!role) {
      throw new AppError('Unauthorized access to specified workspace', 403, 'WORKSPACE_ACCESS_DENIED');
    }
    return headerWs;
  }

  const queryWs = req.query.workspaceId;
  if (typeof queryWs === 'string' && queryWs.length > 0) {
    const role = await workspaceRepo.getUserRole(queryWs, req.user!.id);
    if (!role) {
      throw new AppError('Unauthorized access to specified workspace', 403, 'WORKSPACE_ACCESS_DENIED');
    }
    return queryWs;
  }

  const userWorkspaces = await workspaceRepo.listForUser(req.user!.id);
  if (userWorkspaces.length === 0) {
    throw new AppError('User has no accessible workspaces', 403, 'NO_WORKSPACES');
  }

  return userWorkspaces[0].id;
}

function getAnimationService(): AnimationService {
  const config = getConfig();
  const aiProvider = config.GEMINI_API_KEY
    ? new GeminiProvider({ apiKey: config.GEMINI_API_KEY, modelName: config.GEMINI_MODEL })
    : undefined;
  return new AnimationService(aiProvider);
}

// 1. GET /api/reels/:id/animation - Get latest animation plan
animationRouter.get(
  '/reels/:id/animation',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = await resolveActiveWorkspaceId(req);
      const reelPlanId = getParam(req.params.id);

      const reelPlan = await reelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
      if (!reelPlan) {
        throw new AppError('Reel production plan not found', 404, 'REEL_NOT_FOUND');
      }

      const animationService = getAnimationService();
      const plan = await animationService.getLatestPlan(reelPlanId, workspaceId);

      if (!plan) {
        return res.status(200).json({
          success: true,
          data: null,
          meta: {
            requestId: (req as any).id || (req as any).requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const pkg = await packageService.getPackageByReelPlanId(reelPlanId, workspaceId);
      const readiness = await animationService.getReadinessReport(reelPlanId, workspaceId, pkg);

      return res.status(200).json({
        success: true,
        data: {
          animationPlan: plan,
          readiness
        },
        meta: {
          requestId: (req as any).id || (req as any).requestId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// 2. POST /api/reels/:id/animation/generate - Generate or regenerate full animation plan
animationRouter.post(
  '/reels/:id/animation/generate',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = await resolveActiveWorkspaceId(req);
      const reelPlanId = getParam(req.params.id);

      const parseResult = GenerateAnimationPlanInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new AppError(
          `Invalid animation options: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      const reelPlan = await reelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
      if (!reelPlan) {
        throw new AppError('Reel production plan not found', 404, 'REEL_NOT_FOUND');
      }

      // Check if async queue is requested
      const asyncParam = req.query.async === 'true';
      if (asyncParam) {
        const jobId = `anim_${reelPlanId}_${Date.now()}`;
        await queueService.enqueueAnimationJob({
          id: jobId,
          action: 'GENERATE_ANIMATION_PLAN',
          reelPlanId: reelPlan.id,
          productionPackageId: reelPlan.id,
          workspaceId,
          brandId: reelPlan.brandId,
          input: parseResult.data,
          triggeredBy: req.user!.id,
          timestamp: Date.now()
        });

        return res.status(202).json({
          success: true,
          data: {
            jobId,
            message: 'Animation generation job queued successfully.',
            status: 'PENDING'
          },
          meta: {
            requestId: (req as any).id || (req as any).requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Synchronous generation
      let productionPackage = await packageService.getPackageByReelPlanId(reelPlanId, workspaceId);
      if (!productionPackage) {
        productionPackage = await packageService.compilePackage(reelPlanId, workspaceId);
      }

      const brandDna = await dnaRepo.findLatestByBrandId(reelPlan.brandId);
      const marketingStrategy = await marketingRepo.findLatestByBrandId(reelPlan.brandId);
      const campaign = reelPlan.campaignId
        ? await campaignRepo.findByIdAndBrand(reelPlan.campaignId, reelPlan.brandId)
        : null;
      const campaignStrategy = campaign?.campaignStrategy || null;

      const animationService = getAnimationService();
      const result = await animationService.generateAnimationPlan({
        workspaceId,
        brandId: reelPlan.brandId,
        reelPlan,
        productionPackage,
        brandDna,
        marketingStrategy,
        campaignStrategy,
        input: parseResult.data
      });

      return res.status(201).json({
        success: true,
        data: result,
        meta: {
          requestId: (req as any).id || (req as any).requestId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// 3. PUT /api/reels/:id/animation - Update animation plan
animationRouter.put(
  '/reels/:id/animation',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = await resolveActiveWorkspaceId(req);
      const reelPlanId = getParam(req.params.id);

      const parseResult = UpdateAnimationPlanSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new AppError(
          `Invalid update payload: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      const animationService = getAnimationService();
      const latestPlan = await animationService.getLatestPlan(reelPlanId, workspaceId);
      if (!latestPlan) {
        throw new AppError('Animation plan not found for reel', 404, 'ANIMATION_PLAN_NOT_FOUND');
      }

      const updated = await animationService.updatePlan(latestPlan.id, workspaceId, parseResult.data);
      const pkg = await packageService.getPackageByReelPlanId(reelPlanId, workspaceId);
      const readiness = await animationService.getReadinessReport(reelPlanId, workspaceId, pkg);

      return res.status(200).json({
        success: true,
        data: {
          animationPlan: updated,
          readiness
        },
        meta: {
          requestId: (req as any).id || (req as any).requestId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// 4. PATCH /api/reels/:id/animation/status - Update approval/review status
animationRouter.patch(
  '/reels/:id/animation/status',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = await resolveActiveWorkspaceId(req);
      const reelPlanId = getParam(req.params.id);

      const parseResult = UpdateAnimationStatusSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new AppError('Invalid status update', 400, 'VALIDATION_ERROR');
      }

      const animationService = getAnimationService();
      const latestPlan = await animationService.getLatestPlan(reelPlanId, workspaceId);
      if (!latestPlan) {
        throw new AppError('Animation plan not found for reel', 404, 'ANIMATION_PLAN_NOT_FOUND');
      }

      const updated = await animationService.updateStatus(latestPlan.id, workspaceId, parseResult.data.status);

      return res.status(200).json({
        success: true,
        data: updated,
        meta: {
          requestId: (req as any).id || (req as any).requestId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// 5. GET /api/reels/:id/animation/versions - List version history
animationRouter.get(
  '/reels/:id/animation/versions',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = await resolveActiveWorkspaceId(req);
      const reelPlanId = getParam(req.params.id);

      const animationService = getAnimationService();
      const history = await animationService.getHistory(reelPlanId, workspaceId);

      return res.status(200).json({
        success: true,
        data: history,
        meta: {
          requestId: (req as any).id || (req as any).requestId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// 6. POST /api/reels/:id/scenes/:sceneNumber/animation/regenerate - Regenerate single scene animation
animationRouter.post(
  '/reels/:id/scenes/:sceneNumber/animation/regenerate',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = await resolveActiveWorkspaceId(req);
      const reelPlanId = getParam(req.params.id);
      const sceneNumberStr = getParam(req.params.sceneNumber);
      const sceneNumber = parseInt(sceneNumberStr, 10);

      if (isNaN(sceneNumber) || sceneNumber < 1) {
        throw new AppError('Invalid scene number', 400, 'INVALID_SCENE_NUMBER');
      }

      const parseResult = RegenerateSceneAnimationInputSchema.safeParse({
        sceneNumber,
        ...req.body
      });
      if (!parseResult.success) {
        throw new AppError('Invalid scene animation options', 400, 'VALIDATION_ERROR');
      }

      let productionPackage = await packageService.getPackageByReelPlanId(reelPlanId, workspaceId);
      if (!productionPackage) {
        productionPackage = await packageService.compilePackage(reelPlanId, workspaceId);
      }

      const animationService = getAnimationService();
      const updatedPlan = await animationService.regenerateSceneAnimation({
        workspaceId,
        reelPlanId,
        sceneNumber,
        productionPackage,
        input: parseResult.data
      });

      if (!updatedPlan) {
        throw new AppError(`Scene #${sceneNumber} not found or animation plan missing`, 404, 'SCENE_NOT_FOUND');
      }

      const readiness = await animationService.getReadinessReport(reelPlanId, workspaceId, productionPackage);

      return res.status(200).json({
        success: true,
        data: {
          animationPlan: updatedPlan,
          readiness
        },
        meta: {
          requestId: (req as any).id || (req as any).requestId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// 7. GET /api/reels/:id/animation/readiness - Get readiness evaluation report
animationRouter.get(
  '/reels/:id/animation/readiness',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = await resolveActiveWorkspaceId(req);
      const reelPlanId = getParam(req.params.id);

      const pkg = await packageService.getPackageByReelPlanId(reelPlanId, workspaceId);
      const animationService = getAnimationService();
      const report = await animationService.getReadinessReport(reelPlanId, workspaceId, pkg);

      if (!report) {
        throw new AppError('Animation plan not found for reel', 404, 'ANIMATION_PLAN_NOT_FOUND');
      }

      return res.status(200).json({
        success: true,
        data: report,
        meta: {
          requestId: (req as any).id || (req as any).requestId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// 8. GET /api/reels/:id/animation/render-contract - Get Phase 8 Render Contract
animationRouter.get(
  '/reels/:id/animation/render-contract',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = await resolveActiveWorkspaceId(req);
      const reelPlanId = getParam(req.params.id);

      const reelPlan = await reelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
      if (!reelPlan) {
        throw new AppError('Reel production plan not found', 404, 'REEL_NOT_FOUND');
      }

      const animationService = getAnimationService();
      const animationPlan = await animationService.getLatestPlan(reelPlanId, workspaceId);
      if (!animationPlan) {
        throw new AppError('Animation plan not found for reel', 404, 'ANIMATION_PLAN_NOT_FOUND');
      }

      let productionPackage = await packageService.getPackageByReelPlanId(reelPlanId, workspaceId);
      if (!productionPackage) {
        productionPackage = await packageService.compilePackage(reelPlanId, workspaceId);
      }

      const brandDna = await dnaRepo.findLatestByBrandId(reelPlan.brandId);
      const contract = animationService.buildRenderContract({
        animationPlan,
        productionPackage,
        brandDna
      });

      return res.status(200).json({
        success: true,
        data: contract,
        meta: {
          requestId: (req as any).id || (req as any).requestId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  }
);
