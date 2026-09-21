import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest } from '../lib/api.js';
import {
  Sparkles,
  RefreshCw,
  Eye,
  MousePointer,
  DollarSign,
  Activity,
  Award,
  CheckCircle2,
  BarChart3,
  FlaskConical,
  Video,
  Zap,
  Target
} from 'lucide-react';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { Modal } from '../components/Modal.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import type {
  Brand,
  AnalyticsOverviewSummary,
  PerformanceSnapshotRecord,
  ContentPerformanceAnalysisRecord,
  OptimizationInsightRecord,
  OptimizationLearningRecord,
  ExperimentRecord
} from '@vidsnapai/types';

export const AnalyticsDashboardPage: React.FC = () => {
  const { currentWorkspace } = useAuth();

  // State
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'7D' | '14D' | '30D' | '90D' | 'CUSTOM'>('30D');
  const [platform, setPlatform] = useState<'ALL' | 'META' | 'ORGANIC'>('ALL');
  const [summary, setSummary] = useState<AnalyticsOverviewSummary | null>(null);
  const [recentSnapshots, setRecentSnapshots] = useState<PerformanceSnapshotRecord[]>([]);
  const [insights, setInsights] = useState<OptimizationInsightRecord[]>([]);
  const [learnings, setLearnings] = useState<OptimizationLearningRecord[]>([]);
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string>('');

  // Selected Analysis Modal
  const [selectedAnalysis, setSelectedAnalysis] = useState<ContentPerformanceAnalysisRecord | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);

  // Active Metric Chart Tab
  const [activeChartMetric, setActiveChartMetric] = useState<'impressions' | 'reach' | 'videoViews' | 'clicks' | 'spend' | 'conversions'>('videoViews');

  // Load brands for workspace
  const loadBrands = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const res = await apiRequest<{ brands: Brand[] }>('/brands');
      setBrands(res.brands || []);
      if (res.brands && res.brands.length > 0 && !selectedBrandId) {
        setSelectedBrandId(res.brands[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load brands', err);
    }
  }, [currentWorkspace, selectedBrandId]);

  // Load Analytics Data
  const loadAnalyticsData = useCallback(async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    setError('');

    try {
      const queryParams = new URLSearchParams({
        timeRange,
        platform,
        ...(selectedBrandId ? { brandId: selectedBrandId } : {})
      });

      const [overviewRes, insightsRes, learningRes, expRes] = await Promise.all([
        apiRequest<{ summary: AnalyticsOverviewSummary; recentSnapshots: PerformanceSnapshotRecord[] }>(
          `/analytics/meta/overview?${queryParams.toString()}`
        ),
        apiRequest<OptimizationInsightRecord[]>(
          `/analytics/insights${selectedBrandId ? `?brandId=${selectedBrandId}` : ''}`
        ),
        apiRequest<OptimizationLearningRecord[]>(
          `/analytics/learning${selectedBrandId ? `?brandId=${selectedBrandId}` : ''}`
        ),
        apiRequest<ExperimentRecord[]>(
          `/analytics/experiments${selectedBrandId ? `?brandId=${selectedBrandId}` : ''}`
        )
      ]);

      const ov = (overviewRes as any)?.summary ? overviewRes : (overviewRes as any)?.data || { summary: null, recentSnapshots: [] };
      const ins = Array.isArray(insightsRes) ? insightsRes : (insightsRes as any)?.data || [];
      const lrn = Array.isArray(learningRes) ? learningRes : (learningRes as any)?.data || [];
      const exp = Array.isArray(expRes) ? expRes : (expRes as any)?.data || [];

      setSummary(ov.summary || null);
      setRecentSnapshots(ov.recentSnapshots || []);
      setInsights(ins);
      setLearnings(lrn);
      setExperiments(exp);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace, selectedBrandId, timeRange, platform]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    if (currentWorkspace) {
      loadAnalyticsData();
    }
  }, [loadAnalyticsData, currentWorkspace]);

  // Trigger Manual Ingestion Sync
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setError('');
    setSyncSuccessMessage('');

    try {
      await apiRequest('/analytics/meta/sync', {
        method: 'POST',
        body: JSON.stringify({
          brandId: selectedBrandId || undefined,
          platform: 'META'
        })
      });

      setSyncSuccessMessage('Analytics sync initiated. Metrics and AI optimization engine running in background.');
      // Refresh after short delay
      setTimeout(() => {
        loadAnalyticsData();
        setIsSyncing(false);
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate sync');
      setIsSyncing(false);
    }
  };

  // Update Insight Status
  const handleUpdateInsight = async (id: string, status: 'APPLIED' | 'DISMISSED') => {
    try {
      await apiRequest(`/analytics/insights/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setInsights((prev) => prev.map((ins) => (ins.id === id ? { ...ins, status } : ins)));
    } catch (err: any) {
      setError(err.message || 'Failed to update insight');
    }
  };

  // Evaluate Experiment
  const handleEvaluateExperiment = async (id: string) => {
    try {
      const res = await apiRequest<ExperimentRecord>(`/analytics/experiments/${id}/evaluate`, {
        method: 'POST'
      });
      const evaluated = res && !('data' in (res as any)) ? res : (res as any)?.data;
      if (evaluated) {
        setExperiments((prev) => prev.map((exp) => (exp.id === id ? evaluated : exp)));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate experiment');
    }
  };

  // View Reel Analysis
  const handleViewReelAnalysis = async (reelId: string) => {
    try {
      const res = await apiRequest<{ analysis?: ContentPerformanceAnalysisRecord }>(
        `/analytics/meta/reels/${reelId}`
      );
      const analysisData = (res as any)?.analysis || (res as any)?.data?.analysis;
      if (analysisData) {
        setSelectedAnalysis(analysisData);
        setIsAnalysisModalOpen(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reel analysis');
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Performance Intelligence & Optimization
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#818cf8',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px'
              }}
            >
              <Sparkles size={12} /> AI CLOSED-LOOP ENGINE
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Live performance feedback ingestion powering continuous AI content optimization.
          </p>
        </div>

        {/* CONTROLS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          {/* Brand Filter */}
          {brands.length > 0 && (
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600
              }}
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Time Range Selector */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.15rem'
            }}
          >
            {(['7D', '14D', '30D', '90D'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  background: timeRange === r ? 'var(--accent-primary)' : 'transparent',
                  color: timeRange === r ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Platform Selector */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.15rem'
            }}
          >
            {(['ALL', 'META', 'ORGANIC'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                style={{
                  background: platform === p ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: platform === p ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Sync Button */}
          <Button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8125rem'
            }}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ErrorBanner message={error} />
        </div>
      )}

      {syncSuccessMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#34d399',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {/* TOP KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        {/* Spend */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Spend
            </span>
            <DollarSign size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            {summary?.totalSpend !== null && summary?.totalSpend !== undefined ? `$${summary.totalSpend.toLocaleString()}` : '—'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Verified ad spend</span>
        </div>

        {/* Reach */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Reach
            </span>
            <Eye size={16} color="#818cf8" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            {summary?.totalReach !== null && summary?.totalReach !== undefined ? summary.totalReach.toLocaleString() : '—'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Unique accounts reached</span>
        </div>

        {/* Video Views */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Video Views
            </span>
            <Video size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            {summary?.totalVideoViews !== null && summary?.totalVideoViews !== undefined ? summary.totalVideoViews.toLocaleString() : '—'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total video plays</span>
        </div>

        {/* Engagement Rate */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Engagement Rate
            </span>
            <Activity size={16} color="#f472b6" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            {summary?.averageEngagementRate !== null && summary?.averageEngagementRate !== undefined ? `${summary.averageEngagementRate}%` : '—'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Likes, shares, comments, saves</span>
        </div>

        {/* CTR */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Average CTR
            </span>
            <MousePointer size={16} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            {summary?.averageCtr !== null && summary?.averageCtr !== undefined ? `${summary.averageCtr}%` : '—'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click-through rate</span>
        </div>

        {/* Conversions / ROAS */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Conversions / ROAS
            </span>
            <Target size={16} color="#a78bfa" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            {summary?.totalConversions !== null && summary?.totalConversions !== undefined ? summary.totalConversions : '—'}
            {summary?.overallRoas !== null && summary?.overallRoas !== undefined && (
              <span style={{ fontSize: '1rem', color: '#34d399', marginLeft: '0.5rem' }}>
                ({summary.overallRoas}x)
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Purchases & lead actions</span>
        </div>
      </div>

      {/* PERFORMANCE TRENDS GRAPH */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Performance Trend Over Time</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
              Observed delivery across all ingested snapshots
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['videoViews', 'impressions', 'reach', 'clicks', 'spend', 'conversions'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setActiveChartMetric(m)}
                style={{
                  background: activeChartMetric === m ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  border: activeChartMetric === m ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  color: activeChartMetric === m ? '#ffffff' : 'var(--text-secondary)',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Chart representation */}
        {recentSnapshots.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <BarChart3 size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '0.875rem' }}>No performance snapshots available for this timeframe.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '160px', paddingTop: '1rem' }}>
            {recentSnapshots.slice(0, 15).reverse().map((s, idx) => {
              const val = (s as any)[activeChartMetric] || 0;
              const maxVal = Math.max(...recentSnapshots.map((item) => (item as any)[activeChartMetric] || 1));
              const heightPct = Math.max(12, Math.round((val / maxVal) * 100));

              return (
                <div
                  key={s.id || idx}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    height: '100%'
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      background: 'linear-gradient(180deg, var(--accent-primary) 0%, rgba(99, 102, 241, 0.2) 100%)',
                      borderRadius: '4px 4px 0 0',
                      height: `${heightPct}%`,
                      transition: 'height 0.3s ease',
                      position: 'relative'
                    }}
                    title={`${new Date(s.collectedAt).toLocaleDateString()}: ${val.toLocaleString()}`}
                  />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(s.collectedAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TOP PERFORMING CONTENT SECTION */}
      {recentSnapshots.filter((s) => s.reelId).length > 0 && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Video size={18} color="#34d399" />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Top Performing Reels</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {recentSnapshots
              .filter((s) => s.reelId)
              .slice(0, 4)
              .map((snap) => (
                <div
                  key={snap.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8' }}>
                        REEL: {snap.reelId?.slice(0, 8)}...
                      </span>
                      <Badge variant="success">ACTIVE</Badge>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Views</span>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                          {snap.videoViews?.toLocaleString() || '—'}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>CTR</span>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fbbf24' }}>
                          {snap.ctr ? `${snap.ctr}%` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => snap.reelId && handleViewReelAnalysis(snap.reelId)}
                    style={{ fontSize: '0.75rem', padding: '0.35rem' }}
                  >
                    View AI Deep Dive
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
          <LoadingSpinner message="Refreshing performance metrics..." />
        </div>
      )}

      {/* TWO COLUMN SECTION: CONTENT INTELLIGENCE & AI RECOMMENDATIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* CONTENT INTELLIGENCE */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Award size={18} color="#fbbf24" />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Content Intelligence Layer</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
            Aggregated patterns learned from actual viewer responses across all campaigns.
          </p>

          {learnings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No learned patterns synthesized yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {learnings.map((l) => (
                <div
                  key={l.id}
                  style={{
                    padding: '0.875rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: l.patternType.includes('WINNING') ? '#34d399' : '#f87171'
                      }}
                    >
                      {l.patternType.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {(l.confidenceScore * 100).toFixed(0)}% Confidence (Sample: {l.sampleSize})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.25rem' }}>
                    "{l.patternKey}"
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {l.summary}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI OPTIMIZATION RECOMMENDATIONS */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Zap size={18} color="#818cf8" />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>AI Optimization Guidance</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
            Evidence-backed strategic interventions for your next reel generation & campaign.
          </p>

          {insights.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No pending recommendations.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {insights.map((ins) => (
                <div
                  key={ins.id}
                  style={{
                    padding: '0.875rem',
                    background: 'rgba(99, 102, 241, 0.05)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <Badge variant={ins.priority === 'CRITICAL' ? 'danger' : ins.priority === 'HIGH' ? 'warning' : 'info'}>
                      {ins.priority} • {ins.type}
                    </Badge>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399' }}>
                      {ins.expectedImpact}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>
                    {ins.title}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    {ins.recommendation}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '0.4rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '0.75rem'
                    }}
                  >
                    <strong>Evidence:</strong> {ins.reasoning}
                  </div>

                  {ins.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleUpdateInsight(ins.id, 'APPLIED')}
                        style={{
                          background: 'var(--accent-primary)',
                          border: 'none',
                          color: '#ffffff',
                          padding: '0.3rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Apply to Marketing Brain
                      </button>
                      <button
                        onClick={() => handleUpdateInsight(ins.id, 'DISMISSED')}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                          padding: '0.3rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* A/B EXPERIMENTATION ENGINE */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FlaskConical size={18} color="#a78bfa" />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>A/B Experimentation Engine</h2>
          </div>
        </div>

        {experiments.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No active experiments.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
            {experiments.map((exp) => (
              <div
                key={exp.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>{exp.name}</span>
                  <Badge variant={exp.status === 'COMPLETED' ? 'success' : exp.status === 'RUNNING' ? 'info' : 'default'}>
                    {exp.status}
                  </Badge>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {exp.resultSummary || 'Collecting empirical variant sample data...'}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => handleEvaluateExperiment(exp.id)}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  Evaluate Statistical Winner
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ANALYSIS MODAL */}
      {isAnalysisModalOpen && selectedAnalysis && (
        <Modal
          isOpen={isAnalysisModalOpen}
          onClose={() => setIsAnalysisModalOpen(false)}
          title="Content Performance Deep-Dive"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Performance Tier:</span>
              <Badge variant={selectedAnalysis.performanceTier === 'TIER_1_TOP' ? 'success' : 'info'}>
                {selectedAnalysis.performanceTier}
              </Badge>
            </div>

            {/* Scores Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hook Score</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#818cf8' }}>
                  {selectedAnalysis.hookScore}/100
                </div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retention Score</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                  {selectedAnalysis.retentionScore}/100
                </div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Engagement Score</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f472b6' }}>
                  {selectedAnalysis.engagementScore}/100
                </div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Conversion Score</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
                  {selectedAnalysis.conversionScore}/100
                </div>
              </div>
            </div>

            {/* Strengths */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#34d399' }}>
                Empirical Strengths:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {selectedAnalysis.strengths.map((str, idx) => (
                  <li key={idx}>{str}</li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#f87171' }}>
                Drop-Off Analysis:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {selectedAnalysis.weaknesses.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
