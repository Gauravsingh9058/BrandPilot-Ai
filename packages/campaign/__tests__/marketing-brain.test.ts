import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarketingBrainService } from '../src/marketingBrainService.js';
import { CampaignService } from '../src/campaignService.js';
import type { Database } from '@vidsnapai/database';
import type {
  AIProvider,
  Brand,
  BrandDNA,
  MarketingStrategy,
  Campaign,
  MarketingStrategyOutput,
  CampaignStrategyOutput
} from '@vidsnapai/types';

describe('Marketing Brain & Campaign Engine Domain Services', () => {
  let marketingService: MarketingBrainService;
  let campaignService: CampaignService;
  let mockAiProvider: AIProvider;
  let mockDb: any;

  // In-memory test state
  let brands: Brand[] = [];
  let dnaRecords: BrandDNA[] = [];
  let strategies: MarketingStrategy[] = [];
  let campaigns: Campaign[] = [];

  const sampleBrand: Brand = {
    id: 'brand-100',
    workspaceId: 'ws-test',
    name: 'Luminary Audio',
    slug: 'luminary-audio',
    description: 'Precision wireless acoustic monitors',
    websiteUrl: 'https://luminaryaudio.com',
    story: 'Creating zero-latency wireless monitors for musicians.',
    industry: 'Consumer Audio',
    targetAudience: 'Music producers and audio engineers',
    brandVoice: 'Authoritative, pristine, dynamic',
    brandPersonality: 'Innovative, refined',
    uniqueSellingPoints: ['Zero latency', 'Dual driver system'],
    pricingInfo: '$299',
    offers: ['15% off preorder'],
    primaryCta: 'Preorder Luminary One',
    socialLinks: {},
    brandColors: { primary: '#0f172a', secondary: '#38bdf8' },
    typography: { headingFont: 'Outfit', bodyFont: 'Inter' },
    contentPillars: ['Audio Engineering', 'Studio Tips', 'Product Teardowns'],
    marketingRules: {
      claimsToAvoid: ['Magical sound', 'Cheapest monitor'],
      brandRestrictions: ['Do not disparage wired systems'],
      complianceRules: []
    },
    competitorReferences: ['Audio-Technica', 'Shure'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleDNA: BrandDNA = {
    id: 'dna-100',
    brandId: 'brand-100',
    version: 1,
    identity: {
      brandName: 'Luminary Audio',
      industry: 'Consumer Audio',
      story: 'Zero latency wireless monitors.',
      mission: 'Empower sound artists anywhere.',
      personality: ['Innovative', 'Professional']
    },
    audience: {
      primaryAudience: 'Producers and audiophiles',
      demographics: ['20-45 creators'],
      painPoints: ['Wireless latency lag', 'Poor battery life'],
      desires: ['Uncompressed studio sound on the go'],
      buyingMotivations: ['Ultra low latency', 'Pristine audio reproduction']
    },
    messaging: {
      positioning: 'Studio fidelity without the cables.',
      coreMessage: 'Zero latency, absolute clarity.',
      valueProposition: 'Experience pristine reference monitoring cord-free.',
      usps: ['Zero wireless latency', 'Handcrafted drivers'],
      proofPoints: ['50+ producer endorsements', '<1ms latency verified'],
      tone: ['Authoritative', 'Crisp'],
      forbiddenMessaging: ['Magical sound', 'Cheapest monitor']
    },
    products: [],
    visualIdentity: {
      colors: { primary: '#0f172a', secondary: '#38bdf8' },
      typography: { headingFont: 'Outfit', bodyFont: 'Inter' },
      visualStyle: 'Dark matte with cyan neon accents',
      imageStyle: 'Moody studio lighting'
    },
    contentStrategy: {
      contentPillars: ['Audio Engineering', 'Studio Tips'],
      preferredTopics: ['Latency benchmarks', 'Equalization curves'],
      educationalTopics: ['How ultra-wideband audio works'],
      promotionalTopics: ['Preorder launch bundle'],
      storytellingTopics: ['Why we rejected Bluetooth standard']
    },
    promotionRules: {
      primaryCTA: 'Preorder Luminary One',
      offers: ['15% off preorder'],
      claimsToAvoid: ['Magical sound'],
      complianceRules: [],
      brandRestrictions: []
    },
    generatedBy: 'gemini',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleMarketingStrategyOutput: MarketingStrategyOutput = {
    objective: 'CUSTOMER_ACQUISITION',
    businessGoal: 'Accelerate preorders and scale initial recurring sales',
    marketingGoal: 'Generate 5,000 qualified preorder leads in 60 days',
    targetAudience: {
      primarySegments: ['Pro Audio Engineers', 'Home Studio Producers', 'Audiophiles'],
      psychographics: ['Values pristine sound reproduction', 'Frustrated by cable clutter'],
      buyingTriggers: ['New studio buildout', 'Touring convenience requirement'],
      objectionsToOvercome: ['Latency perception in wireless audio', 'Battery degradation fears']
    },
    positioning: {
      marketCategory: 'Pro Wireless Acoustic Monitoring',
      competitiveMoat: 'Proprietary lossless Ultra-Wideband audio transmission sub-1ms',
      valuePropositionStatement: 'Reference-grade studio monitoring without a single cord.',
      differentiators: ['<1ms real latency', 'Handcrafted beryllium planar drivers']
    },
    messagingStrategy: {
      brandNarrativeHook: 'Hear every nuance the artist intended with zero cable restraint.',
      keyThemes: ['Lossless Studio Acoustics', 'True Zero Latency', 'Aerospace Engineering'],
      primaryAngles: ['The Death of Cable Drag', 'Studio Quality Anywhere', 'Blind Test Champion'],
      voiceGuidance: 'Authoritative, technical yet accessible, electrifying'
    },
    contentStrategy: {
      pillars: [
        {
          name: 'Acoustic Science',
          purpose: 'Educate on planar drivers and latency physics',
          audienceNeed: 'Technical validation of audio performance',
          messagingAngle: 'Why Bluetooth fails and UWB wins',
          recommendedFormats: ['Oscilloscope visualizer reels', 'Teardown videos']
        }
      ],
      contentMix: [
        { type: 'Educational', percentage: 35, purpose: 'Teach acoustics and latency', funnelStage: 'AWARENESS' },
        { type: 'Product Showcase', percentage: 30, purpose: 'Macro hardware craftsmanship', funnelStage: 'CONSIDERATION' },
        { type: 'Social Proof', percentage: 20, purpose: 'Producer studio reactions', funnelStage: 'CONSIDERATION' },
        { type: 'Promotional Offer', percentage: 15, purpose: 'Founder preorder discount', funnelStage: 'CONVERSION' }
      ],
      educationalThemes: ['Audio physics', 'Frequency response curves'],
      promotionalThemes: ['Early bird preorder bundle'],
      storytellingThemes: ['3-year engineering journey'],
      socialProofThemes: ['Grammy-winning engineer reactions'],
      engagementThemes: ['Audio production debate polls']
    },
    funnelStrategy: {
      stages: [
        {
          stage: 'AWARENESS',
          audienceState: 'Unaware of UWB wireless studio tech',
          objective: 'Hook with latency comparison demo',
          messageFocus: 'Can wireless audio truly match wired fidelity?',
          contentRole: 'Viral hook demo',
          ctaBehavior: 'Learn more in bio'
        },
        {
          stage: 'CONSIDERATION',
          audienceState: 'Skeptical of battery and driver durability',
          objective: 'Validate with engineer teardown reviews',
          messageFocus: 'Sub-1ms verified by Nashville mastering pros.',
          contentRole: 'Deep dive video',
          ctaBehavior: 'Explore the tech'
        },
        {
          stage: 'CONVERSION',
          audienceState: 'High purchase intent',
          objective: 'Drive preorder checkout',
          messageFocus: 'Save 15% on founder batch.',
          contentRole: 'Direct offer banner',
          ctaBehavior: 'Preorder Luminary One'
        },
        {
          stage: 'RETENTION',
          audienceState: 'Owner of Luminary One',
          objective: 'Encourage referrals and advocacy',
          messageFocus: 'Welcome to the future of monitoring.',
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
          role: 'Visual storytelling and artist lifestyle',
          contentApproach: 'Behind the scenes studio recording',
          formatGuidance: '9:16 high definition reels',
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
      recommendedOffers: ['15% off Founder Preorder + Free Case'],
      urgencyMechanisms: ['Limited first 500 units production run'],
      riskReversals: ['30-Day No-Questions-Asked Studio Trial']
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
      restrictedTopics: ['Competitor bashing'],
      brandRestrictions: ['Do not claim to replace all cables globally'],
      toneRestrictions: ['Avoid gimmicky hype slang'],
      complianceNotes: ['Must list 2-year warranty terms clearly']
    }
  };

  const sampleCampaignStrategyOutput: CampaignStrategyOutput = {
    objective: 'PRODUCT_LAUNCH',
    audience: {
      primary: 'Studio producers and audio creators',
      secondary: 'Discerning audiophiles',
      painPoints: ['Cable snags during live takes', 'Bluetooth latency delay'],
      desires: ['Lossless wireless studio freedom'],
      motivations: ['Speed up studio sessions with uncompromised sound']
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
      'Why top producers are switching to Luminary'
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
        cta: 'Preorder Luminary One'
      }
    },
    offerStrategy: '15% off founder batch + free custom audio case',
    ctaStrategy: 'Preorder Luminary One',
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
    brands = [sampleBrand];
    dnaRecords = [sampleDNA];
    strategies = [];
    campaigns = [];

    mockDb = {} as Database;

    mockAiProvider = {
      providerName: 'gemini',
      generateText: vi.fn(),
      generateStructured: vi.fn().mockImplementation(async (prompt: string) => {
        if (typeof prompt === 'string' && prompt.includes('Campaign')) {
          return sampleCampaignStrategyOutput;
        }
        return sampleMarketingStrategyOutput;
      })
    };

    marketingService = new MarketingBrainService(mockDb, mockAiProvider);
    campaignService = new CampaignService(mockDb, mockAiProvider);

    // Mock BrandRepo, ProductRepo, AssetRepo, DnaRepo in marketingService
    vi.spyOn(marketingService['brandRepo'], 'findByIdAndWorkspace').mockImplementation(async (brandId, wsId) => {
      return brands.find((b) => b.id === brandId && b.workspaceId === wsId) || null;
    });

    vi.spyOn(marketingService['productRepo'], 'listForBrand').mockImplementation(async () => []);
    vi.spyOn(marketingService['assetRepo'], 'listForBrand').mockImplementation(async () => []);

    vi.spyOn(marketingService['dnaRepo'], 'findLatestByBrandId').mockImplementation(async (brandId) => {
      return dnaRecords.find((d) => d.brandId === brandId) || null;
    });

    // Mock MarketingStrategyRepo in marketingService & campaignService
    vi.spyOn(marketingService['strategyRepo'], 'findLatestByBrandId').mockImplementation(async (brandId) => {
      const list = strategies.filter((s) => s.brandId === brandId).sort((a, b) => b.version - a.version);
      return list[0] || null;
    });

    vi.spyOn(marketingService['strategyRepo'], 'listVersions').mockImplementation(async (brandId) => {
      return strategies.filter((s) => s.brandId === brandId).sort((a, b) => b.version - a.version);
    });

    vi.spyOn(marketingService['strategyRepo'], 'saveNewVersion').mockImplementation(async (brandId, output, generatedBy) => {
      const latest = strategies.filter((s) => s.brandId === brandId).sort((a, b) => b.version - a.version)[0];
      const version = (latest?.version || 0) + 1;

      const record: MarketingStrategy = {
        id: `strat-${Math.random().toString(36).substring(2, 8)}`,
        brandId,
        version,
        ...output,
        generatedBy: (generatedBy as any)?.provider || 'gemini',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      strategies.push(record);
      return record;
    });

    vi.spyOn(marketingService['strategyRepo'], 'updateLatest').mockImplementation(async (brandId, updates) => {
      const latest = strategies.filter((s) => s.brandId === brandId).sort((a, b) => b.version - a.version)[0];
      if (!latest) return null;
      Object.assign(latest, updates, { updatedAt: new Date() });
      return latest;
    });

    // Mock CampaignRepo in campaignService
    vi.spyOn(campaignService['brandRepo'], 'findByIdAndWorkspace').mockImplementation(async (brandId, wsId) => {
      return brands.find((b) => b.id === brandId && b.workspaceId === wsId) || null;
    });

    vi.spyOn(campaignService['dnaRepo'], 'findLatestByBrandId').mockImplementation(async (brandId) => {
      return dnaRecords.find((d) => d.brandId === brandId) || null;
    });

    vi.spyOn(campaignService['strategyRepo'], 'findLatestByBrandId').mockImplementation(async (brandId) => {
      const list = strategies.filter((s) => s.brandId === brandId).sort((a, b) => b.version - a.version);
      return list[0] || null;
    });

    vi.spyOn(campaignService['campaignRepo'], 'create').mockImplementation(async (brandId, input) => {
      const brand = brands.find((b) => b.id === brandId);
      const newCampaign: Campaign = {
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
      campaigns.push(newCampaign);
      return newCampaign;
    });

    vi.spyOn(campaignService['campaignRepo'], 'findByIdAndBrand').mockImplementation(async (campaignId, brandId) => {
      return campaigns.find((c) => c.id === campaignId && c.brandId === brandId) || null;
    });

    vi.spyOn(campaignService['campaignRepo'], 'update').mockImplementation(async (campaignId, brandId, updates) => {
      const camp = campaigns.find((c) => c.id === campaignId && c.brandId === brandId);
      if (!camp) return null;
      Object.assign(camp, updates, { updatedAt: new Date() });
      return camp;
    });

    vi.spyOn(campaignService['campaignRepo'], 'updateStrategy').mockImplementation(async (campaignId, brandId, strategy, version) => {
      const camp = campaigns.find((c) => c.id === campaignId && c.brandId === brandId);
      if (!camp) return null;
      camp.campaignStrategy = strategy;
      camp.strategyVersion = version;
      camp.status = 'READY';
      camp.updatedAt = new Date();
      return camp;
    });

    vi.spyOn(campaignService['campaignRepo'], 'listForBrand').mockImplementation(async (brandId) => {
      return campaigns.filter((c) => c.brandId === brandId);
    });
  });

  // ==========================================
  // MARKETING BRAIN SERVICE TESTS
  // ==========================================
  describe('MarketingBrainService', () => {
    it('generates a complete marketing strategy (v1) anchored to Brand DNA', async () => {
      const strategy = await marketingService.generateStrategy('brand-100', 'ws-test', {
        objective: 'CUSTOMER_ACQUISITION',
        businessGoal: 'Accelerate preorders and scale initial recurring sales',
        marketingGoal: 'Generate 5,000 qualified preorder leads in 60 days'
      });

      expect(strategy).toBeDefined();
      expect(strategy.version).toBe(1);
      expect(strategy.positioning.valuePropositionStatement).toBe(
        'Reference-grade studio monitoring without a single cord.'
      );
      expect(strategy.funnelStrategy.stages[0].stage).toBe('AWARENESS');
      expect(strategy.funnelStrategy.stages[2].ctaBehavior).toBe('Preorder Luminary One');
      expect(strategy.contentStrategy.contentMix).toHaveLength(4);
      expect(strategy.channelStrategy.channelGuidance).toHaveLength(2);
      expect(mockAiProvider.generateStructured).toHaveBeenCalled();
    });

    it('increments version to v2 when regenerated and maintains version history', async () => {
      const v1 = await marketingService.generateStrategy('brand-100', 'ws-test', {
        objective: 'CUSTOMER_ACQUISITION',
        businessGoal: 'Goal',
        marketingGoal: 'Goal'
      });
      expect(v1.version).toBe(1);

      const v2 = await marketingService.generateStrategy('brand-100', 'ws-test', {
        objective: 'CUSTOMER_ACQUISITION',
        businessGoal: 'Goal',
        marketingGoal: 'Goal'
      });
      expect(v2.version).toBe(2);

      const history = await marketingService.getStrategyHistory('brand-100', 'ws-test');
      expect(history).toHaveLength(2);
      expect(history[0].version).toBe(2);
      expect(history[1].version).toBe(1);
    });

    it('preserves existing valid marketing strategy if AI synthesis fails (safe fallback)', async () => {
      const v1 = await marketingService.generateStrategy('brand-100', 'ws-test', {
        objective: 'CUSTOMER_ACQUISITION',
        businessGoal: 'Goal',
        marketingGoal: 'Goal'
      });
      expect(v1.version).toBe(1);

      // AI failure on second run
      vi.spyOn(mockAiProvider, 'generateStructured').mockRejectedValueOnce(
        new Error('AI generation model timeout')
      );

      await expect(
        marketingService.generateStrategy('brand-100', 'ws-test', {
          objective: 'CUSTOMER_ACQUISITION',
          businessGoal: 'Goal',
          marketingGoal: 'Goal'
        })
      ).rejects.toThrow('AI generation model timeout');

      // Check that existing strategy is intact
      const latest = await marketingService.getLatestStrategy('brand-100', 'ws-test');
      expect(latest).not.toBeNull();
      expect(latest?.version).toBe(1);
      expect(latest?.positioning.valuePropositionStatement).toBe(
        'Reference-grade studio monitoring without a single cord.'
      );
    });

    it('rejects invalid AI generated structure that violates Zod schema without saving', async () => {
      // Mock malformed response missing required fields
      vi.spyOn(mockAiProvider, 'generateStructured').mockResolvedValueOnce({
        positioning: { marketCategory: 'Broken' }
      });

      await expect(
        marketingService.generateStrategy('brand-100', 'ws-test', {
          objective: 'CUSTOMER_ACQUISITION',
          businessGoal: 'Goal',
          marketingGoal: 'Goal'
        })
      ).rejects.toThrow('invalid Marketing Strategy structure');

      const latest = await marketingService.getLatestStrategy('brand-100', 'ws-test');
      expect(latest).toBeNull();
    });

    it('allows updating fields of the current marketing strategy', async () => {
      await marketingService.generateStrategy('brand-100', 'ws-test', {
        objective: 'CUSTOMER_ACQUISITION',
        businessGoal: 'Goal',
        marketingGoal: 'Goal'
      });

      const updated = await marketingService.updateStrategy('brand-100', 'ws-test', {
        positioning: {
          marketCategory: 'Pro Wireless Acoustic Monitoring',
          competitiveMoat: 'Proprietary lossless Ultra-Wideband audio transmission sub-1ms',
          valuePropositionStatement: 'Updated Custom Reference Monitoring Positioning',
          differentiators: ['<1ms real latency', 'Handcrafted beryllium planar drivers']
        }
      });

      expect(updated.positioning.valuePropositionStatement).toBe(
        'Updated Custom Reference Monitoring Positioning'
      );
    });
  });

  // ==========================================
  // CAMPAIGN SERVICE TESTS
  // ==========================================
  describe('CampaignService', () => {
    it('creates a new campaign entity with valid parameters', async () => {
      const campaign = await campaignService.createCampaign('brand-100', 'ws-test', {
        name: 'Summer Preorder Campaign',
        description: 'Direct sales drive for Luminary One preorder batch',
        objective: 'SALES',
        channels: ['INSTAGRAM', 'TIKTOK'],
        coreMessage: 'Preorder before founder batch sells out',
        offer: '15% off + free carry case',
        primaryCta: 'Preorder Now'
      });

      expect(campaign.id).toBeDefined();
      expect(campaign.name).toBe('Summer Preorder Campaign');
      expect(campaign.objective).toBe('SALES');
      expect(campaign.status).toBe('DRAFT');
      expect(campaign.strategyVersion).toBe(0);
      expect(campaign.campaignStrategy).toBeNull();
    });

    it('synthesizes Campaign Strategy and increments strategyVersion from 0 to 1', async () => {
      // Create campaign first
      const camp = await campaignService.createCampaign('brand-100', 'ws-test', {
        name: 'Luminary Launch Drive',
        description: 'Promote wireless audio monitoring',
        objective: 'PRODUCT_LAUNCH',
        channels: ['INSTAGRAM', 'TIKTOK']
      });

      // Generate strategy
      const updated = await campaignService.generateCampaignStrategy(
        camp.id,
        'brand-100',
        'ws-test',
        { campaignGoal: 'Drive initial 500 preorders' }
      );

      expect(updated.strategyVersion).toBe(1);
      expect(updated.status).toBe('READY');
      expect(updated.campaignStrategy).not.toBeNull();
      expect(updated.campaignStrategy?.corePromise).toBe(
        'Cut the cord without losing a single sample of fidelity.'
      );
      expect(updated.campaignStrategy?.funnel.awareness.message).toContain(
        'Can wireless monitors really rival'
      );
      expect(updated.campaignStrategy?.keyMessages).toHaveLength(3);
    });

    it('increments campaign strategy version on regeneration (v1 -> v2)', async () => {
      const camp = await campaignService.createCampaign('brand-100', 'ws-test', {
        name: 'Luminary Launch Drive',
        description: 'Promote wireless audio monitoring',
        objective: 'PRODUCT_LAUNCH',
        channels: ['INSTAGRAM']
      });

      const v1 = await campaignService.generateCampaignStrategy(
        camp.id,
        'brand-100',
        'ws-test'
      );
      expect(v1.strategyVersion).toBe(1);

      const v2 = await campaignService.generateCampaignStrategy(
        camp.id,
        'brand-100',
        'ws-test'
      );
      expect(v2.strategyVersion).toBe(2);
    });

    it('safely preserves existing campaign strategy if regeneration fails', async () => {
      const camp = await campaignService.createCampaign('brand-100', 'ws-test', {
        name: 'Luminary Launch Drive',
        description: 'Promote wireless audio monitoring',
        objective: 'PRODUCT_LAUNCH',
        channels: ['INSTAGRAM']
      });

      const v1 = await campaignService.generateCampaignStrategy(
        camp.id,
        'brand-100',
        'ws-test'
      );
      expect(v1.strategyVersion).toBe(1);

      // Simulate AI failure on second call
      vi.spyOn(mockAiProvider, 'generateStructured').mockRejectedValueOnce(
        new Error('AI synthesis connection reset')
      );

      await expect(
        campaignService.generateCampaignStrategy(camp.id, 'brand-100', 'ws-test')
      ).rejects.toThrow('AI synthesis connection reset');

      // Verify v1 strategy was retained
      const current = await campaignService.getCampaignById(camp.id, 'brand-100', 'ws-test');
      expect(current?.strategyVersion).toBe(1);
      expect(current?.campaignStrategy?.corePromise).toBe(
        'Cut the cord without losing a single sample of fidelity.'
      );
    });

    it('updates campaign attributes via updateCampaign', async () => {
      const camp = await campaignService.createCampaign('brand-100', 'ws-test', {
        name: 'Initial Name',
        description: 'Initial Desc',
        objective: 'ENGAGEMENT',
        channels: ['TIKTOK']
      });

      const updated = await campaignService.updateCampaign(
        camp.id,
        'brand-100',
        'ws-test',
        {
          name: 'Renamed Campaign',
          status: 'ACTIVE',
          offer: 'New 20% discount offer'
        }
      );

      expect(updated?.name).toBe('Renamed Campaign');
      expect(updated?.status).toBe('ACTIVE');
      expect(updated?.offer).toBe('New 20% discount offer');
    });
  });
});
