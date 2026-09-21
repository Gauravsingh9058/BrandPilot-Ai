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
import type { BrandWithDetails, BrandDNA, BrandProduct, BrandAsset, BrandAssetType } from '@vidsnapai/types';
import {
  Brain,
  Sparkles,
  Layers,
  Package,
  Image as ImageIcon,
  Globe,
  Plus,
  Trash2,
  Check
} from 'lucide-react';

export const BrandDetailPage: React.FC = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();

  const [brand, setBrand] = useState<BrandWithDetails | null>(null);
  const [dna, setDna] = useState<BrandDNA | null>(null);
  const [_dnaHistory, setDnaHistory] = useState<BrandDNA[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'dna' | 'products' | 'assets'>('dna');
  const [isRegeneratingBrain, setIsRegeneratingBrain] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add Product Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdFeatures, setNewProdFeatures] = useState('');
  const [newProdBenefits, setNewProdBenefits] = useState('');
  const [newProdUsps, setNewProdUsps] = useState('');
  const [newProdOffer, setNewProdOffer] = useState('');
  const [newProdPrice, setNewProdPrice] = useState<number | undefined>(49);
  const [newProdCta, setNewProdCta] = useState('Buy Now');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Add Asset Modal State
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState<BrandAssetType>('product_image');
  const [newAssetUrl, setNewAssetUrl] = useState('');
  const [newAssetProductId, setNewAssetProductId] = useState<string>('');
  const [newAssetPurpose, setNewAssetPurpose] = useState<string>('HERO');
  const [isSubmittingAsset, setIsSubmittingAsset] = useState(false);

  // Assign Asset Modal State
  const [isAssignAssetOpen, setIsAssignAssetOpen] = useState(false);
  const [selectedAssetForAssign, setSelectedAssetForAssign] = useState<BrandAsset | null>(null);
  const [assignProductId, setAssignProductId] = useState<string>('');
  const [assignPurpose, setAssignPurpose] = useState<string>('HERO');
  const [assignEligible, setAssignEligible] = useState<boolean>(true);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  const fetchBrandData = useCallback(async () => {
    if (!brandId) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [brandRes, dnaRes] = await Promise.all([
        apiRequest<{ brand: BrandWithDetails }>(`/api/brands/${brandId}`),
        apiRequest<{ dna: BrandDNA | null; history: BrandDNA[] }>(`/api/brands/${brandId}/dna`)
      ]);

      setBrand(brandRes.brand);
      setDna(dnaRes.dna);
      setDnaHistory(dnaRes.history || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load brand');
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchBrandData();
  }, [fetchBrandData]);

  const handleRegenerateBrain = async () => {
    if (!brandId) return;
    setIsRegeneratingBrain(true);
    setFeedbackMsg('');
    setErrorMsg('');

    try {
      const res = await apiRequest<{ message: string; dna: BrandDNA }>(`/api/brands/${brandId}/dna/generate`, {
        method: 'POST'
      });
      setDna(res.dna);
      setFeedbackMsg(`Brand DNA (Version ${res.dna.version}) regenerated successfully!`);
      await fetchBrandData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setIsRegeneratingBrain(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId || !newProdName.trim()) return;
    setIsSubmittingProduct(true);

    try {
      const featuresArr = newProdFeatures.split(',').map((s) => s.trim()).filter(Boolean);
      const benefitsArr = newProdBenefits.split(',').map((s) => s.trim()).filter(Boolean);
      const uspsArr = newProdUsps.split(',').map((s) => s.trim()).filter(Boolean);

      await apiRequest(`/api/brands/${brandId}/products`, {
        method: 'POST',
        body: JSON.stringify({
          name: newProdName.trim(),
          description: newProdDesc.trim(),
          features: featuresArr.length > 0 ? featuresArr : undefined,
          benefits: benefitsArr.length > 0 ? benefitsArr : undefined,
          usps: uspsArr.length > 0 ? uspsArr : undefined,
          offerInfo: newProdOffer.trim() || undefined,
          price: newProdPrice,
          cta: newProdCta.trim()
        })
      });
      setIsAddProductOpen(false);
      setNewProdName('');
      setNewProdDesc('');
      setNewProdFeatures('');
      setNewProdBenefits('');
      setNewProdUsps('');
      setNewProdOffer('');
      await fetchBrandData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!brandId || !confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiRequest(`/api/brands/${brandId}/products/${productId}`, { method: 'DELETE' });
      await fetchBrandData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId || !newAssetName.trim() || !newAssetUrl.trim()) return;
    setIsSubmittingAsset(true);

    try {
      await apiRequest(`/api/brands/${brandId}/assets`, {
        method: 'POST',
        body: JSON.stringify({
          name: newAssetName.trim(),
          type: newAssetType,
          url: newAssetUrl.trim(),
          storageKey: `assets/${brandId}/${Date.now()}`,
          productId: newAssetProductId || undefined,
          assetPurpose: newAssetPurpose || undefined,
          productionEligible: true
        })
      });
      setIsAddAssetOpen(false);
      setNewAssetName('');
      setNewAssetUrl('');
      setNewAssetProductId('');
      await fetchBrandData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add asset');
    } finally {
      setIsSubmittingAsset(false);
    }
  };

  const openAssignModal = (asset: BrandAsset) => {
    setSelectedAssetForAssign(asset);
    setAssignProductId(asset.productId || (asset.metadata as any)?.productId || '');
    setAssignPurpose(asset.assetPurpose || (asset.metadata as any)?.assetPurpose || 'HERO');
    setAssignEligible(asset.productionEligible !== false);
    setIsAssignAssetOpen(true);
  };

  const handleAssignAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId || !selectedAssetForAssign) return;
    setIsSubmittingAssign(true);

    try {
      await apiRequest(`/api/brands/${brandId}/assets/${selectedAssetForAssign.id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          productId: assignProductId || null,
          assetPurpose: assignPurpose || undefined,
          productionEligible: assignEligible
        })
      });
      setIsAssignAssetOpen(false);
      setSelectedAssetForAssign(null);
      await fetchBrandData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to assign asset');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!brandId || !confirm(`Are you sure you want to delete brand "${brand?.name}"?`)) return;
    try {
      await apiRequest(`/api/brands/${brandId}`, { method: 'DELETE' });
      navigate('/brands');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete brand');
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <LoadingSpinner message="Loading Brand Brain..." />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="main-content">
        <ErrorBanner message={errorMsg || 'Brand not found'} />
        <Button variant="secondary" onClick={() => navigate('/brands')}>
          Return to Brands
        </Button>
      </div>
    );
  }

  const isOwnerOrAdmin = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN';

  return (
    <div className="main-content">
      {/* Top Banner & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.875rem' }}>{brand.name}</h1>
            {dna ? (
              <Badge variant="healthy">
                <Sparkles size={12} />
                DNA v{dna.version} READY
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <span>{brand.industry}</span>
            {brand.websiteUrl && (
              <a
                href={brand.websiteUrl}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#818cf8' }}
              >
                <Globe size={14} />
                <span>{brand.websiteUrl.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>
        </div>

        {/* Global Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isOwnerOrAdmin && (
            <Button
              id="regenerate-brain-button"
              variant="primary"
              onClick={handleRegenerateBrain}
              isLoading={isRegeneratingBrain}
              style={{ fontSize: '0.8125rem' }}
            >
              <Sparkles size={15} />
              <span>{dna ? 'Regenerate Brain (v' + (dna.version + 1) + ')' : 'Generate Brand Brain'}</span>
            </Button>
          )}

          {isOwnerOrAdmin && (
            <button
              onClick={handleDeleteBrand}
              title="Delete Brand"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#fca5a5',
                padding: '0.55rem',
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#6ee7b7',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Check size={16} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && <ErrorBanner message={errorMsg} />}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem',
          gap: '0.5rem'
        }}
      >
        <button
          id="tab-dna"
          onClick={() => setActiveTab('dna')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'dna' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'dna' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <Brain size={16} color={activeTab === 'dna' ? 'var(--accent-primary)' : 'currentColor'} />
          <span>Brand Brain (DNA)</span>
          {dna && (
            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
              v{dna.version}
            </span>
          )}
        </button>

        <button
          id="tab-overview"
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'overview' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <Layers size={16} />
          <span>Profile Overview</span>
        </button>

        <button
          id="tab-products"
          onClick={() => setActiveTab('products')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'products' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'products' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <Package size={16} />
          <span>Products ({brand.products?.length || 0})</span>
        </button>

        <button
          id="tab-assets"
          onClick={() => setActiveTab('assets')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'assets' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'assets' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <ImageIcon size={16} />
          <span>Asset Library ({brand.assets?.length || 0})</span>
        </button>
      </div>

      {/* TAB CONTENT: BRAND BRAIN DNA */}
      {activeTab === 'dna' && (
        <div>
          {!dna ? (
            <Card style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  color: '#818cf8'
                }}
              >
                <Brain size={26} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Brand DNA Not Yet Synthesized</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '450px', margin: '0 auto 1.5rem auto' }}>
                Run the AI Brand Brain engine to synthesize your brand story, customer psychology, and products into persistent Brand DNA.
              </p>
              {isOwnerOrAdmin && (
                <Button variant="primary" onClick={handleRegenerateBrain} isLoading={isRegeneratingBrain}>
                  <Sparkles size={16} />
                  <span>Synthesize Brand Brain Now</span>
                </Button>
              )}
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Strategic Messaging Card */}
              <Card
                title="Strategic Messaging & Value Proposition"
                subtitle="The core marketing hooks powering future campaigns"
                action={<Badge variant="healthy">DNA v{dna.version}</Badge>}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      POSITIONING STATEMENT
                    </span>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                      {dna.messaging.positioning}
                    </p>
                  </div>

                  <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      VALUE PROPOSITION
                    </span>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                      {dna.messaging.valueProposition}
                    </p>
                  </div>
                </div>

                {/* USPs & Proof points */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      KEY USPs
                    </span>
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {dna.messaging.usps.map((usp: string, i: number) => (
                        <li key={i}>{usp}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      PROOF POINTS
                    </span>
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {dna.messaging.proofPoints.map((pp: string, i: number) => (
                        <li key={i}>{pp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Target Audience Psychology */}
              <Card
                title="Audience Psychology & Desires"
                subtitle="Customer triggers and conversion drivers"
              >
                <div style={{ marginBottom: '1rem', padding: '0.875rem', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>PRIMARY TARGET</span>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{dna.audience.primaryAudience}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 600, textTransform: 'uppercase' }}>
                      PAIN POINTS SOLVED
                    </span>
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {dna.audience.painPoints.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 600, textTransform: 'uppercase' }}>
                      CUSTOMER DESIRES
                    </span>
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {dna.audience.desires.map((d: string, i: number) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Content Strategy & Promotion Rules */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <Card title="Content Pillars" subtitle="Themes for 30-day campaign planning">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {dna.contentStrategy.contentPillars.map((pillar: string, i: number) => (
                      <span
                        key={i}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: '#c4b5fd',
                          fontSize: '0.8125rem'
                        }}
                      >
                        {pillar}
                      </span>
                    ))}
                  </div>
                </Card>

                <Card title="Promotion Rules & Guardrails" subtitle="Strict compliance and CTA standards">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRIMARY CALL TO ACTION</span>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                        {dna.promotionRules.primaryCTA}
                      </div>
                    </div>

                    {dna.promotionRules.claimsToAvoid.length > 0 && (
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>CLAIMS TO AVOID</span>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {dna.promotionRules.claimsToAvoid.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Version History Footer */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                Brand DNA Version {dna.version} • Generated by {dna.generatedBy} • Last updated {new Date(dna.updatedAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: PROFILE OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <Card title="Brand Narrative & Story">
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
              {brand.description}
            </p>
            {brand.story && (
              <div>
                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  ORIGIN STORY
                </h4>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {brand.story}
                </p>
              </div>
            )}
          </Card>

          <Card title="Visual Identity">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BRAND COLORS</span>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {brand.brandColors?.primary && (
                    <div
                      title={`Primary: ${brand.brandColors.primary}`}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: brand.brandColors.primary,
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}
                    />
                  )}
                  {brand.brandColors?.secondary && (
                    <div
                      title={`Secondary: ${brand.brandColors.secondary}`}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: brand.brandColors.secondary,
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}
                    />
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TONE OF VOICE</span>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{brand.brandVoice || 'Not specified'}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: PRODUCTS */}
      {activeTab === 'products' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Product & Service Catalog</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                Every reel generation requires a target product with production-eligible media assets.
              </p>
            </div>
            {isOwnerOrAdmin && (
              <Button variant="primary" onClick={() => setIsAddProductOpen(true)} style={{ fontSize: '0.8125rem' }}>
                <Plus size={14} />
                <span>Add Product</span>
              </Button>
            )}
          </div>

          {brand.products.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <Package size={36} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No products added yet.</p>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {brand.products.map((prod: BrandProduct) => {
                const meta = (prod.metadata || {}) as Record<string, unknown>;
                const features: string[] = Array.isArray(prod.features) ? prod.features : Array.isArray(meta.features) ? meta.features as string[] : [];
                const benefits: string[] = Array.isArray(prod.benefits) ? prod.benefits : Array.isArray(meta.benefits) ? meta.benefits as string[] : [];
                const usps: string[] = Array.isArray(prod.usps) ? prod.usps : Array.isArray(meta.usps) ? meta.usps as string[] : [];
                const offerText = typeof prod.offerInfo === 'string' ? prod.offerInfo : typeof meta.offerInfo === 'string' ? meta.offerInfo : typeof prod.offerInfo === 'object' && prod.offerInfo !== null ? JSON.stringify(prod.offerInfo) : '';

                const boundAssets = brand.assets.filter(
                  (a) => a.productId === prod.id || (a.metadata as any)?.productId === prod.id
                );

                return (
                  <Card key={prod.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{prod.name}</h4>
                        {prod.category && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {prod.category}
                          </span>
                        )}
                      </div>
                      {prod.price !== null && prod.price !== undefined && (
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>
                          {prod.currency || '$'}{prod.price}
                        </span>
                      )}
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                      {prod.description}
                    </p>

                    {/* Features */}
                    {features.length > 0 && (
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          FEATURES
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                          {features.map((f, i) => (
                            <span key={i} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Benefits */}
                    {benefits.length > 0 && (
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          BENEFITS
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                          {benefits.map((b, i) => (
                            <span key={i} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* USPs */}
                    {usps.length > 0 && (
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          USPS
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                          {usps.map((u, i) => (
                            <span key={i} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.25)' }}>
                              {u}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Offer Info */}
                    {offerText ? (
                      <div style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontSize: '0.8125rem' }}>
                        🎁 <strong>Offer:</strong> {offerText}
                      </div>
                    ) : null}

                    {/* Attached Product Media */}
                    <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          PRODUCT MEDIA ({boundAssets.length})
                        </span>
                        {boundAssets.length === 0 && (
                          <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600 }}>
                            ⚠️ Media Required
                          </span>
                        )}
                      </div>

                      {boundAssets.length === 0 ? (
                        <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px dashed rgba(239, 68, 68, 0.3)', textAlign: 'center', fontSize: '0.75rem', color: '#fca5a5' }}>
                          No media bound to this product yet. Assign an asset in the Assets tab before generating production reels.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
                          {boundAssets.map((asset) => (
                            <div
                              key={asset.id}
                              style={{
                                position: 'relative',
                                height: '80px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                background: '#000',
                                border: '1px solid rgba(255,255,255,0.1)'
                              }}
                            >
                              <img
                                src={asset.url}
                                alt={asset.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  background: 'rgba(0,0,0,0.8)',
                                  padding: '2px 4px',
                                  fontSize: '0.625rem',
                                  color: '#fff',
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  textTransform: 'uppercase'
                                }}
                              >
                                {asset.assetPurpose || (asset.metadata as any)?.assetPurpose || 'MEDIA'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer CTA & Delete */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        CTA: <strong style={{ color: 'var(--text-primary)' }}>{prod.cta || 'Learn More'}</strong>
                      </span>
                      {isOwnerOrAdmin && (
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                          title="Delete Product"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ASSETS */}
      {activeTab === 'assets' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Brand & Product Asset Gallery</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                Assign assets directly to products with dedicated purposes (HERO, DETAIL, LIFESTYLE, PACKSHOT).
              </p>
            </div>
            {isOwnerOrAdmin && (
              <Button variant="primary" onClick={() => setIsAddAssetOpen(true)} style={{ fontSize: '0.8125rem' }}>
                <Plus size={14} />
                <span>Register Asset</span>
              </Button>
            )}
          </div>

          {brand.assets.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <ImageIcon size={36} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No assets registered yet.</p>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {brand.assets.map((asset: BrandAsset) => {
                const assignedProduct = brand.products.find(
                  (p) => p.id === asset.productId || p.id === (asset.metadata as any)?.productId
                );
                const purpose = asset.assetPurpose || (asset.metadata as any)?.assetPurpose;
                const isEligible = asset.productionEligible !== false;

                return (
                  <Card key={asset.id} style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div
                      style={{
                        position: 'relative',
                        height: '140px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}
                    >
                      <img
                        src={asset.url}
                        alt={asset.name}
                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      {purpose && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: purpose === 'HERO' ? 'rgba(236, 72, 153, 0.9)' : 'rgba(99, 102, 241, 0.9)',
                            color: '#fff',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em'
                          }}
                        >
                          {purpose}
                        </span>
                      )}
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isEligible ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)',
                          color: '#fff',
                          fontSize: '0.625rem',
                          fontWeight: 600
                        }}
                      >
                        {isEligible ? 'PRODUCTION' : 'INELIGIBLE'}
                      </span>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {asset.name}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {asset.type}
                        </span>
                        {assignedProduct ? (
                          <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>
                            📦 {assignedProduct.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <Button
                        variant="secondary"
                        onClick={() => openAssignModal(asset)}
                        style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                      >
                        Assign to Product
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Product Modal */}
      <Modal isOpen={isAddProductOpen} onClose={() => setIsAddProductOpen(false)} title="Add Product / Service">
        <form onSubmit={handleCreateProduct}>
          <Input
            id="new-product-name"
            label="Product Name *"
            placeholder="e.g. Lumina Wireless Hub"
            value={newProdName}
            onChange={(e) => setNewProdName(e.target.value)}
            required
          />

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Product value proposition..."
              value={newProdDesc}
              onChange={(e) => setNewProdDesc(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Features (comma-separated)</label>
            <input
              className="form-input"
              placeholder="e.g. Wireless Charging, 40hr Battery, Active Noise Cancellation"
              value={newProdFeatures}
              onChange={(e) => setNewProdFeatures(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Benefits (comma-separated)</label>
            <input
              className="form-input"
              placeholder="e.g. All-day productivity, Zero cable clutter, Instant device sync"
              value={newProdBenefits}
              onChange={(e) => setNewProdBenefits(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">USPs / Unique Selling Points (comma-separated)</label>
            <input
              className="form-input"
              placeholder="e.g. Patented FastCharge tech, Eco-friendly aluminum chassis"
              value={newProdUsps}
              onChange={(e) => setNewProdUsps(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Special Offer / Promotion</label>
            <input
              className="form-input"
              placeholder="e.g. 20% OFF Launch Discount with code LAUNCH20"
              value={newProdOffer}
              onChange={(e) => setNewProdOffer(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              id="new-product-price"
              label="Price ($)"
              type="number"
              value={newProdPrice ?? ''}
              onChange={(e) => setNewProdPrice(Number(e.target.value))}
            />
            <Input
              id="new-product-cta"
              label="CTA"
              value={newProdCta}
              onChange={(e) => setNewProdCta(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAddProductOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingProduct}>
              Save Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Asset Modal */}
      <Modal isOpen={isAddAssetOpen} onClose={() => setIsAddAssetOpen(false)} title="Register Brand Asset">
        <form onSubmit={handleCreateAsset}>
          <Input
            id="new-asset-name"
            label="Asset Name *"
            placeholder="e.g. Lumina Hero Packshot"
            value={newAssetName}
            onChange={(e) => setNewAssetName(e.target.value)}
            required
          />

          <div className="form-group">
            <label className="form-label">Asset Type</label>
            <select
              className="form-select"
              value={newAssetType}
              onChange={(e) => setNewAssetType(e.target.value as BrandAssetType)}
            >
              <option value="product_image">Product Photo</option>
              <option value="logo">Brand Logo</option>
              <option value="brand_image">Brand Aesthetic Image</option>
              <option value="document">Guideline Document</option>
            </select>
          </div>

          <Input
            id="new-asset-url"
            label="Image URL *"
            placeholder="https://example.com/photo.png"
            value={newAssetUrl}
            onChange={(e) => setNewAssetUrl(e.target.value)}
            required
          />

          <div className="form-group">
            <label className="form-label">Assign to Product (Optional)</label>
            <select
              className="form-select"
              value={newAssetProductId}
              onChange={(e) => setNewAssetProductId(e.target.value)}
            >
              <option value="">-- General Brand Asset (Unassigned) --</option>
              {brand.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {newAssetProductId && (
            <div className="form-group">
              <label className="form-label">Asset Purpose</label>
              <select
                className="form-select"
                value={newAssetPurpose}
                onChange={(e) => setNewAssetPurpose(e.target.value)}
              >
                <option value="HERO">HERO (Main Product Visual)</option>
                <option value="DETAIL">DETAIL (Texture / Feature Shot)</option>
                <option value="LIFESTYLE">LIFESTYLE (In-Action Visual)</option>
                <option value="PACKSHOT">PACKSHOT (Clean Packaging View)</option>
                <option value="FEATURE">FEATURE (Spec Highlight)</option>
                <option value="LOGO">LOGO (Product Branding)</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAddAssetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingAsset}>
              Register Asset
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign to Product Modal */}
      <Modal isOpen={isAssignAssetOpen} onClose={() => setIsAssignAssetOpen(false)} title="Assign Asset to Product">
        <form onSubmit={handleAssignAsset}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Binding <strong>{selectedAssetForAssign?.name}</strong> to a product enables deterministic scene matching in Reel production.
          </p>

          <div className="form-group">
            <label className="form-label">Target Product *</label>
            <select
              className="form-select"
              value={assignProductId}
              onChange={(e) => setAssignProductId(e.target.value)}
              required
            >
              <option value="">-- Select Product --</option>
              {brand.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${p.price ?? 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Asset Purpose</label>
            <select
              className="form-select"
              value={assignPurpose}
              onChange={(e) => setAssignPurpose(e.target.value)}
            >
              <option value="HERO">HERO — Primary Spotlight Visual</option>
              <option value="DETAIL">DETAIL — Close-up Craftsmanship</option>
              <option value="LIFESTYLE">LIFESTYLE — In-Context Real Use</option>
              <option value="PACKSHOT">PACKSHOT — Isolated Packaging Shot</option>
              <option value="FEATURE">FEATURE — Specific Feature Demonstration</option>
              <option value="LOGO">LOGO — Product or Brand Mark</option>
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <input
              type="checkbox"
              id="assign-production-eligible"
              checked={assignEligible}
              onChange={(e) => setAssignEligible(e.target.checked)}
            />
            <label htmlFor="assign-production-eligible" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
              Mark as Production Eligible (Ready for video generation)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAssignAssetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingAssign}>
              Save Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
