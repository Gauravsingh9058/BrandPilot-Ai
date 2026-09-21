import { describe, it, expect, vi } from 'vitest';
import type {
  Brand,
  BrandDNA,
  BrandProduct,
  MarketingStrategy,
  ReelProductionPlan,
  ExperimentRecord,
  OptimizationActionRecord,
  OptimizationContext,
  AIProvider
} from '@vidsnapai/types';
import {
  ExperimentationEngine,
  OptimizationExecutionService,
  AutonomousCampaignLoopService
} from '@vidsnapai/video';
import {
  CampaignDirectorService,
  buildMarketingStrategyPrompt
} from '@vidsnapai/campaign';
import { buildContentPlanPrompt } from '@vidsnapai/content';
import {
  OptimizationActionTypeSchema,
  OptimizationActionStatusSchema
} from '@vidsnapai/validation';

describe('Phase 12: Autonomous Campaign Optimization & Execution Engine', () => {
  // Test Brand Fixture (One8 by Virat Kohli)
  const one8Brand: Brand = {
    id: 'b1088888-8888-8888-8888-888888888888',
    workspaceId: 'ws101111-1111-1111-1111-111111111111',
    name: 'One8 by Virat Kohli',
    slug: 'one8',
    description: 'Active lifestyle and premium sportswear brand by Virat Kohli.',
    industry: 'Sports & Activewear',
    primaryCta: 'Shop One8 Activewear',
    contentPillars: ['Athletic Performance', 'Match Day Energy', 'Streetwear Style'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const one8Dna: BrandDNA = {
    id: 'dna-one8-test',
    brandId: one8Brand.id,
    version: 1,
    generatedBy: 'AI',
    createdAt: new Date(),
    updatedAt: new Date(),
    identity: {
      brandName: 'One8',
      industry: 'Sports & Activewear',
      story: 'Built on Virat Kohli dedication to fitness and everyday active excellence.',
      mission: 'Empower everyday athletes with premium performance gear.',
      personality: ['Energetic', 'Disciplined', 'Premium', 'Modern']
    },
    audience: {
      primaryAudience: 'Active urban youth and fitness enthusiasts aged 18-35',
      demographics: ['18-35', 'Male & Female', 'Urban centers'],
      painPoints: ['Gym apparel that loses shape', 'Uncomfortable fabrics during high-intensity training'],
      desires: ['Look athletic, feel confident, endure tough workouts'],
      buyingMotivations: ['Performance quality', 'Virat Kohli inspiration', 'Aesthetic style']
    },
    messaging: {
      positioning: 'Premium active lifestyle brand delivering match-grade performance.',
      coreMessage: 'Never stop pushing your limits.',
      valueProposition: 'Athletic wear engineered for maximum sweat resistance and peak durability.',
      usps: ['Sweat-wicking microfibers', 'Ergonomic 4-way stretch', 'Pro athlete tested'],
      proofPoints: ['Endorsed by Virat Kohli', 'Over 500,000 active community members'],
      tone: ['Confident', 'Empowering', 'Direct'],
      forbiddenMessaging: ['Flimsy materials', 'Cheap fashion']
    },
    products: [
      {
        name: 'One8 Pro Training Tee',
        category: 'Apparel',
        benefits: ['Breathable', 'Fast-drying'],
        features: ['Seamless fit', 'Reflective logo'],
        price: 39.99,
        usps: ['Pro-wicking'],
        cta: 'Shop Now'
      }
    ],
    visualIdentity: {
      colors: { primary: '#0f172a', accent: '#3b82f6' },
      typography: { headingFont: 'Inter', bodyFont: 'Roboto' },
      visualStyle: 'Cinematic High-Contrast Athletic',
      imageStyle: 'Dynamic action photography in stadium and gym settings'
    },
    contentStrategy: {
      contentPillars: ['Athletic Performance', 'Match Day Energy', 'Streetwear Style'],
      preferredTopics: ['Workout routines', 'Match day preparation', 'Activewear styling'],
      educationalTopics: ['Fabric care', 'Proper training gear'],
      promotionalTopics: ['New drop launches', 'Limited editions'],
      storytellingTopics: ['Athlete journey', 'Behind the design']
    },
    promotionRules: {
      primaryCTA: 'Shop One8 Activewear',
      offers: ['Free shipping over $50'],
      claimsToAvoid: ['Cures medical fatigue', 'Guarantees athletic victories'],
      complianceRules: ['No false medical claims'],
      brandRestrictions: ['Do not use unauthorized sports federation logos']
    }
  };

  const mockProducts: BrandProduct[] = [
    {
      id: 'prod-001',
      brandId: one8Brand.id,
      name: 'One8 Pro Training Tee',
      description: 'Engineered for high-intensity training and everyday comfort.',
      category: 'Apparel',
      price: 39.99,
      currency: 'USD',
      features: ['Seamless fit', '4-way stretch'],
      benefits: ['Stays light when sweating', 'No chafing'],
      usps: ['Pro-wicking tech'],
      cta: 'Shop Pro Tee',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockStrategy: MarketingStrategy = {
    id: 'strat-001',
    brandId: one8Brand.id,
    version: 1,
    objective: 'SALES',
    businessGoal: 'Increase online sales of activewear line by 40%',
    marketingGoal: 'Generate 5,000 qualified direct response orders',
    targetAudience: {
      primarySegments: ['Active Gym-goers', 'Athleisure Fans'],
      psychographics: ['Values fitness', 'Follows cricket & sports'],
      buyingTriggers: ['New product drop', 'Seasonal discount'],
      objectionsToOvercome: ['Premium price point vs generic gym tees']
    },
    positioning: {
      marketCategory: 'Activewear',
      competitiveMoat: 'Virat Kohli performance benchmark',
      valuePropositionStatement: 'Match-grade activewear built for champions.',
      differentiators: ['Sweat-wicking innovation', 'Athletic ergonomic cut']
    },
    messagingStrategy: {
      brandNarrativeHook: 'Are you training like a champion?',
      keyThemes: ['Dedication', 'Match Day Ready'],
      primaryAngles: ['Performance enhancement', 'Transformation'],
      voiceGuidance: 'High energy, motivating, disciplined'
    },
    contentStrategy: {
      pillars: [
        {
          name: 'Athletic Performance',
          purpose: 'Demonstrate activewear durability and sweat resistance under extreme workouts',
          audienceNeed: 'Proof of performance',
          messagingAngle: 'Durability under pressure',
          recommendedFormats: ['SHORT_REEL', 'PRODUCT_SHOWCASE_REEL']
        }
      ],
      contentMix: [
        { type: 'EDUCATIONAL', percentage: 30, purpose: 'Training tips', funnelStage: 'AWARENESS' },
        { type: 'PROMOTIONAL', percentage: 70, purpose: 'Product direct sales', funnelStage: 'CONVERSION' }
      ],
      educationalThemes: ['Sweat management'],
      promotionalThemes: ['Pro Training Tee launch'],
      storytellingThemes: ['Virat Kohli fitness discipline'],
      socialProofThemes: ['Customer gym reviews'],
      engagementThemes: ['Weekend workout challenges']
    },
    funnelStrategy: {
      stages: [
        {
          stage: 'CONVERSION',
          audienceState: 'Ready to buy high quality workout apparel',
          objective: 'Drive checkout conversion',
          messageFocus: 'Engineered for athletes, built to last',
          contentRole: 'Hero product showcase reel',
          ctaBehavior: 'Direct link to product checkout'
        }
      ]
    },
    channelStrategy: {
      recommendedChannels: ['INSTAGRAM', 'TIKTOK'],
      channelGuidance: [
        {
          channel: 'INSTAGRAM',
          role: 'Primary conversion channel',
          contentApproach: 'Dynamic 9:16 vertical reels with kinetic captions',
          formatGuidance: '15-30 seconds with 3s problem-contrast hook',
          ctaStrategy: 'Shop Now'
        }
      ]
    },
    offerStrategy: {
      recommendedOffers: ['15% off first order with code ONE8FIT'],
      urgencyMechanisms: ['Limited drop quantity'],
      riskReversals: ['30-day money back guarantee with free returns']
    },
    kpiStrategy: {
      primaryKPIs: ['ROAS > 3.0', 'CPA < $18'],
      secondaryKPIs: ['CTR > 2.5%'],
      awarenessKPIs: ['3s Video View Rate > 45%'],
      considerationKPIs: ['Completion Rate > 30%'],
      conversionKPIs: ['Conversion Rate > 3.5%']
    },
    risksAndGuardrails: {
      claimsToAvoid: ['Guarantees muscle growth', 'Medical health cure'],
      restrictedTopics: ['Unverified performance claims'],
      brandRestrictions: ['Do not degrade competitor brands'],
      toneRestrictions: ['Never sound arrogant or elitist'],
      complianceNotes: ['Display disclaimer where appropriate']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockReelPlan: ReelProductionPlan = {
    id: 'reel-one8-phase12-001',
    contentJobId: 'job-001',
    brandId: one8Brand.id,
    contentPlanId: 'plan-001',
    workspaceId: one8Brand.workspaceId,
    version: 1,
    title: 'One8 Match-Ready Energy Reel',
    concept: {
      title: 'Match-Ready Energy',
      concept: 'High-energy fast-paced gym training sequence showcasing One8 Pro Tee',
      objective: 'Conversion',
      targetAudience: 'Fitness enthusiasts',
      corePromise: 'Never let sweat slow down your reps',
      emotionalAngle: 'Empowering & unstoppable',
      messagingAngle: 'Match-grade activewear',
      contentPillar: 'Athletic Performance',
      funnelStage: 'CONVERSION'
    },
    objective: 'Drive Sales',
    audience: 'Active youth',
    funnelStage: 'CONVERSION',
    contentPillar: 'Athletic Performance',
    durationSeconds: 30,
    aspectRatio: '9:16',
    platform: 'INSTAGRAM',
    format: 'REEL',
    hook: {
      type: 'PROBLEM',
      text: 'Most gym tees trap sweat after set three.',
      visualIntent: 'Athlete sweating in ordinary soaked cotton shirt',
      deliveryStyle: 'Punchy fast-paced voiceover',
      durationSeconds: 3
    },
    narrative: 'Transition from soggy training sessions to featherweight breathable performance with One8.',
    script: [
      { id: 's1', purpose: 'Hook', text: 'Most gym tees trap sweat after set three.', estimatedDuration: 3, deliveryStyle: 'Energetic', emotionalTone: 'Agitated' },
      { id: 's2', purpose: 'Solution', text: 'Switch to One8 Pro Training Tee with pro-wicking microfibers.', estimatedDuration: 4, deliveryStyle: 'Confident', emotionalTone: 'Inspired' },
      { id: 's3', purpose: 'CTA', text: 'Get yours today and train without limits.', estimatedDuration: 3, deliveryStyle: 'Direct', emotionalTone: 'Empowered' }
    ],
    scenes: [
      {
        sceneNumber: 1,
        durationSeconds: 3,
        purpose: 'Hook',
        visualType: 'PROBLEM',
        narration: 'Most gym tees trap sweat after set three.',
        onScreenText: 'TRAPPED SWEAT?',
        assetRequirement: 'Sweaty athlete working out',
        subject: 'Athlete',
        environment: 'Gym',
        composition: 'Close-up',
        camera: 'Dynamic whip pan',
        lighting: 'High contrast',
        mood: 'Intense',
        transition: 'whip',
        animationIntent: 'Fast scale-in'
      },
      {
        sceneNumber: 2,
        durationSeconds: 4,
        purpose: 'Solution',
        visualType: 'PRODUCT_SHOWCASE',
        narration: 'Switch to One8 Pro Training Tee with pro-wicking microfibers.',
        onScreenText: 'PRO-WICKING 4-WAY STRETCH',
        assetRequirement: 'Hero shot of One8 training tee',
        subject: 'One8 Pro Tee',
        environment: 'Clean modern athletic backdrop',
        composition: 'Center hero',
        camera: 'Smooth tracking push',
        lighting: 'Crisp studio lighting',
        mood: 'Premium',
        transition: 'cut',
        animationIntent: 'Kinetic text pop'
      },
      {
        sceneNumber: 3,
        durationSeconds: 3,
        purpose: 'CTA',
        visualType: 'CTA',
        narration: 'Get yours today and train without limits.',
        onScreenText: 'SHOP ONE8 ACTIVEWEAR',
        assetRequirement: 'Endcard card with shop now button',
        subject: 'One8 Logo & Button',
        environment: 'Dark gradient',
        composition: 'Centered',
        camera: 'Static',
        lighting: 'Glow',
        mood: 'Action-oriented',
        transition: 'fade',
        animationIntent: 'Button pulse'
      }
    ],
    visualDirection: {
      style: 'Cinematic High-Contrast Athletic',
      mood: 'Energetic',
      colorIntent: 'Deep slate navy with electric blue highlights',
      lightingIntent: 'Crisp athletic directional lighting',
      composition: 'Vertical 9:16 centered subject',
      cameraLanguage: 'Rapid cuts, whip pans, zoom transitions',
      pacing: 'Fast-paced rhythmic',
      visualHierarchy: 'Subject first, kinetic text overlay centered',
      brandIntegration: 'One8 logo watermark top-right',
      productEmphasis: 'Hero tee fabric detail'
    },
    voiceDirection: {
      style: 'Confident & Motivating',
      pace: 'Fast & energetic',
      tone: 'Disciplined athlete',
      genderPreference: 'Male',
      language: 'en-US'
    },
    captionDirection: {
      style: 'Bold dynamic kinetic subtitles',
      placement: 'Center bottom-third',
      density: '2-3 words per burst',
      fontEmphasis: 'Heavy sans-serif white on dark backdrop',
      animation: 'Word-by-word active highlight'
    },
    animationDirection: {
      energy: 'High',
      style: 'Kinetic modern',
      textAnimation: 'Punchy scale with glowing highlight',
      visualTransitions: 'Whip pan and optical zoom',
      elementMotion: 'Subtle atmospheric drift'
    },
    audioDirection: {
      musicMood: 'High-energy electronic trap beat',
      soundEffects: 'Subtle riser on hook, impact whoosh on transition',
      pacing: '128 BPM synced to visual cuts',
      mixBalance: 'Voice 100%, Music 25%, SFX 35%'
    },
    cta: {
      type: 'SHOP_NOW',
      text: 'Shop One8 Activewear Now',
      visualTreatment: 'High-contrast glowing button endcard',
      placement: 'Final scene 27s-30s'
    },
    productionMetadata: {
      totalScenes: 3,
      estimatedWordCount: 38,
      targetDurationSeconds: 30,
      calculatedDurationSeconds: 30,
      generatedBy: 'VidSnapAI Autonomous Engine v12.0',
      contentJobId: 'job-001',
      generatedAt: new Date().toISOString(),
      complianceNotes: [],
      warningFlags: []
    },
    status: 'READY',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // ========================================================
  // 1. Optimization Action Schema & Types Verification
  // ========================================================
  it('should validate allowed OptimizationActionTypes and Statuses', () => {
    const validTypes = [
      'CHANGE_HOOK',
      'CHANGE_MESSAGING_ANGLE',
      'CHANGE_CTA',
      'CHANGE_CONTENT_PILLAR',
      'CHANGE_DURATION',
      'CHANGE_VISUAL_STYLE',
      'CREATE_VARIANT',
      'RECOMMEND_AUDIENCE_CHANGE',
      'RECOMMEND_PLACEMENT_CHANGE',
      'RECOMMEND_BUDGET_CHANGE',
      'PAUSE_RECOMMENDATION',
      'REPLACE_CREATIVE'
    ];

    for (const t of validTypes) {
      expect(OptimizationActionTypeSchema.safeParse(t).success).toBe(true);
    }

    const validStatuses = ['PROPOSED', 'APPROVED', 'REJECTED', 'APPLIED', 'FAILED'];
    for (const s of validStatuses) {
      expect(OptimizationActionStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  // ========================================================
  // 2. ExperimentationEngine: Sample Size Enforcement & Outcomes
  // ========================================================
  it('should enforce minimum sample size and calculate WINNER_A, WINNER_B, NO_SIGNIFICANT_DIFFERENCE, and INCONCLUSIVE', () => {
    const engine = new ExperimentationEngine();

    // Case 1: Insufficient sample size (< 30) -> strictly INCONCLUSIVE
    const underpoweredExp: ExperimentRecord = {
      id: 'exp-underpowered',
      workspaceId: one8Brand.workspaceId,
      brandId: one8Brand.id,
      name: 'Hook A/B Test (Underpowered)',
      experimentType: 'HOOK',
      status: 'RUNNING',
      variantA: { label: 'Problem Hook', content: {}, impressions: 15, conversions: 5 },
      variantB: { label: 'Question Hook', content: {}, impressions: 12, conversions: 1 },
      targetMetric: 'conversionRate',
      sampleSizeA: 15,
      sampleSizeB: 12,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const res1 = engine.evaluate(underpoweredExp);
    expect(res1.status).toBe('INCONCLUSIVE');
    expect(res1.winningVariant).toBe('INCONCLUSIVE');
    expect(res1.outcome).toBe('INCONCLUSIVE');
    expect(res1.resultSummary).toContain('Insufficient sample size');

    // Case 2: Sufficient sample size with statistically significant Winner A (>= 90% confidence)
    const winningAExp: ExperimentRecord = {
      id: 'exp-winner-a',
      workspaceId: one8Brand.workspaceId,
      brandId: one8Brand.id,
      name: 'Hook A/B Test: Contrast vs Question',
      experimentType: 'HOOK',
      status: 'RUNNING',
      variantA: { label: 'Contrast Hook', content: {}, impressions: 1000, conversions: 85 }, // 8.5%
      variantB: { label: 'Question Hook', content: {}, impressions: 1000, conversions: 25 }, // 2.5%
      targetMetric: 'conversionRate',
      sampleSizeA: 1000,
      sampleSizeB: 1000,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const res2 = engine.evaluate(winningAExp);
    expect(res2.status).toBe('COMPLETED');
    expect(res2.winningVariant).toBe('A');
    expect(res2.outcome).toBe('WINNER_A');
    expect(res2.confidenceScore).toBeGreaterThanOrEqual(0.90);
    expect(res2.resultSummary).toContain('Variant A won');

    // Case 3: Sufficient sample size with statistically significant Winner B
    const winningBExp: ExperimentRecord = {
      id: 'exp-winner-b',
      workspaceId: one8Brand.workspaceId,
      brandId: one8Brand.id,
      name: 'CTA A/B Test: Shop Now vs Get Yours Today',
      experimentType: 'CTA',
      status: 'RUNNING',
      variantA: { label: 'Generic CTA', content: {}, impressions: 800, conversions: 20 }, // 2.5%
      variantB: { label: 'Urgent CTA', content: {}, impressions: 800, conversions: 68 }, // 8.5%
      targetMetric: 'conversionRate',
      sampleSizeA: 800,
      sampleSizeB: 800,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const res3 = engine.evaluate(winningBExp);
    expect(res3.status).toBe('COMPLETED');
    expect(res3.winningVariant).toBe('B');
    expect(res3.outcome).toBe('WINNER_B');
    expect(res3.confidenceScore).toBeGreaterThanOrEqual(0.90);

    // Case 4: Sufficient sample size with no significant difference
    const tiedExp: ExperimentRecord = {
      id: 'exp-tied',
      workspaceId: one8Brand.workspaceId,
      brandId: one8Brand.id,
      name: 'Visual Style Test: Gym vs Studio',
      experimentType: 'CREATIVE',
      status: 'RUNNING',
      variantA: { label: 'Gym Dark', content: {}, impressions: 500, conversions: 25 }, // 5.0%
      variantB: { label: 'Studio Bright', content: {}, impressions: 500, conversions: 24 }, // 4.8%
      targetMetric: 'conversionRate',
      sampleSizeA: 500,
      sampleSizeB: 500,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const res4 = engine.evaluate(tiedExp);
    expect(res4.status).toBe('COMPLETED');
    expect(res4.winningVariant).toBe('INCONCLUSIVE');
    expect(res4.outcome).toBe('NO_SIGNIFICANT_DIFFERENCE');
    expect(res4.resultSummary).toContain('not statistically significant');
  });

  // ========================================================
  // 3. Marketing Strategy Prompt Optimization Context Separation
  // ========================================================
  it('should explicitly distinguish VERIFIED HISTORICAL PERFORMANCE DATA from AI RECOMMENDATION in Marketing Brain prompt', () => {
    const optContext: OptimizationContext = {
      winningHooks: ['Most gym tees trap sweat after set three.'],
      weakHooks: ['Check out this activewear shirt.'],
      winningMessagingAngles: ['Durability under extreme sweat testing'],
      weakMessagingAngles: ['Generic gym aesthetics'],
      winningCTAs: ['Shop One8 Activewear Now'],
      weakCTAs: ['Click here'],
      winningContentPillars: ['Athletic Performance'],
      weakContentPillars: ['Lifestyle Casual'],
      winningVisualStyles: ['Cinematic High-Contrast Stadium Action'],
      weakVisualStyles: ['Static Studio White Backdrop'],
      experimentOutcomes: [
        {
          name: 'Hook Contrast Test',
          experimentType: 'HOOK',
          winningVariant: 'A',
          resultSummary: 'Problem hook outperformed generic intro by +34%',
          confidenceScore: 0.95
        }
      ],
      verifiedPerformanceData: [
        { metric: '3s View Rate', value: '52.4%', context: 'Contrast Hooks' },
        { metric: 'ROAS', value: '3.82', context: 'High-energy 30s Reels' }
      ],
      aiRecommendations: [
        {
          recommendation: 'Double budget on Athletic Performance pillar',
          reason: 'Consistently delivers CPA under $16 with high repeat purchase rate',
          expectedImpact: '+35% monthly revenue scale'
        }
      ]
    };

    const prompt = buildMarketingStrategyPrompt(
      one8Brand,
      one8Dna,
      mockProducts,
      [],
      {
        objective: 'SALES',
        businessGoal: 'Scale online orders by 40%',
        marketingGoal: 'Generate 5000 units sold'
      },
      optContext
    );

    // Verify explicit section separation
    expect(prompt).toContain('[SECTION 1: VERIFIED HISTORICAL PERFORMANCE DATA]');
    expect(prompt).toContain('[SECTION 2: AI OPTIMIZATION RECOMMENDATIONS]');
    expect(prompt).toContain('Winning Hooks (Verified High Retention/CTR): Most gym tees trap sweat after set three.');
    expect(prompt).toContain('Weak/Underperforming Hooks (Avoid): Check out this activewear shirt.');
    expect(prompt).toContain('Winning CTAs (High Conversion): Shop One8 Activewear Now');
    expect(prompt).toContain('Experiment "Hook Contrast Test" (HOOK): Winner = A');
    expect(prompt).toContain('Recommendation: Double budget on Athletic Performance pillar');
  });

  // ========================================================
  // 4. 30-Day Content Planner: Optimization Context Integration
  // ========================================================
  it('should enrich 30-Day Content Plan prompt with Phase 11/12 optimization intelligence', () => {
    const optContext: OptimizationContext = {
      winningHooks: ['Most gym tees trap sweat after set three.'],
      weakHooks: ['Check this out'],
      winningMessagingAngles: ['Match-grade activewear durability'],
      winningCTAs: ['Shop One8 Pro Tee'],
      experimentOutcomes: [
        {
          name: 'Pillar Test',
          experimentType: 'CREATIVE',
          winningVariant: 'A',
          resultSummary: 'Performance pillar beats Casual pillar by +40%'
        }
      ]
    };

    const prompt = buildContentPlanPrompt({
      brand: one8Brand,
      brandDna: one8Dna,
      products: mockProducts,
      marketingStrategy: mockStrategy,
      durationDays: 30,
      platforms: ['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS'],
      optimizationContext: optContext
    });

    expect(prompt).toContain('PHASE 11/12: OPTIMIZATION INTELLIGENCE & EXPERIMENT CONTEXT');
    expect(prompt).toContain('[VERIFIED HISTORICAL PATTERNS]');
    expect(prompt).toContain('Recommended Winning Hooks: Most gym tees trap sweat after set three.');
    expect(prompt).toContain('High-Converting Messaging Angles: Match-grade activewear durability');
    expect(prompt).toContain('Top Performing CTAs: Shop One8 Pro Tee');
  });

  // ========================================================
  // 5. OptimizationExecutionService: Approval, Rejection & Idempotent Execution
  // ========================================================
  it('should handle the full Optimization Action lifecycle with workspace isolation and strict approval gating', async () => {
    const mockDbActions: OptimizationActionRecord[] = [];
    const mockExecutionHistory: any[] = [];
    let updatedReelHook: any = null;

    const mockActionRepo: any = {
      create: vi.fn().mockImplementation(async (wsId: string, data: any) => {
        const record: OptimizationActionRecord = {
          id: `act-${mockDbActions.length + 1}`,
          workspaceId: wsId,
          brandId: data.brandId,
          campaignId: data.campaignId,
          reelId: data.reelId,
          actionType: data.actionType,
          targetEntity: data.targetEntity,
          reason: data.reason,
          evidence: data.evidence,
          confidence: data.confidence || 0.85,
          expectedImpact: data.expectedImpact,
          sourceMetrics: data.sourceMetrics || {},
          status: data.status || 'PROPOSED',
          appliedAt: null,
          metadata: data.metadata || {},
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockDbActions.push(record);
        return record;
      }),
      findById: vi.fn().mockImplementation(async (id: string, wsId: string) => {
        return mockDbActions.find((a) => a.id === id && a.workspaceId === wsId) || null;
      }),
      list: vi.fn().mockImplementation(async (wsId: string) => {
        return mockDbActions.filter((a) => a.workspaceId === wsId);
      }),
      updateStatus: vi.fn().mockImplementation(async (id: string, wsId: string, status: any, extra: any) => {
        const act = mockDbActions.find((a) => a.id === id && a.workspaceId === wsId);
        if (!act) return null;
        act.status = status;
        if (extra?.appliedAt) act.appliedAt = extra.appliedAt;
        if (extra?.metadata) act.metadata = { ...act.metadata, ...extra.metadata };
        act.updatedAt = new Date();
        return act;
      }),
      createExecutionHistory: vi.fn().mockImplementation(async (wsId: string, bId: string, actId: string, by: string, st: string, res: any) => {
        const hist = { id: `hist-${Date.now()}`, workspaceId: wsId, brandId: bId, actionId: actId, executedBy: by, executionStatus: st, executionResult: res, createdAt: new Date() };
        mockExecutionHistory.push(hist);
        return hist;
      }),
      listExecutionHistory: vi.fn().mockImplementation(async (actId: string, wsId: string) => {
        return mockExecutionHistory.filter((h) => h.actionId === actId && h.workspaceId === wsId);
      })
    };

    const mockReelPlanRepo: any = {
      findByIdAndWorkspace: vi.fn().mockResolvedValue(mockReelPlan),
      update: vi.fn().mockImplementation(async (reelId: string, updates: any) => {
        if (updates.hook) updatedReelHook = updates.hook;
        return { ...mockReelPlan, ...updates };
      })
    };

    const executionService = new OptimizationExecutionService({} as any, {
      actionRepo: mockActionRepo,
      reelPlanRepo: mockReelPlanRepo
    });

    // Step A: Propose optimization action
    const proposed = await executionService.proposeAction(one8Brand.workspaceId, {
      brandId: one8Brand.id,
      reelId: mockReelPlan.id,
      actionType: 'CHANGE_HOOK',
      targetEntity: 'REEL_BLUEPRINT',
      reason: 'Problem-contrast hook improves 3-second retention by 34%',
      evidence: 'Historical performance verified on 10,000+ views',
      confidence: 0.92,
      expectedImpact: '+25% hook completion rate',
      metadata: { newHookText: 'Stop training in soaked tees. Upgrade to pro-wicking microfibers.' }
    });

    expect(proposed.status).toBe('PROPOSED');
    expect(proposed.workspaceId).toBe(one8Brand.workspaceId);

    // Step B: Attempting to apply without approval MUST fail (approval enforcement)
    await expect(executionService.applyAction(proposed.id, one8Brand.workspaceId)).rejects.toThrow(
      /Human approval is required/
    );

    // Step C: Approve action
    const approved = await executionService.approveAction(proposed.id, one8Brand.workspaceId, 'Approved by Virat Kohli brand director');
    expect(approved.status).toBe('APPROVED');

    // Step D: Apply approved action (modifies reel hook safely and creates execution history)
    const { action: applied, executionHistory } = await executionService.applyAction(proposed.id, one8Brand.workspaceId, {
      executedBy: 'DIRECTOR_USER'
    });

    expect(applied.status).toBe('APPLIED');
    expect(applied.appliedAt).toBeDefined();
    expect(executionHistory.executionStatus).toBe('SUCCESS');
    expect(updatedReelHook?.text).toBe('Stop training in soaked tees. Upgrade to pro-wicking microfibers.');

    // Step E: Idempotency Check (re-applying an already applied action returns cleanly without re-executing)
    const reapplyResult = await executionService.applyAction(proposed.id, one8Brand.workspaceId);
    expect(reapplyResult.action.status).toBe('APPLIED');

    // Step F: Workspace isolation check (cross-workspace action access returns null / error)
    await expect(executionService.getAction(proposed.id, 'other-workspace-id')).resolves.toBeNull();
  });

  // ========================================================
  // 6. Complete End-to-End One8 Closed Loop & Approval Gateway
  // ========================================================
  it('should execute complete One8 closed-loop campaign engine and strictly block publishing before approval', async () => {
    // Mock AI provider returning structured campaign director and content plan
    const mockAiProvider: AIProvider = {
      providerName: 'mock_gemini_phase12',
      generateText: vi.fn(),
      generateStructured: vi.fn().mockImplementation(async (_prompt: string, schema: any) => {
        // Campaign Director schema response
        if (schema.properties?.strategicDirectives) {
          return {
            summary: 'One8 Q3 Optimization Strategy: Scale high-converting sweat-contrast hooks and direct response pro-tee showcase.',
            winningPatterns: ['Problem-contrast hooks deliver 34% higher retention', '30s duration achieves highest conversion velocity'],
            weakPatterns: ['Static text intros beyond 4s cause 50% drop-off'],
            strategicDirectives: [
              'Deploy problem-contrast hooks across all top-of-funnel activewear reels',
              'Use kinetic captions with punchy 2-3 word bursts',
              'Direct CTA towards One8 Pro Training Tee checkout'
            ],
            contentRequirements: [
              {
                pillar: 'Athletic Performance',
                angle: 'Transformation and sweat durability',
                recommendedHookType: 'PROBLEM',
                suggestedDurationSeconds: 30,
                suggestedCTA: 'Shop One8 Activewear',
                priority: 'HIGH'
              }
            ],
            proposedActions: [
              {
                actionType: 'CHANGE_HOOK',
                targetEntity: 'REEL_BLUEPRINT',
                reason: 'Switch to sweat-contrast hook based on verified historical retention lift',
                evidence: 'Verified historical performance data shows +34% 3s retention',
                confidence: 0.91,
                expectedImpact: '+25% hook retention lift'
              }
            ]
          };
        }

        // 30-Day Content Plan schema response
        return {
          planName: 'One8 30-Day Performance Activewear Plan',
          objective: 'Scale online activewear orders by 40%',
          durationDays: 7,
          campaignTheme: 'Never Stop Pushing Limits',
          executiveSummary: 'Focused athletic performance strategy for high conversion velocity.',
          weeklyNarratives: [
            {
              weekNumber: 1,
              theme: 'Match Day Readiness',
              focusObjective: 'Hook & Convert',
              funnelFocus: 'CONVERSION',
              strategicPurpose: 'Drive immediate pro-tee sales'
            }
          ],
          diversificationSummary: {
            funnelDistribution: { CONVERSION: 7 },
            contentTypeDistribution: { PROMOTIONAL: 5, EDUCATIONAL: 2 },
            formatDistribution: { SHORT_REEL: 7 },
            pillarDistribution: { 'Athletic Performance': 7 }
          },
          jobs: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
            dayNumber: day,
            weekNumber: 1,
            title: `One8 Pro Tee Day ${day} Challenge`,
            contentType: day % 2 === 0 ? 'EDUCATIONAL' : 'PROMOTIONAL',
            funnelStage: 'CONVERSION',
            contentPillar: 'Athletic Performance',
            objective: 'Demonstrate sweat wicking and fit',
            audience: 'Athletes and gym-goers',
            topic: 'High intensity training sweat test',
            hook: 'Most gym tees trap sweat after set three.',
            keyMessage: 'One8 Pro Tee stays dry through every rep.',
            messagingAngle: 'Match-grade performance',
            offer: '15% off first order',
            cta: 'Shop One8 Pro Tee',
            platform: 'INSTAGRAM',
            format: 'SHORT_REEL',
            priority: 'HIGH'
          }))
        };
      })
    };

    // Mocks for services
    const mockDirectorRunRepo: any = {
      create: vi.fn().mockResolvedValue({
        id: 'dir-run-one8-001',
        workspaceId: one8Brand.workspaceId,
        brandId: one8Brand.id,
        summary: 'One8 Q3 Optimization Strategy',
        winningPatterns: ['Problem-contrast hooks deliver 34% higher retention'],
        weakPatterns: ['Static text intros beyond 4s cause 50% drop-off'],
        strategicDirectives: ['Deploy problem-contrast hooks across all top-of-funnel activewear reels'],
        contentRequirements: [{ pillar: 'Athletic Performance', angle: 'Transformation', suggestedDurationSeconds: 30, suggestedCTA: 'Shop One8 Activewear' }],
        proposedActionIds: ['act-one8-1'],
        createdAt: new Date()
      }),
      findLatestByBrand: vi.fn()
    };

    const mockContentPlanRepo: any = {
      create: vi.fn().mockResolvedValue({
        id: 'plan-one8-phase12',
        brandId: one8Brand.id,
        workspaceId: one8Brand.workspaceId,
        name: 'One8 30-Day Plan',
        status: 'READY'
      })
    };

    const mockContentJobRepo: any = {
      createMany: vi.fn().mockResolvedValue([
        {
          id: 'job-one8-001',
          contentPlanId: 'plan-one8-phase12',
          brandId: one8Brand.id,
          workspaceId: one8Brand.workspaceId,
          dayNumber: 1,
          title: 'One8 Pro Tee Sweat Test Challenge',
          contentType: 'PROMOTIONAL',
          funnelStage: 'CONVERSION',
          contentPillar: 'Athletic Performance',
          hook: 'Most gym tees trap sweat after set three.',
          cta: 'Shop One8 Pro Tee',
          status: 'PLANNED'
        }
      ]),
      findApprovedForPlan: vi.fn().mockResolvedValue([])
    };

    const mockBrandRepo: any = {
      findByIdAndWorkspace: vi.fn().mockResolvedValue(one8Brand)
    };
    const mockProductRepo: any = {
      listForBrand: vi.fn().mockResolvedValue(mockProducts)
    };
    const mockDnaRepo: any = {
      findLatestByBrandId: vi.fn().mockResolvedValue(one8Dna)
    };
    const mockStrategyRepo: any = {
      findLatestByBrandId: vi.fn().mockResolvedValue(mockStrategy)
    };
    const mockCampaignRepo: any = {
      findByIdAndBrand: vi.fn().mockResolvedValue(null)
    };

    // Construct services
    const directorService = new CampaignDirectorService(
      {
        select: () => ({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => []
              })
            })
          })
        }),
        insert: () => ({
          values: () => ({
            returning: () => [{ id: 'act-one8-1', workspaceId: one8Brand.workspaceId, brandId: one8Brand.id, actionType: 'CHANGE_HOOK', targetEntity: 'REEL_BLUEPRINT', reason: 'Contrast hook', evidence: 'Verified', confidence: 0.91, expectedImpact: '+25%', status: 'PROPOSED', createdAt: new Date(), updatedAt: new Date() }]
          })
        })
      } as any,
      mockAiProvider,
      {
        brandRepo: mockBrandRepo,
        productRepo: mockProductRepo,
        dnaRepo: mockDnaRepo,
        strategyRepo: mockStrategyRepo,
        campaignRepo: mockCampaignRepo,
        directorRunRepo: mockDirectorRunRepo
      }
    );

    const contentPlannerService = new (class extends (await import('@vidsnapai/content')).ContentPlannerService {
      constructor() {
        super({} as any, mockAiProvider, {
          planRepo: mockContentPlanRepo,
          jobRepo: mockContentJobRepo,
          brandRepo: mockBrandRepo,
          productRepo: mockProductRepo,
          dnaRepo: mockDnaRepo,
          strategyRepo: mockStrategyRepo,
          campaignRepo: mockCampaignRepo
        });
      }
    })();

    const autonomousLoop = new AutonomousCampaignLoopService({} as any, mockAiProvider, {
      directorService,
      contentPlannerService,
      reelPlannerService: {
        generateReelForJob: vi.fn().mockResolvedValue(mockReelPlan)
      } as any,
      packageService: {
        compilePackage: vi.fn().mockResolvedValue({ id: 'pkg-one8-001', readiness: { isReady: true } })
      } as any,
      animationService: {
        generateAnimationPlan: vi.fn().mockResolvedValue({ animationPlan: { id: 'anim-one8-001' } })
      } as any,
      renderService: {
        renderReelVideo: vi.fn().mockResolvedValue({ outputVideoUrl: 'https://vidsnapai.s3/one8-rendered.mp4' })
      } as any
    });

    // Execute the full autonomous loop
    const loopResult = await autonomousLoop.runAutonomousLoop(one8Brand.workspaceId, {
      brandId: one8Brand.id,
      contentPlanDurationDays: 7,
      generateBlueprints: true,
      renderVideos: true,
      stopAtApprovalGateway: true
    });

    // Verify complete closed-loop execution
    expect(loopResult.success).toBe(true);
    expect(loopResult.workspaceId).toBe(one8Brand.workspaceId);
    expect(loopResult.brandId).toBe(one8Brand.id);
    expect(loopResult.campaignDirectorRunId).toBe('dir-run-one8-001');
    expect(loopResult.proposedActionIds).toEqual(['act-one8-1']);
    expect(loopResult.contentPlanId).toBe('plan-one8-phase12');
    expect(loopResult.createdReelId).toBe(mockReelPlan.id);
    expect(loopResult.reelsRenderedCount).toBe(1);

    // CRITICAL APPROVAL GATEWAY INVARIANT:
    // Pipeline must STOP at approval and never automatically publish unapproved reels to Meta.
    expect(loopResult.approvalRequired).toBe(true);
    expect(loopResult.status).toBe('COMPLETED_STOPPED_AT_APPROVAL');
    expect(loopResult.publishingStatus).toBe('BLOCKED_PENDING_APPROVAL');
    expect(loopResult.approvalRequiredNotice).toContain('Human approval is required before publishing');
  });
});
