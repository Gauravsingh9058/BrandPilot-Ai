import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../apps/api/src/services/auth.service.js';
import { BrandService } from '../packages/brand/src/brandService.js';
import { MarketingBrainService, CampaignService } from '../packages/campaign/src/index.js';
import type { Database } from '@vidsnapai/database';
import type {
  AIProvider,
  Brand,
  BrandProduct,
  BrandAsset,
  BrandDNA,
  User,
  WorkspaceWithMembers,
  MarketingStrategy,
  Campaign,
  MarketingStrategyOutput,
  CampaignStrategyOutput
} from '@vidsnapai/types';

describe('VidSnapAI Phase 3 Full Marketing Brain & Campaign Engine Flow', () => {
  let authService: AuthService;
  let brandService: BrandService;
  let marketingService: MarketingBrainService;
  let campaignService: CampaignService;
  let mockAiProvider: AIProvider;

  // In-memory data
  let users: User[] = [];
  const userPasswords = new Map<string, string>();
  let workspaces: WorkspaceWithMembers[] = [];
  let brands: Brand[] = [];
  let products: BrandProduct[] = [];
  let assets: BrandAsset[] = [];
  let dnas: BrandDNA[] = [];
  let strategies: MarketingStrategy[] = [];
  let campaigns: Campaign[] = [];

  const sampleBrandDnaOutput = {
    identity: {
      brandName: 'AeroGlide Audio',
      industry: 'Consumer Tech',
      story: 'Building zero-loss wireless studio monitors.',
      mission: 'Bring uncompressed studio fidelity to all creators.',
      personality: ['Innovative', 'Precision-Focused']
    },
    audience: {
      primaryAudience: 'Music producers and creators',
      demographics: ['Ages 20-45'],
      painPoints: ['Wireless latency in studio recording'],
      desires: ['Lossless wireless freedom'],
      buyingMotivations: ['Ultra-low latency', 'Pristine sound stage']
    },
    messaging: {
      positioning: 'Studio fidelity without cable drag.',
      coreMessage: 'Zero latency, absolute clarity.',
      valueProposition: 'Experience pristine reference monitoring cord-free.',
      usps: ['Sub-1ms wireless latency', 'Handcrafted beryllium drivers'],
      proofPoints: ['Over 100 studio producer endorsements'],
      tone: ['Authoritative', 'Electrifying'],
      forbiddenMessaging: ['Magic audio']
    },
    products: [
      {
        name: 'AeroGlide Pro',
        category: 'Hardware',
        benefits: ['Zero latency', 'Lossless audio'],
        features: ['Ultra-wideband sync', '40hr battery'],
        price: 349,
        usps: ['Sub-1ms latency'],
        targetAudience: 'Audio Engineers',
        offers: ['Free travel case'],
        cta: 'Order AeroGlide Pro'
      }
    ],
    visualIdentity: {
      logoUrl: 'https://cdn.example.com/aeroglide.png',
      colors: { primary: '#0f172a', secondary: '#38bdf8' },
      typography: { headingFont: 'Outfit', bodyFont: 'Inter' },
      visualStyle: 'Dark matte futuristic design',
      imageStyle: 'Macro studio shots'
    },
    contentStrategy: {
      contentPillars: ['Acoustic Science', 'Studio Workflows'],
      preferredTopics: ['Latency benchmarks'],
      educationalTopics: ['How UWB wireless works'],
      promotionalTopics: ['AeroGlide Pro Preorder'],
      storytellingTopics: ['Overcoming Bluetooth limitations']
    },
    promotionRules: {
      primaryCTA: 'Preorder AeroGlide Pro',
      offers: ['15% off preorder'],
      claimsToAvoid: ['Magical sound'],
      complianceRules: ['Standard 2-year warranty'],
      brandRestrictions: []
    }
  };

  const sampleMarketingStrategyOutput: MarketingStrategyOutput = {
    objective: 'CUSTOMER_ACQUISITION',
    businessGoal: 'Scale direct-to-consumer preorders to 2,500 units in Q3',
    marketingGoal: 'Generate 15,000 qualified preorder landing page visitors',
    targetAudience: {
      primarySegments: ['Music Producers', 'Recording Engineers', 'Audiophiles'],
      psychographics: ['Passionate about sound purity', 'Frustrated by cable clutter'],
      buyingTriggers: ['Studio upgrade cycle', 'Live performance demands'],
      objectionsToOvercome: ['Latency skepticism in wireless monitors']
    },
    positioning: {
      marketCategory: 'Lossless Wireless Studio Monitors',
      competitiveMoat: 'Proprietary Ultra-Wideband lossless sub-millisecond audio streaming',
      valuePropositionStatement: 'The reference standard in wireless zero-latency audio monitoring.',
      differentiators: ['<1ms real-world latency', 'Custom beryllium planar drivers']
    },
    messagingStrategy: {
      brandNarrativeHook: 'Hear every nuance as the artist intended with zero cable restraint.',
      keyThemes: ['Lossless Studio Acoustics', 'True Zero Latency', 'Aerospace Precision'],
      primaryAngles: ['The Death of Cable Drag', 'Studio Quality Anywhere'],
      voiceGuidance: 'Authoritative, technical yet accessible, electrifying'
    },
    contentStrategy: {
      pillars: [
        {
          name: 'Latency Physics',
          purpose: 'Educate on why UWB outperforms legacy wireless audio',
          audienceNeed: 'Proof of zero latency',
          messagingAngle: 'Oscilloscope measurements and real-time blind tests',
          recommendedFormats: ['Comparison reels', 'Oscilloscope visuals']
        }
      ],
      contentMix: [
        { type: 'Educational', percentage: 40, purpose: 'Explain UWB low latency', funnelStage: 'AWARENESS' },
        { type: 'Product Showcase', percentage: 30, purpose: 'Detail hardware build', funnelStage: 'CONSIDERATION' },
        { type: 'Social Proof', percentage: 20, purpose: 'Studio engineer reactions', funnelStage: 'CONSIDERATION' },
        { type: 'Promotional Offer', percentage: 10, purpose: 'Founder preorder discount', funnelStage: 'CONVERSION' }
      ],
      educationalThemes: ['Audio physics', 'Latency benchmarks'],
      promotionalThemes: ['Preorder founder bundle'],
      storytellingThemes: ['3-year engineering journey'],
      socialProofThemes: ['Grammy-winning producer reactions'],
      engagementThemes: ['Mix testing polls']
    },
    funnelStrategy: {
      stages: [
        {
          stage: 'AWARENESS',
          audienceState: 'Skeptical of wireless latency in studio',
          objective: 'Hook with live latency comparison demo',
          messageFocus: 'Can wireless monitors truly match custom studio cables?',
          contentRole: 'Viral comparison clips',
          ctaBehavior: 'Learn more in bio'
        },
        {
          stage: 'CONSIDERATION',
          audienceState: 'Evaluating specs and reliability',
          objective: 'Validate with producer teardown reviews',
          messageFocus: 'Sub-1ms latency verified in top mastering studios.',
          contentRole: 'Deep dive video',
          ctaBehavior: 'Explore the tech'
        },
        {
          stage: 'CONVERSION',
          audienceState: 'High purchase intent',
          objective: 'Drive preorder checkout',
          messageFocus: 'Save 15% on founder batch with free travel case.',
          contentRole: 'Direct offer banner',
          ctaBehavior: 'Preorder AeroGlide Pro'
        },
        {
          stage: 'RETENTION',
          audienceState: 'AeroGlide Pro owner',
          objective: 'Advocacy and community growth',
          messageFocus: 'Welcome to the future of wireless reference sound.',
          contentRole: 'VIP user community content',
          ctaBehavior: 'Join Studio VIP Club'
        }
      ]
    },
    channelStrategy: {
      recommendedChannels: ['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS'],
      channelGuidance: [
        {
          channel: 'Instagram',
          role: 'Visual storytelling and producer lifestyle',
          contentApproach: 'Behind the scenes studio recording',
          formatGuidance: '9:16 high-contrast reels',
          ctaStrategy: 'Link in bio preorder'
        },
        {
          channel: 'YouTube Shorts',
          role: 'Technical breakdowns and teardowns',
          contentApproach: 'Acoustic measurement charts and latency tests',
          formatGuidance: 'Fast-paced technical shorts',
          ctaStrategy: 'Pinned comment link'
        }
      ]
    },
    offerStrategy: {
      recommendedOffers: ['15% off Founder Preorder + Free Custom Travel Case'],
      urgencyMechanisms: ['Limited first 500 units production run'],
      riskReversals: ['30-Day Studio Trial Guarantee']
    },
    kpiStrategy: {
      primaryKPIs: ['Preorder Sales Volume', 'Video Completion Rate (VCR)'],
      secondaryKPIs: ['Email List Signups', 'Shares'],
      awarenessKPIs: ['Total Reel Views', 'Reach'],
      considerationKPIs: ['Website Click-Throughs', 'Saves'],
      conversionKPIs: ['Preorder Checkouts', 'ROAS']
    },
    risksAndGuardrails: {
      claimsToAvoid: ['Magical sound', 'Cheapest audio monitor'],
      restrictedTopics: ['Competitor disparagement'],
      brandRestrictions: ['Do not claim to replace all cables globally'],
      toneRestrictions: ['Avoid gimmicky hype slang'],
      complianceNotes: ['Must list 2-year warranty terms clearly']
    }
  };

  const sampleCampaignStrategyOutput: CampaignStrategyOutput = {
    objective: 'PRODUCT_LAUNCH',
    audience: {
      primary: 'Studio producers and creators',
      secondary: 'Audiophiles',
      painPoints: ['Cable snags during live takes', 'Bluetooth latency lag'],
      desires: ['Lossless wireless studio freedom'],
      motivations: ['Speed up sessions with uncompromised sound']
    },
    positioning: 'Reference-grade monitoring with lossless zero latency.',
    corePromise: 'Cut the cord without losing a single sample of fidelity.',
    keyMessages: [
      'Zero latency wireless monitoring has arrived',
      'Engineered for discerning audio creators',
      'Limited first-run founder production batch'
    ],
    messagingAngles: [
      'The death of cable snag in live recording',
      'Studio acoustic fidelity anywhere',
      'Why top producers are switching to AeroGlide'
    ],
    contentPillars: ['Zero Latency Physics', 'Studio Workflow Freedom', 'Acoustic Teardown'],
    contentMix: [
      { type: 'Educational', percentage: 40, purpose: 'Explain UWB low latency', funnelStage: 'AWARENESS' },
      { type: 'Product Showcase', percentage: 35, purpose: 'Detail aerospace build', funnelStage: 'CONSIDERATION' },
      { type: 'Promotional Offer', percentage: 25, purpose: 'Direct preorder urgency', funnelStage: 'CONVERSION' }
    ],
    funnel: {
      awareness: {
        message: 'Can wireless monitors really rival custom studio cables?',
        formatGuidance: 'Side-by-side oscilloscope demo',
        cta: 'Watch Demo'
      },
      consideration: {
        message: 'Sub-1ms latency verified in top Nashville mastering rooms.',
        formatGuidance: 'Engineer review clip',
        cta: 'Read Review'
      },
      conversion: {
        message: 'Claim 15% off founder batch with code PROLAUNCH.',
        formatGuidance: 'Urgent 3D product showcase',
        cta: 'Preorder AeroGlide Pro'
      }
    },
    offerStrategy: '15% off founder batch + free custom audio case',
    ctaStrategy: 'Preorder AeroGlide Pro',
    channelStrategy: [
      {
        channel: 'Instagram',
        role: 'Visual storytelling',
        contentApproach: 'Studio lifestyle and clean macro hardware shots',
        formatGuidance: '9:16 high contrast reels',
        ctaStrategy: 'Bio link'
      },
      {
        channel: 'TikTok',
        role: 'Demo virality',
        contentApproach: 'Producer latency reaction hooks',
        formatGuidance: 'Fast-paced stitched reactions',
        ctaStrategy: 'Direct shop link'
      }
    ],
    kpis: {
      primary: ['Preorder conversions', 'Engagement Rate'],
      targets: ['500 Preorders in 30 Days', '>4% CTR']
    },
    guardrails: {
      claimsToAvoid: ['Cheapest audio ever', 'Zero setup needed'],
      restrictions: ['Maintain authoritative engineering tone']
    }
  };

  beforeEach(() => {
    users = [];
    userPasswords.clear();
    workspaces = [];
    brands = [];
    products = [];
    assets = [];
    dnas = [];
    strategies = [];
    campaigns = [];

    const mockDb = {} as Database;
    mockAiProvider = {
      providerName: 'gemini',
      generateText: vi.fn(),
      generateStructured: vi.fn().mockImplementation(async (prompt: string) => {
        if (typeof prompt === 'string' && prompt.includes('Campaign Strategy')) {
          return sampleCampaignStrategyOutput;
        }
        if (typeof prompt === 'string' && prompt.includes('Marketing Strategy')) {
          return sampleMarketingStrategyOutput;
        }
        return sampleBrandDnaOutput;
      })
    };

    authService = new AuthService(mockDb);
    brandService = new BrandService(mockDb, mockAiProvider);
    marketingService = new MarketingBrainService(mockDb, mockAiProvider);
    campaignService = new CampaignService(mockDb, mockAiProvider);

    // Auth & Workspace Mocks
    vi.spyOn(authService['userRepo'], 'existsByEmail').mockImplementation(async (email) => {
      return users.some((u) => u.email === email.toLowerCase());
    });

    vi.spyOn(authService['userRepo'], 'create').mockImplementation(async (data) => {
      const user: User = {
        id: `user-${Math.random().toString(36).substring(2, 8)}`,
        email: data.email,
        name: data.name,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      users.push(user);
      userPasswords.set(user.id, data.passwordHash);
      return user;
    });

    vi.spyOn(authService['workspaceRepo'], 'create').mockImplementation(async (data) => {
      const ws: WorkspaceWithMembers = {
        id: `ws-${Math.random().toString(36).substring(2, 8)}`,
        name: data.name,
        ownerId: data.ownerId,
        userRole: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: []
      };
      workspaces.push(ws);
      return ws;
    });

    vi.spyOn(authService['sessionRepo'], 'create').mockImplementation(async (data) => {
      return {
        id: `sess-${Math.random().toString(36).substring(2, 8)}`,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        createdAt: new Date()
      };
    });

    // BrandService Repository Mocks
    vi.spyOn(brandService['brandRepo'], 'create').mockImplementation(async (workspaceId, input, slug) => {
      const brand: Brand = {
        id: `brand-${Math.random().toString(36).substring(2, 8)}`,
        workspaceId,
        name: input.name,
        slug,
        description: input.description,
        websiteUrl: input.websiteUrl || null,
        story: input.story || null,
        industry: input.industry,
        targetAudience: input.targetAudience || null,
        brandVoice: input.brandVoice || null,
        brandPersonality: input.brandPersonality || null,
        uniqueSellingPoints: input.uniqueSellingPoints || [],
        pricingInfo: null,
        offers: input.offers || [],
        primaryCta: input.primaryCta || null,
        socialLinks: {},
        brandColors: input.brandColors || {},
        typography: input.typography || {},
        contentPillars: input.contentPillars || [],
        marketingRules: input.marketingRules || { claimsToAvoid: [], brandRestrictions: [], complianceRules: [] },
        competitorReferences: input.competitorReferences || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      brands.push(brand);
      return brand;
    });

    vi.spyOn(brandService['brandRepo'], 'findByIdAndWorkspace').mockImplementation(async (brandId, workspaceId) => {
      return brands.find((b) => b.id === brandId && b.workspaceId === workspaceId) || null;
    });

    vi.spyOn(brandService['brandRepo'], 'listForWorkspace').mockImplementation(async (workspaceId) => {
      return brands.filter((b) => b.workspaceId === workspaceId);
    });

    vi.spyOn(brandService['productRepo'], 'create').mockImplementation(async (brandId, input) => {
      const prod: BrandProduct = {
        id: `prod-${Math.random().toString(36).substring(2, 8)}`,
        brandId,
        name: input.name,
        description: input.description,
        category: input.category || null,
        price: input.price ?? null,
        currency: input.currency || 'USD',
        features: input.features || [],
        benefits: input.benefits || [],
        usps: input.usps || [],
        targetAudience: null,
        offerInfo: null,
        cta: input.cta || null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      products.push(prod);
      return prod;
    });

    vi.spyOn(brandService['productRepo'], 'listForBrand').mockImplementation(async (brandId) => {
      return products.filter((p) => p.brandId === brandId);
    });

    vi.spyOn(brandService['assetRepo'], 'create').mockImplementation(async (brandId, input) => {
      const asset = {
        id: `asset-${Math.random().toString(36).substring(2, 8)}`,
        brandId,
        type: input.type,
        name: input.name,
        storageKey: input.storageKey,
        url: input.url,
        metadata: {},
        createdAt: new Date()
      } as any;
      assets.push(asset);
      return asset;
    });

    vi.spyOn(brandService['assetRepo'], 'listForBrand').mockImplementation(async (brandId) => {
      return assets.filter((a) => a.brandId === brandId);
    });

    vi.spyOn(brandService['dnaRepo'], 'saveNewVersion').mockImplementation(async (brandId, output, generatedBy) => {
      const latest = dnas.filter((d) => d.brandId === brandId).sort((a, b) => b.version - a.version)[0];
      const version = (latest?.version || 0) + 1;

      const record = {
        id: `dna-${Math.random().toString(36).substring(2, 8)}`,
        brandId,
        version,
        identity: output.identity,
        audience: output.audience,
        messaging: output.messaging,
        products: output.products as any,
        visualIdentity: output.visualIdentity as any,
        contentStrategy: output.contentStrategy,
        promotionRules: output.promotionRules,
        generatedBy: generatedBy || 'gemini',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      dnas.push(record);
      return record;
    });

    vi.spyOn(brandService['dnaRepo'], 'findLatestByBrandId').mockImplementation(async (brandId) => {
      return dnas.filter((d) => d.brandId === brandId).sort((a, b) => b.version - a.version)[0] || null;
    });

    // MarketingBrainService Mocks
    vi.spyOn(marketingService['brandRepo'], 'findByIdAndWorkspace').mockImplementation(async (bId, wsId) => {
      return brands.find((b) => b.id === bId && b.workspaceId === wsId) || null;
    });
    vi.spyOn(marketingService['productRepo'], 'listForBrand').mockImplementation(async (bId) => {
      return products.filter((p) => p.brandId === bId);
    });
    vi.spyOn(marketingService['assetRepo'], 'listForBrand').mockImplementation(async (bId) => {
      return assets.filter((a) => a.brandId === bId);
    });
    vi.spyOn(marketingService['dnaRepo'], 'findLatestByBrandId').mockImplementation(async (bId) => {
      return dnas.filter((d) => d.brandId === bId).sort((a, b) => b.version - a.version)[0] || null;
    });
    vi.spyOn(marketingService['strategyRepo'], 'findLatestByBrandId').mockImplementation(async (bId) => {
      const list = strategies.filter((s) => s.brandId === bId).sort((a, b) => b.version - a.version);
      return list[0] || null;
    });
    vi.spyOn(marketingService['strategyRepo'], 'listVersions').mockImplementation(async (bId) => {
      return strategies.filter((s) => s.brandId === bId).sort((a, b) => b.version - a.version);
    });
    vi.spyOn(marketingService['strategyRepo'], 'saveNewVersion').mockImplementation(async (bId, output, generatedBy) => {
      const latest = strategies.filter((s) => s.brandId === bId).sort((a, b) => b.version - a.version)[0];
      const version = (latest?.version || 0) + 1;
      const rec: MarketingStrategy = {
        id: `strat-${Math.random().toString(36).substring(2, 8)}`,
        brandId: bId,
        version,
        ...output,
        generatedBy: (generatedBy as any)?.provider || 'gemini',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      strategies.push(rec);
      return rec;
    });
    vi.spyOn(marketingService['strategyRepo'], 'updateLatest').mockImplementation(async (bId, updates) => {
      const latest = strategies.filter((s) => s.brandId === bId).sort((a, b) => b.version - a.version)[0];
      if (!latest) return null;
      Object.assign(latest, updates, { updatedAt: new Date() });
      return latest;
    });

    // CampaignService Mocks
    vi.spyOn(campaignService['brandRepo'], 'findByIdAndWorkspace').mockImplementation(async (bId, wsId) => {
      return brands.find((b) => b.id === bId && b.workspaceId === wsId) || null;
    });
    vi.spyOn(campaignService['dnaRepo'], 'findLatestByBrandId').mockImplementation(async (bId) => {
      return dnas.filter((d) => d.brandId === bId).sort((a, b) => b.version - a.version)[0] || null;
    });
    vi.spyOn(campaignService['strategyRepo'], 'findLatestByBrandId').mockImplementation(async (bId) => {
      const list = strategies.filter((s) => s.brandId === bId).sort((a, b) => b.version - a.version);
      return list[0] || null;
    });
    vi.spyOn(campaignService['campaignRepo'], 'create').mockImplementation(async (brandId, input) => {
      const brand = brands.find((b) => b.id === brandId);
      const camp = {
        id: `camp-${Math.random().toString(36).substring(2, 8)}`,
        brandId,
        workspaceId: brand?.workspaceId || 'ws-test',
        name: input.name,
        description: input.description,
        status: input.status || 'DRAFT',
        objective: input.objective,
        channels: input.channels || [],
        coreMessage: input.coreMessage || null,
        offer: input.offer || null,
        primaryCta: input.primaryCta || null,
        campaignStrategy: null,
        strategyVersion: 0,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        targetAudience: input.targetAudience || {},
        contentPillars: input.contentPillars || [],
        kpis: input.kpis || {},
        guardrails: input.guardrails || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      campaigns.push(camp);
      return camp;
    });
    vi.spyOn(campaignService['campaignRepo'], 'listForBrand').mockImplementation(async (bId) => {
      return campaigns.filter((c) => c.brandId === bId);
    });
    vi.spyOn(campaignService['campaignRepo'], 'findByIdAndBrand').mockImplementation(async (cId, bId) => {
      return campaigns.find((c) => c.id === cId && c.brandId === bId) || null;
    });
    vi.spyOn(campaignService['campaignRepo'], 'update').mockImplementation(async (cId, bId, updates) => {
      const camp = campaigns.find((c) => c.id === cId && c.brandId === bId);
      if (!camp) return null;
      Object.assign(camp, updates, { updatedAt: new Date() });
      return camp;
    });
    vi.spyOn(campaignService['campaignRepo'], 'updateStrategy').mockImplementation(async (cId, bId, strategy, version) => {
      const camp = campaigns.find((c) => c.id === cId && c.brandId === bId);
      if (!camp) return null;
      camp.campaignStrategy = strategy;
      camp.strategyVersion = version;
      camp.status = 'READY';
      camp.updatedAt = new Date();
      return camp;
    });
  });

  it('completes the full Phase 1 -> Phase 2 -> Phase 3 end-to-end journey seamlessly', async () => {
    // 1. User Signs up & gets default workspace
    const signup = await authService.signup({
      name: 'Elena Rostova',
      email: 'elena@aeroglide.io',
      password: 'StrongPassword123'
    });
    const workspaceId = signup.workspace.id;
    expect(workspaceId).toBeDefined();

    // 2. User creates a Brand
    const brand = await brandService.createBrand(workspaceId, {
      name: 'AeroGlide Audio',
      industry: 'Consumer Tech',
      description: 'Zero-latency wireless studio monitors for recording artists',
      websiteUrl: 'https://aeroglide.io',
      story: 'Engineered by audio purists to eliminate wireless lag forever.',
      brandVoice: 'Dynamic, sharp, authoritative',
      brandPersonality: 'Innovative, precision-engineered',
      primaryCta: 'Preorder AeroGlide Pro'
    });
    expect(brand.id).toBeDefined();

    // 3. User adds Product and Asset
    await brandService.createProduct(brand.id, workspaceId, {
      name: 'AeroGlide Pro',
      description: 'Ultra-low latency wireless monitor',
      price: 349,
      cta: 'Order AeroGlide Pro'
    });

    await brandService.createAsset(brand.id, workspaceId, {
      name: 'AeroGlide Logo',
      type: 'logo',
      storageKey: 'logos/aeroglide.png',
      url: 'https://cdn.example.com/aeroglide.png'
    });

    // 4. Generate Brand Brain (Brand DNA v1)
    const dnaV1 = await brandService.generateBrandDNA(brand.id, workspaceId);
    expect(dnaV1.version).toBe(1);
    expect(dnaV1.identity.brandName).toBe('AeroGlide Audio');

    // 5. Transform Brand Brain into Master Marketing Strategy (v1)
    const marketingStratV1 = await marketingService.generateStrategy(brand.id, workspaceId, {
      objective: 'CUSTOMER_ACQUISITION',
      businessGoal: 'Scale direct-to-consumer preorders to 2,500 units in Q3',
      marketingGoal: 'Generate 15,000 qualified preorder landing page visitors'
    });
    expect(marketingStratV1.version).toBe(1);
    expect(marketingStratV1.positioning.valuePropositionStatement).toBe(
      'The reference standard in wireless zero-latency audio monitoring.'
    );
    expect(marketingStratV1.funnelStrategy.stages[0].stage).toBe('AWARENESS');
    expect(marketingStratV1.contentStrategy.contentMix).toHaveLength(4);

    // 6. Regenerate Marketing Strategy (v2) and verify version history
    const marketingStratV2 = await marketingService.generateStrategy(brand.id, workspaceId, {
      objective: 'CUSTOMER_ACQUISITION',
      businessGoal: 'Scale direct-to-consumer preorders to 2,500 units in Q3',
      marketingGoal: 'Generate 15,000 qualified preorder landing page visitors'
    });
    expect(marketingStratV2.version).toBe(2);

    const stratHistory = await marketingService.getStrategyHistory(brand.id, workspaceId);
    expect(stratHistory.length).toBe(2);
    expect(stratHistory[0].version).toBe(2);
    expect(stratHistory[1].version).toBe(1);

    // 7. Manually patch Marketing Strategy positioning
    const patchedStrat = await marketingService.updateStrategy(brand.id, workspaceId, {
      positioning: {
        marketCategory: 'Lossless Wireless Studio Monitors',
        competitiveMoat: 'Proprietary Ultra-Wideband lossless sub-millisecond audio streaming',
        valuePropositionStatement: 'Custom Master Positioning: Studio fidelity with zero cord drag.',
        differentiators: ['<1ms real-world latency', 'Custom beryllium planar drivers']
      }
    });
    expect(patchedStrat.positioning.valuePropositionStatement).toBe(
      'Custom Master Positioning: Studio fidelity with zero cord drag.'
    );

    // 8. Create a Campaign under this Brand
    const campaign = await campaignService.createCampaign(brand.id, workspaceId, {
      name: 'AeroGlide Launch Surge',
      description: 'Direct sales drive for AeroGlide Pro founder batch',
      objective: 'PRODUCT_LAUNCH',
      channels: ['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS'],
      coreMessage: 'Cut the cord without losing a single sample of fidelity',
      offer: '15% off Founder Preorder + Free Custom Case',
      primaryCta: 'Preorder AeroGlide Pro'
    });

    expect(campaign.id).toBeDefined();
    expect(campaign.status).toBe('DRAFT');
    expect(campaign.strategyVersion).toBe(0);
    expect(campaign.campaignStrategy).toBeNull();

    // 9. Synthesize AI Campaign Strategy (v1)
    const campWithStratV1 = await campaignService.generateCampaignStrategy(
      campaign.id,
      brand.id,
      workspaceId,
      { campaignGoal: 'Drive 500 founder preorders in 30 days' }
    );

    expect(campWithStratV1.strategyVersion).toBe(1);
    expect(campWithStratV1.status).toBe('READY');
    expect(campWithStratV1.campaignStrategy).not.toBeNull();
    expect(campWithStratV1.campaignStrategy?.corePromise).toBe(
      'Cut the cord without losing a single sample of fidelity.'
    );
    expect(campWithStratV1.campaignStrategy?.funnel.conversion.cta).toBe('Preorder AeroGlide Pro');
    expect(campWithStratV1.campaignStrategy?.keyMessages).toHaveLength(3);

    // 10. Regenerate Campaign Strategy (v2)
    const campWithStratV2 = await campaignService.generateCampaignStrategy(
      campaign.id,
      brand.id,
      workspaceId
    );
    expect(campWithStratV2.strategyVersion).toBe(2);

    // 11. Update Campaign attributes & activate campaign
    const activatedCampaign = await campaignService.updateCampaign(
      campaign.id,
      brand.id,
      workspaceId,
      {
        status: 'ACTIVE',
        offer: '20% Special Launch Week Discount'
      }
    );
    expect(activatedCampaign?.status).toBe('ACTIVE');
    expect(activatedCampaign?.offer).toBe('20% Special Launch Week Discount');

    // 12. Safe Fallback verification: AI failure does not corrupt state
    vi.spyOn(mockAiProvider, 'generateStructured').mockRejectedValueOnce(
      new Error('API quota rate limit')
    );

    await expect(
      campaignService.generateCampaignStrategy(campaign.id, brand.id, workspaceId)
    ).rejects.toThrow('API quota rate limit');

    // Verify existing campaign strategy v2 is preserved
    const preservedCampaign = await campaignService.getCampaignById(campaign.id, brand.id, workspaceId);
    expect(preservedCampaign?.strategyVersion).toBe(2);
    expect(preservedCampaign?.campaignStrategy?.corePromise).toBe(
      'Cut the cord without losing a single sample of fidelity.'
    );

    // 13. Verify Workspace Isolation
    const strangerBrandAccess = await brandService.getBrandById(brand.id, 'workspace-stranger');
    expect(strangerBrandAccess).toBeNull();

    await expect(
      marketingService.generateStrategy(brand.id, 'workspace-stranger', {
        objective: 'SALES',
        businessGoal: 'Goal',
        marketingGoal: 'Goal'
      })
    ).rejects.toThrow('not found in this workspace');

    await expect(
      campaignService.getCampaignById(campaign.id, brand.id, 'workspace-stranger')
    ).resolves.toBeNull();
  });
});
