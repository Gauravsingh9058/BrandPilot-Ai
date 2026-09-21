import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';
import { Badge } from '../components/Badge.js';
import { Modal } from '../components/Modal.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { apiRequest } from '../lib/api.js';
import type { Campaign, CampaignStatus, CampaignStrategy } from '@vidsnapai/types';
import {
  Megaphone,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Check
} from 'lucide-react';

export const CampaignDetailPage: React.FC = () => {
  const { brandId, campaignId } = useParams<{ brandId: string; campaignId: string }>();
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<CampaignStatus>('DRAFT');
  const [editCoreMessage, setEditCoreMessage] = useState('');
  const [editOffer, setEditOffer] = useState('');
  const [editPrimaryCta, setEditPrimaryCta] = useState('');

  const isOwnerOrAdmin = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN';

  const fetchCampaign = useCallback(async () => {
    if (!brandId || !campaignId) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiRequest<Campaign>(`/api/brands/${brandId}/campaigns/${campaignId}`);
      if (res) {
        setCampaign(res);
      } else {
        setErrorMsg('Campaign not found');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to fetch campaign');
    } finally {
      setIsLoading(false);
    }
  }, [brandId, campaignId]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  const handleGenerateStrategy = async () => {
    if (!brandId || !campaignId) return;
    setIsGeneratingStrategy(true);
    setErrorMsg('');
    try {
      const res = await apiRequest<Campaign>(
        `/api/brands/${brandId}/campaigns/${campaignId}/generate-strategy`,
        {
          method: 'POST',
          body: JSON.stringify({
            campaignGoal: campaign?.description
          })
        }
      );

      if (res) {
        setCampaign(res);
        setFeedbackMsg(`Campaign Strategy Version ${res.strategyVersion} generated successfully!`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Strategy generation failed');
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const handleOpenEdit = () => {
    if (!campaign) return;
    setEditName(campaign.name);
    setEditDescription(campaign.description);
    setEditStatus(campaign.status);
    setEditCoreMessage(campaign.coreMessage || '');
    setEditOffer(campaign.offer || '');
    setEditPrimaryCta(campaign.primaryCta || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!brandId || !campaignId) return;
    try {
      const res = await apiRequest<Campaign>(`/api/brands/${brandId}/campaigns/${campaignId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          status: editStatus,
          coreMessage: editCoreMessage || null,
          offer: editOffer || null,
          primaryCta: editPrimaryCta || null
        })
      });

      if (res) {
        setCampaign(res);
        setIsEditModalOpen(false);
        setFeedbackMsg('Campaign details updated');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save changes');
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner message="Retrieving Campaign Details..." />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <ErrorBanner message={errorMsg || 'Campaign not found'} />
        <Button variant="secondary" onClick={() => navigate(`/brands/${brandId}/campaigns`)} style={{ marginTop: '1rem' }}>
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const strat = campaign.campaignStrategy as CampaignStrategy | null;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(`/brands/${brandId}/campaigns`)}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(244, 114, 182, 0.15)',
                color: '#f472b6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Megaphone size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {campaign.name}
                </h1>
                <Badge variant={campaign.status === 'READY' || campaign.status === 'ACTIVE' ? 'ready' : 'draft'}>
                  {campaign.status}
                </Badge>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {campaign.objective} • {campaign.channels.join(', ') || 'Omnichannel'}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isOwnerOrAdmin && (
            <Button variant="secondary" onClick={handleOpenEdit} style={{ fontSize: '0.8125rem' }}>
              <Edit3 size={14} />
              <span>Edit Settings</span>
            </Button>
          )}

          {isOwnerOrAdmin && (
            <Button
              variant="primary"
              onClick={handleGenerateStrategy}
              disabled={isGeneratingStrategy}
              style={{ fontSize: '0.8125rem' }}
            >
              {isGeneratingStrategy ? (
                <LoadingSpinner message="Synthesizing..." size="sm" />
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>{strat ? 'Regenerate Strategy' : 'Synthesize Strategy'}</span>
                </>
              )}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Campaign Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <Card title="Campaign Overview & Scope">
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              {campaign.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CALL TO ACTION</span>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
                  {campaign.primaryCta || 'Not specified'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SPECIAL OFFER</span>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f472b6', marginTop: '0.2rem' }}>
                  {campaign.offer || 'Standard brand offerings'}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Strategy Status" subtitle="Planning readiness">
            {strat ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <CheckCircle2 size={18} color="#10b981" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#10b981' }}>
                    Strategy Version {campaign.strategyVersion} Active
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  AI Strategy synthesized using Brand Brain and Master Marketing Strategy foundations.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Campaign Strategy has not been synthesized yet.
                </p>
                {isOwnerOrAdmin && (
                  <Button variant="primary" onClick={handleGenerateStrategy} disabled={isGeneratingStrategy}>
                    <Sparkles size={14} />
                    <span>Synthesize Now</span>
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Strategy Inspector */}
        {strat && (
          <>
            {/* Core Promise & Funnel Breakdown */}
            <Card
              title="Campaign Funnel & Conversion Journey"
              subtitle={`Core Promise: "${strat.corePromise}"`}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' }}>
                {/* Awareness */}
                <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                    1. Awareness Phase
                  </span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '0.4rem', lineHeight: 1.4 }}>
                    {strat.funnel.awareness.message}
                  </p>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Format: {strat.funnel.awareness.formatGuidance}
                  </div>
                </div>

                {/* Consideration */}
                <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(167, 139, 250, 0.08)', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase' }}>
                    2. Consideration Phase
                  </span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '0.4rem', lineHeight: 1.4 }}>
                    {strat.funnel.consideration.message}
                  </p>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Format: {strat.funnel.consideration.formatGuidance}
                  </div>
                </div>

                {/* Conversion */}
                <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>
                    3. Conversion Phase
                  </span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '0.4rem', lineHeight: 1.4 }}>
                    {strat.funnel.conversion.message}
                  </p>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    CTA: {strat.funnel.conversion.cta}
                  </div>
                </div>
              </div>
            </Card>

            {/* Content Mix & Messaging Angles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <Card title="Content Mix Strategy" subtitle="Recommended content distribution">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {strat.contentMix.map((mix, idx) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600 }}>{mix.type}</span>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{mix.percentage}%</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '0.25rem' }}>
                        <div style={{ height: '100%', width: `${mix.percentage}%`, background: 'var(--accent-gradient)' }} />
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{mix.purpose}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Key Messages & Angles" subtitle="Hooks for autonomous creative orchestration">
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>KEY MESSAGES</span>
                  <ul style={{ marginTop: '0.35rem', paddingLeft: '1.2rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {strat.keyMessages.map((msg, idx) => (
                      <li key={idx}>{msg}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>MESSAGING ANGLES</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
                    {strat.messagingAngles.map((angle, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: '#c4b5fd',
                          fontSize: '0.75rem'
                        }}
                      >
                        {angle}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Channels & Guardrails */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <Card title="Channel Execution Blueprints" subtitle="Platform guidance">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {strat.channelStrategy.map((ch, idx) => (
                    <div key={idx} style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#38bdf8' }}>{ch.channel}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ch.role}</span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{ch.contentApproach}</p>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>CTA: {ch.ctaStrategy}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="KPI Targets & Guardrails" subtitle="Safety standards & metrics">
                <div style={{ marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TARGET METRICS</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
                    {strat.kpis.primary.map((kpi, idx) => (
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>RESTRICTIONS & CLAIMS TO AVOID</span>
                  <ul style={{ marginTop: '0.35rem', paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {strat.guardrails.claimsToAvoid.map((claim, idx) => (
                      <li key={idx}>{claim}</li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* EDIT CAMPAIGN MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Campaign Settings"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Input
            id="edit-camp-name"
            label="Campaign Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />

          <div className="form-group">
            <label className="form-label">Campaign Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as CampaignStatus)}
              className="form-input"
            >
              {['DRAFT', 'READY', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'].map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </div>

          <Input
            id="edit-core-message"
            label="Core Message (Optional)"
            value={editCoreMessage}
            onChange={(e) => setEditCoreMessage(e.target.value)}
          />

          <Input
            id="edit-offer"
            label="Offer / Promotion (Optional)"
            value={editOffer}
            onChange={(e) => setEditOffer(e.target.value)}
          />

          <Input
            id="edit-primary-cta"
            label="Primary CTA (Optional)"
            value={editPrimaryCta}
            onChange={(e) => setEditPrimaryCta(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEdit}>
              Save Settings
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
