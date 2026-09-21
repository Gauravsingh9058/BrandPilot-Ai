import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';
import { Button } from '../components/Button.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { Modal } from '../components/Modal.js';
import type {
  AnimationPlan,
  AnimationStatus,
  AnimationReadinessReport,
  AnimationRenderContract,
  SceneAnimation,
  AnimationLanguage,
  AnimationIntensity
} from '@vidsnapai/types';

export function AnimationStudioPage() {
  const { brandId, reelId } = useParams<{ brandId: string; reelId: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [animationPlan, setAnimationPlan] = useState<AnimationPlan | null>(null);
  const [readiness, setReadiness] = useState<AnimationReadinessReport | null>(null);
  const [versionHistory, setVersionHistory] = useState<AnimationPlan[]>([]);
  const [renderContract, setRenderContract] = useState<AnimationRenderContract | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<AnimationLanguage>('CINEMATIC');
  const [selectedIntensity, setSelectedIntensity] = useState<AnimationIntensity>('MEDIUM');
  const [customGuidance, setCustomGuidance] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);

  // Modals
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [sceneRegenTarget, setSceneRegenTarget] = useState<number | null>(null);
  const [sceneRegenGuidance, setSceneRegenGuidance] = useState('');
  const [isRegeneratingScene, setIsRegeneratingScene] = useState(false);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);

  const loadData = async () => {
    if (!reelId) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch current animation plan
      const planRes = await apiRequest<{ animationPlan: AnimationPlan | null; readiness: AnimationReadinessReport | null }>(
        `/api/reels/${reelId}/animation`
      );

      if (planRes && planRes.animationPlan) {
        setAnimationPlan(planRes.animationPlan);
        setReadiness(planRes.readiness);
        setSelectedLanguage(planRes.animationPlan.animationLanguage);
        setSelectedIntensity(planRes.animationPlan.globalSettings?.intensity || 'MEDIUM');
      }

      // 2. Fetch version history
      try {
        const histRes = await apiRequest<AnimationPlan[]>(`/api/reels/${reelId}/animation/versions`);
        if (histRes) {
          setVersionHistory(histRes);
        }
      } catch (e) {
        console.warn('Failed to load version history', e);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load animation studio data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reelId]);

  const handleGeneratePlan = async () => {
    if (!reelId) return;
    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await apiRequest<{ animationPlan: AnimationPlan; readiness: AnimationReadinessReport }>(
        `/api/reels/${reelId}/animation/generate`,
        {
          method: 'POST',
          body: JSON.stringify({
            animationLanguage: selectedLanguage,
            intensity: selectedIntensity,
            reducedMotion,
            customGuidance: customGuidance.trim() || undefined
          })
        }
      );

      if (res && res.animationPlan) {
        setAnimationPlan(res.animationPlan);
        setReadiness(res.readiness);
        setSuccessMessage(`Animation Plan v${res.animationPlan.version} generated successfully!`);
        setIsRegenerateModalOpen(false);
        // Refresh versions
        const histRes = await apiRequest<AnimationPlan[]>(`/api/reels/${reelId}/animation/versions`);
        if (histRes) setVersionHistory(histRes);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate animation plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = async (newStatus: AnimationStatus) => {
    if (!reelId || !animationPlan) return;
    try {
      const res = await apiRequest<AnimationPlan>(`/api/reels/${reelId}/animation/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (res) {
        setAnimationPlan({ ...animationPlan, status: newStatus });
        setSuccessMessage(`Status updated to ${newStatus}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleRegenerateScene = async () => {
    if (!reelId || sceneRegenTarget === null) return;
    setIsRegeneratingScene(true);
    setError(null);

    try {
      const res = await apiRequest<{ animationPlan: AnimationPlan; readiness: AnimationReadinessReport }>(
        `/api/reels/${reelId}/scenes/${sceneRegenTarget}/animation/regenerate`,
        {
          method: 'POST',
          body: JSON.stringify({
            customGuidance: sceneRegenGuidance.trim() || undefined
          })
        }
      );

      if (res && res.animationPlan) {
        setAnimationPlan(res.animationPlan);
        setReadiness(res.readiness);
        setSuccessMessage(`Scene #${sceneRegenTarget} animation motion regenerated!`);
        setSceneRegenTarget(null);
        setSceneRegenGuidance('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate scene animation');
    } finally {
      setIsRegeneratingScene(false);
    }
  };

  const handleFetchRenderContract = async () => {
    if (!reelId) return;
    try {
      const res = await apiRequest<AnimationRenderContract>(`/api/reels/${reelId}/animation/render-contract`);
      if (res) {
        setRenderContract(res);
        setIsContractModalOpen(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Phase 8 render contract');
    }
  };

  const handleRenderVideo = async () => {
    if (!reelId) return;
    setIsRenderingVideo(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await apiRequest(`/api/reels/${reelId}/render`, { method: 'POST' });
      setSuccessMessage('Vertical Reel video rendered successfully! You can preview and download it in the Reels Dashboard.');
    } catch (err: any) {
      setError(err.message || 'Failed to render reel video');
    } finally {
      setIsRenderingVideo(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner message="Initializing Animation Studio & Motion Intelligence..." />
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
            <Link to={`/brands/${brandId}/reels`} style={{ color: 'var(--color-primary)' }}>Reels</Link>
            <span>/</span>
            <Link to={`/brands/${brandId}/reels/${reelId}`} style={{ color: 'var(--color-primary)' }}>Blueprint</Link>
            <span>/</span>
            <Link to={`/brands/${brandId}/reels/${reelId}/media`} style={{ color: 'var(--color-primary)' }}>Media Studio</Link>
            <span>/</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Animation Studio</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.875rem', fontWeight: 800, background: 'linear-gradient(135deg, #A855F7, #6366F1, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Motion & Animation Intelligence Studio
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.925rem' }}>
            Autonomous camera choreography, kinetic typography, product reveals, and audio-synchronized rhythm.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => setIsRegenerateModalOpen(true)}>
            🪄 Generate / Tune Motion
          </Button>

          <Button variant="secondary" onClick={handleFetchRenderContract} disabled={!animationPlan}>
            📦 Phase 8 Contract
          </Button>

          <Button
            variant="primary"
            onClick={handleRenderVideo}
            disabled={!animationPlan}
            isLoading={isRenderingVideo}
            style={{
              background: 'linear-gradient(135deg, #A855F7 0%, #3B82F6 100%)',
              color: '#ffffff',
              fontWeight: 700
            }}
          >
            🚀 Render Video
          </Button>

          {animationPlan && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}>
                v{animationPlan.version} {versionHistory.length > 1 ? `(${versionHistory.length} revs)` : ''}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, marginRight: '0.5rem', color: 'var(--color-text-secondary)' }}>
                  STATUS:
                </span>
                <select
                  value={animationPlan.status}
                  onChange={(e) => handleStatusChange(e.target.value as AnimationStatus)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="READY">READY</option>
                  <option value="NEEDS_REVIEW">NEEDS REVIEW</option>
                  <option value="APPROVED">APPROVED (Locked)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {successMessage && (
        <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ADE80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '0.875rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✓ {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Plan Header & Readiness Scorebar */}
      {animationPlan ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Card 1: Language & Pacing */}
          <div className="card" style={{ padding: '1.25rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
              Motion Language & Energy
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                {animationPlan.animationLanguage}
              </span>
              <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', fontWeight: 700 }}>
                {animationPlan.globalSettings.intensity} INTENSITY
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Pacing: {animationPlan.globalSettings.pacing} | Easing: {animationPlan.globalSettings.defaultEasing}
            </div>
          </div>

          {/* Card 2: Version & Generator */}
          <div className="card" style={{ padding: '1.25rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
              Plan Version & History
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38BDF8' }}>
                Version {animationPlan.version}
              </span>
              <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontWeight: 700 }}>
                {animationPlan.sceneAnimations.length} SCENES
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              {animationPlan.metadata?.generatedBy || 'BrandPilot AI Animation Engine'}
            </div>
          </div>

          {/* Card 3: Readiness Score */}
          <div className="card" style={{ padding: '1.25rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>
                Render Readiness
              </span>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: (readiness?.score || 0) >= 80 ? '#4ADE80' : '#FBBF24' }}>
                {readiness?.score ?? 100} / 100
              </span>
            </div>
            <div style={{ height: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden', margin: '0.5rem 0' }}>
              <div
                style={{
                  height: '100%',
                  width: `${readiness?.score ?? 100}%`,
                  background: (readiness?.score || 0) >= 80 ? 'linear-gradient(90deg, #10B981, #4ADE80)' : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Status: <strong style={{ color: readiness?.status === 'READY' ? '#4ADE80' : '#FBBF24' }}>{readiness?.status || 'READY'}</strong>
              {readiness?.blockers && readiness.blockers.length > 0 && ` (${readiness.blockers.length} blockers)`}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--color-surface)', borderRadius: '16px', border: '1px dashed var(--color-border)', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>No Animation Plan Generated Yet</h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
            BrandPilot AI can automatically generate director-grade camera movements, kinetic typography, and audio-synchronized scene choreography.
          </p>
          <Button variant="primary" onClick={() => setIsRegenerateModalOpen(true)}>
            🪄 Generate Autonomous Animation Plan
          </Button>
        </div>
      )}

      {/* Scene Animation Timeline Breakdown */}
      {animationPlan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Scene-by-Scene Motion Breakdown
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Total Animation Events: {animationPlan.metadata?.totalEventsCount || 12}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
            {animationPlan.sceneAnimations.map((scene: SceneAnimation) => {
              const hasHero = scene.productMotion?.some((p) => p.isHeroMoment);
              const textAnim = scene.textMotion?.[0];
              const camera = scene.cameraMotion?.[0];

              return (
                <div
                  key={scene.sceneNumber}
                  style={{
                    background: 'var(--color-surface)',
                    border: hasHero ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid var(--color-border)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Top Bar for Scene */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'var(--color-primary)', color: '#FFF', fontWeight: 800, fontSize: '0.85rem', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {scene.sceneNumber}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                          Scene #{scene.sceneNumber} ({scene.startTime.toFixed(1)}s - {scene.endTime.toFixed(1)}s)
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                          Duration: {(scene.endTime - scene.startTime).toFixed(1)}s | Intensity: <span style={{ color: '#818CF8', fontWeight: 600 }}>{scene.animationIntensity}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {hasHero && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(236, 72, 153, 0.15)', color: '#F472B6', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                          ★ HERO PRODUCT MOMENT
                        </span>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSceneRegenTarget(scene.sceneNumber);
                          setSceneRegenGuidance('');
                        }}
                      >
                        ⚡ Tune Scene
                      </Button>
                    </div>
                  </div>

                  {/* Grid of Motion Elements */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    {/* Camera */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.875rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                        🎥 CAMERA CHOREOGRAPHY
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#38BDF8' }}>
                        {camera?.type || 'Cinematic Slow Push'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                        Scale: {camera?.scale ?? 1.05}x | Easing: {camera?.easing || 'CUBIC_OUT'}
                      </div>
                    </div>

                    {/* Text / Kinetic Typography */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.875rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                        💬 KINETIC TYPOGRAPHY
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#A78BFA' }}>
                        {textAnim?.entrance || 'WORD_POP'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                        Emphasis: {textAnim?.emphasisWords?.join(', ') || 'Auto voice sync'}
                      </div>
                    </div>

                    {/* Transition Out */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.875rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                        🔄 TRANSITION OUT
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#FCD34D' }}>
                        {scene.transitionOut?.type || 'CROSSFADE'} ({scene.transitionOut?.duration || 0.3}s)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                        {scene.transitionOut?.rationale || 'Smooth narrative progression'}
                      </div>
                    </div>

                    {/* Audio & Sync Cues */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.875rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                        🎵 SYNC CUES
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#34D399' }}>
                        {scene.synchronizationCues?.length ? `${scene.synchronizationCues.length} Audio Sync Markers` : 'Voice timing sync'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                        {scene.synchronizationCues?.[0]?.label || 'Beat & word aligned'}
                      </div>
                    </div>
                  </div>

                  {/* AI Directorial Rationale */}
                  {scene.rationale && (
                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)', fontSize: '0.825rem', color: 'var(--color-text-secondary)' }}>
                      <strong style={{ color: 'var(--color-text-primary)' }}>Director's Rationale:</strong> {scene.rationale}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Visual Track Inspection Timeline Bar */}
          <div style={{ marginTop: '1rem', padding: '1.5rem', background: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>
              Multitrack Synchronization Overview (Inspection Mode)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Track: Scenes & Transitions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '100px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                  SCENES
                </span>
                <div style={{ flex: 1, display: 'flex', height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', padding: '2px', gap: '2px' }}>
                  {animationPlan.sceneAnimations.map((s) => (
                    <div
                      key={s.sceneNumber}
                      style={{
                        flex: s.endTime - s.startTime,
                        background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#FFF'
                      }}
                    >
                      S{s.sceneNumber}
                    </div>
                  ))}
                </div>
              </div>

              {/* Track: Camera Motion */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '100px', fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8' }}>
                  CAMERA
                </span>
                <div style={{ flex: 1, display: 'flex', height: '20px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', padding: '2px', gap: '2px' }}>
                  {animationPlan.sceneAnimations.map((s) => (
                    <div
                      key={s.sceneNumber}
                      style={{
                        flex: s.endTime - s.startTime,
                        background: 'rgba(56, 189, 248, 0.25)',
                        border: '1px solid rgba(56, 189, 248, 0.5)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        color: '#E0F2FE'
                      }}
                    >
                      {s.cameraMotion?.[0]?.type || 'Slow Push'}
                    </div>
                  ))}
                </div>
              </div>

              {/* Track: Kinetic Typography */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '100px', fontSize: '0.75rem', fontWeight: 700, color: '#A78BFA' }}>
                  KINETIC TEXT
                </span>
                <div style={{ flex: 1, display: 'flex', height: '20px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', padding: '2px', gap: '2px' }}>
                  {animationPlan.sceneAnimations.map((s) => (
                    <div
                      key={s.sceneNumber}
                      style={{
                        flex: s.endTime - s.startTime,
                        background: 'rgba(167, 139, 250, 0.25)',
                        border: '1px solid rgba(167, 139, 250, 0.5)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        color: '#EDE9FE'
                      }}
                    >
                      {s.textMotion?.[0]?.entrance || 'Word Pop'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate / Regenerate Modal */}
      <Modal
        isOpen={isRegenerateModalOpen}
        onClose={() => setIsRegenerateModalOpen(false)}
        title="🪄 Tune Motion & Animation Direction"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Motion Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as AnimationLanguage)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
            >
              <option value="CINEMATIC">CINEMATIC (Modern, smooth, filmic)</option>
              <option value="PREMIUM">PREMIUM (Controlled, graceful, high-end)</option>
              <option value="ENERGETIC">ENERGETIC (High tempo, fast hooks)</option>
              <option value="MINIMAL">MINIMAL (Restrained, spacious typography)</option>
              <option value="PRODUCT_FOCUSED">PRODUCT_FOCUSED (Hero showcases & highlights)</option>
              <option value="LUXURY">LUXURY (Slow pushes, subtle lighting sweep)</option>
              <option value="CORPORATE">CORPORATE (Clean, structured, trustworthy)</option>
              <option value="TECH">TECH (SaaS, AI, futuristic precision)</option>
              <option value="SOCIAL_FAST">SOCIAL_FAST (TikTok/Reels native burst rhythm)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Motion Intensity
            </label>
            <select
              value={selectedIntensity}
              onChange={(e) => setSelectedIntensity(e.target.value as AnimationIntensity)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
            >
              <option value="LOW">LOW (Subtle drifts, calm transitions)</option>
              <option value="MEDIUM">MEDIUM (Balanced, modern pacing)</option>
              <option value="HIGH">HIGH (Dynamic scale pops, fast cuts)</option>
              <option value="EXTREME">EXTREME (High-retention viral motion)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
              />
              <span>Enable Reduced Motion (Accessibility Mode)</span>
            </label>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Custom Direction (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Focus attention heavily on the product bottle reveal in scene 2, use fast word pops for hook."
              value={customGuidance}
              onChange={(e) => setCustomGuidance(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setIsRegenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleGeneratePlan} isLoading={isGenerating}>
              Generate Motion Plan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Scene Regeneration Modal */}
      <Modal
        isOpen={sceneRegenTarget !== null}
        onClose={() => setSceneRegenTarget(null)}
        title={`⚡ Tune Scene #${sceneRegenTarget} Motion`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            Regenerate camera motion and text choreography specifically for this scene without modifying surrounding scenes.
          </p>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Scene Direction Guidance
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Use a dramatic slow push and emphasize the discount percentage in kinetic text."
              value={sceneRegenGuidance}
              onChange={(e) => setSceneRegenGuidance(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setSceneRegenTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRegenerateScene} isLoading={isRegeneratingScene}>
              Apply Scene Motion
            </Button>
          </div>
        </div>
      </Modal>

      {/* Phase 8 Render Contract Modal */}
      <Modal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        title="📦 Phase 8 Animation Render Contract"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            This deterministic render contract will be consumed by Phase 8 (Video Composition & Rendering Engine).
          </p>

          <pre
            style={{
              background: '#0F172A',
              color: '#38BDF8',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            {JSON.stringify(renderContract, null, 2)}
          </pre>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={() => setIsContractModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
