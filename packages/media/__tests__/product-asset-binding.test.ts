import { describe, it, expect, vi } from 'vitest';
import { AssetResolver } from '../src/assetResolver.js';
import { MediaService } from '../src/mediaService.js';
import { ProductionAssetValidator } from '../src/productionAssetValidator.js';
import type {
  Brand,
  BrandProduct,
  BrandAsset,
  MediaRequirement,
  ReelProductionPlan,
  MediaProvider
} from '@vidsnapai/types';

describe('Product Asset Binding Architecture Tests', () => {
  const brand: Brand = {
    id: 'brand-test-1',
    workspaceId: 'ws-test-1',
    name: 'AeroVelocity Athletics',
    slug: 'aerovelocity-athletics',
    description: 'High performance vertical running gear',
    industry: 'Sports & Apparel',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const productA: BrandProduct = {
    id: 'prod-a',
    brandId: brand.id,
    name: 'HyperShoe Pro',
    category: 'Footwear',
    description: 'Carbon-fiber plated marathon racing shoes',
    price: 199,
    currency: 'USD',
    features: ['Carbon plate', 'Ultralight foam'],
    benefits: ['4% energy return', 'Faster race times'],
    usps: ['Sub-2hr marathon certified'],
    cta: 'Order HyperShoe Pro',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const productB: BrandProduct = {
    id: 'prod-b',
    brandId: brand.id,
    name: 'AeroVest Elite',
    category: 'Apparel',
    description: 'Hydro-cooling endurance hydration vest',
    price: 89,
    currency: 'USD',
    features: ['Hydration bladder', 'Reflective harness'],
    benefits: ['Zero bounce', 'Stay hydrated'],
    usps: ['Ultralight mesh'],
    cta: 'Get AeroVest',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const assetForProductA: BrandAsset = {
    id: 'asset-prod-a-hero',
    brandId: brand.id,
    type: 'product_image',
    name: 'HyperShoe Pro Hero 4K Studio',
    storageKey: 'brands/assets/hypershoe-hero.png',
    url: 'https://storage.vidsnapai.com/hypershoe-hero.png',
    productId: 'prod-a',
    assetPurpose: 'HERO',
    productionEligible: true,
    isPlaceholder: false,
    isTestAsset: false,
    width: 1080,
    height: 1920,
    mimeType: 'image/png',
    metadata: {
      productId: 'prod-a',
      assetPurpose: 'HERO',
      productionEligible: true
    },
    createdAt: new Date()
  };

  const assetForProductB: BrandAsset = {
    id: 'asset-prod-b-hero',
    brandId: brand.id,
    type: 'product_image',
    name: 'AeroVest Elite Hero Shot',
    storageKey: 'brands/assets/aerovest-hero.png',
    url: 'https://storage.vidsnapai.com/aerovest-hero.png',
    productId: 'prod-b',
    assetPurpose: 'HERO',
    productionEligible: true,
    isPlaceholder: false,
    isTestAsset: false,
    width: 1080,
    height: 1920,
    mimeType: 'image/png',
    metadata: {
      productId: 'prod-b',
      assetPurpose: 'HERO',
      productionEligible: true
    },
    createdAt: new Date()
  };

  const unrelatedBrandImage: BrandAsset = {
    id: 'asset-unrelated-brand-bg',
    brandId: brand.id,
    type: 'brand_image',
    name: 'Mountain Sunset Aesthetic Background',
    storageKey: 'brands/assets/mountain-sunset.jpg',
    url: 'https://storage.vidsnapai.com/mountain-sunset.jpg',
    productionEligible: true,
    isPlaceholder: false,
    isTestAsset: false,
    metadata: {
      tags: ['mountain', 'nature', 'sunset']
    },
    createdAt: new Date()
  };

  it('1. product A cannot use product B asset (strict product isolation)', () => {
    const requirementForProductA: MediaRequirement = {
      sceneNumber: 1,
      purpose: 'PRODUCT_HERO',
      assetRequirement: 'HyperShoe Pro hero spotlight',
      productReference: 'HyperShoe Pro',
      visualType: 'PRODUCT_SHOWCASE',
      mood: 'Energetic',
      subject: 'HyperShoe Pro',
      environment: 'Studio lighting',
      durationSeconds: 5
    };

    // Give resolver ONLY product B's asset
    const matches = AssetResolver.matchBrandAssets({
      brand,
      products: [productA, productB],
      brandAssets: [assetForProductB],
      requirement: requirementForProductA
    });

    // Product B's asset must NEVER match for Product A
    const matchedProductB = matches.find((m) => m.asset.id === assetForProductB.id);
    expect(matchedProductB).toBeUndefined();
    expect(matches.length).toBe(0);
  });

  it('2. product with HERO image passes matching and achieves top score', () => {
    const requirementForProductA: MediaRequirement = {
      sceneNumber: 1,
      purpose: 'PRODUCT_HERO',
      assetRequirement: 'HyperShoe Pro hero spotlight',
      productReference: 'HyperShoe Pro',
      visualType: 'PRODUCT_SHOWCASE',
      mood: 'Energetic',
      subject: 'HyperShoe Pro',
      environment: 'Studio lighting',
      durationSeconds: 5
    };

    const matches = AssetResolver.matchBrandAssets({
      brand,
      products: [productA, productB],
      brandAssets: [assetForProductA, assetForProductB, unrelatedBrandImage],
      requirement: requirementForProductA
    });

    expect(matches.length).toBeGreaterThan(0);
    const topMatch = matches[0];
    expect(topMatch.asset.id).toBe(assetForProductA.id);
    expect(topMatch.score).toBe(100);
    expect(topMatch.isFirstParty).toBe(true);
  });

  it('3. product with only unrelated brand image fails to match for product hero', () => {
    const requirementForProductA: MediaRequirement = {
      sceneNumber: 1,
      purpose: 'PRODUCT_HERO',
      assetRequirement: 'HyperShoe Pro hero spotlight',
      productReference: 'HyperShoe Pro',
      visualType: 'PRODUCT_SHOWCASE',
      mood: 'Energetic',
      subject: 'HyperShoe Pro',
      environment: 'Studio lighting',
      durationSeconds: 5
    };

    const matches = AssetResolver.matchBrandAssets({
      brand,
      products: [productA],
      brandAssets: [unrelatedBrandImage],
      requirement: requirementForProductA
    });

    // Unrelated brand images must never match for PRODUCT_HERO / PRODUCT_SHOWCASE
    expect(matches.length).toBe(0);
  });

  it('4. Pexels is blocked for product hero scenes and resolves as fallback placeholder when first-party media is missing', async () => {
    const mockProvider: MediaProvider = {
      providerName: 'pexels',
      searchVideos: vi.fn().mockResolvedValue({ assets: [{ id: 'px-1', type: 'video', url: 'https://pexels.com/v.mp4', title: 'Running Shoes' }] }),
      searchImages: vi.fn().mockResolvedValue({ assets: [] }),
      getAssetDetails: vi.fn()
    };

    const mockReelPlan: ReelProductionPlan = {
      id: 'reel-test-1',
      brandId: brand.id,
      contentJobId: 'job-1',
      contentPlanId: 'plan-1',
      workspaceId: 'ws-test-1',
      version: 1,
      title: 'HyperShoe Launch',
      concept: {} as any,
      objective: 'CONVERSION',
      audience: 'Runners',
      funnelStage: 'CONVERSION',
      contentPillar: 'Product',
      durationSeconds: 15,
      aspectRatio: '9:16',
      platform: 'INSTAGRAM',
      format: 'REEL',
      hook: { type: 'STATEMENT', text: 'Unmatched speed', visualIntent: 'Hero', deliveryStyle: 'Bold', durationSeconds: 3 },
      narrative: 'Story',
      script: [],
      scenes: [
        {
          sceneNumber: 1,
          durationSeconds: 5,
          purpose: 'PRODUCT_HERO',
          narration: 'Meet HyperShoe',
          onScreenText: 'HYPERSHOE',
          visualType: 'PRODUCT_SHOWCASE',
          subject: 'HyperShoe Pro',
          environment: 'Studio',
          camera: 'PUSH',
          lighting: 'Rim',
          mood: 'Energetic',
          transition: 'CROSSFADE',
          animationIntent: 'HERO_REVEAL',
          assetRequirement: 'First-party product photo of HyperShoe Pro',
          productReference: 'HyperShoe Pro'
        }
      ],
      visualDirection: {},
      voiceDirection: {},
      captionDirection: {},
      animationDirection: {},
      audioDirection: {},
      cta: { type: 'SHOP_NOW', text: 'Shop Now' },
      productionMetadata: {},
      status: 'READY',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockReelAssetRepo = {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'ra-1', ...data })),
      listByReelPlanId: vi.fn().mockResolvedValue([]),
      listByBrandId: vi.fn().mockResolvedValue([]),
      deleteForReelPlan: vi.fn().mockResolvedValue(true),
      deleteForScene: vi.fn().mockResolvedValue(true),
      update: vi.fn(),
      delete: vi.fn()
    };

    const mockBrandRepo = {
      findById: vi.fn().mockResolvedValue(brand)
    };

    const mockProductRepo = {
      listForBrand: vi.fn().mockResolvedValue([productA])
    };

    const mockBrandAssetRepo = {
      listForBrand: vi.fn().mockResolvedValue([]) // No assets uploaded
    };

    const mediaService = new MediaService({} as any, mockProvider, {
      reelAssetRepo: mockReelAssetRepo as any,
      brandRepo: mockBrandRepo as any,
      productRepo: mockProductRepo as any,
      brandAssetRepo: mockBrandAssetRepo as any
    });

    const result = await mediaService.resolveReelMedia(mockReelPlan, 'ws-test-1');

    // Should NOT have used Pexels for product hero scene
    expect(mockProvider.searchVideos).not.toHaveBeenCalled();
    expect(result.summary.pexelsMatches).toBe(0);
    expect(result.summary.fallbacks).toBe(1);
    expect(result.assets[0].provider).toBe('fallback_placeholder');
  });

  it('5. ProductionAssetValidator enforces required product flags and rejects placeholders', () => {
    const validAsset = ProductionAssetValidator.validateAssetEligibility(assetForProductA, {
      workspaceId: 'ws-test-1',
      brandId: brand.id,
      productId: 'prod-a',
      isProduction: true
    });
    expect(validAsset.valid).toBe(true);

    const placeholderAsset: BrandAsset = {
      ...assetForProductA,
      isPlaceholder: true
    };
    const placeholderValidation = ProductionAssetValidator.validateAssetEligibility(placeholderAsset, {
      isProduction: true
    });
    expect(placeholderValidation.valid).toBe(false);
    expect(placeholderValidation.errorCode).toBe('PRODUCT_ASSET_PLACEHOLDER');

    const wrongProductValidation = ProductionAssetValidator.validateAssetEligibility(assetForProductB, {
      productId: 'prod-a',
      isProduction: true
    });
    expect(wrongProductValidation.valid).toBe(false);
    expect(wrongProductValidation.errorCode).toBe('PRODUCT_ASSET_INVALID');
  });
});
