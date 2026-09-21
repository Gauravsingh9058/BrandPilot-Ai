import { describe, it, expect, vi } from 'vitest';
import {
  VeoReferenceAssetResolver,
  VEO_PRESERVATION_PROMPT_DIRECTIVE,
  VEO_NEGATIVE_PRESERVATION_DIRECTIVE
} from '../src/veoReferenceAssetResolver.js';
import type {
  Brand,
  BrandProduct,
  BrandAsset,
  ReelScene
} from '@vidsnapai/types';

describe('VeoReferenceAssetResolver & Product Asset Binding to Veo 3.1', () => {
  const brand: Brand = {
    id: 'brand-veo-101',
    workspaceId: 'ws-veo-101',
    name: 'AuraSound Labs',
    slug: 'aurasound-labs',
    description: 'Precision acoustic engineering and noise-canceling headphones',
    industry: 'Consumer Electronics',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const product: BrandProduct = {
    id: 'prod-aura-max',
    brandId: brand.id,
    name: 'Aura Max Noise Canceling Headphones',
    category: 'Audio',
    description: 'Flagship studio headphones with titanium dynamic drivers',
    price: 349,
    currency: 'USD',
    features: ['Titanium drivers', 'Adaptive Active Noise Cancellation', '50hr battery'],
    benefits: ['Pure audiophile sound', 'All-day comfort'],
    usps: ['Zero harmonic distortion'],
    cta: 'Order Aura Max',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const otherProduct: BrandProduct = {
    id: 'prod-aura-bud',
    brandId: brand.id,
    name: 'AuraBuds Wireless Earphones',
    category: 'Audio',
    description: 'Compact wireless earbuds',
    price: 149,
    currency: 'USD',
    features: ['IPX7 waterproof', 'Touch controls'],
    benefits: ['Sweatproof', 'Ultra portable'],
    usps: ['Snug ergonomic fit'],
    cta: 'Buy AuraBuds',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const heroAsset: BrandAsset = {
    id: 'asset-aura-hero-packshot',
    brandId: brand.id,
    workspaceId: brand.workspaceId,
    productId: product.id,
    type: 'PRODUCT_IMAGE',
    name: 'Aura Max Studio Packshot',
    assetPurpose: 'HERO',
    storageKey: 'brands/aura/aura-max-hero.png',
    url: 'https://cdn.vidsnapai.com/brands/aura/aura-max-hero.png',
    mimeType: 'image/png',
    width: 2048,
    height: 2048,
    productionEligible: true,
    isPlaceholder: false,
    isTestAsset: false,
    createdAt: new Date()
  };

  const detailAsset: BrandAsset = {
    id: 'asset-aura-detail-driver',
    brandId: brand.id,
    workspaceId: brand.workspaceId,
    productId: product.id,
    type: 'PRODUCT_IMAGE',
    name: 'Aura Max Titanium Driver Macro',
    assetPurpose: 'DETAIL',
    storageKey: 'brands/aura/aura-max-detail.jpg',
    url: 'https://cdn.vidsnapai.com/brands/aura/aura-max-detail.jpg',
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    productionEligible: true,
    isPlaceholder: false,
    isTestAsset: false,
    createdAt: new Date()
  };

  const lifestyleAsset: BrandAsset = {
    id: 'asset-aura-lifestyle-commute',
    brandId: brand.id,
    workspaceId: brand.workspaceId,
    productId: product.id,
    type: 'PRODUCT_IMAGE',
    name: 'Aura Max Commuter Lifestyle',
    assetPurpose: 'LIFESTYLE',
    storageKey: 'brands/aura/aura-max-lifestyle.webp',
    url: 'https://cdn.vidsnapai.com/brands/aura/aura-max-lifestyle.webp',
    mimeType: 'image/webp',
    width: 1080,
    height: 1920,
    productionEligible: true,
    isPlaceholder: false,
    isTestAsset: false,
    createdAt: new Date()
  };

  const packshotAsset: BrandAsset = {
    id: 'asset-aura-packshot-box',
    brandId: brand.id,
    workspaceId: brand.workspaceId,
    productId: product.id,
    type: 'PRODUCT_IMAGE',
    name: 'Aura Max Packaging Shot',
    assetPurpose: 'PACKSHOT',
    storageKey: 'brands/aura/aura-max-packshot.png',
    url: 'https://cdn.vidsnapai.com/brands/aura/aura-max-packshot.png',
    mimeType: 'image/png',
    width: 1500,
    height: 1500,
    productionEligible: true,
    isPlaceholder: false,
    isTestAsset: false,
    createdAt: new Date()
  };

  const unrelatedBrandAsset: BrandAsset = {
    id: 'asset-aura-generic-brand',
    brandId: brand.id,
    workspaceId: brand.workspaceId,
    productId: otherProduct.id,
    type: 'PRODUCT_IMAGE',
    name: 'AuraBuds Wireless Earphones Case',
    assetPurpose: 'HERO',
    storageKey: 'brands/aura/aurabuds-hero.png',
    url: 'https://cdn.vidsnapai.com/brands/aura/aurabuds-hero.png',
    mimeType: 'image/png',
    width: 1080,
    height: 1080,
    productionEligible: true,
    isPlaceholder: false,
    isTestAsset: false,
    createdAt: new Date()
  };

  const productHeroScene: ReelScene = {
    sceneNumber: 3,
    durationSeconds: 5.0,
    purpose: 'PRODUCT HERO',
    narration: 'Meet Aura Max — the pinnacle of sound.',
    onScreenText: 'AURA MAX',
    visualType: 'PRODUCT_SHOWCASE',
    subject: 'Aura Max floating in macro spotlight',
    environment: 'Luxury studio dark mist',
    composition: 'Macro central 9:16 portrait',
    camera: 'Smooth 45-degree orbit',
    lighting: 'Volumetric studio rim lighting',
    mood: 'Prestigious',
    transition: 'Push zoom',
    animationIntent: 'Luminescent edge glow',
    assetRequirement: 'Aura Max genuine hero image',
    productReference: product.id,
    brandElement: brand.name
  };

  describe('Priority Selection & Limit to Max 3 References', () => {
    it('prioritizes HERO/PACKSHOT -> DETAIL -> LIFESTYLE and returns max 3 references', () => {
      const allAssets = [
        lifestyleAsset, // LIFESTYLE (priority 3)
        detailAsset,    // DETAIL (priority 2)
        packshotAsset,  // PACKSHOT (priority 1)
        heroAsset,      // HERO (priority 1)
        unrelatedBrandAsset // different product (ignored)
      ];

      const result = VeoReferenceAssetResolver.resolveReferences({
        brand,
        product,
        scene: productHeroScene,
        brandAssets: allAssets,
        workspaceId: brand.workspaceId,
        isProduction: true
      });

      expect(result.isValid).toBe(true);
      expect(result.productId).toBe(product.id);
      expect(result.selectedAssets.length).toBe(3);
      expect(result.referenceImages.length).toBe(3);
      expect(result.referenceAssetIds.length).toBe(3);

      // Verify the top 3 selected assets match HERO, PACKSHOT, and DETAIL
      const selectedIds = result.selectedAssets.map((a) => a.id);
      expect(selectedIds).toContain(heroAsset.id);
      expect(selectedIds).toContain(packshotAsset.id);
      expect(selectedIds).toContain(detailAsset.id);
      // Lower priority lifestyle asset not in top 3 when 2 hero/packshots and 1 detail exist
      expect(selectedIds).not.toContain(lifestyleAsset.id);
      // Unrelated brand asset must NEVER be included
      expect(selectedIds).not.toContain(unrelatedBrandAsset.id);

      // Verify Veo reference payload format
      expect(result.referenceImages[0]).toEqual({
        image: {
          uri: expect.stringMatching(/^https:\/\/cdn\.vidsnapai\.com\//),
          mimeType: expect.stringMatching(/^image\//)
        },
        referenceType: 'REFERENCE_TYPE_SUBJECT',
        referenceId: 1
      });
      expect(result.firstFrameAssetId).toBe(result.selectedAssets[0].id);
    });
  });

  describe('Multi-Tenant Isolation & Unrelated Asset Protection', () => {
    it('never uses assets from another workspace or brand', () => {
      const foreignBrandAsset: BrandAsset = {
        ...heroAsset,
        id: 'foreign-brand-asset',
        brandId: 'competitor-brand-id',
        url: 'https://cdn.vidsnapai.com/competitor/hero.png'
      };

      const foreignWorkspaceAsset: BrandAsset = {
        ...heroAsset,
        id: 'foreign-ws-asset',
        workspaceId: 'other-workspace-id',
        url: 'https://cdn.vidsnapai.com/other-ws/hero.png'
      };

      const result = VeoReferenceAssetResolver.resolveReferences({
        brand,
        product,
        scene: productHeroScene,
        brandAssets: [foreignBrandAsset, foreignWorkspaceAsset],
        workspaceId: brand.workspaceId,
        isProduction: true
      });

      expect(result.isValid).toBe(false);
      expect(result.selectedAssets).toHaveLength(0);
      expect(result.failureReason).toContain('PRODUCT_REFERENCE_REQUIRED');
    });

    it('never uses assets bound to a different product', () => {
      const result = VeoReferenceAssetResolver.resolveReferences({
        brand,
        product,
        scene: productHeroScene,
        brandAssets: [unrelatedBrandAsset],
        workspaceId: brand.workspaceId,
        isProduction: true
      });

      expect(result.isValid).toBe(false);
      expect(result.selectedAssets).toHaveLength(0);
      expect(result.failureReason).toContain('PRODUCT_REFERENCE_REQUIRED');
    });
  });

  describe('Validation: Rejecting Placeholders, Test Patterns, and Low-Quality Media', () => {
    it('rejects placeholder and test assets', () => {
      const placeholderAsset: BrandAsset = {
        ...heroAsset,
        id: 'placeholder-asset',
        isPlaceholder: true
      };

      const testPatternAsset: BrandAsset = {
        ...heroAsset,
        id: 'test-pattern-asset',
        isTestAsset: true
      };

      const nonEligibleAsset: BrandAsset = {
        ...heroAsset,
        id: 'non-prod-asset',
        productionEligible: false
      };

      const validation1 = VeoReferenceAssetResolver.validateAssetForVeoReference(placeholderAsset, {
        brandId: brand.id,
        workspaceId: brand.workspaceId,
        productId: product.id
      });
      expect(validation1.valid).toBe(false);
      expect(validation1.reason).toContain('Placeholder');

      const validation2 = VeoReferenceAssetResolver.validateAssetForVeoReference(testPatternAsset, {
        brandId: brand.id,
        workspaceId: brand.workspaceId,
        productId: product.id
      });
      expect(validation2.valid).toBe(false);
      expect(validation2.reason).toContain('Test pattern');

      const validation3 = VeoReferenceAssetResolver.validateAssetForVeoReference(nonEligibleAsset, {
        brandId: brand.id,
        workspaceId: brand.workspaceId,
        productId: product.id
      });
      expect(validation3.valid).toBe(false);
      expect(validation3.reason).toContain('production-eligible');
    });

    it('rejects video files from static reference image list', () => {
      const videoAsset: BrandAsset = {
        ...heroAsset,
        id: 'video-asset',
        type: 'PRODUCT_VIDEO',
        mimeType: 'video/mp4',
        url: 'https://cdn.vidsnapai.com/product.mp4'
      };

      const validation = VeoReferenceAssetResolver.validateAssetForVeoReference(videoAsset, {
        brandId: brand.id,
        workspaceId: brand.workspaceId,
        productId: product.id
      });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Video assets cannot be supplied as static reference images');
    });

    it('rejects low-resolution assets (<128px)', () => {
      const lowResAsset: BrandAsset = {
        ...heroAsset,
        id: 'low-res-asset',
        width: 64,
        height: 64
      };

      const validation = VeoReferenceAssetResolver.validateAssetForVeoReference(lowResAsset, {
        brandId: brand.id,
        workspaceId: brand.workspaceId,
        productId: product.id
      });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('resolution too low');
    });
  });

  describe('Preservation Prompt Directives & Negative Constraints', () => {
    it('instructs Veo explicitly to preserve exact appearance, proportions, and details', () => {
      const result = VeoReferenceAssetResolver.resolveReferences({
        brand,
        product,
        scene: productHeroScene,
        brandAssets: [heroAsset, detailAsset],
        workspaceId: brand.workspaceId,
        isProduction: true
      });

      expect(result.preservationPromptDirective).toBe(
        'Preserve the exact appearance, proportions, colors, materials, branding and recognizable details of the supplied product reference.'
      );
      expect(result.preservationPromptDirective).toBe(VEO_PRESERVATION_PROMPT_DIRECTIVE);
      expect(result.negativePromptDirective).toBe(VEO_NEGATIVE_PRESERVATION_DIRECTIVE);

      // Check negative prompt rules against altered logo, changed colors, different packaging
      expect(result.negativePromptDirective).toContain('altered logo');
      expect(result.negativePromptDirective).toContain('changed product colors');
      expect(result.negativePromptDirective).toContain('different packaging');
      expect(result.negativePromptDirective).toContain('invented accessories');
      expect(result.negativePromptDirective).toContain('invented text on packaging');
      expect(result.negativePromptDirective).toContain('distorted product shape');
    });
  });

  describe('Scene Failure Handling: No Silent Unrelated Object Hallucinations', () => {
    it('marks product scene FAILED if product reference assets are missing', () => {
      const result = VeoReferenceAssetResolver.resolveReferences({
        brand,
        product,
        scene: productHeroScene,
        brandAssets: [], // zero valid assets
        workspaceId: brand.workspaceId,
        isProduction: true
      });

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBe('LOW');
      expect(result.failureReason).toContain('PRODUCT_REFERENCE_REQUIRED');
      expect(result.selectedAssets).toHaveLength(0);
      expect(result.referenceAssetIds).toHaveLength(0);
    });
  });

  describe('Mocked VeoProvider Integration', () => {
    it('successfully calls generateReferenceVideo with resolved referenceImages and correct parameters', async () => {
      const result = VeoReferenceAssetResolver.resolveReferences({
        brand,
        product,
        scene: productHeroScene,
        brandAssets: [heroAsset, detailAsset, lifestyleAsset],
        workspaceId: brand.workspaceId,
        isProduction: true
      });

      expect(result.isValid).toBe(true);

      const mockVeoProvider = {
        generateReferenceVideo: vi.fn().mockResolvedValue({
          operationId: 'operations/veo-ref-op-98765',
          status: 'SUBMITTED',
          model: 'veo-3.1-generate-preview'
        })
      };

      const enhancedPrompt = `${productHeroScene.veoPrompt || ''} ${result.preservationPromptDirective}`.trim();
      const enhancedNegativePrompt = `${productHeroScene.veoNegativePrompt || ''}, ${result.negativePromptDirective}`.trim();

      const veoCallInput = {
        prompt: enhancedPrompt,
        negativePrompt: enhancedNegativePrompt,
        referenceImages: result.referenceImages,
        model: 'veo-3.1-generate-preview' as const,
        aspectRatio: '9:16' as const,
        durationSeconds: 5 as const,
        resolution: '1080p' as const
      };

      const response = await mockVeoProvider.generateReferenceVideo(veoCallInput);

      expect(mockVeoProvider.generateReferenceVideo).toHaveBeenCalledTimes(1);
      expect(mockVeoProvider.generateReferenceVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'veo-3.1-generate-preview',
          aspectRatio: '9:16',
          referenceImages: expect.arrayContaining([
            expect.objectContaining({
              image: {
                uri: heroAsset.url,
                mimeType: 'image/png'
              },
              referenceType: 'REFERENCE_TYPE_SUBJECT',
              referenceId: 1
            })
          ])
        })
      );

      expect(response.operationId).toBe('operations/veo-ref-op-98765');
      expect(response.status).toBe('SUBMITTED');
      expect(response.model).toBe('veo-3.1-generate-preview');
    });
  });
});
