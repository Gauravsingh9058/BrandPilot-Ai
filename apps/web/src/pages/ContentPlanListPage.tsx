import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { apiRequest } from '../lib/api.js';
import type { BrandWithDetails, ContentPlan } from '@vidsnapai/types';
import {
  CalendarDays,
  Sparkles,
  ArrowRight,
  Trash2,
  Layers,
  Flame
} from 'lucide-react';

export const ContentPlanListPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const { brandId } = useParams<{ brandId?: string }>();
  const navigate = useNavigate();

  const [brands, setBrands] = useState<BrandWithDetails[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandId || '');
  const [plans, setPlans] = useState<ContentPlan[]>([]);
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

  const fetchPlans = useCallback(async (bId: string) => {
    if (!bId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiRequest<ContentPlan[]>(`/api/brands/${bId}/content-plans`);
      setPlans(res || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load content plans');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    if (selectedBrandId) {
      fetchPlans(selectedBrandId);
    }
  }, [selectedBrandId, fetchPlans]);

  const handleDeletePlan = async (planId: string) => {
    if (!selectedBrandId || !window.confirm('Are you sure you want to delete this content plan?')) return;
    try {
      await apiRequest(`/api/brands/${selectedBrandId}/content-plans/${planId}`, {
        method: 'DELETE'
      });
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete content plan');
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(129, 140, 248, 0.15)',
                color: '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)'
              }}
            >
              <CalendarDays size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                30-Day Content Calendars
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Autonomous high-converting strategic content calendars engineered by BrandPilot AI
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
                  navigate(`/brands/${e.target.value}/content-plans`);
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
              onClick={() => navigate(`/brands/${selectedBrandId}/content-plans/new`)}
            >
              <Sparkles size={16} />
              <span>Generate 30-Day Plan</span>
            </Button>
          )}
        </div>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} style={{ marginBottom: '1.5rem' }} />}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['ALL', 'READY', 'ACTIVE', 'DRAFT', 'COMPLETED', 'ARCHIVED'].map((st) => (
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
          <LoadingSpinner message="Loading Content Plans..." />
        </div>
      ) : filteredPlans.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <CalendarDays size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            {plans.length === 0 ? 'No Content Plans Generated Yet' : 'No Plans Match Filter'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
            {plans.length === 0
              ? 'Transform your Brand Brain and Marketing Strategy into an autonomous 30-Day Content Plan with diversified hooks, angles, and formats.'
              : 'Try selecting a different status filter above.'}
          </p>
          {isOwnerOrAdmin && selectedBrandId && (
            <Button
              variant="primary"
              onClick={() => navigate(`/brands/${selectedBrandId}/content-plans/new`)}
            >
              <Sparkles size={16} />
              <span>Generate 30-Day Plan</span>
            </Button>
          )}
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filteredPlans.map((p) => {
            const metrics = (p.strategySnapshot as any)?.diversificationMetrics;
            const score = metrics?.score ?? 90;
            const theme = (p.strategySnapshot as any)?.campaignTheme || 'Strategic Content Flow';

            return (
              <Card key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.25rem' }}>{p.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Version {p.version}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                      <span style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Layers size={12} /> {p.durationDays} Days Planned
                      </span>
                    </div>
                  </div>
                  <Badge variant={p.status === 'READY' || p.status === 'ACTIVE' ? 'ready' : 'draft'}>
                    {p.status}
                  </Badge>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>THEME / OBJECTIVE</div>
                  <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 500 }}>{theme}</div>
                </div>

                {/* Metrics Preview */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', padding: '0.5rem 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Flame size={16} color="#f59e0b" />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Diversification Score</span>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: score >= 80 ? '#10b981' : '#f59e0b' }}>
                    {score}%
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isOwnerOrAdmin && (
                      <button
                        onClick={() => handleDeletePlan(p.id)}
                        title="Delete content plan"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/brands/${selectedBrandId}/content-plans/${p.id}`)}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem' }}
                    >
                      <CalendarDays size={13} />
                      <span>Open Calendar</span>
                      <ArrowRight size={12} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
