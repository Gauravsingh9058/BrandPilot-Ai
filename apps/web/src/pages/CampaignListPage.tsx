import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { apiRequest } from '../lib/api.js';
import type { BrandWithDetails, Campaign } from '@vidsnapai/types';
import {
  Megaphone,
  Plus,
  ArrowRight,
  Trash2
} from 'lucide-react';

export const CampaignListPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const { brandId } = useParams<{ brandId?: string }>();
  const navigate = useNavigate();

  const [brands, setBrands] = useState<BrandWithDetails[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandId || '');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const isOwnerOrAdmin = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN';

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

  const fetchCampaigns = useCallback(async (bId: string) => {
    if (!bId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiRequest<Campaign[]>(`/api/brands/${bId}/campaigns`);
      setCampaigns(res || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    if (selectedBrandId) {
      fetchCampaigns(selectedBrandId);
    }
  }, [selectedBrandId, fetchCampaigns]);

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!selectedBrandId || !window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await apiRequest(`/api/brands/${selectedBrandId}/campaigns/${campaignId}`, {
        method: 'DELETE'
      });
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete campaign');
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

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
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Campaign Initiatives
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Tactical promotional drives powered by Brand Brain and Marketing Strategy
              </p>
            </div>
          </div>
        </div>

        {/* Brand & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {brands.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Brand:</span>
              <select
                value={selectedBrandId}
                onChange={(e) => {
                  setSelectedBrandId(e.target.value);
                  navigate(`/brands/${e.target.value}/campaigns`);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  color: '#ffffff',
                  padding: '0.45rem 0.875rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id} style={{ background: '#111622', color: '#fff' }}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isOwnerOrAdmin && selectedBrandId && (
            <Button
              variant="primary"
              onClick={() => navigate(`/brands/${selectedBrandId}/campaigns/new`)}
            >
              <Plus size={16} />
              <span>Create Campaign</span>
            </Button>
          )}
        </div>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} style={{ marginBottom: '1.5rem' }} />}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['ALL', 'DRAFT', 'READY', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: statusFilter === st ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
              background: statusFilter === st ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: statusFilter === st ? '#818cf8' : 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {st}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <LoadingSpinner message="Loading Campaigns..." />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Megaphone size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            {campaigns.length === 0 ? 'No Campaigns Created Yet' : 'No Campaigns Match Filter'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
            {campaigns.length === 0
              ? 'Launch your first targeted campaign initiative to begin structured content planning.'
              : 'Try selecting a different status filter above.'}
          </p>
          {isOwnerOrAdmin && selectedBrandId && (
            <Button
              variant="primary"
              onClick={() => navigate(`/brands/${selectedBrandId}/campaigns/new`)}
            >
              <Plus size={16} />
              <span>Create Campaign</span>
            </Button>
          )}
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredCampaigns.map((c) => (
            <Card key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{c.name}</h3>
                <Badge variant={c.status === 'READY' || c.status === 'ACTIVE' ? 'ready' : 'draft'}>
                  {c.status}
                </Badge>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1rem', lineHeight: 1.4, minHeight: '2.4rem' }}>
                {c.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                  {c.objective}
                </span>
                {c.campaignStrategy ? (
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
                    Strategy v{c.strategyVersion} Ready
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    Strategy Pending
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.875rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {c.channels.length > 0 ? c.channels.join(', ') : 'Omnichannel'}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => handleDeleteCampaign(c.id)}
                      title="Delete campaign"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/brands/${selectedBrandId}/campaigns/${c.id}`)}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                  >
                    <span>Command Center</span>
                    <ArrowRight size={12} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
