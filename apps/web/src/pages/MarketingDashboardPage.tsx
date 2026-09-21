import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { apiRequest } from '../lib/api.js';
import type { BrandWithDetails, MarketingStrategy, Campaign } from '@vidsnapai/types';
import {
  Compass,
  Megaphone,
  Brain,
  Sparkles,
  ArrowRight,
  Target,
  AlertCircle,
  Plus
} from 'lucide-react';

export const MarketingDashboardPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const { brandId } = useParams<{ brandId?: string }>();
  const navigate = useNavigate();

  const [brands, setBrands] = useState<BrandWithDetails[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandId || '');
  const [strategy, setStrategy] = useState<MarketingStrategy | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchBrands = useCallback(async () => {
    try {
      const res = await apiRequest<{ brands: BrandWithDetails[] }>('/api/brands', {
        headers: currentWorkspace ? { 'x-workspace-id': currentWorkspace.id } : {}
      });
      const brandList = res.brands || [];
      setBrands(brandList);
      if (!selectedBrandId && brandList.length > 0) {
        setSelectedBrandId(brandList[0].id);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to fetch brands');
    }
  }, [currentWorkspace, selectedBrandId]);

  const fetchMarketingData = useCallback(async (bId: string) => {
    if (!bId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [stratRes, campRes] = await Promise.all([
        apiRequest<MarketingStrategy>(`/api/brands/${bId}/marketing/strategy`),
        apiRequest<Campaign[]>(`/api/brands/${bId}/campaigns`)
      ]);

      setStrategy(stratRes || null);
      setCampaigns(campRes || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load marketing strategy');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    if (selectedBrandId) {
      fetchMarketingData(selectedBrandId);
    }
  }, [selectedBrandId, fetchMarketingData]);

  const activeBrand = brands.find((b) => b.id === selectedBrandId);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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
                Marketing Brain Command Center
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Strategic positioning, multi-stage funnel intelligence, and autonomous campaign orchestration
              </p>
            </div>
          </div>
        </div>

        {/* Brand Selector */}
        {brands.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Active Brand:</span>
            <select
              value={selectedBrandId}
              onChange={(e) => {
                setSelectedBrandId(e.target.value);
                navigate(`/brands/${e.target.value}/marketing`);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: '#ffffff',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id} style={{ background: '#111622', color: '#fff' }}>
                  {b.name} ({b.industry})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} style={{ marginBottom: '1.5rem' }} />}

      {brands.length === 0 && !isLoading ? (
        <Card style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <Brain size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Brands Found in Workspace</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
            Before configuring marketing intelligence, you need to create a brand and synthesize its Brand Brain.
          </p>
          <Button variant="primary" onClick={() => navigate('/brands/new')}>
            <Sparkles size={16} />
            <span>Create Brand Brain</span>
          </Button>
        </Card>
      ) : isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <LoadingSpinner message="Analyzing Marketing Intelligence..." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Status & Strategy Overview Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {/* Marketing Strategy Status Card */}
            <Card
              title="Master Marketing Strategy"
              subtitle={strategy ? `Version ${strategy.version} Active • ${strategy.objective}` : 'Strategy Configuration'}
            >
              {strategy ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Badge variant="ready">STRATEGY READY (v{strategy.version})</Badge>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Updated {new Date(strategy.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      POSITIONING
                    </div>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {strategy.positioning.valuePropositionStatement}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FUNNEL STAGES</span>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#38bdf8' }}>
                        {strategy.funnelStrategy.stages.length} Active Stages
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CONTENT PILLARS</span>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#c084fc' }}>
                        {strategy.contentStrategy.pillars.length} Pillars
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/brands/${selectedBrandId}/marketing/strategy`)}
                      style={{ fontSize: '0.8125rem' }}
                    >
                      <Target size={14} />
                      <span>Inspect & Edit Strategy</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <AlertCircle size={36} color="var(--warning)" style={{ marginBottom: '0.75rem' }} />
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>No Strategy Synthesized</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
                    Generate your master marketing strategy using the Brand Brain intelligence.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/brands/${selectedBrandId}/marketing/strategy`)}
                  >
                    <Sparkles size={16} />
                    <span>Synthesize Marketing Strategy</span>
                  </Button>
                </div>
              )}
            </Card>

            {/* Campaign Engine Quick Stats */}
            <Card
              title="Campaign Engine Overview"
              subtitle="Targeted promotional initiatives"
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.875rem', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 114, 182, 0.08)', border: '1px solid rgba(244, 114, 182, 0.2)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#f472b6', fontWeight: 600 }}>TOTAL CAMPAIGNS</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{campaigns.length}</div>
                </div>
                <div style={{ padding: '0.875rem', borderRadius: 'var(--radius-sm)', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>STRATEGIES READY</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>
                    {campaigns.filter((c) => c.campaignStrategy !== null).length}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Ready to launch a new targeted campaign?
                </span>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/brands/${selectedBrandId}/campaigns/new`)}
                  style={{ fontSize: '0.8125rem' }}
                >
                  <Plus size={14} />
                  <span>New Campaign</span>
                </Button>
              </div>
            </Card>
          </div>

          {/* Active Campaigns Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Megaphone size={20} color="var(--accent-primary)" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Campaign Initiatives</h2>
              </div>
              <Link
                to={`/brands/${selectedBrandId}/campaigns`}
                style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <span>View All Campaigns</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {campaigns.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <Megaphone size={36} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  No campaigns created for {activeBrand?.name || 'this brand'} yet.
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/brands/${selectedBrandId}/campaigns/new`)}
                  style={{ fontSize: '0.8125rem' }}
                >
                  <Plus size={14} />
                  <span>Create First Campaign</span>
                </Button>
              </Card>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {campaigns.slice(0, 6).map((c) => (
                  <Card key={c.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{c.name}</h3>
                      <Badge variant={c.status === 'READY' || c.status === 'ACTIVE' ? 'ready' : 'draft'}>
                        {c.status}
                      </Badge>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.description}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                        {c.objective}
                      </span>
                      {c.campaignStrategy && (
                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                          Strategy v{c.strategyVersion}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {c.channels.length > 0 ? c.channels.join(', ') : 'Omnichannel'}
                      </span>
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/brands/${selectedBrandId}/campaigns/${c.id}`)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                      >
                        <span>Command Center</span>
                        <ArrowRight size={12} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
