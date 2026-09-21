import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Film,
  Sparkles,
  ChevronRight,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  CalendarDays,
  Download,
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clapperboard,
  Check,
  X,
  Send,
  Calendar,
  Zap
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { Badge } from '../components/Badge.js';
import { Button } from '../components/Button.js';
import { MetaAdsPublishModal } from '../components/MetaAdsPublishModal.js';
import type { Brand, ReelProductionPlan, ContentPlan } from '@vidsnapai/types';

export const ReelsDashboardPage: React.FC = () => {
  const { brandId, planId } = useParams<{ brandId?: string; planId?: string }>();
  const navigate = useNavigate();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [reels, setReels] = useState<ReelProductionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [renderingReelId, setRenderingReelId] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'GENERATED' | 'BLUEPRINTS'>('GENERATED');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterFunnel, setFilterFunnel] = useState<string>('ALL');

  // Modal States
  const [rejectModalReelId, setRejectModalReelId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [scheduleModalReelId, setScheduleModalReelId] = useState<string | null>(null);
  const [schedulePlatform, setSchedulePlatform] = useState<string>('INSTAGRAM');
  const [scheduleDateTime, setScheduleDateTime] = useState<string>('');
  const [metaAdsModalReel, setMetaAdsModalReel] = useState<ReelProductionPlan | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchInitialData();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [brandId, planId]);

  // Set up polling when any reel is currently rendering or generating
  useEffect(() => {
    const hasRendering = reels.some(
      (r) => r.status === 'IN_PRODUCTION' || r.status === 'GENERATING' || r.status === 'QUEUED'
    );

    if (hasRendering) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(() => {
          fetchInitialData(true);
        }, 3000);
      }
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [reels]);

  const fetchInitialData = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError('');

    try {
      if (!brandId) {
        const brandsRes = await apiRequest<{ brands: Brand[] }>('/api/brands');
        if (brandsRes.brands && brandsRes.brands.length > 0) {
          navigate(`/brands/${brandsRes.brands[0].id}/reels`, { replace: true });
          return;
        }
      } else if (planId) {
        const [brandRes, planRes, reelsRes] = await Promise.all([
          apiRequest<{ brand: Brand }>(`/api/brands/${brandId}`),
          apiRequest<ContentPlan>(`/api/brands/${brandId}/content-plans/${planId}`).catch(() => null),
          apiRequest<ReelProductionPlan[]>(`/api/content-plans/${planId}/reels`)
        ]);

        setBrand(brandRes.brand);
        setPlan(planRes);
        const fetchedReels = reelsRes || [];
        setReels(fetchedReels);

        const hasGenerated = fetchedReels.some(
          (r) =>
            r.status === 'COMPLETED' ||
            r.status === 'APPROVED' ||
            r.status === 'SCHEDULED' ||
            r.status === 'PUBLISHED' ||
            r.renderOutput?.outputVideoUrl
        );
        if (!hasGenerated && fetchedReels.length > 0 && !isSilent) {
          setActiveTab('BLUEPRINTS');
        }
      } else {
        const [brandRes, reelsRes] = await Promise.all([
          apiRequest<{ brand: Brand }>(`/api/brands/${brandId}`),
          apiRequest<ReelProductionPlan[]>(`/api/brands/${brandId}/reels`)
        ]);

        setBrand(brandRes.brand);
        setPlan(null);
        const fetchedReels = reelsRes || [];
        setReels(fetchedReels);

        const hasGenerated = fetchedReels.some(
          (r) =>
            r.status === 'COMPLETED' ||
            r.status === 'APPROVED' ||
            r.status === 'SCHEDULED' ||
            r.status === 'PUBLISHED' ||
            r.renderOutput?.outputVideoUrl
        );
        if (!hasGenerated && fetchedReels.length > 0 && !isSilent) {
          setActiveTab('BLUEPRINTS');
        }
      }
    } catch (err: unknown) {
      if (!isSilent) {
        setError(err instanceof Error ? err.message : 'Failed to load Reel blueprints');
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!planId) return;
    setIsBatchGenerating(true);
    setError('');
    setSuccessMessage(null);
    try {
      await apiRequest(`/api/content-plans/${planId}/reels/generate-batch`, {
        method: 'POST'
      });
      const updated = await apiRequest<ReelProductionPlan[]>(`/api/content-plans/${planId}/reels`);
      const reelList = Array.isArray(updated) ? updated : [];
      setReels(reelList);
      if (reelList.length > 0) {
        setSuccessMessage(`Successfully generated ${reelList.length} reel blueprint${reelList.length === 1 ? '' : 's'}!`);
        setActiveTab('BLUEPRINTS');
      } else {
        setError('No blueprints were generated for this content plan.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to batch generate reel blueprints');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const handleRenderReel = async (reelId: string) => {
    setRenderingReelId(reelId);
    setError('');
    setSuccessMessage(null);

    setReels((prev) =>
      prev.map((r) => (r.id === reelId ? { ...r, status: 'IN_PRODUCTION' } : r))
    );
    setActiveTab('GENERATED');

    try {
      await apiRequest(`/api/reels/${reelId}/render`, {
        method: 'POST'
      });
      setSuccessMessage('Vertical Reel video rendered successfully!');
      await fetchInitialData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to render reel video');
      await fetchInitialData(true);
    } finally {
      setRenderingReelId(null);
    }
  };

  const handleApproveReel = async (reelId: string) => {
    setActionInProgressId(reelId);
    setError('');
    setSuccessMessage(null);

    try {
      await apiRequest(`/api/reels/${reelId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Approved in dashboard' })
      });
      setSuccessMessage('Reel approved for distribution!');
      await fetchInitialData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve reel');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleOpenRejectModal = (reelId: string) => {
    setRejectModalReelId(reelId);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalReelId || !rejectReason.trim()) {
      setError('Please provide a reason for rejecting the reel.');
      return;
    }

    setActionInProgressId(rejectModalReelId);
    setError('');
    setSuccessMessage(null);

    try {
      await apiRequest(`/api/reels/${rejectModalReelId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() })
      });
      setSuccessMessage('Reel rejected with feedback.');
      setRejectModalReelId(null);
      await fetchInitialData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject reel');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleOpenScheduleModal = (reelId: string) => {
    setScheduleModalReelId(reelId);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    setScheduleDateTime(tomorrow.toISOString().slice(0, 16));
  };

  const handleConfirmSchedule = async () => {
    if (!scheduleModalReelId || !scheduleDateTime) {
      setError('Please choose a valid schedule date and time.');
      return;
    }

    setActionInProgressId(scheduleModalReelId);
    setError('');
    setSuccessMessage(null);

    try {
      await apiRequest(`/api/reels/${scheduleModalReelId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({
          platform: schedulePlatform,
          scheduledAt: new Date(scheduleDateTime).toISOString()
        })
      });
      setSuccessMessage(`Reel scheduled for publishing to ${schedulePlatform}!`);
      setScheduleModalReelId(null);
      await fetchInitialData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to schedule reel');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handlePublishReel = async (reelId: string, platform = 'INSTAGRAM') => {
    setActionInProgressId(reelId);
    setError('');
    setSuccessMessage(null);

    try {
      const res = await apiRequest<{ result?: { externalUrl?: string } }>(`/api/reels/${reelId}/publish`, {
        method: 'POST',
        body: JSON.stringify({ platform })
      });
      const postUrl = (res as any)?.result?.externalUrl || (res as any)?.data?.result?.externalUrl;
      setSuccessMessage(
        postUrl
          ? `Reel published successfully to ${platform}! Post URL: ${postUrl}`
          : `Reel published successfully to ${platform}!`
      );
      await fetchInitialData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish reel');
    } finally {
      setActionInProgressId(null);
    }
  };

  const getVideoUrl = (reel: ReelProductionPlan): string | null => {
    if (reel.outputVideoUrl) return reel.outputVideoUrl;
    if (reel.renderOutput?.outputVideoUrl) return reel.renderOutput.outputVideoUrl;
    if (reel.productionMetadata?.renderOutput?.outputVideoUrl) {
      return reel.productionMetadata.renderOutput.outputVideoUrl;
    }
    return null;
  };

  const generatedReels = reels.filter(
    (r) =>
      r.status === 'COMPLETED' ||
      r.status === 'APPROVED' ||
      r.status === 'SCHEDULED' ||
      r.status === 'PUBLISHED' ||
      r.status === 'IN_PRODUCTION' ||
      r.status === 'FAILED' ||
      getVideoUrl(r) !== null
  );

  const filteredBlueprints = reels.filter((r) => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (filterFunnel !== 'ALL' && r.funnelStage !== filterFunnel) return false;
    return true;
  });

  const completedCount = reels.filter(
    (r) =>
      r.status === 'COMPLETED' ||
      r.status === 'APPROVED' ||
      r.status === 'SCHEDULED' ||
      r.status === 'PUBLISHED' ||
      getVideoUrl(r) !== null
  ).length;

  const approvedCount = reels.filter(
    (r) => r.status === 'APPROVED' || r.status === 'SCHEDULED' || r.status === 'PUBLISHED'
  ).length;

  const publishedCount = reels.filter((r) => r.status === 'PUBLISHED').length;

  if (isLoading) {
    return (
      <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading autonomous Reel studio & generated videos..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
      {/* Breadcrumb Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap'
        }}
      >
        <Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Dashboard
        </Link>
        <ChevronRight size={14} />
        {brand && (
          <>
            <Link to={`/brands/${brand.id}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              {brand.name}
            </Link>
            <ChevronRight size={14} />
          </>
        )}
        {planId && brand && (
          <>
            <Link to={`/brands/${brand.id}/content-plans`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              30-Day Plans
            </Link>
            <ChevronRight size={14} />
            <Link to={`/brands/${brand.id}/content-plans/${planId}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              {plan?.name || 'Content Plan'}
            </Link>
            <ChevronRight size={14} />
          </>
        )}
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Reels Dashboard</span>
      </div>

      {error && <ErrorBanner message={error} style={{ marginBottom: '1.5rem' }} />}
      {successMessage && (
        <div
          style={{
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid #22c55e',
            color: '#86efac',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={18} color="#22c55e" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#86efac',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <Film size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Reel Production & Publishing Studio
              </h1>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {brand ? `${brand.name} • ` : ''}
                {plan ? `${plan.name} • ` : ''}
                Vertical 9:16 Reel Blueprints, Video Rendering & Social Distribution
              </div>
            </div>
          </div>
        </div>

        {/* Quick Nav / Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {planId && brand ? (
            <>
              <Link to={`/brands/${brand.id}/content-plans/${planId}`} style={{ textDecoration: 'none' }}>
                <Button variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CalendarDays size={16} />
                  <span>30-Day Content Plan</span>
                </Button>
              </Link>
              {reels.length === 0 && (
                <Button
                  variant="primary"
                  isLoading={isBatchGenerating}
                  onClick={handleBatchGenerate}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Sparkles size={16} />
                  <span>Generate All Reel Blueprints</span>
                </Button>
              )}
            </>
          ) : brand ? (
            <Link to={`/brands/${brand.id}/content-plans`} style={{ textDecoration: 'none' }}>
              <Button variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarDays size={16} />
                <span>30-Day Content Plans</span>
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: '0.25rem'
            }}
          >
            Rendered Videos (Phase 8)
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#38bdf8' }}>
            {completedCount}
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: '0.25rem'
            }}
          >
            Approved Reels
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#10b981' }}>
            {approvedCount}
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: '0.25rem'
            }}
          >
            Published to Social
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#a855f7' }}>
            {publishedCount}
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: '0.25rem'
            }}
          >
            Total Reel Blueprints
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {reels.length}
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '2rem',
          gap: '1rem'
        }}
      >
        <button
          onClick={() => setActiveTab('GENERATED')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.875rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'GENERATED' ? '3px solid #38bdf8' : '3px solid transparent',
            color: activeTab === 'GENERATED' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Film size={18} color={activeTab === 'GENERATED' ? '#38bdf8' : 'currentColor'} />
          <span>🎬 Generated Reels & Publishing</span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '100px',
              background: activeTab === 'GENERATED' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.1)',
              color: activeTab === 'GENERATED' ? '#38bdf8' : 'var(--text-muted)'
            }}
          >
            {completedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('BLUEPRINTS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.875rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'BLUEPRINTS' ? '3px solid #a855f7' : '3px solid transparent',
            color: activeTab === 'BLUEPRINTS' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Layers size={18} color={activeTab === 'BLUEPRINTS' ? '#a855f7' : 'currentColor'} />
          <span>📋 Reel Blueprints</span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '100px',
              background: activeTab === 'BLUEPRINTS' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.1)',
              color: activeTab === 'BLUEPRINTS' ? '#a855f7' : 'var(--text-muted)'
            }}
          >
            {reels.length}
          </span>
        </button>
      </div>

      {/* TAB 1: GENERATED REELS VIEW */}
      {activeTab === 'GENERATED' && (
        <div>
          {generatedReels.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-medium)'
              }}
            >
              <Film size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
                No Generated Reels Yet
              </h3>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  maxWidth: '520px',
                  margin: '0 auto 1.5rem',
                  lineHeight: 1.5
                }}
              >
                You have {reels.length} Reel blueprints in your pipeline. Click below to render your first vertical reel using the Phase 8 rendering engine.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {reels.length > 0 ? (
                  <Button
                    variant="primary"
                    onClick={() => handleRenderReel(reels[0].id)}
                    isLoading={renderingReelId === reels[0].id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
                      color: '#ffffff'
                    }}
                  >
                    <Sparkles size={16} />
                    <span>Render First Approved Reel ({reels[0].title.slice(0, 30)}...)</span>
                  </Button>
                ) : planId ? (
                  <Button
                    variant="primary"
                    isLoading={isBatchGenerating}
                    onClick={handleBatchGenerate}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
                      color: '#ffffff'
                    }}
                  >
                    <Sparkles size={16} />
                    <span>Generate Reel Blueprints First</span>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: '2rem'
              }}
            >
              {generatedReels.map((reel) => {
                const videoUrl = getVideoUrl(reel);
                const isRendering =
                  renderingReelId === reel.id ||
                  reel.status === 'IN_PRODUCTION' ||
                  reel.status === 'GENERATING';
                const isFailed = reel.status === 'FAILED' || reel.status === 'RENDER_FAILED';
                const isActionBusy = actionInProgressId === reel.id;

                const isApproved = reel.status === 'APPROVED' || reel.status === 'SCHEDULED' || reel.status === 'PUBLISHED';
                const isScheduled = reel.status === 'SCHEDULED';
                const isPublished = reel.status === 'PUBLISHED';
                const isRejected = reel.status === 'REJECTED';

                return (
                  <div
                    key={reel.id}
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      border: isRendering
                        ? '2px solid #38bdf8'
                        : isPublished
                        ? '2px solid #a855f7'
                        : isApproved
                        ? '2px solid #10b981'
                        : isFailed
                        ? '1px solid #ef4444'
                        : '1px solid var(--border-subtle)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {/* Video Player or Rendering Placeholder */}
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '9/16',
                        background: '#0B0F19',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}
                    >
                      {isRendering ? (
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem'
                          }}
                        >
                          <div
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '50%',
                              border: '3px solid rgba(56, 189, 248, 0.2)',
                              borderTopColor: '#38bdf8',
                              animation: 'spin 1s linear infinite'
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '1.1rem' }}>
                              Rendering Reel...
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              Phase 8 composition, motion, and audio encoding
                            </div>
                          </div>
                        </div>
                      ) : isFailed ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                          <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 0.75rem' }} />
                          <div style={{ fontWeight: 700, color: '#ef4444' }}>Render Failed</div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0.75rem' }}>
                            {reel.renderOutput?.errorMessage || 'An error occurred during video composition.'}
                          </p>
                          {reel.renderOutput?.errorMessage?.includes('PRODUCT_ASSET_REQUIRED') && (
                            <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px' }}>
                              ⚠️ Product asset is required. Please upload a product image or video in Brand Assets.
                            </div>
                          )}
                          {reel.renderOutput?.diagnostics && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontFamily: 'monospace' }}>
                              Variance: {reel.renderOutput.diagnostics.visualVariance ?? 'N/A'} • Colors: {reel.renderOutput.diagnostics.uniqueColors ?? 'N/A'}
                            </div>
                          )}
                          <Button
                            variant="secondary"
                            onClick={() => handleRenderReel(reel.id)}
                            style={{ fontSize: '0.8rem' }}
                          >
                            <RefreshCw size={14} style={{ marginRight: '0.25rem' }} />
                            Retry Render
                          </Button>
                        </div>
                      ) : videoUrl ? (
                        <video
                          key={videoUrl}
                          controls
                          preload="metadata"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        >
                          <source src={videoUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          <Film size={40} style={{ opacity: 0.5, margin: '0 auto 0.5rem' }} />
                          <div>No video preview available</div>
                        </div>
                      )}

                      {/* Floating status pill */}
                      <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
                        <Badge
                          variant={
                            isPublished
                              ? 'owner'
                              : isApproved
                              ? 'admin'
                              : isRejected
                              ? 'member'
                              : 'default'
                          }
                        >
                          {isPublished
                            ? 'PUBLISHED'
                            : isScheduled
                            ? 'SCHEDULED'
                            : isApproved
                            ? 'APPROVED'
                            : isRejected
                            ? 'REJECTED'
                            : reel.status === 'COMPLETED'
                            ? 'RENDER COMPLETE'
                            : reel.status}
                        </Badge>
                      </div>

                      {/* Format pill */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          zIndex: 10,
                          background: 'rgba(0, 0, 0, 0.65)',
                          backdropFilter: 'blur(8px)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Clock size={12} />
                        <span>{reel.durationSeconds || 30}s • 9:16 MP4</span>
                      </div>
                    </div>

                    {/* Card Information & Actions */}
                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      <div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                            marginBottom: '0.25rem'
                          }}
                        >
                          {brand?.name || 'Brand'} • {reel.funnelStage}
                        </div>
                        <h3
                          style={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            margin: 0,
                            color: 'var(--text-primary)',
                            lineHeight: 1.3
                          }}
                        >
                          {reel.title}
                        </h3>
                      </div>

                      {reel.hook?.text && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            fontStyle: 'italic',
                            lineHeight: 1.4
                          }}
                        >
                          "{reel.hook.text}"
                        </p>
                      )}

                      {/* Phase 9 Approval & Publishing Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                          padding: '0.5rem 0',
                          borderTop: '1px solid var(--border-subtle)'
                        }}
                      >
                        {!isApproved && !isRejected && (
                          <Button
                            variant="secondary"
                            onClick={() => handleApproveReel(reel.id)}
                            isLoading={isActionBusy}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              color: '#10b981',
                              borderColor: 'rgba(16, 185, 129, 0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Check size={13} />
                            <span>Approve</span>
                          </Button>
                        )}

                        {!isRejected && !isPublished && (
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenRejectModal(reel.id)}
                            isLoading={isActionBusy}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              color: '#ef4444',
                              borderColor: 'rgba(239, 68, 68, 0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <X size={13} />
                            <span>Reject</span>
                          </Button>
                        )}

                        <Button
                          variant="secondary"
                          onClick={() => handleOpenScheduleModal(reel.id)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Calendar size={13} />
                          <span>Schedule</span>
                        </Button>

                        <Button
                          variant="primary"
                          onClick={() => handlePublishReel(reel.id, 'INSTAGRAM')}
                          isLoading={isActionBusy}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Send size={13} />
                          <span>Publish</span>
                        </Button>

                        <Button
                          variant="primary"
                          onClick={() => setMetaAdsModalReel(reel)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            background: '#1877F2',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Zap size={13} />
                          <span>Meta Ads</span>
                        </Button>
                      </div>

                      {/* Download & Blueprint Bar */}
                      <div
                        style={{
                          marginTop: 'auto',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {videoUrl && (
                            <a
                              href={videoUrl}
                              download={`${reel.title.slice(0, 30)}.mp4`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ textDecoration: 'none' }}
                            >
                              <Button
                                variant="primary"
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem'
                                }}
                              >
                                <Download size={14} />
                                <span>Download</span>
                              </Button>
                            </a>
                          )}

                          <Button
                            variant="secondary"
                            onClick={() => handleRenderReel(reel.id)}
                            isLoading={renderingReelId === reel.id}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <RefreshCw size={13} />
                            <span>Re-render</span>
                          </Button>
                        </div>

                        <Link
                          to={`/brands/${reel.brandId}/reels/${reel.id}`}
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--accent-primary)',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontWeight: 600
                          }}
                        >
                          <span>Blueprint</span>
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REEL BLUEPRINTS VIEW */}
      {activeTab === 'BLUEPRINTS' && (
        <div>
          {/* Filter Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <SlidersHorizontal size={14} /> Filter Status:
              </span>
              {['ALL', 'READY', 'APPROVED', 'IN_PRODUCTION', 'COMPLETED', 'PUBLISHED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    background: filterStatus === st ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: filterStatus === st ? '#ffffff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.25rem 0.625rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Funnel Stage:
              </span>
              {['ALL', 'AWARENESS', 'CONSIDERATION', 'CONVERSION', 'RETENTION'].map((fn) => (
                <button
                  key={fn}
                  onClick={() => setFilterFunnel(fn)}
                  style={{
                    background: filterFunnel === fn ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: filterFunnel === fn ? '#38bdf8' : 'var(--text-muted)',
                    border: filterFunnel === fn ? '1px solid #38bdf8' : '1px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {fn}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filteredBlueprints.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-medium)'
              }}
            >
              <Film size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
                No Reel Blueprints Match Filters
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Try adjusting your status or funnel stage filters.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: '1.5rem'
              }}
            >
              {filteredBlueprints.map((reel) => {
                const videoUrl = getVideoUrl(reel);
                const isRendered = reel.status === 'COMPLETED' || videoUrl !== null;
                const isRendering =
                  renderingReelId === reel.id || reel.status === 'IN_PRODUCTION';

                return (
                  <div
                    key={reel.id}
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: '1.25rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'rgba(255, 255, 255, 0.02)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: '#818cf8'
                            }}
                          >
                            v{reel.version}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {reel.platform} • {reel.aspectRatio}
                          </span>
                        </div>
                        <Badge
                          variant={
                            reel.status === 'COMPLETED'
                              ? 'owner'
                              : reel.status === 'APPROVED'
                              ? 'admin'
                              : 'member'
                          }
                        >
                          {reel.status}
                        </Badge>
                      </div>
                      <h3
                        style={{
                          fontSize: '1.125rem',
                          fontWeight: 700,
                          margin: 0,
                          color: 'var(--text-primary)',
                          lineHeight: 1.3
                        }}
                      >
                        {reel.title}
                      </h3>
                    </div>

                    {/* Body */}
                    <div
                      style={{
                        padding: '1.25rem',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            marginBottom: '0.25rem'
                          }}
                        >
                          Hook ({reel.hook?.type || 'QUESTION'})
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            fontStyle: 'italic'
                          }}
                        >
                          "{reel.hook?.text || 'No hook text'}"
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          fontSize: '0.8125rem',
                          color: 'var(--text-muted)'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} /> {reel.durationSeconds}s
                        </span>
                        <span>•</span>
                        <span>{reel.scenes?.length || 0} Scenes</span>
                        <span>•</span>
                        <span style={{ color: '#38bdf8' }}>{reel.funnelStage}</span>
                      </div>

                      {/* Pipeline Readiness Badges */}
                      <div
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-subtle)',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.5rem',
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={13} color="#10b981" />
                          <span style={{ color: 'var(--text-muted)' }}>Blueprint:</span>
                          <strong style={{ color: '#10b981' }}>{reel.status}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {reel.scenes?.some((s) => (s as any).mediaUrl || (s as any).assetId || s.productReference || s.background) ? (
                            <CheckCircle2 size={13} color="#10b981" />
                          ) : (
                            <AlertCircle size={13} color="#f59e0b" />
                          )}
                          <span style={{ color: 'var(--text-muted)' }}>Media:</span>
                          <strong style={{ color: reel.scenes?.some((s) => (s as any).mediaUrl || (s as any).assetId || s.productReference || s.background) ? '#10b981' : '#f59e0b' }}>
                            {reel.scenes?.some((s) => (s as any).mediaUrl || (s as any).assetId || s.productReference || s.background) ? 'READY' : 'MEDIA_REQUIRED'}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={13} color={isRendered ? '#38bdf8' : '#a855f7'} />
                          <span style={{ color: 'var(--text-muted)' }}>Render:</span>
                          <strong style={{ color: isRendered ? '#38bdf8' : 'var(--text-muted)' }}>
                            {isRendered ? 'READY' : isRendering ? 'RENDERING' : 'QUEUED'}
                          </strong>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div
                        style={{
                          marginTop: 'auto',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem'
                        }}
                      >
                        <Button
                          variant="secondary"
                          onClick={() => handleRenderReel(reel.id)}
                          isLoading={isRendering}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: isRendered ? 'rgba(56, 189, 248, 0.15)' : undefined,
                            color: isRendered ? '#38bdf8' : undefined
                          }}
                        >
                          <Clapperboard size={14} />
                          <span>{isRendered ? 'Re-render' : 'Render Reel'}</span>
                        </Button>

                        <Link to={`/brands/${reel.brandId}/reels/${reel.id}`} style={{ textDecoration: 'none' }}>
                          <Button
                            variant="primary"
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <span>Command Center</span>
                            <ArrowRight size={14} />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalReelId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-medium)',
              padding: '2rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700 }}>
              Reject Reel with Feedback
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Please specify what needs adjustment so the automated production engine can regenerate appropriately.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Hook audio is too aggressive, adjust caption styling..."
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setRejectModalReelId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmReject}
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModalReelId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-medium)',
              padding: '2rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700 }}>
              Schedule Social Publishing
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Select your target social platform and desired publishing timestamp.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Target Social Platform
              </label>
              <select
                value={schedulePlatform}
                onChange={(e) => setSchedulePlatform(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  fontSize: '0.9rem'
                }}
              >
                <option value="INSTAGRAM">Instagram Reels</option>
                <option value="FACEBOOK">Facebook Reels</option>
                <option value="YOUTUBE">YouTube Shorts</option>
                <option value="TIKTOK">TikTok</option>
                <option value="MOCK">Mock Dev Publisher</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Publish Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setScheduleModalReelId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmSchedule}
                style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' }}
              >
                Confirm Schedule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 10: Meta Ads Publishing Modal */}
      {metaAdsModalReel && (
        <MetaAdsPublishModal
          isOpen={Boolean(metaAdsModalReel)}
          onClose={() => setMetaAdsModalReel(null)}
          reel={metaAdsModalReel}
          onPublishSuccess={() => {
            fetchInitialData(true);
            setSuccessMessage('Meta Ad Campaign published successfully!');
          }}
        />
      )}
    </div>
  );
};
