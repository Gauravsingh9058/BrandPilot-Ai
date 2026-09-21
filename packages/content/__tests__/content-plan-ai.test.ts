import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentPlannerService } from '../src/contentPlannerService.js';
import { normalizeContentPlanOutput } from '../src/normalizers/content-plan.normalizer.js';
import { buildDeterministicContentPlan } from '../src/deterministic/content-plan.fallback.js';
import { ContentPlanOutputSchema } from '@vidsnapai/validation';
import type {
  AIProvider,
  Brand,
  BrandProduct,
  Campaign,
  ContentPlanOutput,
  ContentPlan,
  ContentJob
} from '@vidsnapai/types';

describe('Content Plan AI Generation & Normalization Pipeline', () => {
  let contentPlannerService: ContentPlannerService;
  let mockAiProvider: AIProvider;
  let inMemoryBrands: Brand[] = [];
  let inMemoryProducts: BrandProduct[] = [];
  let inMemoryCampaigns: Campaign[] = [];
  let inMemoryPlans: ContentPlan[] = [];
  let inMemoryJobs: ContentJob[] = [];

  const sampleOne8Brand: Brand = {
    id: 'brand-one8',
    workspaceId: 'ws-one8',
    name: 'one8 by Virat Kohli',
    slug: 'one8-by-virat-kohli',
    industry: 'Fashion and lifestyle',
    websiteUrl: 'https://one8.com',
    description: 'Modern fashion and lifestyle essentials that help consumers express their individual style and confidence.',
    targetAudience: 'Fashion-forward youth, fitness enthusiasts, active lifestyle seekers',
    brandVoice: 'Athletic, trendy, confident, energetic',
    primaryCta: 'Shop Now',
    contentPillars: ['Style in Motion', 'Behind the Craft', 'Everyday Confidence Looks', 'Community Spotlights'],
    offers: ['Limited-time exclusive deals on selected products'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleOne8Products: BrandProduct[] = [
    {
      id: 'prod-1',
      brandId: 'brand-one8',
      name: 'one8 Active Athleisure Tee',
      description: 'Ultra-breathable lightweight performance training t-shirt.',
      category: 'Athleisure',
      benefits: ['Moisture wicking', 'Ergonomic fit', 'Maximum comfort'],
      features: ['Air-mesh technology', 'Reflective logo'],
      usps: ['Engineered for movement'],
      price: '1499',
      targetAudience: 'Athletes & fitness seekers',
      primaryOffer: '20% off launch week',
      cta: 'Shop Athleisure',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const sampleOne8Campaign: Campaign = {
    id: 'camp-one8',
    brandId: 'brand-one8',
    workspaceId: 'ws-one8',
    name: 'one8 30-Day Sports-Lifestyle Awakening',
    description: '30-day premium sports-lifestyle content campaign focused on fitness, fashion, performance, confidence, and everyday lifestyle.',
    objective: 'Brand awareness and product sales',
    status: 'ACTIVE',
    budget: 50000,
    targetAudience: { primary: 'Fashion-forward youth, fitness enthusiasts, active lifestyle seekers' },
    offer: 'Limited-time exclusive deals on selected products',
    primaryCta: 'Shop Now',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    strategySnapshot: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleValidPlan: ContentPlanOutput = buildDeterministicContentPlan({
    brand: sampleOne8Brand,
    products: sampleOne8Products,
    campaign: sampleOne8Campaign,
    durationDays: 30
  });

  beforeEach(() => {
    inMemoryBrands = [{ ...sampleOne8Brand }];
    inMemoryProducts = [{ ...sampleOne8Products[0] }];
    inMemoryCampaigns = [{ ...sampleOne8Campaign }];
    inMemoryPlans = [];
    inMemoryJobs = [];

    mockAiProvider = {
      providerName: 'mock_test_ai',
      generateText: vi.fn(),
      generateStructured: vi.fn().mockResolvedValue(sampleValidPlan)
    };

    const mockBrandRepo: any = {
      findByIdAndWorkspace: vi.fn().mockImplementation((id, wsId) => {
        return Promise.resolve(inMemoryBrands.find((b) => b.id === id && b.workspaceId === wsId) || null);
      })
    };

    const mockProductRepo: any = {
      listForBrand: vi.fn().mockImplementation((bId) => {
        return Promise.resolve(inMemoryProducts.filter((p) => p.brandId === bId));
      })
    };

    const mockDnaRepo: any = {
      findLatestByBrandId: vi.fn().mockResolvedValue(null)
    };

    const mockStrategyRepo: any = {
      findLatestByBrandId: vi.fn().mockResolvedValue(null)
    };

    const mockCampaignRepo: any = {
      findByIdAndBrand: vi.fn().mockImplementation((cId, bId) => {
        return Promise.resolve(inMemoryCampaigns.find((c) => c.id === cId && c.brandId === bId) || null);
      })
    };

    const mockPlanRepo: any = {
      create: vi.fn().mockImplementation((brandId, workspaceId, data) => {
        const created: ContentPlan = {
          id: `plan-${Date.now()}`,
          brandId,
          campaignId: data.campaignId,
          workspaceId,
          name: data.name,
          objective: data.objective,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          durationDays: data.durationDays,
          status: 'READY',
          version: data.version || 1,
          planGroupId: data.planGroupId || `group-${Date.now()}`,
          strategySnapshot: data.strategySnapshot || {},
          createdAt: new Date(),
          updatedAt: new Date()
        };
        inMemoryPlans.push(created);
        return Promise.resolve(created);
      }),
      findById: vi.fn().mockImplementation((id, bId) => {
        return Promise.resolve(inMemoryPlans.find((p) => p.id === id && p.brandId === bId) || null);
      }),
      getLatestVersion: vi.fn().mockResolvedValue(1)
    };

    const mockJobRepo: any = {
      createMany: vi.fn().mockImplementation((_planId, _brandId, _wsId, jobs) => {
        const createdJobs: ContentJob[] = jobs.map((j: any, i: number) => ({
          id: `job-${i + 1}`,
          ...j,
          status: 'PLANNED',
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        inMemoryJobs.push(...createdJobs);
        return Promise.resolve(createdJobs);
      }),
      findForPlan: vi.fn().mockImplementation((planId) => {
        return Promise.resolve(inMemoryJobs.filter((j) => j.contentPlanId === planId));
      }),
      findApprovedForPlan: vi.fn().mockResolvedValue([])
    };

    contentPlannerService = new ContentPlannerService({} as any, mockAiProvider, {
      brandRepo: mockBrandRepo,
      productRepo: mockProductRepo,
      dnaRepo: mockDnaRepo,
      strategyRepo: mockStrategyRepo,
      campaignRepo: mockCampaignRepo,
      planRepo: mockPlanRepo,
      jobRepo: mockJobRepo
    });
  });

  it('successfully generates and validates full 30-Day Content Plan for one8 by Virat Kohli with all 8 required fields', async () => {
    const result = await contentPlannerService.generateContentPlan('brand-one8', 'ws-one8', {
      campaignId: 'camp-one8',
      durationDays: 30
    });

    expect(result).toBeDefined();
    expect(result.name).toContain('one8');
    expect(result.durationDays).toBe(30);

    const snapshot = result.strategySnapshot as any;
    expect(snapshot).toBeDefined();

    // Verify top-level fields
    expect(result.name).toBeDefined();
    expect(result.objective).toBeDefined();
    expect(result.durationDays).toBe(30);
    expect(snapshot.campaignTheme).toBeDefined();
    expect(snapshot.executiveSummary).toBeDefined();
    expect(snapshot.weeklyNarratives).toBeInstanceOf(Array);
    expect(result.jobs).toBeInstanceOf(Array);
    expect(result.jobs.length).toBe(30);

    const fullPlan: ContentPlanOutput = {
      planName: result.name,
      objective: result.objective,
      durationDays: result.durationDays,
      campaignTheme: snapshot.campaignTheme,
      executiveSummary: snapshot.executiveSummary,
      weeklyNarratives: snapshot.weeklyNarratives,
      diversificationSummary: {
        funnelDistribution: snapshot.diversificationMetrics?.metrics?.funnelDistribution || {},
        contentTypeDistribution: snapshot.diversificationMetrics?.metrics?.contentTypeDistribution || {},
        formatDistribution: snapshot.diversificationMetrics?.metrics?.formatDistribution || {},
        pillarDistribution: {}
      },
      jobs: result.jobs.map((j) => ({
        dayNumber: j.dayNumber,
        weekNumber: Math.ceil(j.dayNumber / 7),
        title: j.title,
        contentType: j.contentType,
        funnelStage: j.funnelStage,
        contentPillar: j.contentPillar,
        objective: j.objective,
        audience: j.audience,
        topic: j.topic,
        hook: j.hook,
        keyMessage: j.keyMessage,
        messagingAngle: j.messagingAngle,
        offer: j.offer,
        cta: j.cta,
        platform: j.platform,
        format: j.format,
        priority: j.priority
      }))
    };

    // Validate using Zod schema
    const schemaValidation = ContentPlanOutputSchema.safeParse(fullPlan);
    expect(schemaValidation.success).toBe(true);

    // Verify jobs array
    expect(result.jobs).toHaveLength(30);
    expect(result.jobs[0].dayNumber).toBe(1);
    expect(result.jobs[29].dayNumber).toBe(30);
  });

  it('normalizes markdown-fenced ```json output safely', () => {
    const fencedOutput = `\`\`\`json
${JSON.stringify(sampleValidPlan)}
\`\`\``;

    const normalized = normalizeContentPlanOutput(fencedOutput);
    const parsed = ContentPlanOutputSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    expect(normalized.planName).toBe(sampleValidPlan.planName);
    expect(normalized.jobs.length).toBe(30);
  });

  it('unwraps response when wrapped in { contentPlan: { ... } }', () => {
    const wrapped = {
      contentPlan: sampleValidPlan
    };

    const normalized = normalizeContentPlanOutput(wrapped);
    const parsed = ContentPlanOutputSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    expect(normalized.planName).toBe(sampleValidPlan.planName);
    expect(normalized.durationDays).toBe(30);
  });

  it('unwraps response when wrapped in { plan: { ... } }', () => {
    const wrapped = {
      plan: sampleValidPlan
    };

    const normalized = normalizeContentPlanOutput(wrapped);
    const parsed = ContentPlanOutputSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    expect(normalized.planName).toBe(sampleValidPlan.planName);
  });

  it('unwraps response when wrapped in { data: { ... } }', () => {
    const wrapped = {
      data: sampleValidPlan
    };

    const normalized = normalizeContentPlanOutput(wrapped);
    const parsed = ContentPlanOutputSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    expect(normalized.planName).toBe(sampleValidPlan.planName);
  });

  it('normalizes string numbers and converts them properly', () => {
    const stringifiedNumbers = {
      ...sampleValidPlan,
      durationDays: '30' as any,
      weeklyNarratives: sampleValidPlan.weeklyNarratives.map((n) => ({
        ...n,
        weekNumber: String(n.weekNumber) as any
      })),
      jobs: sampleValidPlan.jobs.map((j) => ({
        ...j,
        dayNumber: String(j.dayNumber) as any,
        weekNumber: String(j.weekNumber) as any
      }))
    };

    const normalized = normalizeContentPlanOutput(stringifiedNumbers);
    const parsed = ContentPlanOutputSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    expect(normalized.durationDays).toBe(30);
    expect(typeof normalized.jobs[0].dayNumber).toBe('number');
  });

  it('generates 100% valid ContentPlanOutput from buildDeterministicContentPlan', () => {
    const fallback = buildDeterministicContentPlan({
      brand: sampleOne8Brand,
      products: sampleOne8Products,
      campaign: sampleOne8Campaign,
      durationDays: 30
    });

    const parsed = ContentPlanOutputSchema.safeParse(fallback);
    expect(parsed.success).toBe(true);
    expect(fallback.jobs).toHaveLength(30);
    expect(fallback.weeklyNarratives).toHaveLength(5);
  });

  it('retries with corrective prompt when initial AI response fails validation', async () => {
    const invalidOutput = {
      planName: 'Invalid Plan'
      // missing all other required fields
    };

    (mockAiProvider.generateStructured as any)
      .mockResolvedValueOnce(invalidOutput)
      .mockResolvedValueOnce(sampleValidPlan);

    const result = await contentPlannerService.generateContentPlan('brand-one8', 'ws-one8', {
      campaignId: 'camp-one8'
    });

    expect(result).toBeDefined();
    expect(mockAiProvider.generateStructured).toHaveBeenCalledTimes(2);
    expect(result.jobs).toHaveLength(30);
  });

  it('falls back to deterministic generator if AI provider throws in non-test environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      (mockAiProvider.generateStructured as any).mockRejectedValue(new Error('AI Service Overloaded'));

      const result = await contentPlannerService.generateContentPlan('brand-one8', 'ws-one8', {
        campaignId: 'camp-one8',
        durationDays: 30
      });

      expect(result).toBeDefined();
      expect(result.jobs).toHaveLength(30);
      expect((result.strategySnapshot as any).weeklyNarratives).toBeInstanceOf(Array);
      expect((result.strategySnapshot as any).weeklyNarratives.length).toBeGreaterThanOrEqual(4);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
