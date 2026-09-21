import { type Job } from 'bullmq';
import { getDatabase } from '@vidsnapai/database';
import { createAIProvider } from '@vidsnapai/ai';
import { getConfig } from '@vidsnapai/config';
import {
  MetaAdsRepository,
  MetaApiClient,
  AnalyticsRepository,
  ContentPerformanceAnalyzer,
  OptimizationIntelligenceService,
  ReelProductionPlanRepository,
  normalizeMetaInsights
} from '@vidsnapai/video';
import { BrandRepository } from '@vidsnapai/brand';
import type {
  AnalyticsSyncJobPayload,
  AnalyticsSyncJobResult,
  MetaAdPublicationRecord,
  ContentPerformanceAnalysisRecord
} from '@vidsnapai/types';

export async function processAnalyticsSyncJob(
  job: Job<AnalyticsSyncJobPayload>
): Promise<AnalyticsSyncJobResult> {
  const { id: jobId, action, workspaceId, brandId, campaignId, reelId } = job.data;

  console.log(`[AnalyticsSyncProcessor] Starting job ${job.id} for workspace ${workspaceId} (Action: ${action})`);

  const db = getDatabase();
  const metaRepo = new MetaAdsRepository(db);
  const analyticsRepo = new AnalyticsRepository(db);
  const reelRepo = new ReelProductionPlanRepository(db);
  const brandRepo = new BrandRepository(db);
  const metaClient = new MetaApiClient();

  const config = getConfig();
  const aiProvider = createAIProvider({
    apiKey: config.GEMINI_API_KEY
  });

  const optService = new OptimizationIntelligenceService(aiProvider, analyticsRepo);
  const contentAnalyzer = new ContentPerformanceAnalyzer();

  let snapshotsIngested = 0;
  let analysesComputed = 0;
  let insightsGenerated = 0;

  try {
    // 1. Fetch active Meta connection for the workspace
    const connection = await metaRepo.findConnection(workspaceId);
    if (!connection || !connection.accessToken) {
      console.log(`[AnalyticsSyncProcessor] No active Meta connection found for workspace ${workspaceId}.`);
      return {
        jobId: job.id || jobId,
        workspaceId,
        brandId,
        status: 'completed',
        snapshotsIngested: 0,
        analysesComputed: 0,
        insightsGenerated: 0,
        processedAt: new Date().toISOString()
      };
    }

    const accessToken = connection.accessToken;

    // 2. Fetch publications in the workspace/brand
    const publications: MetaAdPublicationRecord[] = brandId
      ? await metaRepo.listPublicationsForBrand(brandId, workspaceId)
      : await metaRepo.listPublicationsForWorkspace(workspaceId);

    // Filter publications if campaignId or reelId specified
    const targetPubs = publications.filter((p: MetaAdPublicationRecord) => {
      if (reelId && p.reelPlanId !== reelId) return false;
      if (campaignId && p.metaCampaignId !== campaignId) return false;
      return true;
    });

    for (const pub of targetPubs) {
      if (!pub.metaAdId && !pub.metaCampaignId) continue;

      try {
        let rawInsights: Record<string, unknown> | null = null;
        if (pub.metaAdId) {
          rawInsights = await metaClient.getAdInsights(pub.metaAdId, accessToken);
        } else if (pub.metaCampaignId) {
          rawInsights = await metaClient.getCampaignInsights(pub.metaCampaignId, accessToken);
        }

        if (rawInsights) {
          const normalized = normalizeMetaInsights(rawInsights);

          // Save performance snapshot
          await analyticsRepo.createSnapshot({
            workspaceId,
            brandId: pub.brandId,
            marketingCampaignId: pub.metaCampaignId,
            reelId: pub.reelPlanId,
            publicationId: pub.id,
            platform: 'META',
            externalCampaignId: pub.metaCampaignId,
            externalAdSetId: pub.metaAdSetId,
            externalAdId: pub.metaAdId,
            impressions: normalized.impressions,
            reach: normalized.reach,
            videoViews: normalized.videoViews,
            videoViews3s: normalized.videoViews3s,
            videoViewsThruplay: normalized.videoViewsThruplay,
            watchTimeSeconds: normalized.watchTimeSeconds,
            averageWatchTimeSeconds: normalized.averageWatchTimeSeconds,
            completionRate: normalized.completionRate,
            likes: normalized.likes,
            comments: normalized.comments,
            shares: normalized.shares,
            saves: normalized.saves,
            clicks: normalized.clicks,
            linkClicks: normalized.linkClicks,
            ctr: normalized.ctr,
            cpc: normalized.cpc,
            cpm: normalized.cpm,
            spend: normalized.spend,
            conversions: normalized.conversions,
            conversionValue: normalized.conversionValue,
            purchases: normalized.purchases,
            revenue: normalized.revenue,
            rawPayload: rawInsights
          });
          snapshotsIngested++;

          // Save point-in-time metric history
          await analyticsRepo.createMetricHistory({
            workspaceId,
            brandId: pub.brandId,
            reelId: pub.reelPlanId,
            externalCampaignId: pub.metaCampaignId,
            externalAdSetId: pub.metaAdSetId,
            externalAdId: pub.metaAdId,
            platform: 'META',
            metricPayload: rawInsights
          });

          // Run Content Performance Analyzer if reel exists
          if (pub.reelPlanId) {
            const reel = await reelRepo.findByIdAndWorkspace(pub.reelPlanId, workspaceId);
            if (reel) {
              const analysis = contentAnalyzer.analyze({
                workspaceId,
                brandId: pub.brandId,
                reelPlan: reel,
                metrics: normalized
              });
              await analyticsRepo.upsertContentPerformanceAnalysis(analysis as any);
              analysesComputed++;
            }
          }
        }
      } catch (pubErr: any) {
        console.error(`[AnalyticsSyncProcessor] Ingestion failed for publication ${pub.id}:`, pubErr.message);
      }
    }

    // 3. Generate AI Optimization Insights if brand is present
    if (brandId) {
      const brand = await brandRepo.findByIdAndWorkspace(brandId, workspaceId);
      if (brand) {
        const [analysesRows, snapshotRows] = await Promise.all([
          analyticsRepo.listAnalysesForBrand(brandId, workspaceId),
          analyticsRepo.findSnapshotsForBrand(brandId, workspaceId)
        ]);

        const analyses: ContentPerformanceAnalysisRecord[] = analysesRows.map((r: any) => ({
          ...r,
          performanceTier: r.performanceTier,
          strengths: (r.strengths as string[]) || [],
          weaknesses: (r.weaknesses as string[]) || [],
          detectedPatterns: (r.detectedPatterns as Record<string, unknown>) || {},
          metricSummary: (r.metricSummary as any) || {}
        }));

        if (analyses.length > 0 || snapshotRows.length > 0) {
          const optOutput = await optService.generateOptimizationIntelligence({
            workspaceId,
            brandId,
            brand,
            analyses,
            snapshots: snapshotRows as any
          });
          insightsGenerated += optOutput.recommendations.length;
        }
      }
    }

    console.log(
      `[AnalyticsSyncProcessor] Completed sync for workspace ${workspaceId}: ${snapshotsIngested} snapshots, ${analysesComputed} analyses, ${insightsGenerated} insights.`
    );

    return {
      jobId: job.id || jobId,
      workspaceId,
      brandId,
      status: 'completed',
      snapshotsIngested,
      analysesComputed,
      insightsGenerated,
      processedAt: new Date().toISOString()
    };
  } catch (err: any) {
    console.error(`[AnalyticsSyncProcessor] Error executing sync job:`, err.message);
    return {
      jobId: job.id || jobId,
      workspaceId,
      brandId,
      status: 'failed',
      snapshotsIngested,
      analysesComputed,
      insightsGenerated,
      processedAt: new Date().toISOString(),
      error: err.message
    };
  }
}
