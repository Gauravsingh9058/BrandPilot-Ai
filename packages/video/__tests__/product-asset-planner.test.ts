import { describe, it, expect, vi } from 'vitest';
import { ReelPlannerService } from '../src/reelPlannerService.js';
import { MockAIProvider } from '@vidsnapai/ai';
import type {
  Brand,
  BrandProduct,
  BrandAsset,
  ContentJob
} from '@vidsnapai/types';

describe('Reel Planner Product Asset Preflight and Regeneration Tests', () => {
  const mockBrand: Brand = {
    id: 'brand-1',
    workspaceId: 'ws-1',
    name: 'AeroVelocity Athletics',
    slug: 'aerovelocity',
    description: 'High performance vertical gear',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockProduct: BrandProduct = {
    id: 'prod-hypershoe',
    brandId: 'brand-1',
    name: 'HyperShoe Pro',
    category: 'Footwear',
    description: 'Carbon-fiber plated marathon racing shoes',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockJob: ContentJob = {
    id: 'job-1',
    brandId: 'brand-1',
    workspaceId: 'ws-1',
    contentPlanId: 'plan-1',
    dayNumber: 1,
    scheduledDate: new Date(),
    title: 'HyperShoe Pro Launch',
    contentType: 'PRODUCT',
    funnelStage: 'CONVERSION',
    contentPillar: 'Product Spotlight',
    objective: 'Drive sales',
    audience: 'Runners',
    topic: 'HyperShoe Pro Performance',
    hook: 'Want to run 4% faster?',
    keyMessage: 'Engineered for sub-2 hour marathons.',
    messagingAngle: 'Speed',
    offer: null,
    cta: 'Shop Now',
    platform: 'INSTAGRAM',
    format: 'REEL',
    priority: 'HIGH',
    status: 'READY',
    strategy: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockEligibleAsset: BrandAsset = {
    id: 'asset-1',
    brandId: 'brand-1',
    type: 'product_image',
    name: 'HyperShoe Pro 4K Hero',
    storageKey: 'brands/assets/hero.jpg',
    url: 'https://storage.vidsnapai.com/hero.jpg',
    productId: 'prod-hypershoe',
    assetPurpose: 'HERO',
    productionEligible: true,
    isPlaceholder: false,
    isTestAsset: false,
    metadata: {
      productId: 'prod-hypershoe',
      assetPurpose: 'HERO',
      productionEligible: true
    },
    createdAt: new Date()
  };

  const mockAIProvider = new MockAIProvider();

  it('1. product without production-eligible asset stops reel generation with PRODUCT_MEDIA_REQUIRED', async () => {
    const mockReelRepo = {
      findLatestByContentJobId: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      getNextVersionNumber: vi.fn().mockResolvedValue(1)
    };
    const mockJobRepo = { findById: vi.fn().mockResolvedValue(mockJob) };
    const mockPlanRepo = { findByIdAndWorkspace: vi.fn().mockResolvedValue({ id: 'plan-1' }) };
    const mockBrandRepo = { findByIdAndWorkspace: vi.fn().mockResolvedValue(mockBrand) };
    const mockProductRepo = { listForBrand: vi.fn().mockResolvedValue([mockProduct]) };
    const mockBrandAssetRepo = { listForBrand: vi.fn().mockResolvedValue([]) }; // No assets!
    const mockDnaRepo = { findLatestByBrandId: vi.fn().mockResolvedValue(null) };
    const mockStrategyRepo = { findLatestByBrandId: vi.fn().mockResolvedValue(null) };
    const mockCampaignRepo = { findByIdAndBrand: vi.fn().mockResolvedValue(null) };

    const planner = new ReelPlannerService({} as any, mockAIProvider, {
      reelRepo: mockReelRepo as any,
      jobRepo: mockJobRepo as any,
      planRepo: mockPlanRepo as any,
      brandRepo: mockBrandRepo as any,
      productRepo: mockProductRepo as any,
      brandAssetRepo: mockBrandAssetRepo as any,
      dnaRepo: mockDnaRepo as any,
      strategyRepo: mockStrategyRepo as any,
      campaignRepo: mockCampaignRepo as any
    });

    await expect(
      planner.generateReelForJob('job-1', 'ws-1', { targetProductId: 'prod-hypershoe' })
    ).rejects.toThrow(
      'PRODUCT_MEDIA_REQUIRED: Upload at least one production-ready product image or video for HyperShoe Pro before generating this reel.'
    );
  });

  it('2. product with HERO image passes preflight and generates reel plan', async () => {
    const mockReelRepo = {
      findLatestByContentJobId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'reel-1', ...data })),
      getNextVersionNumber: vi.fn().mockResolvedValue(1)
    };
    const mockJobRepo = { findById: vi.fn().mockResolvedValue(mockJob) };
    const mockPlanRepo = { findByIdAndWorkspace: vi.fn().mockResolvedValue({ id: 'plan-1' }) };
    const mockBrandRepo = { findByIdAndWorkspace: vi.fn().mockResolvedValue(mockBrand) };
    const mockProductRepo = { listForBrand: vi.fn().mockResolvedValue([mockProduct]) };
    const mockBrandAssetRepo = { listForBrand: vi.fn().mockResolvedValue([mockEligibleAsset]) };
    const mockDnaRepo = { findLatestByBrandId: vi.fn().mockResolvedValue(null) };
    const mockStrategyRepo = { findLatestByBrandId: vi.fn().mockResolvedValue(null) };
    const mockCampaignRepo = { findByIdAndBrand: vi.fn().mockResolvedValue(null) };

    const planner = new ReelPlannerService({} as any, mockAIProvider, {
      reelRepo: mockReelRepo as any,
      jobRepo: mockJobRepo as any,
      planRepo: mockPlanRepo as any,
      brandRepo: mockBrandRepo as any,
      productRepo: mockProductRepo as any,
      brandAssetRepo: mockBrandAssetRepo as any,
      dnaRepo: mockDnaRepo as any,
      strategyRepo: mockStrategyRepo as any,
      campaignRepo: mockCampaignRepo as any
    });

    const result = await planner.generateReelForJob('job-1', 'ws-1', { targetProductId: 'prod-hypershoe' });
    expect(result).toBeDefined();
    expect(result.targetProductId).toBe('prod-hypershoe');
  });

  it('3. product asset survives reel regeneration (regenerateReelForJob)', async () => {
    const mockReelRepo = {
      findLatestByContentJobId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'reel-2', ...data })),
      getNextVersionNumber: vi.fn().mockResolvedValue(2)
    };
    const mockJobRepo = { findById: vi.fn().mockResolvedValue(mockJob) };
    const mockPlanRepo = { findByIdAndWorkspace: vi.fn().mockResolvedValue({ id: 'plan-1' }) };
    const mockBrandRepo = { findByIdAndWorkspace: vi.fn().mockResolvedValue(mockBrand) };
    const mockProductRepo = { listForBrand: vi.fn().mockResolvedValue([mockProduct]) };
    const mockBrandAssetRepo = { listForBrand: vi.fn().mockResolvedValue([mockEligibleAsset]) };
    const mockDnaRepo = { findLatestByBrandId: vi.fn().mockResolvedValue(null) };
    const mockStrategyRepo = { findLatestByBrandId: vi.fn().mockResolvedValue(null) };
    const mockCampaignRepo = { findByIdAndBrand: vi.fn().mockResolvedValue(null) };

    const planner = new ReelPlannerService({} as any, mockAIProvider, {
      reelRepo: mockReelRepo as any,
      jobRepo: mockJobRepo as any,
      planRepo: mockPlanRepo as any,
      brandRepo: mockBrandRepo as any,
      productRepo: mockProductRepo as any,
      brandAssetRepo: mockBrandAssetRepo as any,
      dnaRepo: mockDnaRepo as any,
      strategyRepo: mockStrategyRepo as any,
      campaignRepo: mockCampaignRepo as any
    });

    const regenerated = await planner.regenerateReelForJob('job-1', 'ws-1', {
      targetProductId: 'prod-hypershoe',
      regenerateReason: 'Add more hook urgency'
    });

    expect(regenerated).toBeDefined();
    expect(regenerated.version).toBe(2);
    expect(regenerated.targetProductId).toBe('prod-hypershoe');
  });
});
