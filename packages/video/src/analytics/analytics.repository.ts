import { eq, and, desc, gte, lte } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import {
  performanceSnapshots,
  performanceMetricHistory,
  contentPerformanceAnalysis,
  optimizationInsights,
  optimizationLearning,
  experiments,
  type PerformanceSnapshotRow,
  type NewPerformanceSnapshotRow,
  type PerformanceMetricHistoryRow,
  type NewPerformanceMetricHistoryRow,
  type ContentPerformanceAnalysisRow,
  type NewContentPerformanceAnalysisRow,
  type OptimizationInsightRow,
  type NewOptimizationInsightRow,
  type OptimizationLearningRow,
  type NewOptimizationLearningRow,
  type ExperimentRow,
  type NewExperimentRow
} from '@vidsnapai/database';
import type { AnalyticsOverviewSummary } from '@vidsnapai/types';

export class AnalyticsRepository {
  constructor(private db: Database) {}

  // ==========================================
  // Performance Snapshots
  // ==========================================

  async createSnapshot(snapshot: NewPerformanceSnapshotRow): Promise<PerformanceSnapshotRow> {
    const [inserted] = await this.db
      .insert(performanceSnapshots)
      .values(snapshot)
      .returning();
    return inserted;
  }

  async findSnapshotById(id: string, workspaceId: string): Promise<PerformanceSnapshotRow | null> {
    const [found] = await this.db
      .select()
      .from(performanceSnapshots)
      .where(
        and(
          eq(performanceSnapshots.id, id),
          eq(performanceSnapshots.workspaceId, workspaceId)
        )
      );
    return found || null;
  }

  async findSnapshotsForBrand(
    brandId: string,
    workspaceId: string,
    options?: {
      platform?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<PerformanceSnapshotRow[]> {
    const conditions = [
      eq(performanceSnapshots.brandId, brandId),
      eq(performanceSnapshots.workspaceId, workspaceId)
    ];

    if (options?.platform && options.platform !== 'ALL') {
      conditions.push(eq(performanceSnapshots.platform, options.platform));
    }
    if (options?.startDate) {
      conditions.push(gte(performanceSnapshots.collectedAt, options.startDate));
    }
    if (options?.endDate) {
      conditions.push(lte(performanceSnapshots.collectedAt, options.endDate));
    }

    return this.db
      .select()
      .from(performanceSnapshots)
      .where(and(...conditions))
      .orderBy(desc(performanceSnapshots.collectedAt))
      .limit(options?.limit || 100);
  }

  async findSnapshotsForReel(reelId: string, workspaceId: string): Promise<PerformanceSnapshotRow[]> {
    return this.db
      .select()
      .from(performanceSnapshots)
      .where(
        and(
          eq(performanceSnapshots.reelId, reelId),
          eq(performanceSnapshots.workspaceId, workspaceId)
        )
      )
      .orderBy(desc(performanceSnapshots.collectedAt));
  }

  async findSnapshotsForCampaign(campaignId: string, workspaceId: string): Promise<PerformanceSnapshotRow[]> {
    return this.db
      .select()
      .from(performanceSnapshots)
      .where(
        and(
          eq(performanceSnapshots.marketingCampaignId, campaignId),
          eq(performanceSnapshots.workspaceId, workspaceId)
        )
      )
      .orderBy(desc(performanceSnapshots.collectedAt));
  }

  async getOverviewSummary(
    workspaceId: string,
    brandId?: string,
    options?: { startDate?: Date; endDate?: Date; platform?: string }
  ): Promise<AnalyticsOverviewSummary> {
    const conditions = [eq(performanceSnapshots.workspaceId, workspaceId)];
    if (brandId) {
      conditions.push(eq(performanceSnapshots.brandId, brandId));
    }
    if (options?.platform && options.platform !== 'ALL') {
      conditions.push(eq(performanceSnapshots.platform, options.platform));
    }
    if (options?.startDate) {
      conditions.push(gte(performanceSnapshots.collectedAt, options.startDate));
    }
    if (options?.endDate) {
      conditions.push(lte(performanceSnapshots.collectedAt, options.endDate));
    }

    const rows = await this.db
      .select()
      .from(performanceSnapshots)
      .where(and(...conditions))
      .orderBy(desc(performanceSnapshots.collectedAt));

    if (rows.length === 0) {
      return {
        totalSpend: null,
        totalReach: null,
        totalImpressions: null,
        totalVideoViews: null,
        averageEngagementRate: null,
        averageCtr: null,
        totalConversions: null,
        totalRevenue: null,
        overallRoas: null,
        snapshotCount: 0,
        lastSyncedAt: null
      };
    }

    let totalSpend = 0;
    let totalReach = 0;
    let totalImpressions = 0;
    let totalVideoViews = 0;
    let totalClicks = 0;
    let totalEngagements = 0;
    let totalConversions = 0;
    let totalRevenue = 0;

    let hasSpend = false;
    let hasReach = false;
    let hasImpressions = false;
    let hasVideoViews = false;
    let hasClicks = false;
    let hasEngagements = false;
    let hasConversions = false;
    let hasRevenue = false;

    for (const r of rows) {
      if (r.spend !== null && r.spend !== undefined) {
        totalSpend += r.spend;
        hasSpend = true;
      }
      if (r.reach !== null && r.reach !== undefined) {
        totalReach += r.reach;
        hasReach = true;
      }
      if (r.impressions !== null && r.impressions !== undefined) {
        totalImpressions += r.impressions;
        hasImpressions = true;
      }
      if (r.videoViews !== null && r.videoViews !== undefined) {
        totalVideoViews += r.videoViews;
        hasVideoViews = true;
      }
      if (r.clicks !== null && r.clicks !== undefined) {
        totalClicks += r.clicks;
        hasClicks = true;
      }
      if (r.conversions !== null && r.conversions !== undefined) {
        totalConversions += r.conversions;
        hasConversions = true;
      }
      if (r.revenue !== null && r.revenue !== undefined) {
        totalRevenue += r.revenue;
        hasRevenue = true;
      }
      const eng = (r.likes || 0) + (r.comments || 0) + (r.shares || 0) + (r.saves || 0) + (r.clicks || 0);
      if (eng > 0) {
        totalEngagements += eng;
        hasEngagements = true;
      }
    }

    const averageCtr = hasClicks && hasImpressions && totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : null;
    const averageEngagementRate = hasEngagements && hasReach && totalReach > 0 ? Number(((totalEngagements / totalReach) * 100).toFixed(2)) : null;
    const overallRoas = hasRevenue && hasSpend && totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : null;

    return {
      totalSpend: hasSpend ? Number(totalSpend.toFixed(2)) : null,
      totalReach: hasReach ? totalReach : null,
      totalImpressions: hasImpressions ? totalImpressions : null,
      totalVideoViews: hasVideoViews ? totalVideoViews : null,
      averageEngagementRate,
      averageCtr,
      totalConversions: hasConversions ? totalConversions : null,
      totalRevenue: hasRevenue ? Number(totalRevenue.toFixed(2)) : null,
      overallRoas,
      snapshotCount: rows.length,
      lastSyncedAt: rows[0]?.collectedAt ? rows[0].collectedAt.toISOString() : null
    };
  }

  // ==========================================
  // Metric History
  // ==========================================

  async createMetricHistory(history: NewPerformanceMetricHistoryRow): Promise<PerformanceMetricHistoryRow> {
    const [inserted] = await this.db
      .insert(performanceMetricHistory)
      .values(history)
      .returning();
    return inserted;
  }

  async listMetricHistory(
    workspaceId: string,
    brandId: string,
    reelId?: string
  ): Promise<PerformanceMetricHistoryRow[]> {
    const conditions = [
      eq(performanceMetricHistory.workspaceId, workspaceId),
      eq(performanceMetricHistory.brandId, brandId)
    ];
    if (reelId) {
      conditions.push(eq(performanceMetricHistory.reelId, reelId));
    }
    return this.db
      .select()
      .from(performanceMetricHistory)
      .where(and(...conditions))
      .orderBy(desc(performanceMetricHistory.timestamp))
      .limit(100);
  }

  // ==========================================
  // Content Performance Analysis
  // ==========================================

  async upsertContentPerformanceAnalysis(
    analysis: NewContentPerformanceAnalysisRow
  ): Promise<ContentPerformanceAnalysisRow> {
    const existing = await this.findAnalysisForReel(analysis.reelId, analysis.workspaceId);
    if (existing) {
      const [updated] = await this.db
        .update(contentPerformanceAnalysis)
        .set({
          performanceTier: analysis.performanceTier,
          hookScore: analysis.hookScore,
          retentionScore: analysis.retentionScore,
          engagementScore: analysis.engagementScore,
          conversionScore: analysis.conversionScore,
          overallScore: analysis.overallScore,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          detectedPatterns: analysis.detectedPatterns,
          metricSummary: analysis.metricSummary,
          analyzedAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(contentPerformanceAnalysis.id, existing.id),
            eq(contentPerformanceAnalysis.workspaceId, analysis.workspaceId)
          )
        )
        .returning();
      return updated;
    }

    const [inserted] = await this.db
      .insert(contentPerformanceAnalysis)
      .values(analysis)
      .returning();
    return inserted;
  }

  async findAnalysisForReel(reelId: string, workspaceId: string): Promise<ContentPerformanceAnalysisRow | null> {
    const [found] = await this.db
      .select()
      .from(contentPerformanceAnalysis)
      .where(
        and(
          eq(contentPerformanceAnalysis.reelId, reelId),
          eq(contentPerformanceAnalysis.workspaceId, workspaceId)
        )
      );
    return found || null;
  }

  async listAnalysesForBrand(
    brandId: string,
    workspaceId: string
  ): Promise<ContentPerformanceAnalysisRow[]> {
    return this.db
      .select()
      .from(contentPerformanceAnalysis)
      .where(
        and(
          eq(contentPerformanceAnalysis.brandId, brandId),
          eq(contentPerformanceAnalysis.workspaceId, workspaceId)
        )
      )
      .orderBy(desc(contentPerformanceAnalysis.overallScore));
  }

  // ==========================================
  // Optimization Insights
  // ==========================================

  async createInsight(insight: NewOptimizationInsightRow): Promise<OptimizationInsightRow> {
    const [inserted] = await this.db
      .insert(optimizationInsights)
      .values(insight)
      .returning();
    return inserted;
  }

  async listInsights(
    workspaceId: string,
    brandId?: string,
    options?: { type?: string; priority?: string; status?: string }
  ): Promise<OptimizationInsightRow[]> {
    const conditions = [eq(optimizationInsights.workspaceId, workspaceId)];
    if (brandId) {
      conditions.push(eq(optimizationInsights.brandId, brandId));
    }
    if (options?.type) {
      conditions.push(eq(optimizationInsights.type, options.type));
    }
    if (options?.priority) {
      conditions.push(eq(optimizationInsights.priority, options.priority));
    }
    if (options?.status) {
      conditions.push(eq(optimizationInsights.status, options.status));
    }

    return this.db
      .select()
      .from(optimizationInsights)
      .where(and(...conditions))
      .orderBy(desc(optimizationInsights.createdAt))
      .limit(50);
  }

  async updateInsightStatus(
    id: string,
    workspaceId: string,
    status: string
  ): Promise<OptimizationInsightRow | null> {
    const [updated] = await this.db
      .update(optimizationInsights)
      .set({ status })
      .where(
        and(
          eq(optimizationInsights.id, id),
          eq(optimizationInsights.workspaceId, workspaceId)
        )
      )
      .returning();
    return updated || null;
  }

  // ==========================================
  // Optimization Learning
  // ==========================================

  async upsertLearning(learning: NewOptimizationLearningRow): Promise<OptimizationLearningRow> {
    const [found] = await this.db
      .select()
      .from(optimizationLearning)
      .where(
        and(
          eq(optimizationLearning.workspaceId, learning.workspaceId),
          eq(optimizationLearning.brandId, learning.brandId),
          eq(optimizationLearning.patternKey, learning.patternKey)
        )
      );

    if (found) {
      const [updated] = await this.db
        .update(optimizationLearning)
        .set({
          sampleSize: learning.sampleSize,
          confidenceScore: learning.confidenceScore,
          summary: learning.summary,
          evidenceReferences: learning.evidenceReferences,
          recommendations: learning.recommendations,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(optimizationLearning.id, found.id),
            eq(optimizationLearning.workspaceId, learning.workspaceId)
          )
        )
        .returning();
      return updated;
    }

    const [inserted] = await this.db
      .insert(optimizationLearning)
      .values(learning)
      .returning();
    return inserted;
  }

  async listLearnings(workspaceId: string, brandId?: string): Promise<OptimizationLearningRow[]> {
    const conditions = [eq(optimizationLearning.workspaceId, workspaceId)];
    if (brandId) {
      conditions.push(eq(optimizationLearning.brandId, brandId));
    }
    return this.db
      .select()
      .from(optimizationLearning)
      .where(and(...conditions))
      .orderBy(desc(optimizationLearning.confidenceScore))
      .limit(50);
  }

  // ==========================================
  // Experiments
  // ==========================================

  async createExperiment(experiment: NewExperimentRow): Promise<ExperimentRow> {
    const [inserted] = await this.db
      .insert(experiments)
      .values(experiment)
      .returning();
    return inserted;
  }

  async findExperimentById(id: string, workspaceId: string): Promise<ExperimentRow | null> {
    const [found] = await this.db
      .select()
      .from(experiments)
      .where(
        and(
          eq(experiments.id, id),
          eq(experiments.workspaceId, workspaceId)
        )
      );
    return found || null;
  }

  async listExperiments(workspaceId: string, brandId?: string): Promise<ExperimentRow[]> {
    const conditions = [eq(experiments.workspaceId, workspaceId)];
    if (brandId) {
      conditions.push(eq(experiments.brandId, brandId));
    }
    return this.db
      .select()
      .from(experiments)
      .where(and(...conditions))
      .orderBy(desc(experiments.createdAt));
  }

  async updateExperiment(
    id: string,
    workspaceId: string,
    updates: Partial<NewExperimentRow>
  ): Promise<ExperimentRow | null> {
    const [updated] = await this.db
      .update(experiments)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(experiments.id, id),
          eq(experiments.workspaceId, workspaceId)
        )
      )
      .returning();
    return updated || null;
  }
}
