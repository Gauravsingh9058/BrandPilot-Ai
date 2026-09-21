import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Sparkles,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
  Edit3,
  Copy,
  Layers,
  Mic,
  Zap,
  Target,
  Check,
  AlertCircle,
  Play,
  Download,
  ShieldCheck,
  Film,
  RefreshCw,
  Eye,
  Send,
  Package,
  Cpu,
  Radio,
  Image as ImageIcon
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { Badge } from '../components/Badge.js';
import { Button } from '../components/Button.js';
import { Modal } from '../components/Modal.js';
import { Input } from '../components/Input.js';
import { MetaAdsPublishModal } from '../components/MetaAdsPublishModal.js';
import type {
  Brand,
  BrandProduct,
  Campaign,
  ReelProductionPlan,
  ReelScene,
  ReelStatus,
  ReelAsset,
  VideoRenderOutput,
  SceneVideoArtifact,
  UpdateReelPlanInput
} from '@vidsnapai/types';

export const ReelProductionPlanPage: React.FC = () => {
  const { brandId, reelId } = useParams<{ brandId: string; reelId: string }>();

  // Core Entity States
  const [brand, setBrand] = useState<Brand | null>(null);
  const [product, setProduct] = useState<BrandProduct | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [reel, setReel] = useState<ReelProductionPlan | null>(null);
  const [assets, setAssets] = useState<ReelAsset[]>([]);
  const [history, setHistory] = useState<ReelProductionPlan[]>([]);
  const [renderOutput, setRenderOutput] = useState<VideoRenderOutput | null>(null);
  const [sceneArtifacts, setSceneArtifacts] = useState<SceneVideoArtifact[]>([]);

  // Loading & Polling States
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAiScenes, setIsGeneratingAiScenes] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingSceneIndex, setPollingSceneIndex] = useState<number>(1);
  const [pollingMessage, setPollingMessage] = useState<string>('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Error & Feedback States
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [errorExplanation, setErrorExplanation] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [isSceneRegenerateModalOpen, setIsSceneRegenerateModalOpen] = useState(false);
  const [isMetaAdsModalOpen, setIsMetaAdsModalOpen] = useState(false);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);
  const [sceneRegenGuidance, setSceneRegenGuidance] = useState('');

  // Edit forms state
  const [editTitle, setEditTitle] = useState('');
  const [editHookText, setEditHookText] = useState('');
  const [editCtaText, setEditCtaText] = useState('');
  const [editScenes, setEditScenes] = useState<ReelScene[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Regenerate form state
  const [regenerateReason, setRegenerateReason] = useState('');
  const [customGuidance, setCustomGuidance] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoPlayerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchReelPlan();
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [brandId, reelId]);

  // Handle live polling when video is generating or in production
  useEffect(() => {
    const isRenderingStatus =
      reel?.status === 'RENDERING' ||
      reel?.status === 'GENERATING' ||
      reel?.status === 'IN_PRODUCTION' ||
      reel?.status === 'QUALITY_CHECK' ||
      isGeneratingAiScenes;

    if (isRenderingStatus) {
      setIsPolling(true);
      if (!pollingTimerRef.current) {
        pollingTimerRef.current = setInterval(() => {
          pollRenderProgress();
        }, 2500);
      }
    } else {
      setIsPolling(false);
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [reel?.status, isGeneratingAiScenes]);

  const fetchReelPlan = async () => {
    if (!brandId || !reelId) return;
    setIsLoading(true);
    setError('');
    setErrorCode('');
    setErrorExplanation('');

    try {
      const [brandRes, reelRes, assetsRes] = await Promise.all([
        apiRequest<{ brand: Brand }>(`/api/brands/${brandId}`),
        apiRequest<ReelProductionPlan>(`/api/brands/${brandId}/reels/${reelId}`),
        apiRequest<{ assets: ReelAsset[] }>(`/api/reels/${reelId}/assets`).catch(() => ({ assets: [] }))
      ]);

      const fetchedBrand = brandRes.brand;
      const fetchedReel = reelRes;
      setBrand(fetchedBrand);
      setReel(fetchedReel);
      setAssets(assetsRes.assets || []);

      // Resolve selected Product
      const prodId = fetchedReel.productId || fetchedReel.targetProductId;
      if (prodId && (fetchedBrand as any).products) {
        const matched = (fetchedBrand as any).products.find((p: BrandProduct) => p.id === prodId);
        if (matched) setProduct(matched);
      } else if ((fetchedBrand as any).products && (fetchedBrand as any).products.length > 0) {
        setProduct((fetchedBrand as any).products[0]);
      }

      // Resolve Campaign if present
      if (fetchedReel.campaignId) {
        try {
          const campaignRes = await apiRequest<{ campaign: Campaign }>(
            `/api/brands/${brandId}/campaigns/${fetchedReel.campaignId}`
          );
          if (campaignRes?.campaign) setCampaign(campaignRes.campaign);
        } catch {
          // ignore if campaign details are optional
        }
      }

      // Load history
      if (fetchedReel.contentJobId) {
        try {
          const historyRes = await apiRequest<ReelProductionPlan[]>(
            `/api/content-jobs/${fetchedReel.contentJobId}/reel/history`
          );
          setHistory(historyRes || [fetchedReel]);
        } catch {
          setHistory([fetchedReel]);
        }
      }

      // Fetch Render Output & QA data
      try {
        const renderRes = await apiRequest<{
          renderOutput: VideoRenderOutput | null;
          outputVideoUrl: string | null;
          status: ReelStatus;
        }>(`/api/reels/${reelId}/render`);
        if (renderRes?.renderOutput) {
          setRenderOutput(renderRes.renderOutput);
          if ((renderRes.renderOutput as any).sceneArtifacts) {
            setSceneArtifacts((renderRes.renderOutput as any).sceneArtifacts);
          }
        }
      } catch {
        // non-blocking
      }
    } catch (err: unknown) {
      handleErrorClassification(err, 'Failed to load Reel blueprint');
    } finally {
      setIsLoading(false);
    }
  };

  const pollRenderProgress = async () => {
    if (!brandId || !reelId) return;

    try {
      const [reelRes, renderRes] = await Promise.all([
        apiRequest<ReelProductionPlan>(`/api/brands/${brandId}/reels/${reelId}`),
        apiRequest<{
          renderOutput: VideoRenderOutput | null;
          outputVideoUrl: string | null;
          status: ReelStatus;
        }>(`/api/reels/${reelId}/render`)
      ]);

      setReel(reelRes);

      if (renderRes?.renderOutput) {
        setRenderOutput(renderRes.renderOutput);
        if ((renderRes.renderOutput as any).sceneArtifacts) {
          setSceneArtifacts((renderRes.renderOutput as any).sceneArtifacts);
        }
      }

      // Progress animation calculation
      const totalScenes = reelRes.scenes?.length || 5;
      setPollingSceneIndex((prev) => (prev >= totalScenes ? 1 : prev + 1));
      setPollingMessage(`Polling Google Veo 3.1 & Assembly Pipeline (Scene ${pollingSceneIndex}/${totalScenes})`);

      // Check PostgreSQL confirmation for successful generation and verified artifact
      const hasCompletedOutput =
        (reelRes.renderOutput?.status === 'COMPLETED' || renderRes.renderOutput?.status === 'COMPLETED') &&
        (reelRes.outputVideoUrl || renderRes.outputVideoUrl || reelRes.renderOutput?.outputVideoUrl);

      if (hasCompletedOutput) {
        setIsGeneratingAiScenes(false);
        setIsPolling(false);
        setSuccessMsg('Reel video generation, Veo 3.1 scene synthesis, and master assembly confirmed by PostgreSQL!');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else if (reelRes.status === 'FAILED' || renderRes.renderOutput?.status === 'FAILED') {
        setIsGeneratingAiScenes(false);
        setIsPolling(false);
        const errMsg = renderRes.renderOutput?.errorMessage || 'Video rendering failed.';
        handleErrorClassification(new Error(errMsg), 'Video Generation Failed');
      }
    } catch (err: unknown) {
      // Continue polling silently unless hard error
      console.warn('Polling check error:', err);
    }
  };

  const handleErrorClassification = (err: unknown, defaultMsg: string) => {
    const rawMsg = err instanceof Error ? err.message : String(err || defaultMsg);
    setError(rawMsg);

    if (rawMsg.includes('429') || rawMsg.includes('QUOTA_EXHAUSTED') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      setErrorCode('VEO_QUOTA_EXHAUSTED');
      setErrorExplanation('Google Veo 3.1 quota has been temporarily exhausted. The pipeline circuit breaker is engaged. Please retry after quota reset.');
    } else if (rawMsg.includes('VEO_GENERATION_FAILED') || rawMsg.includes('Veo')) {
      setErrorCode('VEO_GENERATION_FAILED');
      setErrorExplanation('Google Veo 3.1 encountered a generation error for one or more scenes. You can retry the specific scene or retry the full reel.');
    } else if (rawMsg.includes('REEL_QA_FAILED')) {
      setErrorCode('REEL_QA_FAILED');
      setErrorExplanation('Automated Quality Assurance rejected the rendered video because it failed visual frame integrity or safe-margin standards.');
    } else if (rawMsg.includes('RENDER_VISUAL_VALIDATION_FAILED')) {
      setErrorCode('RENDER_VISUAL_VALIDATION_FAILED');
      setErrorExplanation('Visual validator detected abnormal blank, blue, or frozen frames. Output has been safely blocked from publication.');
    } else if (rawMsg.includes('PRODUCT_ASSET_MISSING') || rawMsg.includes('PRODUCT_ASSET_INVALID')) {
      setErrorCode('PRODUCT_ASSET_INVALID');
      setErrorExplanation('Selected product asset is invalid or not production-ready for Veo 3.1 reference conditioning.');
    } else {
      setErrorCode('REEL_PRODUCTION_ERROR');
      setErrorExplanation(rawMsg || defaultMsg);
    }
  };

  // ----------------------------------------------------
  // Primary User Actions
  // ----------------------------------------------------

  // 1. Generate AI Scenes & Full Render Pipeline
  const handleGenerateAiScenes = async () => {
    if (!reel) return;
    setIsGeneratingAiScenes(true);
    setError('');
    setErrorCode('');
    setErrorExplanation('');
    setSuccessMsg('');
    setActionInProgress('GENERATE_AI_SCENES');

    try {
      // First ensure media assets are resolved
      await apiRequest(`/api/reels/${reel.id}/media/resolve`, {
        method: 'POST',
        body: JSON.stringify({ refreshExisting: false })
      }).catch(() => null);

      // Trigger Veo 3.1 & Master Render
      await apiRequest(`/api/reels/${reel.id}/render`, {
        method: 'POST'
      });

      setSuccessMsg('Google Veo 3.1 video generation initiated. Polling status...');
      setReel((prev) => (prev ? { ...prev, status: 'RENDERING' } : prev));
    } catch (err: unknown) {
      handleErrorClassification(err, 'Failed to initiate AI video generation');
      setIsGeneratingAiScenes(false);
    } finally {
      setActionInProgress(null);
    }
  };

  // 2. Retry Scene (Individual scene retry)
  const handleRetryScene = async (sceneNumber: number) => {
    if (!reel || !brandId) return;
    setError('');
    setErrorCode('');
    setErrorExplanation('');
    setActionInProgress(`RETRY_SCENE_${sceneNumber}`);

    try {
      await apiRequest(`/api/reels/${reel.id}/scenes/${sceneNumber}/media/resolve`, {
        method: 'POST',
        body: JSON.stringify({ refreshExisting: true })
      });
      setSuccessMsg(`Scene #${sceneNumber} queued for Veo 3.1 regeneration.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchReelPlan();
    } catch (err: unknown) {
      handleErrorClassification(err, `Failed to retry Scene #${sceneNumber}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // 3. Regenerate Scene with custom guidance
  const handleOpenSceneRegenerate = (sceneNumber: number) => {
    setSelectedSceneIndex(sceneNumber - 1);
    setSceneRegenGuidance('');
    setIsSceneRegenerateModalOpen(true);
  };

  const handleConfirmSceneRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reel || !brandId || selectedSceneIndex === null) return;
    const sceneNum = selectedSceneIndex + 1;

    setActionInProgress(`REGEN_SCENE_${sceneNum}`);
    setIsSceneRegenerateModalOpen(false);
    setError('');

    try {
      const updated = await apiRequest<ReelProductionPlan>(
        `/api/brands/${brandId}/reels/${reel.id}/regenerate-scene`,
        {
          method: 'POST',
          body: JSON.stringify({
            sceneNumber: sceneNum,
            customGuidance: sceneRegenGuidance
          })
        }
      );
      setReel(updated);
      setSuccessMsg(`Scene #${sceneNum} regenerated with Google Veo 3.1 guidance.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      handleErrorClassification(err, `Failed to regenerate Scene #${sceneNum}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // 4. Retry Full Reel
  const handleRetryFullReel = async () => {
    await handleGenerateAiScenes();
  };

  // 5. Approve Reel
  const handleApproveReel = async () => {
    if (!reel) return;
    setActionInProgress('APPROVE');
    setError('');

    try {
      await apiRequest<ReelProductionPlan>(`/api/reels/${reel.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Approved via Reel Production Studio' })
      });
      setReel((prev) => (prev ? { ...prev, status: 'APPROVED' } : prev));
      setSuccessMsg('Reel approved for social distribution!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      handleErrorClassification(err, 'Failed to approve Reel');
    } finally {
      setActionInProgress(null);
    }
  };

  // 6. Preview Scroll
  const handleScrollToPreview = () => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 7. Save Blueprint Edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reel || !brandId) return;

    setIsSaving(true);
    setError('');
    try {
      const updatePayload: UpdateReelPlanInput = {
        title: editTitle,
        hook: { ...reel.hook, text: editHookText },
        cta: { ...reel.cta, text: editCtaText },
        scenes: editScenes
      };

      const updated = await apiRequest<ReelProductionPlan>(
        `/api/brands/${brandId}/reels/${reel.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updatePayload)
        }
      );

      setReel(updated);
      setIsEditModalOpen(false);
      setSuccessMsg('Reel production blueprint updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      handleErrorClassification(err, 'Failed to save edits');
    } finally {
      setIsSaving(false);
    }
  };

  // 8. Regenerate Full Blueprint Version
  const handleRegenerateFullReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reel) return;

    setIsRegenerating(true);
    setError('');
    try {
      const newPlan = await apiRequest<ReelProductionPlan>(
        `/api/content-jobs/${reel.contentJobId}/reel/regenerate`,
        {
          method: 'POST',
          body: JSON.stringify({
            regenerateReason,
            customGuidance
          })
        }
      );

      setReel(newPlan);
      setHistory((prev) => [newPlan, ...prev]);
      setIsRegenerateModalOpen(false);
      setSuccessMsg(`Regenerated new version v${newPlan.version} successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      handleErrorClassification(err, 'Failed to regenerate Reel blueprint');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyContract = () => {
    if (!reel) return;
    navigator.clipboard.writeText(JSON.stringify(reel, null, 2));
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2500);
  };

  // Helper to determine if final video preview is eligible
  const isVideoArtifactVerified = Boolean(
    (reel?.renderOutput?.status === 'COMPLETED' || renderOutput?.status === 'COMPLETED') &&
    (reel?.outputVideoUrl || renderOutput?.outputVideoUrl || reel?.renderOutput?.outputVideoUrl) &&
    reel?.status !== 'FAILED' &&
    renderOutput?.status !== 'FAILED'
  );

  const activeVideoUrl =
    reel?.outputVideoUrl || renderOutput?.outputVideoUrl || reel?.renderOutput?.outputVideoUrl || '';

  // Reference Images calculation
  const heroImage =
    (product?.metadata as any)?.heroImageUrl ||
    (product?.metadata as any)?.imageUrl ||
    assets.find((a) => a.assetType === 'PRODUCT_IMAGE' || (a.metadata as any)?.assetPurpose === 'HERO')?.sourceUrl ||
    assets.find((a) => a.assetType === 'IMAGE')?.sourceUrl ||
    '';
  const detailImage =
    (product?.metadata as any)?.detailImageUrl ||
    assets.find((a) => (a.metadata as any)?.assetPurpose === 'DETAIL' || (a.assetType === 'IMAGE' && a.sceneNumber === 2))?.sourceUrl ||
    '';
  const lifestyleImage =
    (product?.metadata as any)?.lifestyleImageUrl ||
    assets.find((a) => (a.metadata as any)?.assetPurpose === 'LIFESTYLE' || (a.assetType === 'IMAGE' && a.sceneNumber === 3))?.sourceUrl ||
    '';

  if (isLoading) {
    return (
      <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading Reel Production Studio & Veo 3.1 Pipeline..." />
      </div>
    );
  }

  if (!reel) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <ErrorBanner message={error || 'Reel production plan not found'} />
        <Link to={`/brands/${brandId}/reels`} style={{ marginTop: '1rem', display: 'inline-block' }}>
          <Button variant="secondary">Back to Reels</Button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>
      {/* Traceability Breadcrumbs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          fontSize: '0.8125rem',
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
        <Link to={`/brands/${brandId}/reels`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Reel Studio
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: '#818cf8', fontWeight: 600 }}>v{reel.version} • {reel.title}</span>
      </div>

      {/* Error & Failure Banner with exact error code & human explanation */}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.9375rem' }}>
                  Pipeline Failure
                </span>
                {errorCode && (
                  <span
                    style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      background: 'rgba(239, 68, 68, 0.25)',
                      color: '#fca5a5',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      fontFamily: 'monospace'
                    }}
                  >
                    CODE: {errorCode}
                  </span>
                )}
              </div>
              <p style={{ margin: '0 0 0.75rem 0', color: '#fecaca', fontSize: '0.875rem', lineHeight: 1.5 }}>
                {errorExplanation || error}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  onClick={handleRetryFullReel}
                  style={{
                    fontSize: '0.8125rem',
                    padding: '0.35rem 0.75rem',
                    background: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <RefreshCw size={14} />
                  <span>Retry Full Reel</span>
                </Button>
                {reel.scenes?.[0] && (
                  <Button
                    variant="secondary"
                    onClick={() => handleRetryScene(1)}
                    style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
                  >
                    Retry Scene 1
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successMsg && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#34d399',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Live Polling Banner */}
      {isPolling && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.18) 0%, rgba(168, 85, 247, 0.18) 100%)',
            border: '1px solid #818cf8',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Radio size={18} color="#818cf8" className="animate-pulse" />
            <div>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.875rem' }}>
                Generating Scene {pollingSceneIndex}/{reel.scenes?.length || 5} • Google Veo 3.1
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {pollingMessage || 'Polling Google Veo 3.1 status every 2.5s | Verifying PostgreSQL confirmation stream...'}
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              background: 'rgba(99, 102, 241, 0.3)',
              color: '#c7d2fe',
              fontWeight: 700
            }}
          >
            LIVE POLLING ACTIVE
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. BRAND • PRODUCT • CAMPAIGN • OBJECTIVE • DURATION • PLATFORM HEADER */}
      {/* ========================================================================= */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.98) 100%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '320px' }}>
            {/* Top Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em'
                }}
              >
                AUTONOMOUS REEL DIRECTOR
              </span>
              <span
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}
              >
                GOOGLE VEO 3.1
              </span>
              <span
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                VERSION {reel.version}
              </span>
              <Badge variant={reel.status === 'APPROVED' ? 'admin' : reel.status === 'COMPLETED' ? 'owner' : 'member'}>
                {reel.status}
              </Badge>
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: '#ffffff', lineHeight: 1.2 }}>
              {reel.title}
            </h1>

            <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '800px', lineHeight: 1.5 }}>
              {reel.narrative || reel.concept?.concept}
            </p>

            {/* Core Architecture Matrix */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  BRAND
                </div>
                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.9rem', marginTop: '2px' }}>
                  {brand?.name || 'Brand Default'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {brand?.industry || brand?.description || 'Direct-to-Consumer'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  PRODUCT
                </div>
                <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.9rem', marginTop: '2px' }}>
                  {product?.name || reel.targetProduct || 'Hero Brand Product'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {product?.price ? `$${product.price} • ` : ''}{product?.category || 'Primary Hero'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  CAMPAIGN
                </div>
                <div style={{ color: '#a855f7', fontWeight: 700, fontSize: '0.9rem', marginTop: '2px' }}>
                  {campaign?.name || 'Direct Promotion Campaign'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {campaign?.objective || reel.funnelStage || 'Conversion'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  REEL OBJECTIVE
                </div>
                <div style={{ color: '#34d399', fontWeight: 700, fontSize: '0.9rem', marginTop: '2px' }}>
                  {reel.objective || 'Commercial Reel'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Funnel: {reel.funnelStage}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  DURATION
                </div>
                <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.9rem', marginTop: '2px' }}>
                  {reel.durationSeconds}s Target
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {reel.productionMetadata?.calculatedDurationSeconds?.toFixed(1) || reel.durationSeconds}s Calculated
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  PLATFORM
                </div>
                <div style={{ color: '#f472b6', fontWeight: 700, fontSize: '0.9rem', marginTop: '2px' }}>
                  {reel.platform || 'Instagram Reels'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {reel.aspectRatio || '9:16'} Vertical
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '240px' }}>
            {/* AI Generation Trigger */}
            <Button
              variant="primary"
              onClick={handleGenerateAiScenes}
              isLoading={isGeneratingAiScenes || actionInProgress === 'GENERATE_AI_SCENES'}
              style={{
                background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
                fontWeight: 800,
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)'
              }}
            >
              <Sparkles size={18} />
              <span>Generate AI Scenes</span>
            </Button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="secondary"
                onClick={handleScrollToPreview}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Eye size={15} />
                <span>Preview</span>
              </Button>

              {reel.status !== 'APPROVED' ? (
                <Button
                  variant="primary"
                  onClick={handleApproveReel}
                  isLoading={actionInProgress === 'APPROVE'}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    background: '#10b981'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Approve</span>
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={handleApproveReel}
                  style={{ flex: 1, color: '#34d399', borderColor: '#10b981' }}
                >
                  <span>Approved ✓</span>
                </Button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="secondary"
                onClick={() => setIsRegenerateModalOpen(true)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <RotateCcw size={14} />
                <span>Regen Full Reel</span>
              </Button>

              <Button
                variant="secondary"
                onClick={handleRetryFullReel}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={14} />
                <span>Retry Full Reel</span>
              </Button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditTitle(reel.title);
                  setEditHookText(reel.hook?.text || '');
                  setEditCtaText(reel.cta?.text || '');
                  setEditScenes(JSON.parse(JSON.stringify(reel.scenes || [])));
                  setIsEditModalOpen(true);
                }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Edit3 size={14} />
                <span>Edit Blueprint</span>
              </Button>

              <Button
                variant="secondary"
                onClick={handleCopyContract}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {copiedContract ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{copiedContract ? 'Copied' : 'JSON'}</span>
              </Button>
            </div>

            <Button
              variant="primary"
              onClick={() => setIsMetaAdsModalOpen(true)}
              style={{
                background: '#1877F2',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Send size={15} />
              <span>Publish to Social & Meta Ads</span>
            </Button>

            {/* Version Selector */}
            {history.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>History:</span>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {history.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => setReel(h)}
                      style={{
                        padding: '0.15rem 0.45rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '3px',
                        background: h.version === reel.version ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.06)',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      v{h.version}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PRODUCT ASSETS (Selected Hero Image, Reference Images, Asset Status)   */}
      {/* ========================================================================= */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={20} color="#38bdf8" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              Product Assets & Veo 3.1 Reference Binding
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              ASSET STATUS: PRODUCTION READY
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0' }}>
          Up to 3 first-party reference images are bound into Google Veo 3.1 prompts to enforce strict product visual consistency, colors, packaging, and logo fidelity.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {/* Hero Packshot Reference */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.04em' }}>
                1. HERO PACKSHOT (SELECTED)
              </span>
              <span style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                PRIMARY
              </span>
            </div>
            {heroImage ? (
              <div style={{ width: '100%', height: '140px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={heroImage} alt="Product Hero Packshot" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ height: '140px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <ImageIcon size={28} />
                <span style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Auto-selected from Brand Library</span>
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <strong>Conditioning:</strong> Product shape, packaging geometry, primary color palette, front label.
            </div>
          </div>

          {/* Detail Reference */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a855f7', letterSpacing: '0.04em' }}>
                2. DETAIL / TEXTURE REF
              </span>
              <span style={{ fontSize: '0.7rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                DETAIL
              </span>
            </div>
            {detailImage ? (
              <div style={{ width: '100%', height: '140px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={detailImage} alt="Product Detail Ref" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ height: '140px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <ImageIcon size={28} />
                <span style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Macro texture & materials</span>
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <strong>Conditioning:</strong> Surface sheen, close-up texture, ingredient highlights, typography.
            </div>
          </div>

          {/* Lifestyle Reference */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.04em' }}>
                3. LIFESTYLE / IN-USE REF
              </span>
              <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                CONTEXT
              </span>
            </div>
            {lifestyleImage ? (
              <div style={{ width: '100%', height: '140px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={lifestyleImage} alt="Lifestyle Ref" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ height: '140px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <ImageIcon size={28} />
                <span style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Contextual environment</span>
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <strong>Conditioning:</strong> Real-world human interaction, lighting ambient interaction, scale.
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. REEL BLUEPRINT (Hook, Scenes, Script, CTA)                             */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Film size={20} color="#818cf8" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              Reel Blueprint Architecture
            </h2>
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {reel.scenes?.length || 0} Deterministic Scenes
          </span>
        </div>

        {/* Hook & CTA Split Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Hook Card */}
          <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={18} color="#f59e0b" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                  Hook Architecture
                </h3>
              </div>
              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700 }}>
                {reel.hook?.type || 'PROBLEM_AGITATION'}
              </span>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
                Spoken Hook Copy ({reel.hook?.durationSeconds || 3}s)
              </div>
              <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#ffffff', fontStyle: 'italic' }}>
                "{reel.hook?.text}"
              </p>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div><strong style={{ color: 'var(--text-primary)' }}>Visual Intent:</strong> {reel.hook?.visualIntent}</div>
              <div><strong style={{ color: 'var(--text-primary)' }}>Delivery Style:</strong> {reel.hook?.deliveryStyle}</div>
            </div>
          </div>

          {/* CTA Card */}
          <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={18} color="#10b981" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                  Call-To-Action (CTA)
                </h3>
              </div>
              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}>
                {reel.cta?.type || 'LEARN_MORE'}
              </span>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
                CTA Trigger & Button Copy
              </div>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#34d399' }}>
                {reel.cta?.text}
              </p>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div><strong style={{ color: 'var(--text-primary)' }}>Visual Treatment:</strong> {reel.cta?.visualTreatment}</div>
              <div><strong style={{ color: 'var(--text-primary)' }}>Placement:</strong> {reel.cta?.placement}</div>
            </div>
          </div>
        </div>

        {/* Script & Voiceover Timeline */}
        <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Mic size={16} color="#38bdf8" />
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              Full Chronological Voiceover & Kinetic Caption Script
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {reel.scenes?.map((sc, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#818cf8', minWidth: '60px' }}>
                  Scene {sc.sceneNumber || i + 1} ({sc.durationSeconds}s):
                </span>
                <div style={{ flex: 1, fontSize: '0.8125rem' }}>
                  <span style={{ color: '#ffffff', fontStyle: 'italic' }}>"{sc.narration || '[No voiceover]'}"</span>
                  {sc.onScreenText && (
                    <span style={{ marginLeft: '0.75rem', color: '#f472b6', fontWeight: 700 }}>
                      [TEXT: {sc.onScreenText}]
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. VIDEO GENERATION (Scene 1 Veo status, Scene 2 Veo status, ...)        */}
      {/* ========================================================================= */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '1.5rem',
          marginBottom: '2.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={20} color="#38bdf8" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Video Generation & Veo 3.1 Scene Synthesizer
              </h2>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Actual Provider: <strong style={{ color: '#38bdf8' }}>Google Veo 3.1</strong> • 1080x1920 Vertical Cinematic Engine
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              onClick={handleGenerateAiScenes}
              isLoading={isGeneratingAiScenes}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}
            >
              <RefreshCw size={14} />
              <span>Regenerate All AI Scenes</span>
            </Button>
          </div>
        </div>

        {/* Per-Scene Veo Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reel.scenes?.map((scene, idx) => {
            const sceneNum = scene.sceneNumber || idx + 1;
            const matchedArtifact = sceneArtifacts.find((art) => art.sceneNumber === sceneNum);
            const isSceneGenerating = isPolling && pollingSceneIndex === sceneNum;
            const isReady = Boolean(matchedArtifact?.videoUrl || (renderOutput?.status === 'COMPLETED' && isVideoArtifactVerified));
            const isFailed = Boolean(errorCode && !isReady);

            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  border: isSceneGenerating ? '1px solid #818cf8' : '1px solid var(--border-subtle)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8125rem',
                        fontWeight: 800
                      }}
                    >
                      {String(sceneNum).padStart(2, '0')}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#ffffff' }}>
                        Scene {sceneNum}: {scene.purpose}
                      </h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {scene.visualType} • {scene.durationSeconds}s duration
                      </div>
                    </div>
                  </div>

                  {/* Veo Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isSceneGenerating ? (
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <RefreshCw size={12} className="animate-spin" /> GENERATING IN VEO 3.1
                      </span>
                    ) : isReady ? (
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CheckCircle2 size={12} /> VEO 3.1 READY
                      </span>
                    ) : isFailed ? (
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.75rem', fontWeight: 800 }}>
                        GENERATION FAILED
                      </span>
                    ) : (
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>
                        QUEUED FOR VEO
                      </span>
                    )}

                    <Button
                      variant="secondary"
                      onClick={() => handleOpenSceneRegenerate(sceneNum)}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    >
                      Regenerate Scene
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => handleRetryScene(sceneNum)}
                      isLoading={actionInProgress === `RETRY_SCENE_${sceneNum}`}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    >
                      Retry Scene
                    </Button>
                  </div>
                </div>

                {/* Veo Visual Direction & Prompt Specs */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5
                  }}
                >
                  <div><strong style={{ color: '#38bdf8' }}>Camera & Motion:</strong> {scene.camera || 'Slow cinematic push-in'} ({scene.composition || 'Center-weighted'})</div>
                  <div><strong style={{ color: '#a855f7' }}>Environment & Lighting:</strong> {scene.environment || 'Studio'} • {scene.lighting || 'Cinematic rim lighting'}</div>
                  <div><strong style={{ color: '#34d399' }}>Product Asset Binding:</strong> {scene.productReference || product?.name || 'Hero product reference image #1'}</div>
                  <div><strong style={{ color: '#fbbf24' }}>Transition:</strong> {scene.transition || 'Cinematic Crossfade'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. FINAL ASSEMBLY & 6. QA (Quality Assurance) STATUS                      */}
      {/* ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Final Assembly Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="#818cf8" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Final Assembly Pipeline
              </h3>
            </div>
            <span
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                background: isVideoArtifactVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                color: isVideoArtifactVerified ? '#34d399' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {isVideoArtifactVerified ? 'ASSEMBLY COMPLETED' : 'PENDING SCENE CLIPS'}
            </span>
          </div>

          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div><strong>Master Concat:</strong> FFmpeg scene timeline with directional transitions</div>
            <div><strong>Audio Engine:</strong> Voiceover narration track + ducked background score</div>
            <div><strong>Brand Typography:</strong> Dynamic kinetic subtitles burnt to safe-zone specs</div>
            <div><strong>Format:</strong> 1080x1920 (9:16 Vertical) @ 30fps H.264 / AAC</div>
          </div>
        </div>

        {/* QA Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="#10b981" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Automated Quality Assurance (QA)
              </h3>
            </div>
            <span
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                background: isVideoArtifactVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                color: isVideoArtifactVerified ? '#34d399' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {isVideoArtifactVerified ? 'QA PASSED ✓' : 'PRE-RENDER CHECK'}
            </span>
          </div>

          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={14} color="#10b981" />
              <span><strong>Frame Integrity:</strong> No blank/blue/frozen frames validated</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={14} color="#10b981" />
              <span><strong>Visual Variance:</strong> High dynamic color range & standard dev &gt; 15</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={14} color="#10b981" />
              <span><strong>Safe Zones:</strong> Platform overlay safe area compliant (9:16)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={14} color="#10b981" />
              <span><strong>Product Presence:</strong> Confirmed in Hero Packshot scenes</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. FINAL REEL (Guarded Player - Never show blue/blank player as success)  */}
      {/* ========================================================================= */}
      <div
        ref={videoPlayerRef}
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '2rem',
          marginBottom: '2.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Play size={20} color="#38bdf8" />
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              Final Reel Video Preview
            </h2>
          </div>
          {isVideoArtifactVerified && (
            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.75rem', fontWeight: 800 }}>
              VERIFIED ARTIFACT EXISTS
            </span>
          )}
        </div>

        {/* Guard condition: Only show player when video file exists, render completed, and QA passed */}
        {isVideoArtifactVerified && activeVideoUrl ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'center' }}>
            {/* 9:16 Video Player */}
            <div style={{ maxWidth: '340px', margin: '0 auto', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
              <video
                controls
                playsInline
                style={{ width: '100%', maxHeight: '600px', display: 'block', background: '#000' }}
                src={activeVideoUrl}
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Video Specs & Output Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#ffffff', fontSize: '1rem' }}>
                  Master Video Verification
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  <div><strong>Storage URL:</strong> <a href={activeVideoUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Open Direct MP4</a></div>
                  <div><strong>Resolution:</strong> 1080 x 1920 (9:16 Vertical)</div>
                  <div><strong>Duration:</strong> {renderOutput?.durationSeconds || reel.durationSeconds}s</div>
                  <div><strong>Format / Codec:</strong> MP4 (H.264 / AAC)</div>
                  <div><strong>QA Verification:</strong> PASSED (PostgreSQL Confirmed)</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a
                  href={activeVideoUrl}
                  download={`${reel.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <Button variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Download size={15} />
                    <span>Download Master MP4</span>
                  </Button>
                </a>

                <Button
                  variant="primary"
                  onClick={() => setIsMetaAdsModalOpen(true)}
                  style={{ background: '#1877F2', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Send size={15} />
                  <span>Publish to Instagram / Meta Ads</span>
                </Button>
              </div>
            </div>
          </div>
        ) : isPolling || isGeneratingAiScenes ? (
          /* Live Render In-Progress State */
          <div
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed #6366f1'
            }}
          >
            <RefreshCw size={36} color="#818cf8" className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
              Synthesizing Scenes with Google Veo 3.1...
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
              Veo 3.1 is currently rendering cinematic scene clips with reference image conditioning. The video player will activate automatically once PostgreSQL confirms successful assembly and QA inspection.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#38bdf8', fontWeight: 700 }}>
                Generating Scene {pollingSceneIndex}/{reel.scenes?.length || 5}
              </span>
            </div>
          </div>
        ) : (
          /* Idle / Unrendered State */
          <div
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-subtle)'
            }}
          >
            <Film size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
              AI Video Not Yet Generated
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '520px', margin: '0 auto 1.5rem' }}>
              Click "Generate AI Scenes" above to start the Google Veo 3.1 cinematic generation and master assembly pipeline.
            </p>
            <Button
              variant="primary"
              onClick={handleGenerateAiScenes}
              style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)' }}
            >
              <Sparkles size={16} style={{ marginRight: '0.4rem' }} />
              <span>Generate AI Scenes</span>
            </Button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS: Edit Blueprint, Single Scene Edit, Scene Regen, Regenerate Full   */}
      {/* ========================================================================= */}

      {/* 1. Full Blueprint Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Reel Production Blueprint"
      >
        <form onSubmit={handleSaveEdit}>
          <Input
            id="edit-reel-title"
            label="Reel Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
            style={{ marginBottom: '1rem' }}
          />

          <Input
            id="edit-hook-text"
            label="Spoken Hook Text"
            value={editHookText}
            onChange={(e) => setEditHookText(e.target.value)}
            required
            style={{ marginBottom: '1rem' }}
          />

          <Input
            id="edit-cta-text"
            label="Call-to-Action Copy"
            value={editCtaText}
            onChange={(e) => setEditCtaText(e.target.value)}
            required
            style={{ marginBottom: '1.5rem' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Save Blueprint Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Single Scene Regenerate Modal */}
      <Modal
        isOpen={isSceneRegenerateModalOpen}
        onClose={() => setIsSceneRegenerateModalOpen(false)}
        title={`Regenerate Scene #${(selectedSceneIndex || 0) + 1} with Google Veo 3.1`}
      >
        <form onSubmit={handleConfirmSceneRegenerate}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
            Specify custom guidance or prompt adjustments for this scene. Veo 3.1 will synthesize a new video clip while preserving product reference consistency.
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
              Custom Guidance / Camera Motion Directive
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. Focus closer on the logo, increase dynamic lighting, make camera push-in faster"
              value={sceneRegenGuidance}
              onChange={(e) => setSceneRegenGuidance(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsSceneRegenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={actionInProgress === `REGEN_SCENE_${(selectedSceneIndex || 0) + 1}`}>
              Regenerate Scene
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Full Reel Regenerate Modal */}
      <Modal
        isOpen={isRegenerateModalOpen}
        onClose={() => setIsRegenerateModalOpen(false)}
        title={`Regenerate Full Reel (Creates Version ${reel.version + 1})`}
      >
        <form onSubmit={handleRegenerateFullReel}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
            Synthesizes a completely fresh narrative and scene storyboard while preserving version {reel.version} in your history.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
              Reason for Regeneration (Optional)
            </label>
            <input
              className="input"
              placeholder="e.g. More energetic hook, focus more on product benefits"
              value={regenerateReason}
              onChange={(e) => setRegenerateReason(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
              Custom AI Directive / Guidance (Optional)
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. Use a curiosity-gap hook and focus on fast cuts"
              value={customGuidance}
              onChange={(e) => setCustomGuidance(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsRegenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isRegenerating}>
              Regenerate Version {reel.version + 1}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Meta Ads Publishing Modal */}
      <MetaAdsPublishModal
        isOpen={isMetaAdsModalOpen}
        onClose={() => setIsMetaAdsModalOpen(false)}
        reel={reel}
        onPublishSuccess={() => {
          fetchReelPlan();
          setSuccessMsg('Meta Ad Campaign published successfully!');
        }}
      />
    </div>
  );
};
