import { Router, type Request, type Response } from 'express';
import { getDatabase, type PerformanceSnapshotRow } from '@vidsnapai/database';
import { Queue } from 'bullmq';
import { getRedisClient } from '../lib/redis.js';
import { requireAuth } from '../middleware/auth.js';
import { getVerifiedWorkspaceId } from '../middleware/workspace.js';
import {
  AnalyticsRepository,
  ExperimentationEngine
} from '@vidsnapai/video';
import {
  AnalyticsOverviewQuerySchema,
  AnalyticsSyncRequestSchema,
  OptimizationInsightQuerySchema,
  CreateExperimentSchema
} from '@vidsnapai/validation';

export const analyticsRouter = Router();

const ANALYTICS_SYNC_QUEUE_NAME = 'analytics-sync';
let analyticsQueue: Queue | null = null;

function getAnalyticsQueue(): Queue {
  if (!analyticsQueue) {
    const redis = getRedisClient();
    analyticsQueue = new Queue(ANALYTICS_SYNC_QUEUE_NAME, {
      connection: redis as unknown as { host?: string; port?: number }
    });
  }
  return analyticsQueue;
}

const db = getDatabase();
// Analytics routes are verified through getVerifiedWorkspaceId

async function resolveWorkspace(req: Request): Promise<string> {
  return getVerifiedWorkspaceId(req);
}

// All analytics routes require authentication
analyticsRouter.use(requireAuth);

/**
 * GET /api/analytics/meta/overview
 * Aggregate KPIs and performance summary across workspace/brand.
 */
analyticsRouter.get('/meta/overview', async (req: Request, res: Response) => {
  try {
    const workspaceId = await resolveWorkspace(req);
    const parseResult = AnalyticsOverviewQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parseResult.error.message } });
    }

    const { brandId, timeRange = '30D', platform = 'ALL', startDate, endDate } = parseResult.data;
    const analyticsRepo = new AnalyticsRepository(db);

    let start: Date | undefined;
    let end: Date | undefined;

    if (timeRange === '7D') {
      start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '14D') {
      start = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '30D') {
      start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '90D') {
      start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'CUSTOM' && startDate) {
      start = new Date(startDate);
      if (endDate) end = new Date(endDate);
    }

    const summary = await analyticsRepo.getOverviewSummary(workspaceId, brandId, {
      startDate: start,
      endDate: end,
      platform
    });

    let recentSnapshots: PerformanceSnapshotRow[] = [];
    if (brandId) {
      recentSnapshots = await analyticsRepo.findSnapshotsForBrand(brandId, workspaceId, {
        startDate: start,
        endDate: end,
        platform,
        limit: 50
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        summary,
        timeRange,
        platform,
        recentSnapshots
      }
    });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : err.message?.includes('Workspace ID') ? 400 : 500;
    return res.status(status).json({
      success: false,
      error: { code: 'ANALYTICS_OVERVIEW_FAILED', message: err.message || 'Failed to fetch overview analytics' }
    });
  }
});

/**
 * GET /api/analytics/meta/campaigns
 * List campaign-level snapshots.
 */
analyticsRouter.get('/meta/campaigns', async (req: Request, res: Response) => {
  try {
    const workspaceId = await resolveWorkspace(req);
    const brandId = req.query.brandId as string;
    const analyticsRepo = new AnalyticsRepository(db);

    const snapshots = brandId
      ? await analyticsRepo.findSnapshotsForBrand(brandId, workspaceId, { limit: 100 })
      : [];

    const campaigns = snapshots.filter((s) => s.externalCampaignId || s.marketingCampaignId);

    return res.status(200).json({
      success: true,
      data: campaigns
    });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      success: false,
      error: { code: 'CAMPAIGN_ANALYTICS_FAILED', message: err.message }
    });
  }
});

/**
 * GET /api/analytics/meta/adsets
 * List adset-level performance data.
 */
analyticsRouter.get('/meta/adsets', async (req: Request, res: Response) => {
  try {
    const workspaceId = await resolveWorkspace(req);
    const brandId = req.query.brandId as string;
    const analyticsRepo = new AnalyticsRepository(db);

    const snapshots = brandId
      ? await analyticsRepo.findSnapshotsForBrand(brandId, workspaceId, { limit: 100 })
      : [];

    const adsets = snapshots.filter((s) => s.externalAdSetId);

    return res.status(200).json({
      success: true,
      data: adsets
    });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      success: false,
      error: { code: 'ADSET_ANALYTICS_FAILED', message: err.message }
    });
  }
});

/**
 * GET /api/analytics/meta/ads
 * List ad-level performance data.
 */
analyticsRouter.get('/meta/ads', async (req: Request, res: Response) => {
  try {
    const workspaceId = await resolveWorkspace(req);
    const brandId = req.query.brandId as string;
    const analyticsRepo = new AnalyticsRepository(db);

    const snapshots = brandId
      ? await analyticsRepo.findSnapshotsForBrand(brandId, workspaceId, { limit: 100 })
      : [];

    const ads = snapshots.filter((s) => s.externalAdId);

    return res.status(200).json({
      success: true,
      data: ads
    });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      success: false,
      error: { code: 'AD_ANALYTICS_FAILED', message: err.message }
    });
  }
});

/**
 * GET /api/analytics/meta/reels/:reelId
 * Detailed performance and AI content performance analysis for a specific reel.
 */
analyticsRouter.get('/meta/reels/:reelId', async (req: Request, res: Response) => {
  try {
    const workspaceId = await resolveWorkspace(req);
    const reelId = req.params.reelId as string;
    const analyticsRepo = new AnalyticsRepository(db);

    const [snapshots, analysis] = await Promise.all([
      analyticsRepo.findSnapshotsForReel(reelId, workspaceId),
      analyticsRepo.findAnalysisForReel(reelId, workspaceId)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        reelId,
        latestSnapshot: snapshots[0] || null,
        history: snapshots,
        analysis
      }
    });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      success: false,
      error: { code: 'REEL_ANALYTICS_FAILED', message: err.message }
    });
  }
});

/**
 * POST /api/analytics/meta/sync
 * Triggers asynchronous background ingestion of Meta analytics.
 */
analyticsRouter.post('/meta/sync', async (req: Request, res: Response) => {
  try {
    const workspaceId = await resolveWorkspace(req);
    const parseResult = AnalyticsSyncRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parseResult.error.message } });
    }

    const { brandId, campaignId, reelId } = parseResult.data;
    const queue = getAnalyticsQueue();

    const job = await queue.add('analytics-sync-job', {
      id: `sync_${Date.now()}`,
      action: reelId ? 'SYNC_REEL' : campaignId ? 'SYNC_CAMPAIGN' : brandId ? 'SYNC_BRAND' : 'SYNC_WORKSPACE',
      workspaceId,
      brandId,
      campaignId,
      reelId,
      timestamp: Date.now()
    });

    return res.status(202).json({
      success: true,
      data: {
        jobId: job.id,
        status: 'QUEUED',
        message: 'Analytics synchronization job enqueued successfully'
      }
    });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      success: false,
      error: { code: 'SYNC_ENQUEUE_FAILED', message: err.message }
    });
  }
});

/**
 * POST /api/analytics/meta/sync/reel/:reelId
 * Enqueues reel-level sync.
 */
analyticsRouter.post('/meta/sync/reel/:reelId', async (req: Request, res: Response) => {
  try {
    const workspaceId = await resolveWorkspace(req);
    const reelId = req.params.reelId as string;
    const queue = getAnalyticsQueue();
    const job = await queue.add('analytics-sync-job', {
      id: `sync_reel_${Date.now()}`,
      action: 'SYNC_REEL',
      workspaceId,
      reelId,
      timestamp: Date.now()
    });

    return res.status(202).json({
      success: true,
      data: {
        jobId: job.id,
        status: 'QUEUED',
        message: `Analytics sync enqueued for Reel ${reelId}`
      }
    });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      success: false,
      error: { code: 'REEL_SYNC_ENQUEUE_FAILED', message: err.message }
    });
  }
});

/**
 * GET /api/analytics/insights
 * Returns actionable AI optimization recommendations.
 */
analyticsRouter.get('/insights', async (req: Request, res: Response) => {
  try {
    const workspaceId = await resolveWorkspace(req);
    const parseResult = OptimizationInsightQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parseResult.error.message } });
    }

    const { brandId, type, priority, status } = parseResult.data;
    const analyticsRepo = new AnalyticsRepository(db);

    const insights = await analyticsRepo.listInsights(workspaceId, brandId, {
      type,
      priority,
      status
    });

    return res.status(200).json({
      success: true,
      data: insights
    });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      success: false,
      error: { code: 'FETCH_INSIGHTS_FAILED', message: err.message }
    });
  }
});

/**
 * PATCH /api/analytics/insights/:id
 * Updates insight status (e.g. APPLIED, DISMISSED).
 */
analyticsRouter.patch('/insights/:id', async (req: Request, res: Response) => {
  try {
    const workspaceId = await resolveWorkspace(req);
    const id = req.params.id as string;
    const { status } = req.body;

    if (!['PENDING', 'APPLIED', 'DISMISSED'].includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status must be PENDING, APPLIED, or DISMISSED' } });
    }

    const analyticsRepo = new AnalyticsRepository(db);
    const updated = await analyticsRepo.updateInsightStatus(id, workspaceId, status);
    if (!updated) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Insight not found in this workspace' } });
    }

    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      success: false,
      error: { code: 'UPDATE_INSIGHT_FAILED', message: err.message }
    });
  }
});

/**
 * GET /api/analytics/learning
 * Returns learned patterns across the brand (winning hooks, angles, CTAs).
 */
analyticsRouter.get('/learning', async (req: Request, res: Response) => {
  try {
    const workspaceId = await resolveWorkspace(req);
    const brandId = req.query.brandId as string;
    const analyticsRepo = new AnalyticsRepository(db);

    const learnings = await analyticsRepo.listLearnings(workspaceId, brandId);

    return res.status(200).json({
      success: true,
      data: learnings
    });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      success: false,
      error: { code: 'FETCH_LEARNING_FAILED', message: err.message }
    });
  }
});

/**
 * GET /api/analytics/experiments
 * List A/B experiments.
 */
analyticsRouter.get('/experiments', async (req: Request, res: Response) => {
  try {
    const workspaceId = await resolveWorkspace(req);
    const brandId = req.query.brandId as string;
    const analyticsRepo = new AnalyticsRepository(db);

    const list = await analyticsRepo.listExperiments(workspaceId, brandId);

    return res.status(200).json({
      success: true,
      data: list
    });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      success: false,
      error: { code: 'FETCH_EXPERIMENTS_FAILED', message: err.message }
    });
  }
});

/**
 * POST /api/analytics/experiments
 * Create a new A/B experiment.
 */
analyticsRouter.post('/experiments', async (req: Request, res: Response) => {
  try {
    const workspaceId = await resolveWorkspace(req);
    const parseResult = CreateExperimentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parseResult.error.message } });
    }

    const analyticsRepo = new AnalyticsRepository(db);
    const created = await analyticsRepo.createExperiment({
      workspaceId,
      brandId: parseResult.data.brandId,
      name: parseResult.data.name,
      experimentType: parseResult.data.experimentType,
      status: 'DRAFT',
      variantA: parseResult.data.variantA,
      variantB: parseResult.data.variantB,
      targetMetric: parseResult.data.targetMetric,
      sampleSizeA: parseResult.data.variantA.impressions || 0,
      sampleSizeB: parseResult.data.variantB.impressions || 0
    });

    return res.status(201).json({
      success: true,
      data: created
    });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      success: false,
      error: { code: 'CREATE_EXPERIMENT_FAILED', message: err.message }
    });
  }
});

/**
 * POST /api/analytics/experiments/:id/evaluate
 * Evaluates an experiment with statistical confidence.
 */
analyticsRouter.post('/experiments/:id/evaluate', async (req: Request, res: Response) => {
  try {
    const workspaceId = await resolveWorkspace(req);
    const id = req.params.id as string;
    const analyticsRepo = new AnalyticsRepository(db);
    const experiment = await analyticsRepo.findExperimentById(id, workspaceId);

    if (!experiment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Experiment not found in this workspace' } });
    }

    const engine = new ExperimentationEngine();
    const evaluation = engine.evaluate(experiment as any);

    const updated = await analyticsRepo.updateExperiment(id, workspaceId, {
      status: evaluation.status,
      sampleSizeA: evaluation.sampleSizeA,
      sampleSizeB: evaluation.sampleSizeB,
      confidenceScore: evaluation.confidenceScore,
      winningVariant: evaluation.winningVariant,
      resultSummary: evaluation.resultSummary,
      endedAt: evaluation.status === 'COMPLETED' ? new Date() : undefined
    });

    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err: any) {
    const status = err.message?.includes('Access denied') ? 403 : 500;
    return res.status(status).json({
      success: false,
      error: { code: 'EVALUATE_EXPERIMENT_FAILED', message: err.message }
    });
  }
});
