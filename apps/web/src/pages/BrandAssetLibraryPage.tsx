import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderArchive,
  Image as ImageIcon,
  Film,
  Mic,
  Music,
  Volume2,
  ChevronRight,
  Upload,
  Clock,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { Badge } from '../components/Badge.js';
import { Button } from '../components/Button.js';
import { Modal } from '../components/Modal.js';
import { Input } from '../components/Input.js';
import type { Brand, BrandAsset, ReelAsset, BrandProduct } from '@vidsnapai/types';

export const BrandAssetLibraryPage: React.FC = () => {
  const { brandId } = useParams<{ brandId: string }>();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<BrandProduct[]>([]);
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);
  const [reelAssets, setReelAssets] = useState<ReelAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'BRAND' | 'REEL' | 'VOICE' | 'MUSIC' | 'SFX'>('ALL');

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; name: string; type: string; previewUrl?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Assign to Product modal state
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAssetName, setSelectedAssetName] = useState('');
  const [assignProductId, setAssignProductId] = useState('');
  const [assignPurpose, setAssignPurpose] = useState('HERO');
  const [assignEligible, setAssignEligible] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (brandId) {
      fetchAssetLibrary();
    }
  }, [brandId]);

  const fetchAssetLibrary = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [brandRes, assetsRes, productsRes] = await Promise.all([
        apiRequest<{ brand: Brand }>(`/api/brands/${brandId}`),
        apiRequest<{ brandAssets: BrandAsset[]; reelAssets: ReelAsset[] }>(`/api/brands/${brandId}/assets`),
        apiRequest<{ products: BrandProduct[] }>(`/api/brands/${brandId}/products`).catch(() => ({ products: [] }))
      ]);

      setBrand(brandRes.brand);
      setBrandAssets(assetsRes.brandAssets || []);
      setReelAssets(assetsRes.reelAssets || []);
      setProducts(productsRes.products || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load asset library');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignToProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId || !selectedAssetId) return;

    setIsAssigning(true);
    try {
      await apiRequest(`/api/brands/${brandId}/assets/${selectedAssetId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          productId: assignProductId || null,
          assetPurpose: assignPurpose || undefined,
          productionEligible: assignEligible
        })
      });
      setIsAssignOpen(false);
      setSelectedAssetId(null);
      await fetchAssetLibrary();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to assign product');
    } finally {
      setIsAssigning(false);
    }
  };

  const openDeleteModal = (asset: { id: string; name: string; type: string; previewUrl?: string }) => {
    setAssetToDelete(asset);
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  const handleDeleteAsset = async () => {
    if (!brandId || !assetToDelete) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      await apiRequest(`/api/brands/${brandId}/assets/${assetToDelete.id}`, {
        method: 'DELETE'
      });

      // Optimistically remove from state immediately
      setBrandAssets((prev) => prev.filter((a) => a.id !== assetToDelete.id));
      setIsDeleteOpen(false);
      setSuccessToast(`Asset "${assetToDelete.name}" deleted successfully.`);
      setAssetToDelete(null);
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete asset');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(uploadFile);
      const base64Data = await base64Promise;

      await apiRequest('/api/storage/upload', {
        method: 'POST',
        body: JSON.stringify({
          base64Data,
          filename: uploadName.trim() || uploadFile.name,
          mimeType: uploadFile.type || 'application/octet-stream',
          folder: 'brand-assets'
        })
      });

      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadName('');
      await fetchAssetLibrary();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading Brand Asset Library..." />
      </div>
    );
  }

  const allAssetsCombined = [
    ...brandAssets.map((ba) => {
      const meta = (ba.metadata || {}) as Record<string, unknown>;
      const prodId = ba.productId || (meta.productId as string);
      const matchedProd = products.find((p) => p.id === prodId);
      return {
        id: ba.id,
        name: ba.name,
        type: ba.type.toUpperCase(),
        source: 'BRAND_LIBRARY',
        url: ba.url,
        previewUrl: ba.url,
        category: ba.type.includes('image') || ba.type === 'logo' ? 'BRAND' : 'OTHER',
        duration: null as number | null | undefined,
        dimensions: null as string | null | undefined,
        productId: prodId,
        productName: matchedProd?.name,
        assetPurpose: ba.assetPurpose || (meta.assetPurpose as string),
        productionEligible: ba.productionEligible !== false,
        createdAt: ba.createdAt
      };
    }),
    ...reelAssets.map((ra) => ({
      id: ra.id,
      name: ra.filename || `${ra.assetType} Asset (${ra.provider})`,
      type: ra.assetType,
      source: ra.sourceType,
      url: ra.sourceUrl || ra.previewUrl,
      previewUrl: ra.previewUrl || ra.sourceUrl,
      category:
        ra.assetType === 'VOICE'
          ? 'VOICE'
          : ra.assetType === 'MUSIC'
          ? 'MUSIC'
          : ra.assetType === 'SFX'
          ? 'SFX'
          : 'REEL',
      duration: ra.durationSeconds,
      dimensions: ra.width && ra.height ? `${ra.width}x${ra.height}` : null,
      productId: undefined,
      productName: undefined,
      assetPurpose: undefined,
      productionEligible: ra.productionEligible !== false,
      createdAt: ra.createdAt
    }))
  ];

  const filteredAssets = allAssetsCombined.filter((a) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'BRAND') return a.source === 'BRAND_LIBRARY';
    if (activeTab === 'REEL') return a.type === 'VIDEO' || a.type === 'IMAGE' || a.type === 'PRODUCT_IMAGE';
    if (activeTab === 'VOICE') return a.category === 'VOICE' || a.type === 'VOICE';
    if (activeTab === 'MUSIC') return a.category === 'MUSIC' || a.type === 'MUSIC';
    if (activeTab === 'SFX') return a.category === 'SFX' || a.type === 'SFX';
    return true;
  });

  const openAssignModalForAsset = (assetId: string, assetName: string, currentProductId?: string, currentPurpose?: string, currentEligible: boolean = true) => {
    setSelectedAssetId(assetId);
    setSelectedAssetName(assetName);
    setAssignProductId(currentProductId || '');
    setAssignPurpose(currentPurpose || 'HERO');
    setAssignEligible(currentEligible);
    setIsAssignOpen(true);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link>
        <ChevronRight size={14} />
        {brand && (
          <>
            <Link to={`/brands/${brand.id}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{brand.name}</Link>
            <ChevronRight size={14} />
          </>
        )}
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Asset Library</span>
      </div>

      {error && <ErrorBanner message={error} style={{ marginBottom: '1.5rem' }} />}

      {successToast && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: '1.5rem'
          }}
        >
          <span>✓</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* Hero Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(236, 72, 153, 0.12) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          marginBottom: '2rem'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: '100px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            <FolderArchive size={14} />
            Phase 6 Production Asset Library
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
            {brand ? `${brand.name} Production Assets` : 'Asset Library'}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '700px' }}>
            Deterministic product media catalog. Assign assets directly to products with purpose tags (HERO, DETAIL, LIFESTYLE, PACKSHOT).
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsUploadOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
        >
          <Upload size={16} />
          <span>Upload Local Asset</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        {[
          { key: 'ALL', label: 'All Assets', count: allAssetsCombined.length, icon: FolderArchive },
          { key: 'BRAND', label: 'Brand Library', count: brandAssets.length, icon: ImageIcon },
          { key: 'REEL', label: 'Video & Image B-Roll', count: reelAssets.filter((r) => r.assetType === 'VIDEO' || r.assetType === 'IMAGE').length, icon: Film },
          { key: 'VOICE', label: 'Voice Narration', count: reelAssets.filter((r) => r.assetType === 'VOICE').length, icon: Mic },
          { key: 'MUSIC', label: 'Music Tracks', count: reelAssets.filter((r) => r.assetType === 'MUSIC').length, icon: Music },
          { key: 'SFX', label: 'Sound Effects', count: reelAssets.filter((r) => r.assetType === 'SFX').length, icon: Volume2 }
        ].map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeTab === key ? 'var(--primary)' : 'transparent',
              color: activeTab === key ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Icon size={14} />
            <span>{label}</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8, padding: '0.1rem 0.4rem', borderRadius: '100px', background: activeTab === key ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)' }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <FolderArchive size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#ffffff' }}>No assets found</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 1.5rem 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            There are no assets in this category yet. Resolve media from your Reel blueprints or upload local files.
          </p>
          <Button variant="secondary" onClick={() => setIsUploadOpen(true)}>
            Upload Asset
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Asset Media Preview Box */}
              <div
                style={{
                  height: '160px',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                {asset.previewUrl && (asset.type === 'IMAGE' || asset.type === 'PRODUCT_IMAGE' || asset.type === 'LOGO') ? (
                  <img
                    src={asset.previewUrl}
                    alt={asset.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : asset.type === 'VIDEO' || asset.type === 'PRODUCT_VIDEO' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#818cf8' }}>
                    <Film size={36} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Vertical Video B-Roll</span>
                  </div>
                ) : asset.type === 'VOICE' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
                    <Mic size={36} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Voice Narration Track</span>
                  </div>
                ) : asset.type === 'MUSIC' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#f43f5e' }}>
                    <Music size={36} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Background Music</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#fbbf24' }}>
                    <Volume2 size={36} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Audio / SFX</span>
                  </div>
                )}

                {/* Purpose Badge if Brand Library */}
                {asset.assetPurpose && (
                  <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(236, 72, 153, 0.9)', color: '#fff', fontSize: '0.6875rem', fontWeight: 700 }}>
                      {asset.assetPurpose}
                    </span>
                  </div>
                )}

                {/* Source Badge */}
                <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                  <Badge variant={asset.source === 'BRAND_LIBRARY' ? 'success' : asset.source === 'PEXELS' ? 'info' : 'default'}>
                    {asset.source}
                  </Badge>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      {asset.type}
                    </span>
                    {asset.productName && (
                      <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>
                        📦 {asset.productName}
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#ffffff', margin: '0 0 0.5rem 0', wordBreak: 'break-word' }}>
                    {asset.name}
                  </h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} />
                    <span>{asset.duration ? `${asset.duration.toFixed(1)}s` : 'Standard'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {asset.source === 'BRAND_LIBRARY' && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => openAssignModalForAsset(asset.id, asset.name, asset.productId, asset.assetPurpose, asset.productionEligible)}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        >
                          Assign
                        </Button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal({ id: asset.id, name: asset.name, type: asset.type, previewUrl: asset.previewUrl || undefined })}
                          title="Delete Asset"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#ef4444',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                    {asset.dimensions && <span>{asset.dimensions}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign to Product Modal */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="Assign Asset to Product"
      >
        <form onSubmit={handleAssignToProduct}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Binding <strong>{selectedAssetName}</strong> to a product enables deterministic scene matching in Reel production.
          </p>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.875rem', fontWeight: 600 }}>
              Target Product *
            </label>
            <select
              className="form-select"
              value={assignProductId}
              onChange={(e) => setAssignProductId(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
              required
            >
              <option value="">-- Select Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${p.price ?? 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.875rem', fontWeight: 600 }}>
              Asset Purpose
            </label>
            <select
              className="form-select"
              value={assignPurpose}
              onChange={(e) => setAssignPurpose(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            >
              <option value="HERO">HERO — Primary Spotlight Visual</option>
              <option value="DETAIL">DETAIL — Close-up Craftsmanship</option>
              <option value="LIFESTYLE">LIFESTYLE — In-Context Real Use</option>
              <option value="PACKSHOT">PACKSHOT — Isolated Packaging Shot</option>
              <option value="FEATURE">FEATURE — Specific Feature Demonstration</option>
              <option value="LOGO">LOGO — Product or Brand Mark</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              id="library-assign-eligible"
              checked={assignEligible}
              onChange={(e) => setAssignEligible(e.target.checked)}
            />
            <label htmlFor="library-assign-eligible" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
              Mark as Production Eligible
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAssignOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isAssigning}
            >
              Save Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Local Asset"
      >
        {uploadError && <ErrorBanner message={uploadError} style={{ marginBottom: '1rem' }} />}

        <form onSubmit={handleFileUpload}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Choose File (Audio MP3/WAV/M4A, Video MP4, Image PNG/JPG)
            </label>
            <input
              type="file"
              accept="audio/*,video/mp4,image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setUploadFile(file);
                if (file && !uploadName) {
                  setUploadName(file.name.replace(/\.[^/.]+$/, ''));
                }
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--bg-secondary)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)'
              }}
              required
            />
          </div>

          <Input
            id="upload-asset-name"
            label="Asset Title"
            type="text"
            placeholder="e.g. Energetic Electronic Studio Beat"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsUploadOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isUploading}
              disabled={!uploadFile}
            >
              Upload & Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Asset Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => !isDeleting && setIsDeleteOpen(false)}
        title="Delete asset?"
      >
        <div>
          {deleteError && <ErrorBanner message={deleteError} style={{ marginBottom: '1rem' }} />}

          {assetToDelete && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1rem'
                }}
              >
                {assetToDelete.previewUrl ? (
                  <img
                    src={assetToDelete.previewUrl}
                    alt={assetToDelete.name}
                    style={{
                      width: '56px',
                      height: '56px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <FolderArchive size={24} />
                  </div>
                )}
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {assetToDelete.name}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Type: {assetToDelete.type}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  color: '#fca5a5',
                  fontSize: '0.875rem',
                  lineHeight: '1.4'
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#ef4444' }} />
                <div>
                  <strong style={{ color: '#f87171' }}>This action is permanent.</strong>
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    Deleting this asset will remove it from the brand library and storage. Active reels or product references depending on this asset may be affected.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteAsset}
              isLoading={isDeleting}
              disabled={isDeleting}
            >
              Delete Asset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
