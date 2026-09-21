import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { apiRequest } from '../lib/api.js';
import type { BrandWithDetails, Campaign, ContentPlatform, ContentPlanWithJobs } from '@vidsnapai/types';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Brain,
  Layers,
  Zap
} from 'lucide-react';

const AVAILABLE_PLATFORMS: Array<{ id: ContentPlatform; label: string; icon: string }> = [
  { id: 'INSTAGRAM', label: 'Instagram (Reels & Feed)', icon: '📸' },
  { id: 'TIKTOK', label: 'TikTok', icon: '🎵' },
  { id: 'YOUTUBE_SHORTS', label: 'YouTube Shorts', icon: '▶️' },
  { id: 'FACEBOOK', label: 'Facebook', icon: '👥' },
  { id: 'LINKEDIN', label: 'LinkedIn', icon: '💼' },
  { id: 'TWITTER', label: 'X / Twitter', icon: '🐦' }
];

export const ContentPlanWizardPage: React.FC = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();

  const [brand, setBrand] = useState<BrandWithDetails | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [planName, setPlanName] = useState('');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<ContentPlatform[]>(['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS']);
  const [customGuidance, setCustomGuidance] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadBrandContext = useCallback(async () => {
    if (!brandId) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [brandData, campaignsData] = await Promise.all([
        apiRequest<{ brand: BrandWithDetails }>(`/api/brands/${brandId}`),
        apiRequest<Campaign[]>(`/api/brands/${brandId}/campaigns`)
      ]);

      setBrand(brandData.brand);
      setCampaigns(campaignsData || []);
      setPlanName(`${brandData.brand.name} 30-Day Growth Content Plan`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load brand data');
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    loadBrandContext();
  }, [loadBrandContext]);

  const togglePlatform = (p: ContentPlatform) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((x) => x !== p));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId) return;

    setErrorMsg('');
    setIsGenerating(true);
    setGenerationStep(1);

    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1500);

    try {
      const payload = {
        name: planName.trim() || `${brand?.name} 30-Day Content Plan`,
        campaignId: selectedCampaignId || null,
        durationDays,
        startDate: new Date(startDate).toISOString(),
        platforms: selectedPlatforms,
        customGuidance: customGuidance.trim() || null
      };

      const res = await apiRequest<ContentPlanWithJobs>(`/api/brands/${brandId}/content-plans/generate`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      clearInterval(stepInterval);
      navigate(`/brands/${brandId}/content-plans/${res.id}`);
    } catch (err) {
      clearInterval(stepInterval);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate 30-Day Content Plan');
      setIsGenerating(false);
      setGenerationStep(0);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem 0' }}>
        <LoadingSpinner message="Loading Planning Studio..." />
      </div>
    );
  }

  if (!brand) {
    return (
      <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <ErrorBanner message="Brand not found" />
        <Link to="/brands" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Brands
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Back Link */}
      <Link
        to={`/brands/${brandId}/content-plans`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
          textDecoration: 'none'
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Content Plans</span>
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(129, 140, 248, 0.15)',
            color: '#818cf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)'
          }}
        >
          <Sparkles size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Autonomous 30-Day Content Studio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Synthesize Brand Brain + Strategy into a 30-day diversified reel and social plan for <strong>{brand.name}</strong>
          </p>
        </div>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} style={{ marginBottom: '1.5rem' }} />}

      {/* Generation Loading Overlay */}
      {isGenerating ? (
        <Card style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.3)',
              animation: 'pulse 2s infinite'
            }}
          >
            <Sparkles size={32} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Engineering 30-Day Strategic Plan...
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 2rem auto' }}>
            BrandPilot AI is autonomously analyzing brand positioning, developing weekly narratives, generating 30 high-converting hooks, and diversifying angles.
          </p>

          <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: generationStep >= 1 ? '#10b981' : 'var(--text-muted)' }}>
              <CheckCircle2 size={18} />
              <span style={{ fontSize: '0.875rem' }}>Ingesting Brand DNA & Market Positioning</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: generationStep >= 2 ? '#10b981' : 'var(--text-muted)' }}>
              <CheckCircle2 size={18} />
              <span style={{ fontSize: '0.875rem' }}>Structuring 4-Week Narrative & Funnel Stages</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: generationStep >= 3 ? '#10b981' : 'var(--text-muted)' }}>
              <CheckCircle2 size={18} />
              <span style={{ fontSize: '0.875rem' }}>Synthesizing 30 Unique Hooks & Content Angles</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: generationStep >= 4 ? '#10b981' : 'var(--text-muted)' }}>
              <CheckCircle2 size={18} />
              <span style={{ fontSize: '0.875rem' }}>Evaluating Diversification & Repetition Guardrails</span>
            </div>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleGenerate}>
          {/* Section 1: Core Configuration */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="#818cf8" />
              <span>Plan Parameters</span>
            </h2>

            <div style={{ marginBottom: '1.25rem' }}>
              <Input
                id="plan-name"
                label="Plan Name"
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. Q4 Growth Sprint 30-Day Plan"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Duration
                </label>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value={7} style={{ background: '#111622' }}>7-Day Quick Sprint (7 Reels)</option>
                  <option value={14} style={{ background: '#111622' }}>14-Day Targeted Campaign (14 Reels)</option>
                  <option value={30} style={{ background: '#111622' }}>30-Day Full Autonomous Plan (30 Reels) [Recommended]</option>
                  <option value={60} style={{ background: '#111622' }}>60-Day Extended Roadmap (60 Reels)</option>
                </select>
              </div>

              <div>
                <Input
                  id="plan-start-date"
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Campaign Association */}
            {campaigns.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Attach to Existing Campaign (Optional)
                </label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="" style={{ background: '#111622' }}>-- Standalone 30-Day Brand Growth Plan --</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: '#111622' }}>
                      Campaign: {c.name} ({c.objective})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </Card>

          {/* Section 2: Platforms Selection */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} color="#38bdf8" />
              <span>Target Platforms</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
              Select all platforms you plan to distribute this content schedule across.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {AVAILABLE_PLATFORMS.map((plat) => {
                const isSelected = selectedPlatforms.includes(plat.id);
                return (
                  <div
                    key={plat.id}
                    onClick={() => togglePlatform(plat.id)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '1px solid #818cf8' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{plat.icon}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 600 : 400 }}>{plat.label}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Section 3: Custom Directives */}
          <Card style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Brain size={18} color="#f472b6" />
              <span>Custom Strategic Guidance (Optional)</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
              Add any special emphasis, seasonal events, promotion angles, or product highlights for the AI planner to incorporate.
            </p>

            <textarea
              rows={4}
              value={customGuidance}
              onChange={(e) => setCustomGuidance(e.target.value)}
              placeholder="e.g. Focus heavily on solving audience overwhelm in Week 1, showcase product feature testimonials in Week 3, and drive urgency for our early-bird launch in Week 4."
              style={{
                width: '100%',
                padding: '0.75rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </Card>

          {/* Submit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Link to={`/brands/${brandId}/content-plans`} className="btn btn-secondary">
              Cancel
            </Link>
            <Button
              type="submit"
              variant="primary"
              style={{ padding: '0.65rem 1.75rem', fontSize: '0.95rem' }}
            >
              <Sparkles size={18} />
              <span>Synthesize {durationDays}-Day Content Plan</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
