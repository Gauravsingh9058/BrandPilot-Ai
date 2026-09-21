import React, { useState, useEffect } from 'react';
import { Modal } from './Modal.js';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { Badge } from './Badge.js';
import { ErrorBanner } from './ErrorBanner.js';
import { LoadingSpinner } from './LoadingSpinner.js';
import { apiRequest } from '../lib/api.js';
import type {
  ReelProductionPlan,
  MetaConnectionSanitized,
  MetaAdPublishResult,
  MetaAdObjective,
  MetaAdCallToActionType
} from '@vidsnapai/types';
import {
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  DollarSign,
  Globe,
  Share2
} from 'lucide-react';

interface MetaAdsPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  reel: ReelProductionPlan;
  onPublishSuccess?: (result: MetaAdPublishResult) => void;
}

export const MetaAdsPublishModal: React.FC<MetaAdsPublishModalProps> = ({
  isOpen,
  onClose,
  reel,
  onPublishSuccess
}) => {
  const [connection, setConnection] = useState<MetaConnectionSanitized | null>(null);
  const [isLoadingConn, setIsLoadingConn] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<MetaAdPublishResult | null>(null);

  // Form State
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>('');
  const [campaignName, setCampaignName] = useState<string>(`${reel.title} - Ad Campaign`);
  const [objective, setObjective] = useState<MetaAdObjective>('OUTCOME_TRAFFIC');
  const [dailyBudgetDollars, setDailyBudgetDollars] = useState<number>(20);
  const [primaryText, setPrimaryText] = useState<string>(
    (reel.concept as any)?.caption || (reel.hook as any)?.text || reel.title || ''
  );
  const [headline, setHeadline] = useState<string>(reel.title || 'Special Promotion');
  const [ctaType, setCtaType] = useState<MetaAdCallToActionType>('LEARN_MORE');
  const [destinationUrl, setDestinationUrl] = useState<string>(
    (reel.cta as any)?.url || 'https://vidsnapai.com'
  );
  const [country, setCountry] = useState<string>('US');

  useEffect(() => {
    if (isOpen) {
      fetchConnection();
      setPublishResult(null);
      setError(null);
    }
  }, [isOpen]);

  const fetchConnection = async () => {
    setIsLoadingConn(true);
    try {
      const res = await apiRequest<MetaConnectionSanitized | null>('/meta/connection', {
        headers: { 'X-Workspace-Id': reel.workspaceId }
      });
      setConnection(res);
      if (res && res.adAccounts && res.adAccounts.length > 0) {
        setSelectedAdAccount(res.selectedAdAccountId || res.adAccounts[0].id);
      }
    } catch (err: unknown) {
      console.error('Failed to load Meta connection:', err);
    } finally {
      setIsLoadingConn(false);
    }
  };

  const handleConnectOAuth = async () => {
    try {
      setError(null);
      const res = await apiRequest<{ url: string }>('/meta/auth/url', {
        headers: { 'X-Workspace-Id': reel.workspaceId }
      });

      // Simulation fallback if mock clientId
      if (res.url.includes('mock_meta_app_id')) {
        const callbackRes = await apiRequest<MetaConnectionSanitized>('/meta/auth/callback', {
          method: 'POST',
          headers: { 'X-Workspace-Id': reel.workspaceId },
          body: JSON.stringify({ code: `mock_code_${Date.now()}` })
        });
        setConnection(callbackRes);
        if (callbackRes.adAccounts.length > 0) {
          setSelectedAdAccount(callbackRes.adAccounts[0].id);
        }
      } else {
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start Meta connection');
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdAccount) {
      setError('Please select an active Meta Ad Account');
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const idempotencyKey = `meta_pub_${reel.workspaceId}_${reel.id}_${Date.now()}`;
      const res = await apiRequest<MetaAdPublishResult>(`/reels/${reel.id}/meta-ads/publish`, {
        method: 'POST',
        headers: { 'X-Workspace-Id': reel.workspaceId },
        body: JSON.stringify({
          campaignId: reel.campaignId || undefined,
          metaAdAccountId: selectedAdAccount,
          metaCampaignName: campaignName,
          metaCampaignObjective: objective,
          dailyBudget: Math.round(dailyBudgetDollars * 100), // convert to cents
          primaryText,
          headline,
          callToActionType: ctaType,
          destinationUrl,
          targeting: {
            geoLocations: { countries: [country] },
            publisherPlatforms: ['facebook', 'instagram'],
            facebookPositions: ['facebook_reels'],
            instagramPositions: ['reels']
          },
          idempotencyKey
        })
      });

      setPublishResult(res);
      if (onPublishSuccess) {
        onPublishSuccess(res);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to launch Meta Ad Campaign');
    } finally {
      setIsPublishing(false);
    }
  };

  const isApproved = reel.status === 'APPROVED' || reel.status === 'READY_FOR_ADS';
  const isRendered = Boolean(reel.outputVideoUrl || reel.renderOutput?.outputVideoUrl);
  const canPublish = isApproved && isRendered && Boolean(connection);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Meta Ads Launcher (Instagram & Facebook Reels)">
      {isLoadingConn ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <LoadingSpinner message="Checking Meta Ads connection..." />
        </div>
      ) : publishResult && publishResult.success ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--success-border, #10b981)',
              borderRadius: '8px'
            }}
          >
            <CheckCircle2 size={24} color="#10b981" />
            <div>
              <div style={{ fontWeight: 600, color: '#10b981' }}>Ad Campaign Launched Successfully!</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Your 9:16 vertical reel has been deployed to Meta Ads Manager.
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.75rem',
              fontSize: '0.85rem'
            }}
          >
            <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Campaign ID:</span>
              <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                {publishResult.externalCampaignId || 'N/A'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ad Set ID:</span>
              <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                {publishResult.externalAdSetId || 'N/A'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ad Creative ID:</span>
              <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                {publishResult.externalCreativeId || 'N/A'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ad ID:</span>
              <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                {publishResult.externalAdId || 'N/A'}
              </div>
            </div>
          </div>

          {publishResult.adsManagerUrl && (
            <a
              href={publishResult.adsManagerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: '#1877F2',
                color: '#fff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              <ExternalLink size={18} /> View in Meta Ads Manager
            </a>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && <ErrorBanner message={error} />}

          {/* Validation Warnings */}
          {!isApproved && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#ef4444'
              }}
            >
              <AlertTriangle size={18} />
              <span>
                <strong>Approval Required:</strong> This reel has status "{reel.status}". You must approve the reel before publishing to Meta Ads.
              </span>
            </div>
          )}

          {!isRendered && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#ef4444'
              }}
            >
              <AlertTriangle size={18} />
              <span>
                <strong>Video Rendering Required:</strong> This reel must be rendered into a vertical MP4 before publishing to Meta Ads.
              </span>
            </div>
          )}

          {/* Connection Header / Connect CTA */}
          <div
            style={{
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Share2 size={18} color="#1877F2" />
                <span style={{ fontWeight: 600 }}>Meta Ads Integration</span>
                {connection ? (
                  <Badge variant="success">Connected</Badge>
                ) : (
                  <Badge variant="warning">Disconnected</Badge>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {connection
                  ? `Connected as ${connection.metaUserName} (${connection.adAccounts.length} Ad Accounts)`
                  : 'Connect your Meta Business Account to deploy vertical video ads.'}
              </div>
            </div>

            {!connection && (
              <Button type="button" variant="primary" onClick={handleConnectOAuth}>
                Connect Meta
              </Button>
            )}
          </div>

          {connection && (
            <>
              {/* Ad Account Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Meta Ad Account <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={selectedAdAccount}
                  onChange={(e) => setSelectedAdAccount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input, var(--bg-secondary))',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                  required
                >
                  {connection.adAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.id}) — {acc.currency}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campaign Hierarchy Configuration */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.75rem'
                }}
              >
                <Input
                  id="meta-campaign-name"
                  label="Campaign Name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  required
                />

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Campaign Objective
                  </label>
                  <select
                    value={objective}
                    onChange={(e) => setObjective(e.target.value as MetaAdObjective)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input, var(--bg-secondary))',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="OUTCOME_TRAFFIC">Traffic (Website Clicks)</option>
                    <option value="OUTCOME_LEADS">Lead Generation</option>
                    <option value="OUTCOME_SALES">Conversions & Sales</option>
                    <option value="OUTCOME_ENGAGEMENT">Engagement (Reels Views)</option>
                    <option value="OUTCOME_AWARENESS">Brand Awareness & Reach</option>
                  </select>
                </div>
              </div>

              {/* Budget & Targeting */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Daily Budget ($ USD)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign
                      size={16}
                      style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                    />
                    <input
                      type="number"
                      min={5}
                      max={10000}
                      value={dailyBudgetDollars}
                      onChange={(e) => setDailyBudgetDollars(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem 0.6rem 2rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input, var(--bg-secondary))',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem'
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Target Country
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Globe
                      size={16}
                      style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                    />
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem 0.6rem 2rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input, var(--bg-secondary))',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="US">United States (US)</option>
                      <option value="GB">United Kingdom (GB)</option>
                      <option value="CA">Canada (CA)</option>
                      <option value="AU">Australia (AU)</option>
                      <option value="DE">Germany (DE)</option>
                      <option value="IN">India (IN)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Ad Creative Details */}
              <Input
                id="meta-headline"
                label="Ad Headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                required
              />

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Primary Text (Caption / Body)
                </label>
                <textarea
                  value={primaryText}
                  onChange={(e) => setPrimaryText(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input, var(--bg-secondary))',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Call To Action
                  </label>
                  <select
                    value={ctaType}
                    onChange={(e) => setCtaType(e.target.value as MetaAdCallToActionType)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input, var(--bg-secondary))',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="LEARN_MORE">Learn More</option>
                    <option value="SHOP_NOW">Shop Now</option>
                    <option value="SIGN_UP">Sign Up</option>
                    <option value="CONTACT_US">Contact Us</option>
                    <option value="WATCH_MORE">Watch More</option>
                    <option value="ORDER_NOW">Order Now</option>
                    <option value="GET_OFFER">Get Offer</option>
                  </select>
                </div>

                <Input
                  id="meta-destination-url"
                  label="Destination URL"
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  required
                />
              </div>

              {/* Creative Live Preview Box */}
              <div
                style={{
                  padding: '0.75rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '0.8rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  <Layers size={14} />
                  <span>Advantage+ Reels Placement Preview (9:16 Video)</span>
                </div>
                <div style={{ fontWeight: 600 }}>{headline}</div>
                <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {primaryText}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ padding: '0.2rem 0.5rem', background: '#1877F2', color: '#fff', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {ctaType.replace('_', ' ')}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{destinationUrl}</span>
                </div>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPublishing}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isPublishing}
              disabled={!canPublish || isPublishing}
            >
              <Play size={16} style={{ marginRight: '0.4rem' }} /> Launch Meta Ad Campaign
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
