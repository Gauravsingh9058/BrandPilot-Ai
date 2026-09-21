import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../apps/api/src/services/auth.service.js';
import { BrandService } from '../packages/brand/src/brandService.js';
import { MarketingBrainService, CampaignService } from '../packages/campaign/src/index.js';
import { ContentPlanService, ContentPlannerService } from '../packages/content/src/index.js';
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
  ContentPlan,
  ContentJob,
  ContentPlanOutput,
  ContentJobOutput,
  MarketingStrategyOutput
} from '@vidsnapai/types';

describe('VidSnapAI Phase 4 Full End-to-End Content Planner Integration Flow', () => {
  let authService: AuthService;
  let brandService: BrandService;
  let marketingService: MarketingBrainService;
  let campaignService: CampaignService;
  let planService: ContentPlanService;
  let plannerService: ContentPlannerService;
  let mockAiProvider: AIProvider;

  // In-memory persistent data stores
  let users: User[] = [];
  const userPasswords = new Map<string, string>();
  let workspaces: WorkspaceWithMembers[] = [];
  let brands: Brand[] = [];
  let products: BrandProduct[] = [];
  let assets: BrandAsset[] = [];
  let dnas: BrandDNA[] = [];
  let strategies: MarketingStrategy[] = [];
  let campaigns: Campaign[] = [];
  let plans: ContentPlan[] = [];
  let jobs: ContentJob[] = [];

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
      contentPillars: ['Acoustic Science', 'Studio Workflows', 'Product Engineering', 'Producer Stories'],
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
    marketingGoal: 'Generate 100,000 highly qualified views and 1,500 preorder waitlist leads',
    targetAudience: {
      primarySegments: ['Pro DAW Creators', 'Sound Designers'],
      psychographics: ['Obsessed with mix accuracy', 'Values clean desk setup'],
      buyingTriggers: ['Frustration with bluetooth latency during tracking'],
      objectionsToOvercome: ['Is wireless latency truly sub-1ms?']
    },
    positioning: {
      marketCategory: 'Zero-Latency Wireless Reference Monitoring',
      competitiveMoat: 'Proprietary ultra-wideband audio sync technology',
      valuePropositionStatement: 'True studio reference monitoring without a single wire.',
      differentiators: ['<1ms verified latency', 'Beryllium planar diaphragm']
    },
    messagingStrategy: {
      brandNarrativeHook: 'Never let cable drag bottleneck your sonic inspiration again.',
      keyThemes: ['Wireless Freedom', 'Reference Accuracy', 'Zero Latency'],
      primaryAngles: ['The latency shootout vs legacy cables'],
      voiceGuidance: 'Crisp, authoritative, technical yet accessible'
    },
    contentStrategy: {
      pillars: [
        {
          name: 'Acoustic Science',
          purpose: 'Educate on frequency response and phase coherence',
          audienceNeed: 'Technical validation',
          messagingAngle: 'Why planar drivers deliver tighter transient response',
          recommendedFormats: ['SHORT_REEL', 'TALKING_HEAD_REEL']
        }
      ],
      contentMix: [
        { type: 'Educational', percentage: 35, purpose: 'Latency science', funnelStage: 'AWARENESS' },
        { type: 'Product Teardown', percentage: 25, purpose: 'Hardware superiority', funnelStage: 'CONSIDERATION' },
        { type: 'Producer Stories', percentage: 25, purpose: 'Studio validation', funnelStage: 'CONSIDERATION' },
        { type: 'Preorder Urgency', percentage: 15, purpose: 'Drive conversions', funnelStage: 'CONVERSION' }
      ],
      educationalThemes: ['Frequency spectrum calibration'],
      promotionalThemes: ['Limited founder bundle batch'],
      storytellingThemes: ['Why we spent 2 years solving wireless sync'],
      socialProofThemes: ['Grammy winner blindfold challenge'],
      engagementThemes: ['Mix translation quiz']
    },
    funnelStrategy: {
      stages: [
        {
          stage: 'AWARENESS',
          audienceState: 'Unaware of UWB wireless capability',
          objective: 'Hook with latency comparison',
          messageFocus: 'Can you track vocals on wireless headphones without lag?',
          contentRole: 'High-contrast split-screen reels',
          ctaBehavior: 'Save reel'
        },
        {
          stage: 'CONSIDERATION',
          audienceState: 'Evaluating AeroGlide Pro',
          objective: 'Prove studio accuracy',
          messageFocus: 'Real DAW tracking sessions with zero perceived latency.',
          contentRole: 'Producer studio sessions',
          ctaBehavior: 'Explore specs'
        },
        {
          stage: 'CONVERSION',
          audienceState: 'Ready to buy',
          objective: 'Drive preorder deposit',
          messageFocus: 'Founder batch strictly limited to 500 units.',
          contentRole: 'Urgency countdown clips',
          ctaBehavior: 'Preorder AeroGlide Pro'
        },
        {
          stage: 'RETENTION',
          audienceState: 'Preorder backer',
          objective: 'Community building',
          messageFocus: 'Welcome to the future of wireless monitoring.',
          contentRole: 'Founder updates',
          ctaBehavior: 'Join Discord'
        }
      ]
    },
    channelStrategy: {
      recommendedChannels: ['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS'],
      channelGuidance: [
        {
          channel: 'INSTAGRAM',
          role: 'Visual brand storytelling & high-converting reels',
          contentApproach: 'Micro teardowns and creator testimonials',
          formatGuidance: '9:16 vertical reels with high-contrast subtitles',
          ctaStrategy: 'Link in bio preorder page'
        }
      ]
    },
    offerStrategy: {
      recommendedOffers: ['Founder Preorder: 15% Off + Free Custom Hardcase ($60 Value)'],
      urgencyMechanisms: ['Strictly limited to first 500 units'],
      riskReversals: ['30-Day Money Back Studio Trial']
    },
    kpiStrategy: {
      primaryKPIs: ['Preorder Conversions', 'Reel Video Views'],
      secondaryKPIs: ['Saves and Shares'],
      awarenessKPIs: ['Reach', '3-sec view rate'],
      considerationKPIs: ['Website clicks'],
      conversionKPIs: ['Preorder checkouts']
    },
    risksAndGuardrails: {
      claimsToAvoid: ['Magic audio latency'],
      restrictedTopics: ['Unverified competitor comparisons'],
      brandRestrictions: ['Do not claim to replace multi-thousand dollar room acoustics'],
      toneRestrictions: ['Never sound arrogant or elitist'],
      complianceNotes: ['2-year warranty disclosure']
    }
  };

  const generateMock30DayOutput = (name = 'AeroGlide Audio 30-Day Growth Content Plan'): ContentPlanOutput => {
    const uniqueHooks = [
      'The #1 mistake producers make when checking their bass frequencies.',
      'Why bluetooth headphones are destroying your vocal timing.',
      'Inside our studio: testing 0.5ms wireless latency against cabled gear.',
      'Can you hear the difference between planar drivers and dynamic cones?',
      'The shocking reason why your mixes translate poorly to car speakers.',
      'Here is how Grammy-winning engineers calibrate their monitor levels.',
      'We dismantled a $500 studio monitor to see what is really inside.',
      'Three acoustic room secrets that cost zero dollars to implement.',
      'Why we spent 2 years engineering our proprietary wireless protocol.',
      'The truth about frequency response charts manufacturers hide from you.',
      'How latency compensation in your DAW actually works.',
      'Behind the scenes with producer Alex Rivera testing AeroGlide Pro.',
      'Top 5 mixing headphone myths you need to stop believing.',
      'Why low impedance monitors matter for dynamic transient response.',
      'Real producer blind test: Wireless AeroGlide vs Legendary Wired Can.',
      'How to isolate unwanted mud in your low-mids without losing warmth.',
      'What happens when you drop studio-grade planar drivers into wireless IEMs.',
      'The engineering challenge behind zero compression wireless audio.',
      'Why phase alignment is the secret weapon of chart-topping masters.',
      'Studio walkthrough: setting up an acoustic reference workspace.',
      'Comparing THD distortion at 90dB across top reference hardware.',
      'Exclusive first look: AeroGlide Pro production line in action.',
      'How to dial in punchy kicks without clipping your master bus.',
      'The real cost of mixing on delayed audio monitoring.',
      'Why top mixing engineers are switching away from legacy cables.',
      'Unboxing the AeroGlide Pro founder edition preview kit.',
      'Final 48 hours: early bird preorder tier is almost sold out.',
      'Customer transformation: from home bedroom to Spotify viral master.',
      'Thank you to our first 500 studio founders — what comes next.',
      'Recap of 30 days of audio science: join the creator community.'
    ];

    const uniqueTopics = [
      'Sub bass clarity techniques',
      'Wireless latency benchmarks',
      'Planar magnetic driver acoustics',
      'Mix translation principles',
      'Studio monitor calibration',
      'Hardware teardown and build quality',
      'Room reflection dampening',
      'Proprietary wireless protocol design',
      'Harmonic distortion analysis',
      'DAW latency compensation',
      'Artist producer endorsements',
      'Headphone impedance guide',
      'Blind listening shootout',
      'Muddy mix EQ cleanup',
      'Ear monitor ergonomic testing',
      'Lossless audio transmission',
      'Phase cancellation troubleshooting',
      'Studio acoustics setup guide',
      'Transient response speed test',
      'Hardware manufacturing showcase',
      'Punchy drum mixing tactics',
      'Monitoring delay consequences',
      'Studio cable clutter elimination',
      'Founder package reveal',
      'Preorder tier launch urgency',
      'Producer before-and-after story',
      'Community milestone celebration',
      'Acoustic engineering synthesis',
      'Audio creator community invite',
      'Next chapter product roadmap'
    ];

    const funnelStages: Array<'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION'> = [
      'AWARENESS',
      'CONSIDERATION',
      'CONVERSION',
      'RETENTION'
    ];

    const pillars = ['Acoustic Science', 'Studio Workflows', 'Product Engineering', 'Producer Stories'];

    const outputJobs: ContentJobOutput[] = [];
    for (let day = 1; day <= 30; day++) {
      outputJobs.push({
        dayNumber: day,
        weekNumber: Math.ceil(day / 7),
        title: `Day ${day}: ${uniqueTopics[day - 1]}`,
        contentType: day % 6 === 0 ? 'PROMOTIONAL' : day % 3 === 0 ? 'STORYTELLING' : 'EDUCATIONAL',
        funnelStage: funnelStages[(day - 1) % funnelStages.length],
        contentPillar: pillars[(day - 1) % pillars.length],
        objective: `Drive engagement and category awareness on Day ${day}`,
        audience: 'Audio engineers and studio producers',
        topic: uniqueTopics[day - 1],
        hook: uniqueHooks[day - 1],
        keyMessage: `Zero latency monitoring unlocks authentic performance on Day ${day}.`,
        messagingAngle: `Focus on clarity and workflow acceleration for day ${day}`,
        offer: day % 7 === 0 ? '15% Off Preorder Bundle' : null,
        cta: day % 7 === 0 ? 'Click link in bio to preorder' : 'Save this tip for your next session',
        platform: 'INSTAGRAM',
        format: 'SHORT_REEL',
        priority: day % 7 === 0 ? 'HIGH' : 'MEDIUM',
        suggestedVisualHook: `Quick visual zoom on soundwave visualizer (Day ${day})`,
        suggestedAudioConcept: 'Crisp studio voiceover with subtle bass thump',
        keyTakeaway: 'Reference audio precision changes mixing speed.',
        strategicRationale: `Positions AeroGlide as the authority in zero-latency hardware for Day ${day}.`
      });
    }

    return {
      planName: name,
      objective: 'Scale preorders and establish category leadership',
      durationDays: 30,
      campaignTheme: 'Precision Sound Without Compromise',
      executiveSummary: 'A structured 30-day narrative moving creators from latency frustration to studio freedom.',
      weeklyNarratives: [
        {
          weekNumber: 1,
          theme: 'The Hidden Flaws of Wireless Monitoring',
          focusObjective: 'Exposing Latency & Category Education',
          funnelFocus: 'AWARENESS',
          strategicPurpose: 'Establish the core problem in modern wireless audio.'
        },
        {
          weekNumber: 2,
          theme: 'The Science of Zero-Latency Acoustics',
          focusObjective: 'Authority & Technical Superiority',
          funnelFocus: 'CONSIDERATION',
          strategicPurpose: 'Demystify ultra-wideband driver architecture.'
        },
        {
          weekNumber: 3,
          theme: 'Studio Proof & Producer Testimonials',
          focusObjective: 'Validation & Social Proof',
          funnelFocus: 'CONSIDERATION',
          strategicPurpose: 'Showcase real-world mixing session tests.'
        },
        {
          weekNumber: 4,
          theme: 'The Preorder Transformation Sprint',
          focusObjective: 'High-Urgency Conversion',
          funnelFocus: 'CONVERSION',
          strategicPurpose: 'Drive preorder commitments with limited-time launch offers.'
        },
        {
          weekNumber: 5,
          theme: 'Creator Community & Next Era',
          focusObjective: 'Community & Retention',
          funnelFocus: 'RETENTION',
          strategicPurpose: 'Celebrate early backers and build community momentum.'
        }
      ],
      diversificationSummary: {
        funnelDistribution: { AWARENESS: 10, CONSIDERATION: 10, CONVERSION: 6, RETENTION: 4 },
        contentTypeDistribution: { EDUCATIONAL: 18, STORYTELLING: 7, PROMOTIONAL: 5 },
        formatDistribution: { SHORT_REEL: 30 },
        pillarDistribution: {
          'Acoustic Science': 8,
          'Studio Workflows': 8,
          'Product Engineering': 7,
          'Producer Stories': 7
        }
      },
      jobs: outputJobs
    };
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
    plans = [];
    jobs = [];

    const mockDb = {} as Database;
    mockAiProvider = {
      providerName: 'gemini',
      generateText: vi.fn(),
      generateStructured: vi.fn().mockImplementation(async (prompt: string) => {
        if (typeof prompt === 'string' && prompt.includes('Marketing Strategy')) {
          return sampleMarketingStrategyOutput;
        }
        if (typeof prompt === 'string' && prompt.includes('Brand DNA')) {
          return sampleBrandDnaOutput;
        }
        return generateMock30DayOutput();
      })
    };

    authService = new AuthService(mockDb);
    brandService = new BrandService(mockDb, mockAiProvider);
    marketingService = new MarketingBrainService(mockDb, mockAiProvider);
    campaignService = new CampaignService(mockDb, mockAiProvider);
    planService = new ContentPlanService(mockDb);
    plannerService = new ContentPlannerService(mockDb, mockAiProvider);

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

    // BrandService Mocks
    vi.spyOn(brandService['brandRepo'], 'create').mockImplementation(async (workspaceId, input, slug) => {
      const brand: Brand = {
        id: `brand-${Math.random().toString(36).substring(2, 8)}`,
        workspaceId,
        name: input.name,
        slug: slug || input.name.toLowerCase().replace(/\s+/g, '-'),
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

    vi.spyOn(brandService['dnaRepo'], 'saveNewVersion').mockImplementation(async (brandId, output, generatedBy) => {
      const latest = dnas.filter((d) => d.brandId === brandId).sort((a, b) => b.version - a.version)[0];
      const version = (latest?.version || 0) + 1;
      const record: BrandDNA = {
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
        generatedBy: (generatedBy as any)?.provider || 'gemini',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dnas.push(record);
      return record;
    });

    vi.spyOn(brandService['dnaRepo'], 'findLatestByBrandId').mockImplementation(async (brandId) => {
      return dnas.filter((d) => d.brandId === brandId).sort((a, b) => b.version - a.version)[0] || null;
    });

    vi.spyOn(brandService['productRepo'], 'listForBrand').mockImplementation(async (brandId) => {
      return products.filter((p) => p.brandId === brandId);
    });

    vi.spyOn(brandService['assetRepo'], 'listForBrand').mockImplementation(async (brandId) => {
      return assets.filter((a) => a.brandId === brandId);
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
    vi.spyOn(marketingService['strategyRepo'], 'saveNewVersion').mockImplementation(async (bId, output, _generatedBy) => {
      const latest = strategies.filter((s) => s.brandId === bId).sort((a, b) => b.version - a.version)[0];
      const version = (latest?.version || 0) + 1;
      const rec: MarketingStrategy = {
        id: `strat-${Math.random().toString(36).substring(2, 8)}`,
        brandId: bId,
        version,
        ...output,
        aiMetadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      strategies.push(rec);
      return rec;
    });
    vi.spyOn(marketingService['strategyRepo'], 'findLatestByBrandId').mockImplementation(async (bId) => {
      return strategies.filter((s) => s.brandId === bId).sort((a, b) => b.version - a.version)[0] || null;
    });

    // CampaignService Mocks
    vi.spyOn(campaignService['brandRepo'], 'findByIdAndWorkspace').mockImplementation(async (bId, wsId) => {
      return brands.find((b) => b.id === bId && b.workspaceId === wsId) || null;
    });
    vi.spyOn(campaignService['campaignRepo'], 'create').mockImplementation(async (bId, input) => {
      const camp: Campaign = {
        id: `camp-${Math.random().toString(36).substring(2, 8)}`,
        brandId: bId,
        name: input.name,
        description: input.description,
        objective: input.objective,
        status: input.status || 'DRAFT',
        channels: input.channels || [],
        contentPillars: input.contentPillars || [],
        strategyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      campaigns.push(camp);
      return camp;
    });
    vi.spyOn(campaignService['campaignRepo'], 'findByIdAndBrand').mockImplementation(async (cId, bId) => {
      return campaigns.find((c) => c.id === cId && c.brandId === bId) || null;
    });

    // ContentPlanService & PlannerService Mocks
    vi.spyOn(plannerService['brandRepo'], 'findByIdAndWorkspace').mockImplementation(async (bId, wsId) => {
      return brands.find((b) => b.id === bId && b.workspaceId === wsId) || null;
    });
    vi.spyOn(plannerService['dnaRepo'], 'findLatestByBrandId').mockImplementation(async (bId) => {
      return dnas.filter((d) => d.brandId === bId).sort((a, b) => b.version - a.version)[0] || null;
    });
    vi.spyOn(plannerService['strategyRepo'], 'findLatestByBrandId').mockImplementation(async (bId) => {
      return strategies.filter((s) => s.brandId === bId).sort((a, b) => b.version - a.version)[0] || null;
    });
    vi.spyOn(plannerService['campaignRepo'], 'findByIdAndBrand').mockImplementation(async (cId, bId) => {
      return campaigns.find((c) => c.id === cId && c.brandId === bId) || null;
    });
    vi.spyOn(plannerService['productRepo'], 'listForBrand').mockImplementation(async (bId) => {
      return products.filter((p) => p.brandId === bId);
    });

    vi.spyOn(plannerService['planRepo'], 'create').mockImplementation(async (bId, wsId, input) => {
      const id = `plan-${plans.length + 1}`;
      const planGroupId = input.planGroupId || `group-${id}`;
      const created: ContentPlan = {
        id,
        brandId: bId,
        workspaceId: wsId,
        campaignId: input.campaignId || null,
        name: input.name,
        objective: input.objective,
        startDate: input.startDate || new Date(),
        endDate: input.endDate || new Date(Date.now() + 30 * 86400000),
        durationDays: input.durationDays || 30,
        status: input.status || 'READY',
        version: input.version || 1,
        planGroupId,
        strategySnapshot: input.strategySnapshot || {},
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      plans.push(created);
      return created;
    });

    vi.spyOn(plannerService['planRepo'], 'getLatestVersion').mockImplementation(async (groupId, bId) => {
      const matched = plans.filter((p) => p.planGroupId === groupId && p.brandId === bId);
      return matched.length > 0 ? Math.max(...matched.map((p) => p.version)) : 0;
    });

    vi.spyOn(plannerService['jobRepo'], 'createMany').mockImplementation(async (planId, bId, wsId, inputs) => {
      const createdJobs: ContentJob[] = inputs.map((inp, idx) => ({
        id: `job-${planId}-${idx + 1}`,
        contentPlanId: planId,
        brandId: bId,
        campaignId: inp.campaignId || null,
        workspaceId: wsId,
        dayNumber: inp.dayNumber,
        scheduledDate: inp.scheduledDate || new Date(),
        title: inp.title,
        contentType: inp.contentType as any,
        funnelStage: inp.funnelStage as any,
        contentPillar: inp.contentPillar,
        objective: inp.objective,
        audience: inp.audience,
        topic: inp.topic,
        hook: inp.hook,
        keyMessage: inp.keyMessage,
        messagingAngle: inp.messagingAngle,
        offer: inp.offer || null,
        cta: inp.cta,
        platform: inp.platform as any,
        format: inp.format as any,
        priority: (inp.priority || 'MEDIUM') as any,
        status: (inp.status || 'PLANNED') as any,
        strategy: (inp.strategy || {}) as Record<string, unknown>,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      jobs.push(...createdJobs);
      return createdJobs;
    });

    vi.spyOn(plannerService['jobRepo'], 'findApprovedForPlan').mockImplementation(async (planId) => {
      return jobs.filter((j) => j.contentPlanId === planId && j.status === 'READY');
    });

    vi.spyOn(planService['brandRepo'], 'findByIdAndWorkspace').mockImplementation(async (bId, wsId) => {
      return brands.find((b) => b.id === bId && b.workspaceId === wsId) || null;
    });

    vi.spyOn(planService['planRepo'], 'findByIdAndBrand').mockImplementation(async (pId, bId) => {
      return plans.find((p) => p.id === pId && p.brandId === bId) || null;
    });

    vi.spyOn(planService['planRepo'], 'delete').mockImplementation(async (pId, bId) => {
      const initial = plans.length;
      plans = plans.filter((p) => !(p.id === pId && p.brandId === bId));
      jobs = jobs.filter((j) => j.contentPlanId !== pId);
      return plans.length < initial;
    });

    vi.spyOn(planService['jobRepo'], 'update').mockImplementation(async (jId, pId, input) => {
      const idx = jobs.findIndex((j) => j.id === jId && j.contentPlanId === pId);
      if (idx === -1) return null;
      jobs[idx] = { ...jobs[idx], ...input, updatedAt: new Date() } as ContentJob;
      return jobs[idx];
    });

    vi.spyOn(planService['jobRepo'], 'updateStatus').mockImplementation(async (jId, pId, status) => {
      const idx = jobs.findIndex((j) => j.id === jId && j.contentPlanId === pId);
      if (idx === -1) return null;
      jobs[idx] = { ...jobs[idx], status, updatedAt: new Date() };
      return jobs[idx];
    });
  });

  it('executes full lifecycle: Signup -> Brand Brain -> Marketing Strategy -> Campaign -> 30-Day Plan -> Diversification -> Job Edit -> Regeneration', async () => {
    // 1. Foundation: Signup & Workspace Setup
    const { user, workspace } = await authService.signup({
      name: 'Maya Lin',
      email: 'maya@aeroglide.io',
      password: 'SecurePassword123!'
    });
    expect(user).toBeDefined();
    expect(workspace).toBeDefined();

    // 2. Brand Brain: Brand Creation & DNA Synthesis
    const brand = await brandService.createBrand(workspace.id, {
      name: 'AeroGlide Audio',
      description: 'Precision wireless acoustic monitors for audio professionals',
      industry: 'Consumer Tech',
      primaryCta: 'Preorder AeroGlide Pro'
    });
    expect(brand.name).toBe('AeroGlide Audio');

    const brandDna = await brandService.generateBrandDNA(brand.id, workspace.id);
    expect(brandDna.version).toBe(1);

    // 3. Marketing Brain: Strategy Generation & Campaign Launch
    const marketingStrategy = await marketingService.generateStrategy(brand.id, workspace.id, {
      objective: 'CUSTOMER_ACQUISITION',
      businessGoal: 'Scale preorders to 2,500 units in Q3',
      marketingGoal: 'Generate 100,000 views and 1,500 waitlist leads'
    });
    expect(marketingStrategy.version).toBe(1);

    const campaign = await campaignService.createCampaign(brand.id, workspace.id, {
      name: 'Q3 Preorder Sprint',
      description: 'D2C Preorder Campaign for AeroGlide Pro',
      objective: 'CUSTOMER_ACQUISITION'
    });
    expect(campaign.name).toBe('Q3 Preorder Sprint');

    // 4. Phase 4: 30-Day Content Planner Generation
    const planV1 = await plannerService.generateContentPlan(brand.id, workspace.id, {
      name: 'AeroGlide 30-Day Launch Sprint',
      campaignId: campaign.id,
      durationDays: 30
    });

    expect(planV1).toBeDefined();
    expect(planV1.version).toBe(1);
    expect(planV1.durationDays).toBe(30);
    expect(planV1.jobs).toHaveLength(30);

    // 5. Verify Diversification Metrics & Cadence
    const metrics = (planV1.strategySnapshot as any)?.diversificationMetrics;
    expect(metrics).toBeDefined();
    expect(metrics.score).toBeGreaterThanOrEqual(80);
    expect(metrics.passed).toBe(true);
    expect(metrics.metrics.totalJobs).toBe(30);

    // 6. Inspect & Modify Individual Jobs (Approval Workflow)
    const day3Job = planV1.jobs.find((j) => j.dayNumber === 3)!;
    expect(day3Job).toBeDefined();

    // Customize Day 3 hook & CTA
    const updatedDay3 = await planService.updateJob(day3Job.id, planV1.id, brand.id, workspace.id, {
      hook: 'EXCLUSIVE TEST: Can planar magnetic wireless beat a $1,200 studio cable setup?',
      cta: 'Watch the full shootout in bio'
    });
    expect(updatedDay3?.hook).toBe('EXCLUSIVE TEST: Can planar magnetic wireless beat a $1,200 studio cable setup?');

    // Approve Day 3 & Day 7
    await planService.updateJobStatus(day3Job.id, planV1.id, brand.id, workspace.id, 'READY');
    const day7Job = planV1.jobs.find((j) => j.dayNumber === 7)!;
    await planService.updateJobStatus(day7Job.id, planV1.id, brand.id, workspace.id, 'READY');

    // 7. Safe Regeneration (v1 -> v2) with Preserved Approved Jobs
    const planV2 = await plannerService.generateContentPlan(brand.id, workspace.id, {
      name: 'AeroGlide 30-Day Launch Sprint v2',
      campaignId: campaign.id,
      durationDays: 30,
      planGroupId: planV1.planGroupId,
      previousPlanId: planV1.id,
      regenerate: true,
      preserveApprovedJobs: true,
      customGuidance: 'Increase focus on planar magnetic driver clarity.'
    });

    expect(planV2.version).toBe(2);
    expect(planV2.planGroupId).toBe(planV1.planGroupId);
    expect(plans).toHaveLength(2);

    // Ensure Day 3 customized hook was preserved into v2
    const v2Day3 = planV2.jobs.find((j) => j.dayNumber === 3);
    expect(v2Day3?.hook).toBe('EXCLUSIVE TEST: Can planar magnetic wireless beat a $1,200 studio cable setup?');

    // 8. Cascading Deletion Verification
    const deleted = await planService.deletePlan(planV1.id, brand.id, workspace.id);
    expect(deleted).toBe(true);
    expect(plans).toHaveLength(1);
    expect(plans[0].version).toBe(2);
  });
});
