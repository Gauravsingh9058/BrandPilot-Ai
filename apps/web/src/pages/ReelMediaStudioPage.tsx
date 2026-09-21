import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Film,
  Sparkles,
  Mic,
  Music,
  Type,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Upload,
  ChevronRight,
  Play,
  Volume2,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { Badge } from '../components/Badge.js';
import { Button } from '../components/Button.js';
import { Modal } from '../components/Modal.js';
import type {
  Brand,
  ReelProductionPlan,
  ReelAsset,
  CaptionTrack,
  AudioMixPlan,
  ProductionReadiness,
  VoiceOption
} from '@vidsnapai/types';

export const ReelMediaStudioPage: React.FC = () => {
  const { brandId, reelId } = useParams<{ brandId: string; reelId: string }>();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [reel, setReel] = useState<ReelProductionPlan | null>(null);
  const [assets, setAssets] = useState<ReelAsset[]>([]);
  const [captionTrack, setCaptionTrack] = useState<CaptionTrack | null>(null);
  const [audioMixPlan, setAudioMixPlan] = useState<AudioMixPlan | null>(null);
  const [readiness, setReadiness] = useState<ProductionReadiness | null>(null);
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'MEDIA' | 'VOICE' | 'CAPTIONS' | 'AUDIO' | 'READINESS'>('MEDIA');

  // Operation Loading States
  const [isResolvingMedia, setIsResolvingMedia] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [isResolvingAudio, setIsResolvingAudio] = useState(false);

  // Local Upload Modals
  const [isMusicUploadOpen, setIsMusicUploadOpen] = useState(false);
  const [isVoiceUploadOpen, setIsVoiceUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Voice Selection State
  const [selectedVoiceId, setSelectedVoiceId] = useState('voice-aura-pro-1');

  useEffect(() => {
    if (reelId) {
      fetchStudioData();
    }
  }, [reelId, brandId]);

  const fetchStudioData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [brandRes, reelRes, assetsRes, voiceOptRes, , captionRes, audioRes, pkgRes] =
        await Promise.all([
          brandId ? apiRequest<{ brand: Brand }>(`/api/brands/${brandId}`) : Promise.resolve(null),
          apiRequest<ReelProductionPlan>(`/api/reels/${reelId}`),
          apiRequest<{ assets: ReelAsset[] }>(`/api/reels/${reelId}/assets`),
          apiRequest<{ voices: VoiceOption[] }>(`/api/reels/${reelId}/voice/options`).catch(() => ({ voices: [] })),
          apiRequest<{ voiceAsset: ReelAsset | null }>(`/api/reels/${reelId}/voice`).catch(() => ({ voiceAsset: null })),
          apiRequest<{ captionTrack: CaptionTrack | null }>(`/api/reels/${reelId}/captions`).catch(() => ({ captionTrack: null })),
          apiRequest<{ audioMixPlan: AudioMixPlan | null }>(`/api/reels/${reelId}/audio`).catch(() => ({ audioMixPlan: null })),
          apiRequest<{ productionPackage: { readiness: ProductionReadiness } }>(`/api/reels/${reelId}/production-package`).catch(() => ({ productionPackage: null }))
        ]);

      if (brandRes) setBrand(brandRes.brand);
      setReel(reelRes);
      setAssets(assetsRes.assets || []);
      setVoiceOptions(voiceOptRes.voices || []);
      setCaptionTrack(captionRes.captionTrack || null);
      setAudioMixPlan(audioRes.audioMixPlan || null);
      if (pkgRes?.productionPackage?.readiness) {
        setReadiness(pkgRes.productionPackage.readiness);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load Media Studio data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveAllMedia = async () => {
    if (!reel) return;
    setIsResolvingMedia(true);
    setError('');
    setActionSuccess('');

    try {
      const res = await apiRequest<{ assets: ReelAsset[]; summary: any }>(
        `/api/reels/${reel.id}/media/resolve`,
        {
          method: 'POST',
          body: JSON.stringify({ refreshExisting: true })
        }
      );
      const resolvedAssets = (res as any)?.assets || (res as any)?.data?.assets || [];
      const summary = (res as any)?.summary || (res as any)?.data?.summary || { resolvedScenes: resolvedAssets.length, brandAssetMatches: 0, pexelsMatches: 0 };
      setAssets(resolvedAssets);
      setActionSuccess(`Resolved ${summary.resolvedScenes} scenes (${summary.brandAssetMatches} brand assets, ${summary.pexelsMatches} stock matches).`);
      await refreshReadiness();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resolve scene media');
    } finally {
      setIsResolvingMedia(false);
    }
  };

  const handleResolveSceneMedia = async (sceneNumber: number) => {
    if (!reel) return;
    setError('');
    try {
      await apiRequest(`/api/reels/${reel.id}/scenes/${sceneNumber}/media/resolve`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      await fetchStudioData();
      setActionSuccess(`Scene ${sceneNumber} media regenerated.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate scene media');
    }
  };

  const handleGenerateVoice = async () => {
    if (!reel) return;
    setIsGeneratingVoice(true);
    setError('');
    setActionSuccess('');

    try {
      await apiRequest<{ voiceAsset: ReelAsset }>(`/api/reels/${reel.id}/voice/generate`, {
        method: 'POST',
        body: JSON.stringify({
          voiceConfig: {
            voiceId: selectedVoiceId,
            provider: 'mock_voice'
          }
        })
      });
      setActionSuccess('Voice narration track synthesized and attached successfully.');
      await fetchStudioData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate voice narration');
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleGenerateCaptions = async () => {
    if (!reel) return;
    setIsGeneratingCaptions(true);
    setError('');
    setActionSuccess('');

    try {
      const res = await apiRequest<{ captionTrack: CaptionTrack }>(`/api/reels/${reel.id}/captions/generate`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setCaptionTrack(res.captionTrack);
      setActionSuccess(`Generated ${res.captionTrack.cues.length} timed kinetic caption cues.`);
      await refreshReadiness();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate caption cues');
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const handleResolveAudio = async () => {
    if (!reel) return;
    setIsResolvingAudio(true);
    setError('');
    setActionSuccess('');

    try {
      const res = await apiRequest<{ audioMixPlan: AudioMixPlan }>(`/api/reels/${reel.id}/audio/resolve`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setAudioMixPlan(res.audioMixPlan);
      setActionSuccess('AI recommended music track and SFX cues configured with ducking.');
      await refreshReadiness();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resolve audio mix');
    } finally {
      setIsResolvingAudio(false);
    }
  };

  const handleUploadLocalAudio = async (type: 'MUSIC' | 'VOICE') => {
    if (!uploadFile || !reel) return;
    setIsUploading(true);
    setError('');

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(uploadFile);
      const base64Data = await base64Promise;

      if (type === 'VOICE') {
        await apiRequest(`/api/reels/${reel.id}/voice/upload`, {
          method: 'POST',
          body: JSON.stringify({
            base64Data,
            filename: uploadFile.name,
            mimeType: uploadFile.type || 'audio/mpeg'
          })
        });
        setIsVoiceUploadOpen(false);
        setActionSuccess('Local voice audio attached successfully.');
      } else {
        await apiRequest(`/api/reels/${reel.id}/audio/local`, {
          method: 'POST',
          body: JSON.stringify({
            base64Data,
            filename: uploadFile.name,
            mimeType: uploadFile.type || 'audio/mpeg',
            type: 'MUSIC'
          })
        });
        setIsMusicUploadOpen(false);
        setActionSuccess('Local music track attached successfully.');
      }

      setUploadFile(null);
      await fetchStudioData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload audio file');
    } finally {
      setIsUploading(false);
    }
  };

  const refreshReadiness = async () => {
    if (!reel) return;
    const pkgRes = await apiRequest<{ productionPackage: { readiness: ProductionReadiness } }>(
      `/api/reels/${reel.id}/production-package`,
      { method: 'POST' }
    );
    if (pkgRes?.productionPackage?.readiness) {
      setReadiness(pkgRes.productionPackage.readiness);
    }
  };

  if (isLoading || !reel) {
    return (
      <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner message="Opening AI Media & Production Studio..." />
      </div>
    );
  }

  const voiceAsset = assets.find((a) => a.assetType === 'VOICE' && a.status === 'READY');
  const isReadyForAnimation = readiness?.status === 'READY_FOR_ANIMATION';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link>
        <ChevronRight size={14} />
        {brand && (
          <>
            <Link to={`/brands/${brand.id}/reels`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{brand.name} Reels</Link>
            <ChevronRight size={14} />
          </>
        )}
        <Link to={`/brands/${brand?.id || reel.brandId}/reels/${reel.id}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Blueprint
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Media & Production Studio</span>
      </div>

      {error && <ErrorBanner message={error} style={{ marginBottom: '1.5rem' }} />}
      {actionSuccess && (
        <div style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: 'var(--radius-md)', color: '#34d399', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Hero Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          marginBottom: '2rem'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: '100px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            <Sparkles size={14} />
            Phase 6: Media + Voice + Captions + Audio Studio
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
            {reel.title}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '700px' }}>
            Autonomous production workspace assembling scene visuals, synthetic narration, kinetic caption tracks, and ducked audio mix blueprints.
          </p>
        </div>

        {/* Readiness Badge & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', background: isReadyForAnimation ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${isReadyForAnimation ? 'rgba(52, 211, 153, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isReadyForAnimation ? <CheckCircle2 size={18} style={{ color: '#34d399' }} /> : <ShieldAlert size={18} style={{ color: '#f87171' }} />}
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isReadyForAnimation ? '#34d399' : '#f87171' }}>
              {isReadyForAnimation ? 'READY FOR PHASE 7 ANIMATION' : `${readiness?.blockers.length || 0} PRODUCTION BLOCKERS`}
            </span>
          </div>

          <Link to={`/brands/${brand?.id || reel.brandId}/reels/${reel.id}`} style={{ textDecoration: 'none' }}>
            <Button variant="secondary">View Blueprint</Button>
          </Link>

          <Link to={`/brands/${brand?.id || reel.brandId}/reels/${reel.id}/animation`} style={{ textDecoration: 'none' }}>
            <Button variant="primary" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #3B82F6 100%)', fontWeight: 700 }}>
              🪄 Open Animation Studio
            </Button>
          </Link>
        </div>
      </div>

      {/* Studio Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {[
          { key: 'MEDIA', label: '1. Visual Media Resolver', icon: Film, count: assets.filter((a) => a.assetType === 'VIDEO' || a.assetType === 'IMAGE' || a.assetType === 'PRODUCT_IMAGE').length },
          { key: 'VOICE', label: '2. Voice Narration Studio', icon: Mic, count: voiceAsset ? 'Ready' : 'Missing' },
          { key: 'CAPTIONS', label: '3. Kinetic Captions', icon: Type, count: captionTrack ? `${captionTrack.cues.length} Cues` : 'Empty' },
          { key: 'AUDIO', label: '4. Audio & Music Mix', icon: Music, count: audioMixPlan ? 'Configured' : 'Empty' },
          { key: 'READINESS', label: '5. Production Readiness Matrix', icon: Layers, count: isReadyForAnimation ? 'Ready' : 'Blocked' }
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeTab === key ? 'var(--primary)' : 'var(--bg-card)',
              color: activeTab === key ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Icon size={16} />
            <span>{label}</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8, padding: '0.1rem 0.4rem', borderRadius: '100px', background: activeTab === key ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)' }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB 1: VISUAL MEDIA RESOLVER */}
      {activeTab === 'MEDIA' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#ffffff' }}>
                Multi-Scene Media Resolution
              </h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                First-party brand assets and products are given strict priority before falling back to vertical 9:16 stock video matches.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={handleResolveAllMedia}
              isLoading={isResolvingMedia}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RotateCcw size={16} />
              <span>Resolve / Regenerate All Scenes</span>
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {(reel.scenes || []).map((scene) => {
              const sceneAsset = assets.find((a) => a.sceneNumber === scene.sceneNumber);

              return (
                <div
                  key={scene.sceneNumber}
                  style={{
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    padding: '1.5rem',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(280px, 320px) 1fr',
                    gap: '1.5rem'
                  }}
                >
                  {/* Left Column: Asset Media Preview */}
                  <div
                    style={{
                      height: '240px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    {sceneAsset?.previewUrl ? (
                      <img
                        src={sceneAsset.previewUrl}
                        alt={`Scene ${scene.sceneNumber}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : sceneAsset?.assetType === 'VIDEO' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#818cf8' }}>
                        <Film size={40} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Resolved Video B-Roll</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                        <AlertCircle size={36} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Media not yet resolved</span>
                      </div>
                    )}

                    <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.7)', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700 }}>
                        Scene {scene.sceneNumber} • {scene.durationSeconds}s
                      </span>
                    </div>

                    {sceneAsset && (
                      <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {sceneAsset.isPlaceholder && (
                          <Badge variant="warning">PLACEHOLDER</Badge>
                        )}
                        {sceneAsset.isTestAsset && (
                          <Badge variant="danger">TEST ASSET</Badge>
                        )}
                        {sceneAsset.productionEligible && !sceneAsset.isPlaceholder && !sceneAsset.isTestAsset && (
                          <Badge variant="success">ELIGIBLE</Badge>
                        )}
                        <Badge variant={sceneAsset.sourceType === 'BRAND_LIBRARY' ? 'success' : sceneAsset.sourceType === 'PEXELS' ? 'info' : 'default'}>
                          {sceneAsset.sourceType}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Scene Director Direction & Asset Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                          {scene.visualType}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                        <span style={{ fontSize: '0.875rem', color: '#ffffff', fontWeight: 600 }}>{scene.purpose}</span>
                      </div>

                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                        <strong style={{ color: '#ffffff' }}>Narration:</strong> "{scene.narration || scene.onScreenText}"
                      </div>

                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        <strong>Visual Requirement:</strong> {scene.assetRequirement || scene.subject}
                      </div>

                      {scene.productReference && (
                        <div style={{ fontSize: '0.8125rem', color: '#34d399', marginBottom: '0.25rem' }}>
                          <strong>Product Reference:</strong> {scene.productReference} (First-Party Matched)
                        </div>
                      )}

                      {sceneAsset?.licenseMetadata && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                          License: {String(sceneAsset.licenseMetadata.license || 'Verified')}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <Button
                        variant="secondary"
                        onClick={() => handleResolveSceneMedia(scene.sceneNumber)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}
                      >
                        <RotateCcw size={14} />
                        <span>Regenerate Scene {scene.sceneNumber}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: VOICE STUDIO */}
      {activeTab === 'VOICE' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#ffffff' }}>
              Voice Narration Synthesis
            </h3>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Select AI Voice Persona
              </label>
              <select
                value={selectedVoiceId}
                onChange={(e) => setSelectedVoiceId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              >
                {voiceOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.gender}, {v.accent || 'Standard'})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Script Narration Text
              </label>
              <textarea
                rows={5}
                readOnly
                value={reel.script?.map((s) => s.text).join(' ') || reel.narrative}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onClick={handleGenerateVoice}
                isLoading={isGeneratingVoice}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Mic size={16} />
                <span>Generate Synthetic Voice</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => setIsVoiceUploadOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Upload size={16} />
                <span>Upload Audio File</span>
              </Button>
            </div>
          </div>

          {/* Voice Track Status Box */}
          <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#ffffff' }}>
                Active Voice Narration Track
              </h3>

              {voiceAsset ? (
                <div style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
                      <Play size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9375rem' }}>{voiceAsset.filename}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Duration: {voiceAsset.durationSeconds?.toFixed(1)}s • Provider: {voiceAsset.provider} ({voiceAsset.sourceType})
                      </div>
                    </div>
                  </div>

                  {/* Audio Waveform Simulator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '36px', padding: '0 0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)' }}>
                    {[12, 24, 32, 18, 28, 36, 20, 14, 26, 34, 16, 28, 30, 22, 18, 32, 24, 15, 29, 35, 19, 23, 31, 17].map((h, i) => (
                      <div key={i} style={{ flex: 1, height: `${h}px`, background: '#34d399', borderRadius: '2px', opacity: 0.8 }} />
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Mic size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>No voice track generated yet. Click "Generate Synthetic Voice" or upload your own audio file.</p>
                </div>
              )}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1rem' }}>
              Phase 8 audio rendering engine will align narration timestamps with background ducking.
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CAPTION STUDIO */}
      {activeTab === 'CAPTIONS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#ffffff' }}>
                Kinetic Caption Engine
              </h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Generates timed kinetic caption cues synchronized with scene pacing and approved narrative script.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={handleGenerateCaptions}
              isLoading={isGeneratingCaptions}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Type size={16} />
              <span>Generate / Refresh Caption Track</span>
            </Button>
          </div>

          {captionTrack && captionTrack.cues.length > 0 ? (
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                <span>Font: <strong>{captionTrack.style?.fontFamily || 'Outfit'}</strong></span>
                <span>•</span>
                <span>Animation: <strong>{captionTrack.style?.animationStyle || 'Kinetic'}</strong></span>
                <span>•</span>
                <span>Total Cues: <strong>{captionTrack.cues.length}</strong></span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {captionTrack.cues.map((cue, idx) => (
                  <div
                    key={cue.id || idx}
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: cue.style === 'CTA' ? '1px solid #f43f5e' : cue.style === 'WORD_HIGHLIGHT' ? '1px solid #6366F1' : '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700, color: '#818cf8' }}>
                        {cue.startTime.toFixed(1)}s - {cue.endTime.toFixed(1)}s
                      </span>
                      <Badge variant={cue.style === 'CTA' ? 'danger' : cue.style === 'WORD_HIGHLIGHT' ? 'primary' : 'default'}>
                        {cue.style || 'STANDARD'}
                      </Badge>
                    </div>

                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {cue.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <Type size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#ffffff' }}>No Captions Generated</h3>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 1.5rem 0' }}>Click below to create synchronized kinetic caption cues from the approved script.</p>
              <Button variant="primary" onClick={handleGenerateCaptions} isLoading={isGeneratingCaptions}>
                Generate Captions
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIO & MUSIC MIX */}
      {activeTab === 'AUDIO' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {/* Music Configuration */}
          <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#ffffff' }}>
              Music Selection & Controls
            </h3>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Button variant="primary" onClick={handleResolveAudio} isLoading={isResolvingAudio}>
                AI Recommended Music
              </Button>
              <Button variant="secondary" onClick={() => setIsMusicUploadOpen(true)}>
                Use from Local Gallery
              </Button>
            </div>

            {audioMixPlan?.musicConfig && (
              <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700, color: '#ffffff' }}>
                    {audioMixPlan.musicConfig.title || 'AI Mood Track'}
                  </div>
                  <Badge variant="primary">{audioMixPlan.musicConfig.source}</Badge>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Mood: {audioMixPlan.musicConfig.mood || 'Ambient'} • Volume: {(audioMixPlan.musicConfig.volume * 100).toFixed(0)}%
                </div>
              </div>
            )}

            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.75rem 0' }}>
              Audio Ducking & Hierarchy
            </h4>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Priority Order:</strong> VOICE &gt; SFX &gt; MUSIC
              </div>
              <div>
                <strong>Ducking Level:</strong> Music automatically ducks to 20% volume whenever voice narration is active.
              </div>
            </div>
          </div>

          {/* SFX Cues */}
          <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#ffffff' }}>
              Sound Effects (SFX) Track
            </h3>

            {audioMixPlan?.sfxConfigs && audioMixPlan.sfxConfigs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {audioMixPlan.sfxConfigs.map((sfx) => (
                  <div key={sfx.id} style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem' }}>{sfx.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Trigger: {sfx.startTime.toFixed(1)}s (Scene {sfx.sceneNumber || 1}) • {sfx.durationSeconds.toFixed(1)}s
                      </div>
                    </div>
                    <Badge variant="default">{sfx.type}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Volume2 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Click "AI Recommended Music" to auto-generate transition whooshes and hook impacts.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: READINESS MATRIX */}
      {activeTab === 'READINESS' && (
        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#ffffff' }}>
                Phase 6 Production Readiness Matrix
              </h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Deterministic verification ensuring all media, voice, captions, and audio are assembled before Phase 7 Animation Intelligence handoff.
              </p>
            </div>

            <Button variant="secondary" onClick={refreshReadiness} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RotateCcw size={16} />
              <span>Re-Evaluate Readiness</span>
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Scene Media Assets', check: readiness?.checks?.media, icon: Film },
              { label: 'Voice Narration Track', check: readiness?.checks?.voice, icon: Mic },
              { label: 'Timed Captions Track', check: readiness?.checks?.captions, icon: Type },
              { label: 'Background Music Track', check: readiness?.checks?.music, icon: Music },
              { label: 'Sound Effects (SFX)', check: readiness?.checks?.sfx, icon: Volume2 },
              { label: 'First-Party Brand Assets', check: readiness?.checks?.brandAssets, icon: Sparkles }
            ].map(({ label, check, icon: Icon }) => {
              const isReady = check?.status === 'READY';
              return (
                <div
                  key={label}
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isReady ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isReady ? '#34d399' : '#f87171' }}>
                      <Icon size={18} />
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#ffffff' }}>{label}</span>
                    </div>
                    <Badge variant={isReady ? 'success' : 'danger'}>
                      {check?.status || 'MISSING'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {check?.details || 'Evaluation pending.'}
                  </div>
                </div>
              );
            })}
          </div>

          {isReadyForAnimation ? (
            <div style={{ padding: '1.5rem', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 style={{ color: '#34d399', fontWeight: 800, margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>
                  ✓ READY FOR PHASE 7 ANIMATION INTELLIGENCE
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  All scene assets, synthetic audio, and kinetic subtitle cues are verified and ready for motion graphics orchestration.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ color: '#f87171', fontWeight: 800, margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>
                Blocked: Missing Required Production Components
              </h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Blockers: [{readiness?.blockers.join(', ')}]. Please resolve scene media, generate voice, and configure captions before handoff.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload Music Modal */}
      <Modal
        isOpen={isMusicUploadOpen}
        onClose={() => setIsMusicUploadOpen(false)}
        title="Upload Local Music Track"
      >
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Choose Audio File (MP3, WAV, M4A, AAC, OGG)
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-secondary)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
            required
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Button variant="secondary" onClick={() => setIsMusicUploadOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => handleUploadLocalAudio('MUSIC')} isLoading={isUploading} disabled={!uploadFile}>
            Upload Music
          </Button>
        </div>
      </Modal>

      {/* Upload Voice Modal */}
      <Modal
        isOpen={isVoiceUploadOpen}
        onClose={() => setIsVoiceUploadOpen(false)}
        title="Upload Local Voice Audio"
      >
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Choose Voice File (MP3, WAV, M4A)
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-secondary)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
            required
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Button variant="secondary" onClick={() => setIsVoiceUploadOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => handleUploadLocalAudio('VOICE')} isLoading={isUploading} disabled={!uploadFile}>
            Upload Voice
          </Button>
        </div>
      </Modal>
    </div>
  );
};
