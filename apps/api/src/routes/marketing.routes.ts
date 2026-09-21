import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireBrandAccess } from '../middleware/brand-access.js';
import { requireCampaignAccess } from '../middleware/campaign-access.js';
import { getDatabase } from '@vidsnapai/database';
import { createAIProvider } from '@vidsnapai/ai';
import { getConfig } from '@vidsnapai/config';
import { MarketingBrainService, CampaignService } from '@vidsnapai/campaign';
import { CampaignAutomationService } from '@vidsnapai/video';
import { QueueService } from '../services/queue.service.js';
import {
  GenerateMarketingStrategySchema,
  UpdateMarketingStrategySchema,
  CreateCampaignSchema,
  UpdateCampaignSchema,
  GenerateCampaignStrategySchema
} from '@vidsnapai/validation';
import { AppError } from '../middleware/error-handler.js';

export const marketingRouter = Router({ mergeParams: true });

const db = getDatabase();
const config = getConfig();
const aiProvider = createAIProvider({ apiKey: config.GEMINI_API_KEY });

const marketingBrainService = new MarketingBrainService(db, aiProvider);
const campaignService = new CampaignService(db, aiProvider);

// ==========================================
// Marketing Strategy Routes
// ==========================================

// POST /api/brands/:brandId/marketing/strategy/generate
marketingRouter.post(
  '/marketing/strategy/generate',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = GenerateMarketingStrategySchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const brand = req.brand!;
      const strategy = await marketingBrainService.generateStrategy(brand.id, brand.workspaceId, parsed.data);

      res.status(201).json({
        success: true,
        data: strategy,
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

// GET /api/brands/:brandId/marketing/strategy (Latest Strategy)
marketingRouter.get(
  '/marketing/strategy',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const strategy = await marketingBrainService.getLatestStrategy(brand.id, brand.workspaceId);

      res.json({
        success: true,
        data: strategy,
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

// GET /api/brands/:brandId/marketing/strategy/history
marketingRouter.get(
  '/marketing/strategy/history',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const history = await marketingBrainService.getStrategyHistory(brand.id, brand.workspaceId);

      res.json({
        success: true,
        data: history,
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

// PATCH /api/brands/:brandId/marketing/strategy
marketingRouter.patch(
  '/marketing/strategy',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = UpdateMarketingStrategySchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const brand = req.brand!;
      const updated = await marketingBrainService.updateStrategy(brand.id, brand.workspaceId, parsed.data);

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

// ==========================================
// Campaign Routes
// ==========================================

// POST /api/brands/:brandId/campaigns
marketingRouter.post(
  '/campaigns',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CreateCampaignSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const brand = req.brand!;
      const campaign = await campaignService.createCampaign(brand.id, brand.workspaceId, parsed.data);

      res.status(201).json({
        success: true,
        data: campaign,
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

// GET /api/brands/:brandId/campaigns
marketingRouter.get(
  '/campaigns',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const campaignList = await campaignService.listCampaigns(brand.id, brand.workspaceId);

      res.json({
        success: true,
        data: campaignList,
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

// GET /api/brands/:brandId/campaigns/:campaignId
marketingRouter.get(
  '/campaigns/:campaignId',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']),
  requireCampaignAccess(['OWNER', 'ADMIN', 'MEMBER']),
  async (req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: req.campaign,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    });
  }
);

// PATCH /api/brands/:brandId/campaigns/:campaignId
marketingRouter.patch(
  '/campaigns/:campaignId',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  requireCampaignAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = UpdateCampaignSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const brand = req.brand!;
      const campaign = req.campaign!;
      const updated = await campaignService.updateCampaign(campaign.id, brand.id, brand.workspaceId, parsed.data);

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

// DELETE /api/brands/:brandId/campaigns/:campaignId
marketingRouter.delete(
  '/campaigns/:campaignId',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  requireCampaignAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const campaign = req.campaign!;
      const deleted = await campaignService.deleteCampaign(campaign.id, brand.id, brand.workspaceId);

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

// POST /api/brands/:brandId/campaigns/:campaignId/generate-strategy
marketingRouter.post(
  '/campaigns/:campaignId/generate-strategy',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  requireCampaignAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = GenerateCampaignStrategySchema.safeParse(req.body || {});
      if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }

      const brand = req.brand!;
      const campaign = req.campaign!;
      const updatedCampaign = await campaignService.generateCampaignStrategy(
        campaign.id,
        brand.id,
        brand.workspaceId,
        parsed.data
      );

      res.json({
        success: true,
        data: updatedCampaign,
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

// POST /api/brands/:brandId/campaigns/:campaignId/generate - Bulk generate/render all planned campaign reels
marketingRouter.post(
  '/campaigns/:campaignId/generate',
  requireAuth,
  requireBrandAccess(['OWNER', 'ADMIN']),
  requireCampaignAccess(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = req.brand!;
      const campaign = req.campaign!;
      const { autoApprove = false, async: isAsync = true } = req.body || {};

      if (isAsync) {
        const queueService = new QueueService();
        const jobId = `bulk_camp_${campaign.id}_${Date.now()}`;
        await queueService.enqueueBulkCampaignProductionJob({
          id: jobId,
          action: 'GENERATE_CAMPAIGN_REELS',
          campaignId: campaign.id,
          contentPlanId: '',
          workspaceId: brand.workspaceId,
          brandId: brand.id,
          autoApprove,
          timestamp: Date.now()
        });

        res.status(202).json({
          success: true,
          data: {
            jobId,
            campaignId: campaign.id,
            status: 'QUEUED',
            message: 'Bulk campaign reel production queued successfully.'
          },
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const automationService = new CampaignAutomationService(db);
      const result = await automationService.produceCampaignReels({
        campaignId: campaign.id,
        workspaceId: brand.workspaceId,
        autoApprove
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

