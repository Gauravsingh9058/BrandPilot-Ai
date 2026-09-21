import { Router, type Request, type Response, type NextFunction } from 'express';
import { getDatabase } from '@vidsnapai/database';
import { MetaAdsService } from '@vidsnapai/video';
import { WorkspaceRepository } from '@vidsnapai/database';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';
import {
  MetaSelectAccountSchema,
  CreateMetaCampaignSchema,
  CreateMetaAdSetSchema,
  PrepareMetaAdCreativeSchema,
  PublishMetaAdSchema
} from '@vidsnapai/validation';

export const metaAdsRouter = Router();
export const reelMetaAdsRouter = Router();

const db = getDatabase();
const metaService = new MetaAdsService(db);
const workspaceRepo = new WorkspaceRepository(db);

/**
 * Helper to resolve active workspace and verify user membership.
 */
async function resolveWorkspace(req: Request): Promise<string> {
  const wsHeader = req.headers['x-workspace-id'];
  let workspaceId = Array.isArray(wsHeader) ? wsHeader[0] : wsHeader;

  if (!workspaceId && req.user?.id) {
    const userWorkspaces = await workspaceRepo.listForUser(req.user.id);
    if (userWorkspaces.length > 0) {
      workspaceId = userWorkspaces[0].id;
    }
  }

  if (!workspaceId) {
    throw new AppError('Active workspace ID could not be determined', 400, 'WORKSPACE_REQUIRED');
  }

  const role = await workspaceRepo.getUserRole(workspaceId, req.user!.id);
  if (!role) {
    throw new AppError('Access denied: You do not belong to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
  }

  return workspaceId;
}

// ==========================================
// Meta OAuth & Connection Management Routes
// ==========================================

// GET /api/meta/auth/url
metaAdsRouter.get(
  '/auth/url',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await resolveWorkspace(req);
      const redirectUri = typeof req.query.redirectUri === 'string' ? req.query.redirectUri : undefined;
      const url = metaService.getOAuthUrl(workspaceId, redirectUri);

      res.json({
        success: true,
        data: { url },
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

// POST /api/meta/auth/callback
metaAdsRouter.post(
  '/auth/callback',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await resolveWorkspace(req);
      const { code, redirectUri } = req.body || {};

      if (!code || typeof code !== 'string') {
        throw new AppError('OAuth authorization code is required', 400, 'VALIDATION_ERROR');
      }

      const connection = await metaService.handleOAuthCallback({
        workspaceId,
        code,
        redirectUri
      });

      res.status(200).json({
        success: true,
        data: connection,
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

// GET /api/meta/connection
metaAdsRouter.get(
  '/connection',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await resolveWorkspace(req);
      const connection = await metaService.getConnection(workspaceId);

      res.json({
        success: true,
        data: connection,
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

// POST /api/meta/connection/select-account
metaAdsRouter.post(
  '/connection/select-account',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await resolveWorkspace(req);
      const parsed = MetaSelectAccountSchema.safeParse(req.body);

      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(msg, 400, 'VALIDATION_ERROR');
      }

      const updated = await metaService.selectAdAccount({
        workspaceId,
        adAccountId: parsed.data.adAccountId,
        pageId: parsed.data.pageId,
        instagramActorId: parsed.data.instagramActorId
      });

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

// DELETE /api/meta/connection
metaAdsRouter.delete(
  '/connection',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await resolveWorkspace(req);
      const disconnected = await metaService.disconnect(workspaceId);

      res.json({
        success: true,
        data: { disconnected },
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

// GET /api/meta/ad-accounts
metaAdsRouter.get(
  '/ad-accounts',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await resolveWorkspace(req);
      const connection = await metaService.getConnection(workspaceId);

      if (!connection) {
        throw new AppError('Meta Ads integration is not connected for this workspace', 404, 'NOT_CONNECTED');
      }

      res.json({
        success: true,
        data: {
          adAccounts: connection.adAccounts,
          pages: connection.pages,
          selectedAdAccountId: connection.selectedAdAccountId,
          selectedPageId: connection.selectedPageId,
          selectedInstagramActorId: connection.selectedInstagramActorId
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

// POST /api/meta/campaigns
metaAdsRouter.post(
  '/campaigns',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await resolveWorkspace(req);
      const parsed = CreateMetaCampaignSchema.safeParse(req.body);

      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(msg, 400, 'VALIDATION_ERROR');
      }

      const metaRepo = new (await import('@vidsnapai/video')).MetaAdsRepository(db);
      const metaClient = new (await import('@vidsnapai/video')).MetaApiClient();
      const connection = await metaRepo.findConnection(workspaceId);

      const accessToken = connection?.accessToken || process.env.META_ACCESS_TOKEN || 'mock_token';
      const metaResult = await metaClient.createCampaign(
        parsed.data.metaAdAccountId,
        {
          name: parsed.data.name,
          objective: parsed.data.objective,
          status: parsed.data.status,
          daily_budget: parsed.data.dailyBudget,
          lifetime_budget: parsed.data.lifetimeBudget,
          special_ad_categories: parsed.data.specialAdCategories
        },
        accessToken
      );

      const campaign = await metaRepo.createCampaign({
        workspaceId,
        brandId: parsed.data.brandId,
        campaignId: parsed.data.campaignId,
        metaAdAccountId: parsed.data.metaAdAccountId,
        externalCampaignId: metaResult.id,
        name: parsed.data.name,
        objective: parsed.data.objective,
        buyingType: parsed.data.buyingType,
        status: parsed.data.status,
        dailyBudget: parsed.data.dailyBudget,
        lifetimeBudget: parsed.data.lifetimeBudget,
        specialAdCategories: parsed.data.specialAdCategories
      });

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

// GET /api/meta/campaigns
metaAdsRouter.get(
  '/campaigns',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await resolveWorkspace(req);
      const brandId = typeof req.query.brandId === 'string' ? req.query.brandId : undefined;

      const metaRepo = new (await import('@vidsnapai/video')).MetaAdsRepository(db);
      const campaigns = await metaRepo.listCampaigns(workspaceId, brandId);

      res.json({
        success: true,
        data: campaigns,
        meta: {
          total: campaigns.length,
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/meta/campaigns/:id/ad-sets
metaAdsRouter.post(
  '/campaigns/:id/ad-sets',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await resolveWorkspace(req);
      const rawId = req.params.id;
      const campaignId = Array.isArray(rawId) ? rawId[0] : rawId;

      const metaRepo = new (await import('@vidsnapai/video')).MetaAdsRepository(db);
      const campaign = await metaRepo.findCampaignById(campaignId, workspaceId);

      if (!campaign) {
        throw new AppError('Meta Campaign not found in this workspace', 404, 'CAMPAIGN_NOT_FOUND');
      }

      const parsed = CreateMetaAdSetSchema.safeParse({ ...req.body, metaAdCampaignId: campaign.id });
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(msg, 400, 'VALIDATION_ERROR');
      }

      const metaClient = new (await import('@vidsnapai/video')).MetaApiClient();
      const connection = await metaRepo.findConnection(workspaceId);
      const accessToken = connection?.accessToken || process.env.META_ACCESS_TOKEN || 'mock_token';

      const metaResult = await metaClient.createAdSet(
        campaign.metaAdAccountId,
        {
          name: parsed.data.name,
          campaign_id: campaign.externalCampaignId,
          status: parsed.data.status,
          billing_event: parsed.data.billingEvent,
          optimization_goal: parsed.data.optimizationGoal,
          daily_budget: parsed.data.dailyBudget,
          lifetime_budget: parsed.data.lifetimeBudget,
          targeting: parsed.data.targeting
        },
        accessToken
      );

      const adSet = await metaRepo.createAdSet({
        workspaceId,
        metaAdCampaignId: campaign.id,
        externalAdSetId: metaResult.id,
        name: parsed.data.name,
        status: parsed.data.status,
        billingEvent: parsed.data.billingEvent,
        optimizationGoal: parsed.data.optimizationGoal,
        dailyBudget: parsed.data.dailyBudget,
        lifetimeBudget: parsed.data.lifetimeBudget,
        targeting: parsed.data.targeting
      });

      res.status(201).json({
        success: true,
        data: adSet,
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
// Reel Meta Ads Endpoints (/api/reels/:id/meta-ads/...)
// ==========================================

// POST /api/reels/:id/meta-ads/prepare
reelMetaAdsRouter.post(
  '/:id/meta-ads/prepare',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawId = req.params.id;
      const reelId = Array.isArray(rawId) ? rawId[0] : rawId;
      const workspaceId = await resolveWorkspace(req);

      const reelRepo = new (await import('@vidsnapai/video')).ReelProductionPlanRepository(db);
      const reel = await reelRepo.findByIdAndWorkspace(reelId, workspaceId);

      if (!reel) {
        throw new AppError('Reel production plan not found in workspace', 404, 'REEL_PLAN_NOT_FOUND');
      }

      const parsed = PrepareMetaAdCreativeSchema.safeParse(req.body || {});
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(msg, 400, 'VALIDATION_ERROR');
      }

      const creative = await metaService.prepareReelForAds({
        reelPlanId: reel.id,
        workspaceId: reel.workspaceId,
        brandId: reel.brandId,
        title: parsed.data.title,
        body: parsed.data.body,
        callToActionType: parsed.data.callToActionType,
        destinationUrl: parsed.data.destinationUrl,
        linkCaption: parsed.data.linkCaption
      });

      res.status(200).json({
        success: true,
        data: creative,
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

// POST /api/reels/:id/meta-ads/publish
reelMetaAdsRouter.post(
  '/:id/meta-ads/publish',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawId = req.params.id;
      const reelId = Array.isArray(rawId) ? rawId[0] : rawId;
      const workspaceId = await resolveWorkspace(req);

      const reelRepo = new (await import('@vidsnapai/video')).ReelProductionPlanRepository(db);
      const reel = await reelRepo.findByIdAndWorkspace(reelId, workspaceId);

      if (!reel) {
        throw new AppError('Reel production plan not found in workspace', 404, 'REEL_PLAN_NOT_FOUND');
      }

      const parsed = PublishMetaAdSchema.safeParse(req.body || {});
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(msg, 400, 'VALIDATION_ERROR');
      }

      const result = await metaService.publishToMeta({
        reelPlanId: reel.id,
        workspaceId: reel.workspaceId,
        brandId: reel.brandId,
        campaignId: parsed.data.campaignId,
        metaAdAccountId: parsed.data.metaAdAccountId,
        metaCampaignName: parsed.data.metaCampaignName,
        metaCampaignObjective: parsed.data.metaCampaignObjective,
        dailyBudget: parsed.data.dailyBudget,
        lifetimeBudget: parsed.data.lifetimeBudget,
        metaAdSetName: parsed.data.metaAdSetName,
        targeting: parsed.data.targeting,
        primaryText: parsed.data.primaryText,
        headline: parsed.data.headline,
        callToActionType: parsed.data.callToActionType,
        destinationUrl: parsed.data.destinationUrl,
        idempotencyKey: parsed.data.idempotencyKey
      });

      res.status(result.success ? 200 : 400).json({
        success: result.success,
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

// GET /api/reels/:id/meta-ads/status
reelMetaAdsRouter.get(
  '/:id/meta-ads/status',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawId = req.params.id;
      const reelId = Array.isArray(rawId) ? rawId[0] : rawId;
      const workspaceId = await resolveWorkspace(req);

      const publications = await metaService.getPublications(reelId, workspaceId);

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
