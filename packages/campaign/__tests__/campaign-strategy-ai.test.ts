import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CampaignService } from '../src/campaignService.js';
import { normalizeCampaignStrategyOutput } from '../src/normalizers/campaign-strategy.normalizer.js';
import { buildDeterministicCampaignStrategy } from '../src/deterministic/campaign-strategy.fallback.js';
import { CampaignStrategySchema } from '@vidsnapai/validation';
import type {
  AIProvider,
  Brand,
  Campaign,
  CampaignStrategyOutput
} from '@vidsnapai/types';

describe('Campaign Strategy AI Generation & Normalization Pipeline', () => {
  let campaignService: CampaignService;
  let mockAiProvider: AIProvider;
  let inMemoryBrands: Brand[] = [];
  let inMemoryCampaigns: Campaign[] = [];

  const sampleOne8Brand: Brand = {
    id: 'brand-one8',
    workspaceId: 'ws-one8',
    name: 'one8 by Virat Kohli',
    slug: 'one8-by-virat-kohli',
    description: 'Modern fashion, footwear, and lifestyle essentials engineered for everyday confidence and active living.',
    websiteUrl: 'https://one8.com',
    story: 'Founded by Virat Kohli to inspire active lifestyles with premium accessible style.',
    industry: 'Fashion and lifestyle',
    targetAudience: 'Digital-first fashion enthusiasts and active urban consumers',
    brandVoice: 'Dynamic, authentic, confident',
    brandPersonality: 'Energetic, bold, aspirational',
    uniqueSellingPoints: ['Curated by Virat Kohli', 'Athlete-grade comfort meets street aesthetic'],
    offers: ['Limited-time exclusive deals on selected products'],
    primaryCta: 'Shop Now',
    socialLinks: {},
    brandColors: { primary: '#18181b', secondary: '#e11d48' },
    typography: { headingFont: 'Outfit', bodyFont: 'Inter' },
    contentPillars: ['Style in Motion', 'Behind the Craft', 'Everyday Confidence Looks'],
    marketingRules: {
      claimsToAvoid: ['Guaranteed life-changing transformation'],
      brandRestrictions: ['Maintain authentic, positive brand tone'],
      complianceRules: []
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleOne8Campaign: Campaign = {
    id: 'camp-one8-launch',
    brandId: 'brand-one8',
    name: 'one8 Style Awakening',
    description: 'Increase brand awareness, customer engagement, product discovery, and sales.',
    objective: 'BRAND_AWARENESS',
    status: 'DRAFT',
    channels: ['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS'],
    offer: 'Limited-time exclusive deals on selected products.',
    primaryCta: 'Shop Now',
    coreMessage: 'Modern fashion and lifestyle essentials that help consumers express their individual style and confidence.',
    contentPillars: ['Style in Motion', 'Everyday Confidence Looks'],
    strategyVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleValidStrategy: CampaignStrategyOutput = {
    objective: 'BRAND_AWARENESS',
    audience: {
      primary: 'Digital-first fashion and lifestyle consumers',
      secondary: 'Trend-conscious urban professionals',
      painPoints: ['Overpriced generic apparel lacking distinct individuality', 'Inconsistent quality'],
      desires: ['Express authentic personal style and confidence', 'Premium lifestyle comfort'],
      motivations: ['Empowerment through athletic lifestyle identity', 'Value for premium craftsmanship']
    },
    positioning: 'one8 by Virat Kohli delivers modern fashion and lifestyle essentials designed for effortless confidence.',
    corePromise: 'Modern fashion and lifestyle essentials that help consumers express their individual style and confidence.',
    keyMessages: [
      'Unapologetic style meets everyday comfort with one8.',
      'Designed to keep you moving with purpose and distinction.',
      'Limited-time exclusive deals on selected products.'
    ],
    messagingAngles: ['Authentic Self-Expression', 'Modern Urban Versatility', 'High-Performance Lifestyle'],
    contentPillars: ['Style in Motion', 'Behind the Craft', 'Everyday Confidence Looks'],
    contentMix: [
      { type: 'EDUCATIONAL', percentage: 35, purpose: 'Style guides and fit breakdowns', funnelStage: 'AWARENESS' },
      { type: 'STORYTELLING', percentage: 35, purpose: 'Brand journey and lookbooks', funnelStage: 'CONSIDERATION' },
      { type: 'PROMOTIONAL', percentage: 30, purpose: 'Limited-time deals showcase', funnelStage: 'CONVERSION' }
    ],
    funnel: {
      awareness: {
        message: 'Redefine your lifestyle wardrobe with signature pieces from one8.',
        formatGuidance: 'High-energy 9:16 vertical short reels featuring dynamic street transitions.',
        cta: 'Discover the Collection'
      },
      consideration: {
        message: 'Experience the difference in premium fabric and bespoke cuts.',
        formatGuidance: 'Detailed lifestyle walkthroughs with focus on texture and versatile styling.',
        cta: 'Explore Selected Fits'
      },
      conversion: {
        message: 'Claim exclusive limited-time deals on signature one8 apparel today.',
        formatGuidance: 'Direct product showcases with countdown timers and clear offer highlights.',
        cta: 'Shop Now'
      }
    },
    offerStrategy: 'Limited-time exclusive deals on selected products.',
    ctaStrategy: 'Drive direct action across touchpoints using bold, high-clarity calls to action: Shop Now.',
    channelStrategy: [
      {
        channel: 'INSTAGRAM',
        role: 'Primary visual showcase, lookbooks, and creator collabs',
        contentApproach: 'Cinematic reels and street-style aesthetic clips',
        formatGuidance: '9:16 high-contrast vertical reels (15-30s)',
        ctaStrategy: 'Shop in Bio'
      },
      {
        channel: 'TIKTOK',
        role: 'Trend-driven virality and organic discovery',
        contentApproach: 'Fast-paced transformation transitions and lifestyle reels',
        formatGuidance: 'Vertical 9:16 video with trending audio and kinetic captions',
        ctaStrategy: 'Shop Now'
      }
    ],
    kpis: {
      primary: ['Total Video Views', 'Click-Through Rate (CTR)', 'Conversion Rate (CVR)'],
      targets: ['1,000,000+ impressions', '3.5%+ CTR', '2.5%+ store conversion rate']
    },
    guardrails: {
      claimsToAvoid: ['Guaranteed life-changing transformation', 'Unsubstantiated claims'],
      restrictions: ['Maintain authentic, positive brand tone', 'Strictly follow brand color palette']
    }
  };

  beforeEach(() => {
    inMemoryBrands = [{ ...sampleOne8Brand }];
    inMemoryCampaigns = [{ ...sampleOne8Campaign }];

    mockAiProvider = {
      providerName: 'mock_test_ai',
      generateText: vi.fn(),
      generateStructured: vi.fn().mockResolvedValue(sampleValidStrategy)
    };

    const mockBrandRepo: any = {
      findByIdAndWorkspace: vi.fn().mockImplementation((id, wsId) => {
        return Promise.resolve(inMemoryBrands.find((b) => b.id === id && b.workspaceId === wsId) || null);
      })
    };

    const mockCampaignRepo: any = {
      findByIdAndBrand: vi.fn().mockImplementation((id, bId) => {
        return Promise.resolve(inMemoryCampaigns.find((c) => c.id === id && c.brandId === bId) || null);
      }),
      updateStrategy: vi.fn().mockImplementation((id, bId, strat, ver) => {
        const camp = inMemoryCampaigns.find((c) => c.id === id && c.brandId === bId);
        if (!camp) return Promise.resolve(null);
        camp.campaignStrategy = strat;
        camp.strategyVersion = ver;
        camp.status = 'READY';
        return Promise.resolve({ ...camp });
      })
    };

    const mockDnaRepo: any = {
      findLatestByBrandId: vi.fn().mockResolvedValue(null)
    };

    const mockStrategyRepo: any = {
      findLatestByBrandId: vi.fn().mockResolvedValue(null)
    };

    campaignService = new CampaignService({} as any, mockAiProvider, {
      brandRepo: mockBrandRepo,
      campaignRepo: mockCampaignRepo,
      dnaRepo: mockDnaRepo,
      strategyRepo: mockStrategyRepo
    });
  });

  // STEP 7: ONE8 TEST CASE
  it('successfully generates and validates full Campaign Strategy for one8 by Virat Kohli with all 14 required fields', async () => {
    const result = await campaignService.generateCampaignStrategy(
      'camp-one8-launch',
      'brand-one8',
      'ws-one8',
      { campaignGoal: 'Increase brand awareness, customer engagement, product discovery, and sales.' }
    );

    expect(result.status).toBe('READY');
    expect(result.strategyVersion).toBe(1);
    expect(result.campaignStrategy).toBeDefined();

    const strategy = result.campaignStrategy!;

    // Assert schema validity
    const parseResult = CampaignStrategySchema.safeParse(strategy);
    expect(parseResult.success).toBe(true);

    // Assert ALL 14 top-level fields are present and structured
    expect(strategy.objective).toBe('BRAND_AWARENESS');
    expect(strategy.audience).toBeDefined();
    expect(strategy.audience.primary).toBeTruthy();
    expect(strategy.audience.painPoints.length).toBeGreaterThanOrEqual(1);
    expect(strategy.audience.desires.length).toBeGreaterThanOrEqual(1);
    expect(strategy.audience.motivations.length).toBeGreaterThanOrEqual(1);

    expect(strategy.positioning).toBeTruthy();
    expect(strategy.corePromise).toBe(
      'Modern fashion and lifestyle essentials that help consumers express their individual style and confidence.'
    );
    expect(strategy.keyMessages.length).toBeGreaterThanOrEqual(1);
    expect(strategy.messagingAngles.length).toBeGreaterThanOrEqual(1);
    expect(strategy.contentPillars.length).toBeGreaterThanOrEqual(1);
    expect(strategy.contentMix.length).toBeGreaterThanOrEqual(1);

    expect(strategy.funnel).toBeDefined();
    expect(strategy.funnel.awareness.message).toBeTruthy();
    expect(strategy.funnel.consideration.message).toBeTruthy();
    expect(strategy.funnel.conversion.message).toBeTruthy();

    expect(strategy.offerStrategy).toBeTruthy();
    expect(strategy.ctaStrategy).toBeTruthy();
    expect(strategy.channelStrategy.length).toBeGreaterThanOrEqual(1);

    expect(strategy.kpis).toBeDefined();
    expect(strategy.kpis.primary.length).toBeGreaterThanOrEqual(1);
    expect(strategy.kpis.targets.length).toBeGreaterThanOrEqual(1);

    expect(strategy.guardrails).toBeDefined();
    expect(strategy.guardrails.claimsToAvoid.length).toBeGreaterThanOrEqual(1);
    expect(strategy.guardrails.restrictions.length).toBeGreaterThanOrEqual(1);
  });

  // STEP 8: REGRESSION TESTS
  it('normalizes markdown-fenced ```json output safely', () => {
    const rawString = '```json\n' + JSON.stringify(sampleValidStrategy) + '\n```';
    const normalized = normalizeCampaignStrategyOutput(rawString);
    const parsed = CampaignStrategySchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
  });

  it('unwraps response when wrapped in { campaignStrategy: { ... } }', () => {
    const wrapped = { campaignStrategy: sampleValidStrategy };
    const normalized = normalizeCampaignStrategyOutput(wrapped);
    const parsed = CampaignStrategySchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
  });

  it('unwraps response when wrapped in { strategy: { ... } }', () => {
    const wrapped = { strategy: sampleValidStrategy };
    const normalized = normalizeCampaignStrategyOutput(wrapped);
    const parsed = CampaignStrategySchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
  });

  it('unwraps response when wrapped in { data: { ... } }', () => {
    const wrapped = { data: sampleValidStrategy };
    const normalized = normalizeCampaignStrategyOutput(wrapped);
    const parsed = CampaignStrategySchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
  });

  it('normalizes string contentMix percentages into numbers', () => {
    const withStringPcts = {
      ...sampleValidStrategy,
      contentMix: [
        { type: 'EDUCATIONAL', percentage: '40%' as any, purpose: 'Build authority', funnelStage: 'AWARENESS' },
        { type: 'PROMOTIONAL', percentage: '60' as any, purpose: 'Drive action', funnelStage: 'CONVERSION' }
      ]
    };
    const normalized = normalizeCampaignStrategyOutput(withStringPcts) as any;
    expect(normalized.contentMix[0].percentage).toBe(40);
    expect(normalized.contentMix[1].percentage).toBe(60);
    const parsed = CampaignStrategySchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
  });

  it('generates 100% valid CampaignStrategy from buildDeterministicCampaignStrategy', () => {
    const fallback = buildDeterministicCampaignStrategy(
      sampleOne8Brand,
      null,
      null,
      sampleOne8Campaign
    );
    const parsed = CampaignStrategySchema.safeParse(fallback);
    expect(parsed.success).toBe(true);
    expect(fallback.objective).toBe('BRAND_AWARENESS');
    expect(fallback.corePromise).toContain('one8 Style Awakening');
    expect(fallback.channelStrategy.length).toBe(3);
  });
});
