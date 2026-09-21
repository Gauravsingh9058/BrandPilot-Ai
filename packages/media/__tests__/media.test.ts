import { describe, it, expect, vi } from 'vitest';
import {
  MediaValidator,
  AssetResolver,
  MediaService
} from '../src/index.js';
import type {
  Brand,
  BrandProduct,
  BrandAsset,
  MediaRequirement,
  ReelProductionPlan,
  MediaProvider
} from '@vidsnapai/types';

describe('Phase 6: Media Package Tests', () => {
  const mockBrand: Brand = {
    id: 'brand-test-1',
    workspaceId: 'ws-test-1',
    name: 'AeroGlide Audio',
    slug: 'aeroglide-audio',
    description: 'Wireless studio headphones',
    industry: 'Consumer Tech',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockProducts: BrandProduct[] = [
    {
      id: 'prod-studio-x',
      brandId: 'brand-test-1',
      name: 'StudioPro X',
      category: 'Headphones',
      description: 'Zero loss wireless studio headphones',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockBrandAssets: BrandAsset[] = [
    {
      id: 'ba-prod-hero',
      brandId: 'brand-test-1',
      type: 'product_image',
      name: 'StudioPro X Hero Angle High Res',
      storageKey: 'brands/assets/hero.jpg',
      url: 'https://storage.vidsnapai.com/brands/hero.jpg',
      metadata: { productId: 'prod-studio-x', tags: ['headphone', 'studio', 'wireless'] },
      createdAt: new Date()
    },
    {
      id: 'ba-logo',
      brandId: 'brand-test-1',
      type: 'logo',
      name: 'AeroGlide Official Logo White',
      storageKey: 'brands/assets/logo.png',
      url: 'https://storage.vidsnapai.com/brands/logo.png',
      metadata: { tags: ['logo', 'badge'] },
      createdAt: new Date()
    }
  ];

  describe('AssetResolver: Brand & Product Matching', () => {
    it('prioritizes first-party product assets when scene references the product', () => {
      const requirement: MediaRequirement = {
        sceneNumber: 1,
        purpose: 'Product Reveal',
        assetRequirement: 'StudioPro X hero shot on wooden studio desk',
        productReference: 'StudioPro X',
        visualType: 'PRODUCT_SHOWCASE',
        mood: 'Premium',
        subject: 'StudioPro X wireless headphones',
        environment: 'Modern studio',
        durationSeconds: 5
      };

      const matches = AssetResolver.matchBrandAssets({
        brand: mockBrand,
        products: mockProducts,
        brandAssets: mockBrandAssets,
        requirement
      });

      expect(matches.length).toBeGreaterThan(0);
      const topMatch = matches[0];
      expect(topMatch.isFirstParty).toBe(true);
      expect(topMatch.score).toBeGreaterThanOrEqual(90);
      expect(topMatch.asset.id).toBe('ba-prod-hero');
    });

    it('matches brand logo when scene requires brandElement or CTA endcard', () => {
      const requirement: MediaRequirement = {
        sceneNumber: 4,
        purpose: 'CTA Endcard',
        assetRequirement: 'AeroGlide logo with preorder button',
        brandElement: 'Logo',
        visualType: 'CTA',
        mood: 'Confident',
        subject: 'Brand logo on colored background',
        environment: 'Studio backdrop',
        durationSeconds: 4
      };

      const matches = AssetResolver.matchBrandAssets({
        brand: mockBrand,
        products: mockProducts,
        brandAssets: mockBrandAssets,
        requirement
      });

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.asset.id === 'ba-logo')).toBe(true);
    });

    it('generates rich, optimized Pexels queries from structured scene requirements', () => {
      const requirement: MediaRequirement = {
        sceneNumber: 2,
        purpose: 'Agitation',
        assetRequirement: 'Close up of music producer tangled in audio cables',
        visualType: 'PROBLEM',
        mood: 'Frustrated',
        subject: 'Music producer tangled in cables',
        environment: 'Recording studio',
        durationSeconds: 4
      };

      const query = AssetResolver.generatePexelsQuery(requirement);
      expect(query.toLowerCase()).toContain('producer');
      expect(query.toLowerCase()).toContain('studio');
    });

    it('applies vertical aspect ratio bonus and duplicate penalties in stock scoring', () => {
      const requirement: MediaRequirement = {
        sceneNumber: 1,
        purpose: 'Hook',
        assetRequirement: 'Studio producer playing synthesizer',
        visualType: 'B-ROLL',
        mood: 'Focused',
        subject: 'Producer synthesizer',
        environment: 'Studio',
        durationSeconds: 4
      };

      const verticalAsset = {
        id: 'pexels-100',
        provider: 'pexels',
        type: 'video' as const,
        url: 'https://pexels.com/v100.mp4',
        width: 1080,
        height: 1920,
        durationSeconds: 10
      };

      const horizontalAsset = {
        id: 'pexels-200',
        provider: 'pexels',
        type: 'video' as const,
        url: 'https://pexels.com/v200.mp4',
        width: 1920,
        height: 1080,
        durationSeconds: 10
      };

      const selectedIds = new Set<string>();
      const scoreVertical = AssetResolver.scorePexelsAsset(verticalAsset, requirement, selectedIds);
      const scoreHorizontal = AssetResolver.scorePexelsAsset(horizontalAsset, requirement, selectedIds);

      expect(scoreVertical).toBeGreaterThan(scoreHorizontal);

      // Add vertical asset to selected IDs and verify duplicate penalty
      selectedIds.add('pexels-100');
      const scoreDuplicate = AssetResolver.scorePexelsAsset(verticalAsset, requirement, selectedIds);
      expect(scoreDuplicate).toBeLessThan(scoreVertical);
    });
  });

  describe('MediaValidator: 9:16 Compatibility & Dimensions', () => {
    it('validates 9:16 vertical video dimensions correctly', () => {
      const result = MediaValidator.validateDimensions(1080, 1920);
      expect(result.isVertical).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('flags horizontal landscape video with appropriate warning', () => {
      const result = MediaValidator.validateDimensions(1920, 1080);
      expect(result.isVertical).toBe(false);
      expect(result.warning).toContain('landscape');
    });

    it('validates duration bounds and flags videos that are too short', () => {
      const result = MediaValidator.validateMediaAsset({
        type: 'video',
        width: 1080,
        height: 1920,
        durationSeconds: 1.5,
        targetDurationSeconds: 6
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.includes('shorter than target'))).toBe(true);
    });
  });

  describe('MediaService: Full Scene Resolution Workflow', () => {
    it('resolves a multi-scene ReelProductionPlan with first-party priority and stock fallback', async () => {
      const mockReelPlan: ReelProductionPlan = {
        id: 'reel-plan-test-1',
        contentJobId: 'job-1',
        brandId: 'brand-test-1',
        contentPlanId: 'plan-1',
        workspaceId: 'ws-test-1',
        version: 1,
        title: 'Zero Latency Studio Freedom',
        concept: { title: 'Studio Freedom' },
        objective: 'Drive preorders',
        audience: 'Producers',
        funnelStage: 'CONSIDERATION',
        contentPillar: 'Audio Gear',
        durationSeconds: 30,
        aspectRatio: '9:16',
        platform: 'INSTAGRAM',
        format: 'REEL',
        hook: { text: 'Tangled in studio cables?' },
        narrative: 'A journey from cables to wireless freedom',
        script: [],
        scenes: [
          {
            sceneNumber: 1,
            durationSeconds: 4,
            purpose: 'Product Reveal',
            narration: 'Meet the new StudioPro X headphones',
            onScreenText: 'STUDIOPRO X',
            visualType: 'PRODUCT_SHOWCASE',
            subject: 'StudioPro X wireless headphones',
            environment: 'Studio desk',
            productReference: 'StudioPro X',
            assetRequirement: 'StudioPro X hero angle'
          },
          {
            sceneNumber: 2,
            durationSeconds: 5,
            purpose: 'Lifestyle Action',
            narration: 'Move freely without latency in any recording session',
            onScreenText: 'NO WIRES • NO LATENCY',
            visualType: 'B-ROLL',
            subject: 'Music producer playing piano freely',
            environment: 'Recording studio',
            assetRequirement: 'Music producer recording in studio'
          }
        ],
        visualDirection: { style: 'Moody cinematic studio with violet rim lights' },
        voiceDirection: { style: 'Authoritative' },
        captionDirection: { style: 'Kinetic uppercase' },
        animationDirection: { energy: 'High' },
        audioDirection: { musicMood: 'Electronic downtempo' },
        cta: { text: 'Preorder Now' },
        productionMetadata: {},
        status: 'READY',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockMediaProvider: MediaProvider = {
        providerName: 'mock_pexels',
        searchVideos: vi.fn().mockResolvedValue({
          assets: [
            {
              id: 'pexels-vid-1',
              provider: 'pexels',
              type: 'video',
              title: 'Producer recording keyboard',
              url: 'https://pexels.com/video1.mp4',
              previewUrl: 'https://pexels.com/preview1.jpg',
              width: 1080,
              height: 1920,
              durationSeconds: 8,
              photographer: 'Jane Doe'
            }
          ],
          totalResults: 1,
          page: 1,
          perPage: 10
        }),
        searchImages: vi.fn().mockResolvedValue({ assets: [], totalResults: 0, page: 1, perPage: 10 })
      };

      const inMemoryAssets: any[] = [];
      const mockReelAssetRepo = {
        create: vi.fn().mockImplementation(async (data) => {
          const record = { ...data, id: `asset-${inMemoryAssets.length + 1}`, createdAt: new Date(), updatedAt: new Date() };
          inMemoryAssets.push(record);
          return record;
        }),
        deleteForReelPlan: vi.fn().mockImplementation(async () => {
          inMemoryAssets.length = 0;
          return 0;
        }),
        listByReelPlanId: vi.fn().mockImplementation(async () => inMemoryAssets)
      };

      const mockBrandRepo = {
        findById: vi.fn().mockResolvedValue(mockBrand)
      };
      const mockProductRepo = {
        listForBrand: vi.fn().mockResolvedValue(mockProducts)
      };
      const mockBrandAssetRepo = {
        listForBrand: vi.fn().mockResolvedValue(mockBrandAssets)
      };

      const mediaService = new MediaService(
        {} as any,
        mockMediaProvider,
        {
          reelAssetRepo: mockReelAssetRepo as any,
          brandRepo: mockBrandRepo as any,
          productRepo: mockProductRepo as any,
          brandAssetRepo: mockBrandAssetRepo as any
        }
      );

      const result = await mediaService.resolveReelMedia(mockReelPlan, 'ws-test-1');

      expect(result.summary.totalScenes).toBe(2);
      expect(result.summary.resolvedScenes).toBe(2);
      expect(result.summary.brandAssetMatches).toBe(1); // Scene 1 matched first-party brand asset
      expect(result.summary.pexelsMatches).toBe(1); // Scene 2 matched stock video

      expect(result.assets[0].sourceType).toBe('BRAND_LIBRARY');
      expect(result.assets[1].sourceType).toBe('PEXELS');
    });
  });
});
