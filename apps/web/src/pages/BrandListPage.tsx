import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { EmptyState } from '../components/EmptyState.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { apiRequest } from '../lib/api.js';
import type { BrandWithDetails } from '@vidsnapai/types';
import { Brain, Plus, Globe, Package, Image, ArrowRight, Sparkles } from 'lucide-react';

export const BrandListPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<BrandWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBrands = useCallback(async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    try {
      const data = await apiRequest<{ brands: BrandWithDetails[] }>(`/api/brands`, {
        headers: {
          'x-workspace-id': currentWorkspace.id
        }
      });
      setBrands(data.brands || []);
    } catch {
      setBrands([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', marginBottom: '0.25rem' }}>Brand Brains</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Persistent brand identity, product knowledge, and AI marketing intelligence
          </p>
        </div>
        <Button
          id="create-brand-button"
          variant="primary"
          onClick={() => navigate('/brands/new')}
        >
          <Plus size={16} />
          <span>New Brand Brain</span>
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading brand profiles..." />
      ) : brands.length === 0 ? (
        <EmptyState
          icon={<Brain size={48} />}
          title="No Brand Brains Created Yet"
          description="Tell BrandPilot AI about your brand once, and it remembers your brand voice, product knowledge, and visual identity for all future marketing campaigns."
          action={
            <Button variant="primary" onClick={() => navigate('/brands/new')}>
              <Sparkles size={16} />
              <span>Create Your First Brand Brain</span>
            </Button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {brands.map((brand) => (
            <Card key={brand.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Top Badge & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {brand.industry}
                  </span>

                  {brand.dnaStatus === 'READY' ? (
                    <Badge variant="healthy">
                      <Sparkles size={11} />
                      DNA v{brand.latestDna?.version || 1} READY
                    </Badge>
                  ) : (
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#fcd34d',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
                      }}
                    >
                      DNA NOT GENERATED
                    </span>
                  )}
                </div>

                {/* Brand Name & Description */}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {brand.name}
                </h3>
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    marginBottom: '1.25rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {brand.description}
                </p>

                {/* Quick Meta */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {brand.websiteUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Globe size={13} />
                      <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {brand.websiteUrl.replace(/^https?:\/\//, '')}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Package size={13} />
                    <span>{brand.products?.length || 0} Products</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Image size={13} />
                    <span>{brand.assets?.length || 0} Assets</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Link
                to={`/brands/${brand.id}`}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.8125rem' }}
              >
                <span>Open Brand Brain</span>
                <ArrowRight size={14} />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
