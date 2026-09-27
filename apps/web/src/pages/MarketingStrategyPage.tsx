import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';
import { Modal } from '../components/Modal.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { apiRequest } from '../lib/api.js';
import type { BrandWithDetails, MarketingStrategy, MarketingObjective } from '@vidsnapai/types';
import {
  Compass,
  Sparkles,
  Edit3,
  Check,
  ArrowLeft
} from 'lucide-react';

const MARKETING_OBJECTIVES: { value: MarketingObjective; label: string; desc: string }[] = [
  { value: 'BRAND_AWARENESS', label: 'Brand Awareness', desc: 'Expand reach and establish top-of-mind brand recognition' },
  { value: 'PRODUCT_AWARENESS', label: 'Product Awareness', desc: 'Educate prospects on specific product capabilities' },
  { value: 'CUSTOMER_ACQUISITION', label: 'Customer Acquisition', desc: 'Drive new customer signups and initial purchases' },
  { value: 'LEAD_GENERATION', label: 'Lead Generation', desc: 'Collect qualified buyer interest and inquiries' },
  { value: 'SALES', label: 'Direct Sales & Revenue', desc: 'Accelerate checkout conversions and deal closing' },
  { value: 'PRODUCT_LAUNCH', label: 'Product Launch', desc: 'Maximize impact for a new feature or flagship release' },
  { value: 'PROMOTION', label: 'Special Promotion / Offer', desc: 'Drive urgency around limited-time incentives' },
  { value: 'ENGAGEMENT', label: 'Community Engagement', desc: 'Spark discussions, shares, and viral interactions' },
  { value: 'WEBSITE_TRAFFIC', label: 'Website Traffic', desc: 'Funnel high-intent social audiences to your website' },
  { value: 'APP_DOWNLOADS', label: 'App Installs', desc: 'Drive mobile/desktop app installations' },
  { value: 'RETENTION', label: 'Retention & Loyalty', desc: 'Reinforce customer satisfaction and repeat usage' }
];

export const MarketingStrategyPage: React.FC = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();

  const [brand, setBrand] = useState<BrandWithDetails | null>(null);
  const [strategy, setStrategy] = useState<MarketingStrategy | null>(null);
  const [history, setHistory] = useState<MarketingStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Generation Form State
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<MarketingObjective>('CUSTOMER_ACQUISITION');
  const [businessGoal, setBusinessGoal] = useState('Acquire 500 new active customers in the next 60 days');
  const [marketingGoal, setMarketingGoal] = useState('Position our brand as the high-performance benchmark in our niche');
  const [campaignRequirements, setCampaignRequirements] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPositioning, setEditPositioning] = useState('');
  const [editHook, setEditHook] = useState('');
  const [editPrimaryCta, setEditPrimaryCta] = useState('');

  const isOwnerOrAdmin = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN';

  const loadData = useCallback(async () => {
    if (!brandId) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [brandRes, stratRes, histRes] = await Promise.all([
        apiRequest<{ brand: BrandWithDetails }>(`/api/brands/${brandId}`),
        apiRequest<MarketingStrategy>(`/api/brands/${brandId}/marketing/strategy`),
        apiRequest<MarketingStrategy[]>(`/api/brands/${brandId}/marketing/strategy/history`)
      ]);

      if (brandRes?.brand) {
        setBrand(brandRes.brand);
      }
      setStrategy(stratRes || null);
      if (histRes) {
        setHistory(histRes);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load marketing strategy');
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateStrategy = async () => {
    if (!brandId) return;
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const res = await apiRequest<MarketingStrategy>(`/api/brands/${brandId}/marketing/strategy/generate`, {
        method: 'POST',
        body: JSON.stringify({
          objective: selectedObjective,
          businessGoal,
          marketingGoal,
          campaignRequirements: campaignRequirements || undefined
        })
      });

      if (res) {
        setStrategy(res);
        setIsGenModalOpen(false);
        setFeedbackMsg(`Marketing Strategy Version ${res.version} successfully synthesized!`);
        await loadData();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'AI Strategy generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenEdit = () => {
    if (!strategy) return;
    setEditPositioning(strategy.positioning.valuePropositionStatement);
    setEditHook(strategy.messagingStrategy.brandNarrativeHook);
    setEditPrimaryCta(strategy.messagingStrategy.voiceGuidance || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!brandId || !strategy) return;
    setErrorMsg('');
    try {
      const res = await apiRequest<MarketingStrategy>(`/api/brands/${brandId}/marketing/strategy`, {
        method: 'PATCH',
        body: JSON.stringify({
          positioning: {
            ...strategy.positioning,
            valuePropositionStatement: editPositioning
          },
          messagingStrategy: {
            ...strategy.messagingStrategy,
            brandNarrativeHook: editHook,
            voiceGuidance: editPrimaryCta
          }
        })
      });

      if (res) {
        setStrategy(res);
        setIsEditModalOpen(false);
        setFeedbackMsg('Strategy adjustments saved successfully');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save strategy updates');
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner message="Retrieving Master Marketing Strategy..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Back link */}
      <button
        onClick={() => navigate(brandId ? `/brands/${brandId}/marketing` : '/marketing')}
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
        <span>Back to Marketing Overview</span>
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Compass size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Master Marketing Strategy
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {brand?.name} • Persistent strategic intelligence driving all campaign decisions
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {strategy && history.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Version:</span>
              <select
                value={strategy.version}
                onChange={(e) => {
                  const targetVer = history.find((h) => h.version === Number(e.target.value));
                  if (targetVer) setStrategy(targetVer);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ffffff',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                {history.map((h) => (
                  <option key={h.id} value={h.version} style={{ background: '#111622', color: '#fff' }}>
                    v{h.version} ({new Date(h.createdAt || Date.now()).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {strategy && isOwnerOrAdmin && (
            <Button variant="secondary" onClick={handleOpenEdit} style={{ fontSize: '0.8125rem' }}>
              <Edit3 size={14} />
              <span>Edit Strategy</span>
            </Button>
          )}

          {isOwnerOrAdmin && (
            <Button
              variant="primary"
              onClick={() => setIsGenModalOpen(true)}
              style={{ fontSize: '0.8125rem' }}
            >
              <Sparkles size={14} />
              <span>{strategy ? 'Regenerate Strategy' : 'Synthesize Strategy'}</span>
            </Button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Check size={16} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && <ErrorBanner message={errorMsg} style={{ marginBottom: '1.5rem' }} />}

      {!strategy ? (
        <Card style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Compass size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Marketing Strategy Configured</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '520px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
            Transform your Brand Brain into an actionable, structured marketing blueprint with target audience segments, positioning statement, multi-stage funnel, and channel guidance.
          </p>
          <Button variant="primary" onClick={() => setIsGenModalOpen(true)}>
            <Sparkles size={16} />
            <span>Synthesize Master Marketing Strategy</span>
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Top Strategic Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <Card title="Strategic Positioning & Value Proposition" subtitle={`Objective: ${strategy.objective}`}>
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>VALUE PROPOSITION STATEMENT</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                  "{strategy.positioning.valuePropositionStatement}"
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MARKET CATEGORY</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    {strategy.positioning.marketCategory}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>COMPETITIVE MOAT</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#a78bfa', marginTop: '0.2rem' }}>
                    {strategy.positioning.competitiveMoat}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Goals & Focus" subtitle="Strategic milestones">
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BUSINESS GOAL</span>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {strategy.businessGoal}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MARKETING GOAL</span>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {strategy.marketingGoal}
                </p>
              </div>
            </Card>
          </div>

          {/* Multi-Stage Funnel Strategy */}
          <Card
            title="Multi-Stage Funnel Architecture"
            subtitle="Audience progression from problem awareness to conversion and retention"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {strategy.funnelStrategy.stages.map((stage, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color:
                            stage.stage === 'AWARENESS'
                              ? '#38bdf8'
                              : stage.stage === 'CONSIDERATION'
                              ? '#a78bfa'
                              : stage.stage === 'CONVERSION'
                              ? '#34d399'
                              : '#f472b6'
                        }}
                      >
                        {stage.stage}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stage {idx + 1}</span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      {stage.objective}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                      {stage.messageFocus}
                    </p>
                  </div>
                  <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>CTA: {stage.ctaBehavior}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Content Strategy & Pillars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Card title="Content Pillars" subtitle="Strategic themes for campaign generation">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {strategy.contentStrategy.pillars.map((pillar, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.2)'
                    }}
                  >
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#c4b5fd', marginBottom: '0.2rem' }}>
                      {pillar.name}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      {pillar.purpose}
                    </p>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Angle: {pillar.messagingAngle}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Recommended Content Mix" subtitle="Strategic distribution ratio">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {strategy.contentStrategy.contentMix.map((mix, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mix.type}</span>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{mix.percentage}%</span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        borderRadius: '3px',
                        background: 'rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                        marginBottom: '0.25rem'
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${mix.percentage}%`,
                          background: 'var(--accent-gradient)'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{mix.purpose}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Channels & KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Card title="Channel Strategy" subtitle="Recommended social platform blueprints">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {strategy.channelStrategy.channelGuidance.map((ch, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#38bdf8' }}>{ch.channel}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ch.formatGuidance}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ch.contentApproach}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Target KPIs & Guardrails" subtitle="Measurement and compliance rules">
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PRIMARY METRICS</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
                  {strategy.kpiStrategy.primaryKPIs.map((kpi, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#6ee7b7',
                        fontSize: '0.75rem'
                      }}
                    >
                      {kpi}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>CLAIMS TO AVOID</span>
                <ul style={{ marginTop: '0.35rem', paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {strategy.risksAndGuardrails.claimsToAvoid.map((claim, idx) => (
                    <li key={idx}>{claim}</li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* GENERATE STRATEGY MODAL */}
      <Modal
        isOpen={isGenModalOpen}
        onClose={() => setIsGenModalOpen(false)}
        title="Synthesize Master Marketing Strategy"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            BrandPilot AI will examine your Brand Brain, product catalog, and target audience to craft a tailored Marketing Strategy.
          </p>

          <div className="form-group">
            <label className="form-label">Primary Marketing Objective</label>
            <select
              value={selectedObjective}
              onChange={(e) => setSelectedObjective(e.target.value as MarketingObjective)}
              className="form-input"
            >
              {MARKETING_OBJECTIVES.map((obj) => (
                <option key={obj.value} value={obj.value}>
                  {obj.label} — {obj.desc}
                </option>
              ))}
            </select>
          </div>

          <Input
            id="gen-biz-goal"
            label="Business Goal"
            placeholder="e.g. Increase product sales by 30% this quarter"
            value={businessGoal}
            onChange={(e) => setBusinessGoal(e.target.value)}
          />

          <Input
            id="gen-mkt-goal"
            label="Marketing Goal"
            placeholder="e.g. Build credibility and drive high-intent free trials"
            value={marketingGoal}
            onChange={(e) => setMarketingGoal(e.target.value)}
          />

          <div className="form-group">
            <label className="form-label">Additional Campaign Requirements (Optional)</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. Focus on B2B buyers, highlight our patented low-latency tech"
              value={campaignRequirements}
              onChange={(e) => setCampaignRequirements(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setIsGenModalOpen(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleGenerateStrategy} disabled={isGenerating}>
              {isGenerating ? <LoadingSpinner message="Synthesizing Strategy..." /> : 'Synthesize Strategy'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* EDIT STRATEGY MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Marketing Strategy"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Value Proposition Statement</label>
            <textarea
              className="form-input"
              rows={3}
              value={editPositioning}
              onChange={(e) => setEditPositioning(e.target.value)}
            />
          </div>

          <Input
            id="edit-hook"
            label="Brand Narrative Hook"
            value={editHook}
            onChange={(e) => setEditHook(e.target.value)}
          />

          <Input
            id="edit-voice"
            label="Voice & Tone Guidance"
            value={editPrimaryCta}
            onChange={(e) => setEditPrimaryCta(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEdit}>
              Save Adjustments
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
