import type {
  ReelProductionPlan,
  NormalizedPerformanceMetrics,
  PerformanceTier,
  ContentPerformanceAnalysisRecord
} from '@vidsnapai/types';

export interface AnalyzeContentInput {
  workspaceId: string;
  brandId: string;
  reelPlan: ReelProductionPlan;
  metrics: NormalizedPerformanceMetrics;
}

export class ContentPerformanceAnalyzer {
  /**
   * Evaluates content performance deterministically based on empirical metrics and Reel Blueprint attributes.
   */
  analyze(input: AnalyzeContentInput): Omit<ContentPerformanceAnalysisRecord, 'id' | 'createdAt' | 'updatedAt'> {
    const { workspaceId, brandId, reelPlan, metrics } = input;
    const duration = reelPlan.durationSeconds || 30;

    // 1. Hook Score (0-100)
    let hookScore = 50;
    if (metrics.videoViews3s !== null && metrics.videoViews3s !== undefined && metrics.impressions && metrics.impressions > 0) {
      const stopRate = (metrics.videoViews3s / metrics.impressions) * 100;
      hookScore = Math.min(100, Math.max(0, Math.round(stopRate * 2.2)));
    } else if (metrics.videoViews && metrics.impressions && metrics.impressions > 0) {
      const viewRate = (metrics.videoViews / metrics.impressions) * 100;
      hookScore = Math.min(100, Math.max(0, Math.round(viewRate * 1.5)));
    } else if (metrics.ctr !== null && metrics.ctr !== undefined) {
      hookScore = Math.min(100, Math.max(0, Math.round(metrics.ctr * 22)));
    }

    // 2. Retention Score (0-100)
    let retentionScore = 50;
    if (metrics.averageWatchTimeSeconds !== null && metrics.averageWatchTimeSeconds !== undefined && duration > 0) {
      const watchPct = (metrics.averageWatchTimeSeconds / duration) * 100;
      retentionScore = Math.min(100, Math.max(0, Math.round(watchPct * 1.25)));
    } else if (metrics.completionRate !== null && metrics.completionRate !== undefined) {
      retentionScore = Math.min(100, Math.max(0, Math.round(metrics.completionRate * 2.0)));
    }

    // 3. Engagement Score (0-100)
    let engagementScore = 50;
    if (metrics.engagementRate !== null && metrics.engagementRate !== undefined) {
      // 5% engagement is top-tier on short-form video
      engagementScore = Math.min(100, Math.max(0, Math.round(metrics.engagementRate * 16)));
    } else {
      const engCount = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0) + (metrics.saves || 0);
      const denominator = metrics.reach || metrics.impressions || metrics.videoViews;
      if (engCount > 0 && denominator && denominator > 0) {
        const rate = (engCount / denominator) * 100;
        engagementScore = Math.min(100, Math.max(0, Math.round(rate * 16)));
      }
    }

    // 4. Conversion Score (0-100)
    let conversionScore = 50;
    if (metrics.conversions !== null && metrics.conversions !== undefined && metrics.clicks && metrics.clicks > 0) {
      const cvr = (metrics.conversions / metrics.clicks) * 100;
      conversionScore = Math.min(100, Math.max(0, Math.round(cvr * 18)));
    } else if (metrics.roas !== null && metrics.roas !== undefined) {
      conversionScore = Math.min(100, Math.max(0, Math.round(metrics.roas * 22)));
    } else if (metrics.ctr !== null && metrics.ctr !== undefined) {
      conversionScore = Math.min(100, Math.max(0, Math.round(metrics.ctr * 18)));
    }

    // 5. Overall Weighted Score
    const overallScore = Number(
      (hookScore * 0.25 + retentionScore * 0.3 + engagementScore * 0.25 + conversionScore * 0.2).toFixed(1)
    );

    // 6. Performance Tier
    let performanceTier: PerformanceTier = 'TIER_3_AVERAGE';
    if (overallScore >= 80) {
      performanceTier = 'TIER_1_TOP';
    } else if (overallScore >= 65) {
      performanceTier = 'TIER_2_HIGH';
    } else if (overallScore >= 45) {
      performanceTier = 'TIER_3_AVERAGE';
    } else {
      performanceTier = 'TIER_4_UNDERPERFORMING';
    }

    // 7. Empirical Strengths & Weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (hookScore >= 75) {
      strengths.push(`High hook retention: Hook type "${reelPlan.hook?.type || 'Direct'}" captured viewer attention rapidly.`);
    } else if (hookScore < 45) {
      weaknesses.push(`Weak initial hook: Significant drop-off before 3-second mark.`);
    }

    if (retentionScore >= 75) {
      strengths.push(`Superior audience retention throughout the ${duration}s video duration.`);
    } else if (retentionScore < 45) {
      weaknesses.push(`Low completion rate: Viewers lost interest in mid-funnel scenes.`);
    }

    if (engagementScore >= 75) {
      strengths.push(`High engagement rate (${metrics.engagementRate ?? 'High'}%): Generated strong interaction, shares, and saves.`);
    } else if (engagementScore < 45) {
      weaknesses.push(`Low community engagement: Minimal likes, shares, or saves relative to reach.`);
    }

    if (conversionScore >= 75) {
      strengths.push(`High conversion efficiency: Call-to-action generated above-average downstream actions.`);
    } else if (conversionScore < 45) {
      weaknesses.push(`Sub-optimal click-through / conversion on CTA.`);
    }

    if (strengths.length === 0) {
      strengths.push('Consistent baseline performance across delivery metrics.');
    }
    if (weaknesses.length === 0) {
      weaknesses.push('No critical drop-off points detected in current reporting window.');
    }

    // 8. Detected Patterns
    const detectedPatterns = {
      hookStyle: reelPlan.hook?.type || 'PROBLEM_AGITATION',
      messagingAngle: reelPlan.concept?.messagingAngle || 'VALUE_DRIVEN',
      ctaType: reelPlan.cta?.type || 'LEARN_MORE',
      durationBucket: duration <= 15 ? 'SHORT_15S' : duration <= 30 ? 'MEDIUM_30S' : 'LONG_60S',
      visualStyle: reelPlan.concept?.emotionalAngle || 'DYNAMIC',
      sceneCount: reelPlan.scenes?.length || 0
    };

    return {
      workspaceId,
      brandId,
      reelId: reelPlan.id,
      analyzedAt: new Date(),
      performanceTier,
      hookScore,
      retentionScore,
      engagementScore,
      conversionScore,
      overallScore,
      strengths,
      weaknesses,
      detectedPatterns,
      metricSummary: metrics
    };
  }
}
