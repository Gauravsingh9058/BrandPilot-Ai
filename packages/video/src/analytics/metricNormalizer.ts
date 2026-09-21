import type { NormalizedPerformanceMetrics } from '@vidsnapai/types';

/**
 * Deterministic metric calculations and normalization.
 * Safety rule: Missing metrics remain null/undefined. No fabricated 0 values.
 */

export function calculateEngagementRate(
  totalEngagements: number | null | undefined,
  reach: number | null | undefined
): number | null {
  if (totalEngagements === null || totalEngagements === undefined || reach === null || reach === undefined || reach <= 0) {
    return null;
  }
  return Number(((totalEngagements / reach) * 100).toFixed(2));
}

export function calculateCtr(
  clicks: number | null | undefined,
  impressions: number | null | undefined
): number | null {
  if (clicks === null || clicks === undefined || impressions === null || impressions === undefined || impressions <= 0) {
    return null;
  }
  return Number(((clicks / impressions) * 100).toFixed(2));
}

export function calculateCompletionRate(
  completedViews: number | null | undefined,
  videoStarts: number | null | undefined
): number | null {
  if (completedViews === null || completedViews === undefined || videoStarts === null || videoStarts === undefined || videoStarts <= 0) {
    return null;
  }
  return Number(((completedViews / videoStarts) * 100).toFixed(2));
}

export function calculateAverageWatchTime(
  totalWatchTimeSeconds: number | null | undefined,
  videoViews: number | null | undefined
): number | null {
  if (
    totalWatchTimeSeconds === null ||
    totalWatchTimeSeconds === undefined ||
    videoViews === null ||
    videoViews === undefined ||
    videoViews <= 0
  ) {
    return null;
  }
  return Number((totalWatchTimeSeconds / videoViews).toFixed(2));
}

export function calculateRoas(
  revenue: number | null | undefined,
  spend: number | null | undefined
): number | null {
  if (revenue === null || revenue === undefined || spend === null || spend === undefined || spend <= 0) {
    return null;
  }
  return Number((revenue / spend).toFixed(2));
}

export function calculateCpa(
  spend: number | null | undefined,
  conversions: number | null | undefined
): number | null {
  if (spend === null || spend === undefined || conversions === null || conversions === undefined || conversions <= 0) {
    return null;
  }
  return Number((spend / conversions).toFixed(2));
}

export function calculateCpc(
  spend: number | null | undefined,
  clicks: number | null | undefined
): number | null {
  if (spend === null || spend === undefined || clicks === null || clicks === undefined || clicks <= 0) {
    return null;
  }
  return Number((spend / clicks).toFixed(2));
}

export function calculateCpm(
  spend: number | null | undefined,
  impressions: number | null | undefined
): number | null {
  if (spend === null || spend === undefined || impressions === null || impressions === undefined || impressions <= 0) {
    return null;
  }
  return Number(((spend / impressions) * 1000).toFixed(2));
}

/**
 * Normalizes raw Meta Graph API insights payload into internal NormalizedPerformanceMetrics structure.
 */
export function normalizeMetaInsights(payload: Record<string, unknown> | null | undefined): NormalizedPerformanceMetrics {
  if (!payload) {
    return {};
  }

  const impressions = payload.impressions !== undefined && payload.impressions !== null ? Number(payload.impressions) : null;
  const reach = payload.reach !== undefined && payload.reach !== null ? Number(payload.reach) : null;
  const spend = payload.spend !== undefined && payload.spend !== null ? Number(payload.spend) : null;
  const clicks = payload.clicks !== undefined && payload.clicks !== null ? Number(payload.clicks) : null;
  const linkClicks = payload.inline_link_clicks !== undefined && payload.inline_link_clicks !== null ? Number(payload.inline_link_clicks) : null;

  let videoViews: number | null = null;
  let likes: number | null = null;
  let comments: number | null = null;
  let shares: number | null = null;
  let saves: number | null = null;
  let conversions: number | null = null;
  let revenue: number | null = null;
  let watchTimeSeconds: number | null = null;
  let averageWatchTimeSeconds: number | null = null;
  let videoViews3s: number | null = null;
  let videoViewsThruplay: number | null = null;

  // Extract from Meta actions array
  if (Array.isArray(payload.actions)) {
    for (const act of payload.actions as Array<{ action_type: string; value: string | number }>) {
      const val = Number(act.value);
      if (act.action_type === 'video_view') videoViews = val;
      if (act.action_type === 'like' || act.action_type === 'post_reaction') likes = val;
      if (act.action_type === 'comment') comments = val;
      if (act.action_type === 'post') shares = val;
      if (act.action_type === 'onsite_conversion.purchase' || act.action_type === 'purchase' || act.action_type === 'lead') {
        conversions = (conversions || 0) + val;
      }
    }
  }

  // Extract from action_values array
  if (Array.isArray(payload.action_values)) {
    for (const av of payload.action_values as Array<{ action_type: string; value: string | number }>) {
      const val = Number(av.value);
      if (av.action_type.includes('purchase') || av.action_type.includes('conversion')) {
        revenue = (revenue || 0) + val;
      }
    }
  }

  // Video watch times
  if (Array.isArray(payload.video_avg_time_watched_actions)) {
    const first = (payload.video_avg_time_watched_actions as any)[0];
    if (first && first.value !== undefined) {
      averageWatchTimeSeconds = Number(first.value);
    }
  }

  if (payload.video_30_sec_watched_actions && Array.isArray(payload.video_30_sec_watched_actions)) {
    const first = (payload.video_30_sec_watched_actions as any)[0];
    if (first && first.value !== undefined) {
      videoViewsThruplay = Number(first.value);
    }
  }

  if (payload.video_p25_watched_actions && Array.isArray(payload.video_p25_watched_actions)) {
    const first = (payload.video_p25_watched_actions as any)[0];
    if (first && first.value !== undefined) {
      videoViews3s = Number(first.value);
    }
  }

  if (payload.watch_time_seconds !== undefined && payload.watch_time_seconds !== null) {
    watchTimeSeconds = Number(payload.watch_time_seconds);
  }

  // Instagram direct fields fallback
  if (payload.plays !== undefined && payload.plays !== null) {
    videoViews = Number(payload.plays);
  }
  if (payload.saved !== undefined && payload.saved !== null) {
    saves = Number(payload.saved);
  }
  if (payload.likes !== undefined && payload.likes !== null && likes === null) {
    likes = Number(payload.likes);
  }
  if (payload.comments !== undefined && payload.comments !== null && comments === null) {
    comments = Number(payload.comments);
  }
  if (payload.shares !== undefined && payload.shares !== null && shares === null) {
    shares = Number(payload.shares);
  }

  const ctr = calculateCtr(clicks, impressions) ?? (payload.ctr !== undefined && payload.ctr !== null ? Number(payload.ctr) : null);
  const cpc = calculateCpc(spend, clicks) ?? (payload.cpc !== undefined && payload.cpc !== null ? Number(payload.cpc) : null);
  const cpm = calculateCpm(spend, impressions) ?? (payload.cpm !== undefined && payload.cpm !== null ? Number(payload.cpm) : null);
  const roas = calculateRoas(revenue, spend);
  const cpa = calculateCpa(spend, conversions);

  const totalEngagements = (likes || 0) + (comments || 0) + (shares || 0) + (saves || 0) + (clicks || 0);
  const engagementRate = calculateEngagementRate(totalEngagements > 0 ? totalEngagements : null, reach || impressions);

  return {
    impressions,
    reach,
    videoViews,
    videoViews3s,
    videoViewsThruplay,
    watchTimeSeconds,
    averageWatchTimeSeconds,
    completionRate: null,
    likes,
    comments,
    shares,
    saves,
    clicks,
    linkClicks,
    ctr,
    cpc,
    cpm,
    spend,
    conversions,
    conversionValue: revenue,
    purchases: conversions,
    revenue,
    roas,
    cpa,
    engagementRate
  };
}
