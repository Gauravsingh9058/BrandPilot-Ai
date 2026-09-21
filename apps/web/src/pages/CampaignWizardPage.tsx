import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { apiRequest } from '../lib/api.js';
import type { BrandWithDetails, Campaign, MarketingObjective } from '@vidsnapai/types';
import {
  Megaphone,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Target,
  Share2,
  Gift
} from 'lucide-react';

const CAMPAIGN_OBJECTIVES: { value: MarketingObjective; label: string; desc: string }[] = [
  { value: 'PRODUCT_AWARENESS', label: 'Product Awareness', desc: 'Educate prospects on specific product capabilities' },
  { value: 'CUSTOMER_ACQUISITION', label: 'Customer Acquisition', desc: 'Drive new customer signups and initial purchases' },
  { value: 'LEAD_GENERATION', label: 'Lead Generation', desc: 'Collect qualified buyer interest and inquiries' },
  { value: 'SALES', label: 'Direct Sales & Revenue', desc: 'Accelerate checkout conversions and deal closing' },
  { value: 'PRODUCT_LAUNCH', label: 'Product Launch', desc: 'Maximize impact for a new feature or flagship release' },
  { value: 'PROMOTION', label: 'Special Promotion / Offer', desc: 'Drive urgency around limited-time incentives' },
  { value: 'ENGAGEMENT', label: 'Community Engagement', desc: 'Spark discussions, shares, and viral interactions' },
  { value: 'BRAND_AWARENESS', label: 'Brand Awareness', desc: 'Expand reach and establish top-of-mind brand recognition' }
];

const AVAILABLE_CHANNELS = [
  { id: 'INSTAGRAM', label: 'Instagram', desc: 'Reels, Stories, Carousels' },
  { id: 'TIKTOK', label: 'TikTok', desc: 'Short-form dynamic video' },
  { id: 'YOUTUBE_SHORTS', label: 'YouTube Shorts', desc: 'High-intent search & discovery' },
  { id: 'FACEBOOK', label: 'Facebook', desc: 'Broader demographic video feeds' },
  { id: 'LINKEDIN', label: 'LinkedIn', desc: 'B2B & Professional audience' },
  { id: 'WEBSITE', label: 'Website / Landing Page', desc: 'Direct on-site promotional banners' }
];

export const CampaignWizardPage: React.FC = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();

  const [brand, setBrand] = useState<BrandWithDetails | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState<MarketingObjective>('PRODUCT_AWARENESS');
  const [coreMessage, setCoreMessage] = useState('');
  const [offer, setOffer] = useState('');
  const [primaryCta, setPrimaryCta] = useState('Claim Offer Now');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS']);
  const [autoGenerateStrategy, setAutoGenerateStrategy] = useState(true);

  const fetchBrand = useCallback(async () => {
    if (!brandId) return;
    setIsLoading(true);
    try {
      const res = await apiRequest<{ brand: BrandWithDetails }>(`/api/brands/${brandId}`);
      if (res?.brand) {
        setBrand(res.brand);
        setName(`${res.brand.name} Launch Drive`);
        setDescription(`High-converting marketing campaign to promote ${res.brand.name}.`);
        if (res.brand.primaryCta) {
          setPrimaryCta(res.brand.primaryCta);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load brand details');
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  const toggleChannel = (chId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(chId) ? prev.filter((id) => id !== chId) : [...prev, chId]
    );
  };

  const handleCreateCampaign = async () => {
    if (!brandId) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      // 1. Create Campaign
      const campaign = await apiRequest<Campaign>(`/api/brands/${brandId}/campaigns`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          objective,
          coreMessage: coreMessage || undefined,
          offer: offer || undefined,
          primaryCta: primaryCta || undefined,
          channels: selectedChannels
        })
      });

      if (!campaign || !campaign.id) {
        throw new Error('Failed to create campaign');
      }

      // 2. Optionally synthesize Campaign Strategy
      if (autoGenerateStrategy) {
        try {
          await apiRequest(`/api/brands/${brandId}/campaigns/${campaign.id}/generate-strategy`, {
            method: 'POST',
            body: JSON.stringify({
              campaignGoal: description
            })
          });
        } catch {
          // If strategy generation fails, we still navigate to campaign detail page where they can retry
        }
      }

      navigate(`/brands/${brandId}/campaigns/${campaign.id}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to initialize campaign');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading Brand Knowledge..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(brandId ? `/brands/${brandId}/campaigns` : '/campaigns')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '0.8125rem',
          marginBottom: '1.25rem'
        }}
      >
        <ArrowLeft size={14} />
        <span>Back to Campaigns</span>
      </button>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(244, 114, 182, 0.15)',
              color: '#f472b6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Megaphone size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Create New Campaign</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
              Targeted promotion for {brand?.name}
            </p>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: currentStep >= step ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)'
              }}
            />
          ))}
        </div>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} style={{ marginBottom: '1.5rem' }} />}

      <Card>
        {/* STEP 1: CAMPAIGN BASICS */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Target size={18} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Step 1: Campaign Fundamentals</h2>
            </div>

            <Input
              id="camp-name"
              label="Campaign Name"
              placeholder="e.g. Summer Performance Upgrade"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="form-group">
              <label className="form-label">Campaign Objective</label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value as MarketingObjective)}
                className="form-input"
              >
                {CAMPAIGN_OBJECTIVES.map((obj) => (
                  <option key={obj.value} value={obj.value}>
                    {obj.label} — {obj.desc}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Campaign Description & Target Outcome</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="What specific outcome or product promotion does this campaign target?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button
                variant="primary"
                onClick={() => setCurrentStep(2)}
                disabled={!name.trim() || !description.trim()}
              >
                <span>Continue to Offer & Message</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: OFFER & CTA */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Gift size={18} color="#a78bfa" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Step 2: Core Message & Conversion Incentive</h2>
            </div>

            <Input
              id="camp-core-msg"
              label="Core Campaign Promise (Optional)"
              placeholder="e.g. Elevate your audio monitoring with zero wireless latency"
              value={coreMessage}
              onChange={(e) => setCoreMessage(e.target.value)}
            />

            <Input
              id="camp-offer"
              label="Special Offer / Hook (Optional)"
              placeholder="e.g. 20% Off Launch Special + Free Case"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
            />

            <Input
              id="camp-cta"
              label="Primary Call to Action"
              placeholder="e.g. Claim Your Launch Kit"
              value={primaryCta}
              onChange={(e) => setPrimaryCta(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                <ArrowLeft size={14} />
                <span>Back</span>
              </Button>
              <Button variant="primary" onClick={() => setCurrentStep(3)}>
                <span>Continue to Channels</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: CHANNELS */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Share2 size={18} color="#38bdf8" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Step 3: Distribution Channels</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
              Select the platforms where this campaign will be deployed. BrandPilot AI will formulate platform-specific guidance.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {AVAILABLE_CHANNELS.map((ch) => {
                const isSelected = selectedChannels.includes(ch.id);
                return (
                  <div
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    style={{
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isSelected ? '#ffffff' : 'var(--text-secondary)' }}>
                        {ch.label}
                      </span>
                      {isSelected && <CheckCircle2 size={16} color="var(--accent-primary)" />}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ch.desc}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                <ArrowLeft size={14} />
                <span>Back</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => setCurrentStep(4)}
                disabled={selectedChannels.length === 0}
              >
                <span>Review & Finalize</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & SUBMIT */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Sparkles size={18} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Step 4: Review & Strategy Synthesis</h2>
            </div>

            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CAMPAIGN NAME</span>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OBJECTIVE</span>
                <div style={{ fontSize: '0.875rem', color: 'var(--accent-primary)' }}>{objective}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CHANNELS</span>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{selectedChannels.join(', ')}</div>
              </div>
              {offer && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OFFER</span>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{offer}</div>
                </div>
              )}
            </div>

            <div
              onClick={() => setAutoGenerateStrategy(!autoGenerateStrategy)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem',
                borderRadius: 'var(--radius-md)',
                background: autoGenerateStrategy ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.02)',
                border: autoGenerateStrategy ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={autoGenerateStrategy}
                onChange={() => {}}
                style={{ cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: autoGenerateStrategy ? '#38bdf8' : 'var(--text-primary)' }}>
                  Synthesize AI Campaign Strategy Immediately
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Uses Brand Brain and Master Marketing Strategy to generate full funnel and content mix guidance.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <Button variant="secondary" onClick={() => setCurrentStep(3)} disabled={isSubmitting}>
                <ArrowLeft size={14} />
                <span>Back</span>
              </Button>
              <Button variant="primary" onClick={handleCreateCampaign} disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoadingSpinner message="Creating & Synthesizing..." size="sm" />
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Create & Launch Campaign Command Center</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
