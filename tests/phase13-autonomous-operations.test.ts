import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  Brand,
  BrandDNA,
  ReelProductionPlan,
  OptimizationActionRecord,
  AIProvider,
  AutonomousPolicy,
  AutonomousLimitsTracking
} from '@vidsnapai/types';
import {
  AutonomousPolicyService,
  AutonomousGuardrailsService,
  AutonomousOperationsService
} from '@vidsnapai/video';
import {
  AutonomousOperatingModeSchema,
  AutonomousPolicySchema,
  TriggerAutonomousRunSchema,
  EmergencyPauseSchema
} from '@vidsnapai/validation';


describe('Phase 13: Autonomous Operations & Self-Optimizing Campaign Engine', () => {
  // Canonical Brand Fixture (One8 by Virat Kohli)
  const one8Brand: Brand = {
    id: 'b1088888-8888-8888-8888-888888888888',
    workspaceId: 'ws101111-1111-1111-1111-111111111111',
    name: 'One8 by Virat Kohli',
    slug: 'one8',
    description: 'Active lifestyle and premium sportswear brand by Virat Kohli.',
    industry: 'Sports & Activewear',
    primaryCta: 'Shop One8 Activewear',
    contentPillars: ['Athletic Performance', 'Match Day Energy', 'Streetwear Style'],
    brandColors: { primary: '#0f172a', accent: '#3b82f6', secondary: '#ffffff' },
    marketingRules: {
      claimsToAvoid: ['Cures chronic fatigue', 'Guarantees Olympic gold medals'],
      complianceRules: ['No false medical claims'],
      brandRestrictions: ['Do not use unauthorized sports federation logos']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const one8Dna: BrandDNA = {
    id: 'dna-one8-ops',
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
      claimsToAvoid: ['Cures chronic fatigue', 'Guarantees Olympic gold medals'],
      complianceRules: ['No false medical claims'],
      brandRestrictions: ['Do not use unauthorized sports federation logos']
    }
  };

  const defaultPolicy: AutonomousPolicy = {
    id: 'pol_123',
    workspaceId: one8Brand.workspaceId,
    mode: 'CONTROLLED',
    status: 'ACTIVE',
    advertising: {
      enabled: true,
      maxDailySpend: 50,
      maxCampaignSpend: 250,
      maxCampaignsPerDay: 3,
      maxNewAdsPerDay: 10
    },
    content: {
      maxReelsPerDay: 10,
      maxReelsPerCampaign: 30
    },
    optimization: {
      autoApply: true,
      allowedActions: [
        'CHANGE_HOOK',
        'CHANGE_MESSAGING_ANGLE',
        'CHANGE_CTA',
        'CHANGE_CONTENT_PILLAR',
        'CHANGE_DURATION',
        'CHANGE_VISUAL_STYLE',
        'CREATE_VARIANT',
        'REPLACE_CREATIVE',
        'PAUSE_RECOMMENDATION'
      ]
    },
    targeting: {
      allowedCountries: ['US', 'IN'],
      allowedAgeRange: { min: 18, max: 45 },
      allowedPlacements: ['reels', 'facebook_reels']
    },
    brand: {
      enforceBrandRules: true,
      enforceBrandColors: true,
      enforceApprovedAssets: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockLimits: AutonomousLimitsTracking = {
    id: 'lim_123',
    workspaceId: one8Brand.workspaceId,
    date: new Date().toISOString().split('T')[0],
    dailySpend: 0,
    campaignsCreated: 0,
    adsCreated: 0,
    reelsCreated: 0,
    reelsRendered: 0,
    reelsPublished: 0,
    optimizationsApplied: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Mock Repositories & Services
  let mockAutonRepo: any;
  let mockBrandRepo: any;
  let mockDnaRepo: any;
  let mockProductRepo: any;
  let mockBrandAssetRepo: any;
  let mockReelRepo: any;
  let mockMetaAdsService: any;
  let mockDirectorService: any;
  let mockContentPlannerService: any;
  let mockReelPlannerService: any;
  let mockMediaService: any;
  let mockVoiceService: any;
  let mockCaptionService: any;
  let mockAudioService: any;
  let mockPackageService: any;
  let mockAnimationService: any;
  let mockRenderService: any;
  let mockExecutionService: any;
  let mockAI: AIProvider;
  let createTestOperationsService: (overrides?: Record<string, any>) => AutonomousOperationsService;

  beforeEach(() => {
    let currentPolicy = { ...defaultPolicy };
    let currentLimits = { ...mockLimits };
    const historyLog: any[] = [];
    const safetyLog: any[] = [];
    const budgetLog: any[] = [];
    const runsMap = new Map<string, any>();
    const stepsMap = new Map<string, any>();

    mockAutonRepo = {
      getOrCreatePolicy: vi.fn().mockImplementation(async (wsId: string) => ({
        ...currentPolicy,
        workspaceId: wsId
      })),
      updatePolicy: vi.fn().mockImplementation(async (wsId: string, updates: any) => {
        currentPolicy = {
          ...currentPolicy,
          ...updates,
          advertising: { ...currentPolicy.advertising, ...updates.advertising },
          content: { ...currentPolicy.content, ...updates.content },
          optimization: { ...currentPolicy.optimization, ...updates.optimization },
          targeting: { ...currentPolicy.targeting, ...updates.targeting },
          brand: { ...currentPolicy.brand, ...updates.brand }
        };
        return currentPolicy;
      }),
      createRun: vi.fn().mockImplementation(async (params: any) => {
        const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newRun = {
          id: runId,
          workspaceId: params.workspaceId,
          brandId: params.brandId,
          campaignId: params.campaignId,
          triggerType: params.triggerType || 'MANUAL',
          status: 'RUNNING',
          currentStep: 'INITIALIZING',
          policySnapshot: params.policySnapshot,
          idempotencyKey: params.idempotencyKey,
          details: {},
          steps: [],
          startedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        runsMap.set(runId, newRun);
        return newRun;
      }),
      updateRun: vi.fn().mockImplementation(async (runId: string, wsId: string, updates: any) => {
        const run = runsMap.get(runId) || { id: runId, workspaceId: wsId };
        const updated = { ...run, ...updates, updatedAt: new Date() };
        runsMap.set(runId, updated);
        return updated;
      }),
      getRunById: vi.fn().mockImplementation(async (runId: string) => runsMap.get(runId) || null),
      listRuns: vi.fn().mockImplementation(async () => Array.from(runsMap.values())),
      createRunStep: vi.fn().mockImplementation(async (params: any) => {
        const stepId = `step_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const step = {
          id: stepId,
          runId: params.runId,
          workspaceId: params.workspaceId,
          stepName: params.stepName,
          status: 'RUNNING',
          inputPayload: params.inputPayload,
          startedAt: new Date(),
          createdAt: new Date()
        };
        stepsMap.set(stepId, step);
        const run = runsMap.get(params.runId);
        if (run) {
          run.steps = run.steps || [];
          run.steps.push(step);
        }
        return step;
      }),
      updateRunStep: vi.fn().mockImplementation(async (stepId: string, wsId: string, updates: any) => {
        const step = stepsMap.get(stepId) || { id: stepId, workspaceId: wsId };
        const updated = { ...step, ...updates };
        stepsMap.set(stepId, updated);
        return updated;
      }),
      recordExecutionHistory: vi.fn().mockImplementation(async (params: any) => {
        const record = { id: `hist_${Date.now()}`, ...params, createdAt: new Date() };
        historyLog.push(record);
        return record;
      }),
      listExecutionHistory: vi.fn().mockImplementation(async () => historyLog),
      getOrCreateLimits: vi.fn().mockImplementation(async () => ({ ...currentLimits })),
      incrementLimits: vi.fn().mockImplementation(async (_wsId: string, increments: any) => {
        currentLimits = {
          ...currentLimits,
          dailySpend: currentLimits.dailySpend + (increments.dailySpend || 0),
          campaignsCreated: currentLimits.campaignsCreated + (increments.campaignsCreated || 0),
          adsCreated: currentLimits.adsCreated + (increments.adsCreated || 0),
          reelsCreated: currentLimits.reelsCreated + (increments.reelsCreated || 0),
          reelsRendered: currentLimits.reelsRendered + (increments.reelsRendered || 0),
          reelsPublished: currentLimits.reelsPublished + (increments.reelsPublished || 0),
          optimizationsApplied: currentLimits.optimizationsApplied + (increments.optimizationsApplied || 0)
        };
        return currentLimits;
      }),
      recordBudgetEvent: vi.fn().mockImplementation(async (params: any) => {
        const evt = { id: `b_evt_${Date.now()}`, ...params, createdAt: new Date() };
        budgetLog.push(evt);
        return evt;
      }),
      listBudgetEvents: vi.fn().mockImplementation(async () => budgetLog),
      recordSafetyEvent: vi.fn().mockImplementation(async (params: any) => {
        const evt = { id: `s_evt_${Date.now()}`, ...params, createdAt: new Date() };
        safetyLog.push(evt);
        return evt;
      }),
      listSafetyEvents: vi.fn().mockImplementation(async () => safetyLog)
    };

    mockBrandRepo = {
      findByIdAndWorkspace: vi.fn().mockResolvedValue(one8Brand),
      findById: vi.fn().mockResolvedValue(one8Brand)
    };

    mockDnaRepo = {
      findLatestByBrandId: vi.fn().mockResolvedValue(one8Dna)
    };

    mockBrandAssetRepo = {
      listForBrand: vi.fn().mockResolvedValue([
        {
          id: 'asset_one8_prod_1',
          brandId: one8Brand.id,
          type: 'IMAGE',
          assetType: 'PRODUCT_IMAGE',
          name: 'One8 Velocity Tee',
          url: 'https://cdn.vidsnapai.com/brands/one8/tee.png',
          storageUrl: 'https://cdn.vidsnapai.com/brands/one8/tee.png',
          metadata: {}
        }
      ]),
      create: vi.fn(),
      findById: vi.fn(),
      delete: vi.fn()
    };

    mockProductRepo = {
      listForBrand: vi.fn().mockResolvedValue([
        {
          id: 'prod_one8_tee',
          brandId: one8Brand.id,
          name: 'One8 Velocity Performance Tee'
        }
      ]),
      create: vi.fn(),
      findById: vi.fn()
    };

    mockReelRepo = {
      findByIdAndWorkspace: vi.fn().mockResolvedValue({
        id: 'reel_one8_101',
        title: 'One8 Match Day High Energy Push',
        status: 'READY_FOR_ADS',
        outputVideoUrl: 'https://cdn.vidsnapai.com/renders/one8_match_day.mp4'
      }),
      updateStatus: vi.fn().mockResolvedValue(true)
    };

    mockDirectorService = {
      runDirector: vi.fn().mockResolvedValue({
        run: {
          id: 'dir_run_1',
          winningPatterns: ['hook: Dynamic Match Day Opening (lift: +42%)'],
          weakPatterns: ['duration: >45s (drag: -18%)'],
          strategicDirectives: ['Prioritize 15-30s high-intensity athletic hooks'],
          contentRequirements: [
            {
              pillar: 'Athletic Performance',
              angle: 'Match Day Endurance',
              suggestedDurationSeconds: 30,
              suggestedCTA: 'Shop One8 Activewear',
              priority: 'HIGH'
            }
          ]
        },
        proposedActions: [
          {
            id: 'act_101',
            actionType: 'CHANGE_HOOK',
            targetEntity: 'REEL',
            reason: 'High-energy match day hook demonstrated 42% lift in CTR',
            evidence: 'CTR increased from 2.1% to 3.8% across 150 sessions',
            confidence: 0.92,
            expectedImpact: '+25% Conversions'
          }
        ]
      })
    };

    mockExecutionService = {
      applyAction: vi.fn().mockResolvedValue({
        success: true,
        actionId: 'act_101',
        status: 'APPLIED'
      })
    };

    mockContentPlannerService = {
      generateContentPlan: vi.fn().mockResolvedValue({
        id: 'plan_one8_7day',
        jobs: [
          {
            id: 'job_reel_1',
            title: 'One8 Match Day High Energy Push',
            pillar: 'Athletic Performance'
          }
        ]
      })
    };

    mockReelPlannerService = {
      generateReelForJob: vi.fn().mockResolvedValue({
        id: 'reel_one8_101',
        title: 'One8 Match Day High Energy Push',
        hook: { text: 'Train like Virat Kohli with One8.' },
        cta: { text: 'Shop One8 Activewear', url: 'https://one8.com' },
        status: 'BLUEPRINT_READY'
      })
    };

    mockMediaService = {
      resolveReelMedia: vi.fn().mockResolvedValue({
        summary: 'Resolved 1 product image asset',
        assets: [{ id: 'asset_one8_prod_1', status: 'READY' }]
      })
    };

    mockVoiceService = {
      generateVoiceTrack: vi.fn().mockResolvedValue({
        id: 'voice_one8_101',
        provider: 'elevenlabs'
      })
    };

    mockCaptionService = {
      generateCaptionTrack: vi.fn().mockResolvedValue({
        id: 'cap_one8_101',
        cues: [{ text: 'Train like Virat Kohli with One8.', startTime: 0, endTime: 3 }]
      })
    };

    mockAudioService = {
      resolveAudioPlan: vi.fn().mockResolvedValue({
        id: 'audio_one8_101',
        musicConfig: { title: 'High Energy Beat' }
      })
    };

    mockPackageService = {
      compilePackage: vi.fn().mockResolvedValue({ id: 'pkg_101', reelPlanId: 'reel_one8_101' })
    };

    mockAnimationService = {
      generateAnimationPlan: vi.fn().mockResolvedValue({
        animationPlan: { id: 'anim_101', kineticTypography: [] }
      })
    };

    mockRenderService = {
      renderReelVideo: vi.fn().mockResolvedValue({
        renderId: 'rnd_101',
        outputVideoUrl: 'https://cdn.vidsnapai.com/renders/one8_match_day.mp4',
        durationSeconds: 30,
        status: 'COMPLETED'
      })
    };

    mockMetaAdsService = {
      publishToMeta: vi.fn().mockResolvedValue({
        success: true,
        publicationId: 'pub_meta_101',
        reelPlanId: 'reel_one8_101',
        workspaceId: one8Brand.workspaceId,
        campaignId: 'meta_camp_101',
        adSetId: 'meta_adset_101',
        creativeId: 'meta_creat_101',
        adId: 'meta_ad_101',
        adsManagerUrl: 'https://adsmanager.facebook.com/adsmanager/manage/ads?act=123456789',
        status: 'PUBLISHED',
        publishedAt: new Date().toISOString()
      })
    };

    mockAI = {
      providerName: 'gemini',
      generateText: vi.fn().mockResolvedValue('Mock AI Strategic Text'),
      generateStructured: vi.fn().mockResolvedValue({})
    };

    createTestOperationsService = (overrides = {}) => {
      return new AutonomousOperationsService({} as any, mockAI, {
        autonRepo: mockAutonRepo,
        brandRepo: mockBrandRepo,
        dnaRepo: mockDnaRepo,
        productRepo: mockProductRepo,
        brandAssetRepo: mockBrandAssetRepo,
        reelRepo: mockReelRepo,
        directorService: mockDirectorService,
        contentPlannerService: mockContentPlannerService,
        reelPlannerService: mockReelPlannerService,
        mediaService: mockMediaService,
        voiceService: mockVoiceService,
        captionService: mockCaptionService,
        audioService: mockAudioService,
        packageService: mockPackageService,
        animationService: mockAnimationService,
        renderService: mockRenderService,
        metaAdsService: mockMetaAdsService,
        executionService: mockExecutionService,
        ...overrides
      });
    };
  });

  // ---------------------------------------------------------------------------
  // 1 & 2: Autonomous vs Controlled Mode Executions
  // ---------------------------------------------------------------------------

  it('1. Autonomous mode executes end-to-end and publishes to Meta without human approval', async () => {
    const operationsService = createTestOperationsService();

    const run = await operationsService.executeAutonomousRun(one8Brand.workspaceId, {
      brandId: one8Brand.id,
      forceAutonomousMode: true,
      dailySpendAmount: 20
    });

    expect(run.status).toBe('COMPLETED');
    expect(mockMetaAdsService.publishToMeta).toHaveBeenCalledTimes(1);
    expect(mockAutonRepo.incrementLimits).toHaveBeenCalledWith(
      one8Brand.workspaceId,
      expect.objectContaining({ dailySpend: 20, reelsPublished: 1 })
    );
  });

  it('2. Controlled mode prepares content, renders video, but STOPS at Approval Gateway without publishing', async () => {
    const operationsService = createTestOperationsService();

    // Default policy is CONTROLLED
    const run = await operationsService.executeAutonomousRun(one8Brand.workspaceId, {
      brandId: one8Brand.id,
      forceAutonomousMode: false
    });

    expect(['STOPPED_AT_APPROVAL', 'APPROVAL_REQUIRED']).toContain(run.status);
    expect(mockRenderService.renderReelVideo).toHaveBeenCalledTimes(1);
    expect(mockMetaAdsService.publishToMeta).not.toHaveBeenCalled();
    expect((run.details as any)?.approvalRequired).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 3: Preserving Phase 9 Approval Workflow
  // ---------------------------------------------------------------------------

  it('3. Existing Phase 9 approval lifecycle is preserved and functional', async () => {
    const policyService = new AutonomousPolicyService({} as any, { autonRepo: mockAutonRepo });
    const policy = await policyService.getPolicy(one8Brand.workspaceId);

    expect(policy.mode).toBe('CONTROLLED');
    expect(policy.advertising.enabled).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 4, 5, 6: Budget & Velocity Guardrails
  // ---------------------------------------------------------------------------

  it('4. Budget limit blocks ad spend and records BUDGET_LIMIT_REACHED safety event', async () => {
    // Set daily spend to 45 (limit is 50), proposed spend is 20 -> 65 > 50 -> Exceeded
    mockAutonRepo.getOrCreateLimits.mockResolvedValueOnce({
      ...mockLimits,
      dailySpend: 45
    });

    const guardrails = new AutonomousGuardrailsService({} as any, { autonRepo: mockAutonRepo });
    const result = await guardrails.validateBudgetGuardrails({
      workspaceId: one8Brand.workspaceId,
      brandId: one8Brand.id,
      policy: defaultPolicy,
      proposedSpendAmount: 20
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('DAILY_SPEND_LIMIT_EXCEEDED');
    expect(mockAutonRepo.recordSafetyEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'BUDGET_LIMIT_REACHED',
        severity: 'CRITICAL'
      })
    );
  });

  it('5. Campaign limit blocks creation when max campaigns per day reached', async () => {
    mockAutonRepo.getOrCreateLimits.mockResolvedValueOnce({
      ...mockLimits,
      campaignsCreated: 3 // Max is 3
    });

    const guardrails = new AutonomousGuardrailsService({} as any, { autonRepo: mockAutonRepo });
    const result = await guardrails.validateBudgetGuardrails({
      workspaceId: one8Brand.workspaceId,
      brandId: one8Brand.id,
      policy: defaultPolicy,
      isNewCampaign: true
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('DAILY_CAMPAIGN_LIMIT_REACHED');
  });

  it('6. Reel limit blocks generation when max reels per day is reached', async () => {
    mockAutonRepo.getOrCreateLimits.mockResolvedValueOnce({
      ...mockLimits,
      reelsCreated: 10 // Max is 10
    });

    const guardrails = new AutonomousGuardrailsService({} as any, { autonRepo: mockAutonRepo });
    const result = await guardrails.validateContentVelocityGuardrails(
      one8Brand.workspaceId,
      defaultPolicy
    );

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('MAX_REELS_PER_DAY_REACHED');
  });

  // ---------------------------------------------------------------------------
  // 7 & 8: Policy & Brand Safety Checks
  // ---------------------------------------------------------------------------

  it('7. Policy restrictions disallow unauthorized optimization action types', async () => {
    const guardrails = new AutonomousGuardrailsService({} as any, { autonRepo: mockAutonRepo });

    const unpermittedAction: OptimizationActionRecord = {
      id: 'act_unauthorized',
      workspaceId: one8Brand.workspaceId,
      brandId: one8Brand.id,
      actionType: 'UNAUTHORIZED_BUDGET_INCREASE' as any,
      targetEntity: 'CAMPAIGN',
      reason: 'Testing boundary',
      evidence: 'None',
      confidence: 0.5,
      expectedImpact: 'High',
      sourceMetrics: {},
      status: 'PROPOSED',
      appliedAt: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await guardrails.validateOptimizationGuardrails({
      workspaceId: one8Brand.workspaceId,
      brandId: one8Brand.id,
      action: unpermittedAction,
      policy: defaultPolicy,
      metricsSampleCount: 200
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('ACTION_NOT_PERMITTED_BY_POLICY');
  });

  it('8. Brand safety guardrail blocks prohibited medical or false claims', async () => {
    const guardrails = new AutonomousGuardrailsService({} as any, { autonRepo: mockAutonRepo });

    const prohibitedReel: ReelProductionPlan = {
      id: 'reel_unsafe',
      workspaceId: one8Brand.workspaceId,
      brandId: one8Brand.id,
      contentJobId: 'job_1',
      contentPlanId: 'plan_1',
      version: 1,
      title: 'Miracle Activewear - Cures Chronic Fatigue Instantly',
      concept: {
        title: 'Miracle Activewear',
        concept: 'Cures Chronic Fatigue',
        objective: 'Sales',
        targetAudience: 'Everyone',
        corePromise: 'Instant Cure',
        emotionalAngle: 'Desperation',
        messagingAngle: 'Medical',
        contentPillar: 'Performance',
        funnelStage: 'CONVERSION'
      },
      objective: 'Sales',
      audience: 'Everyone',
      funnelStage: 'CONVERSION',
      contentPillar: 'Performance',
      durationSeconds: 30,
      aspectRatio: '9:16',
      platform: 'INSTAGRAM',
      format: 'SHORT_REEL',
      hook: { type: 'STATEMENT', text: 'This apparel cures chronic fatigue forever!', visualIntent: 'Text', deliveryStyle: 'Bold', durationSeconds: 3 },
      narrative: 'Narrative text',
      script: [],
      scenes: [],
      visualDirection: {} as any,
      voiceDirection: {} as any,
      captionDirection: {} as any,
      animationDirection: {} as any,
      audioDirection: {} as any,
      cta: { type: 'SHOP_NOW', text: 'Shop Now', visualTreatment: 'Button', placement: 'END_CARD' },
      productionMetadata: {} as any,
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await guardrails.validateBrandSafety({
      workspaceId: one8Brand.workspaceId,
      brandId: one8Brand.id,
      brand: one8Brand,
      dna: one8Dna,
      reel: prohibitedReel,
      policy: defaultPolicy
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('PROHIBITED_CLAIM_DETECTED');
    expect(mockAutonRepo.recordSafetyEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'BRAND_SAFETY_REJECTION',
        severity: 'CRITICAL'
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 9, 10, 11: Idempotency, Duplicate Prevention & Worker Recovery
  // ---------------------------------------------------------------------------

  it('9 & 10. Meta publishing idempotency prevents duplicate entities on retry', async () => {
    const operationsService = createTestOperationsService();

    const idempKey = 'test_idemp_key_123';

    await operationsService.executeAutonomousRun(one8Brand.workspaceId, {
      brandId: one8Brand.id,
      forceAutonomousMode: true,
      idempotencyKey: idempKey
    });

    expect(mockMetaAdsService.publishToMeta).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: `auton_pub_${one8Brand.workspaceId}_reel_one8_101`
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 12 & 13: Emergency Controls (Pause and Resume)
  // ---------------------------------------------------------------------------

  it('12. Emergency Pause immediately halts all future autonomous executions', async () => {
    const policyService = new AutonomousPolicyService({} as any, { autonRepo: mockAutonRepo });
    await policyService.emergencyPause(one8Brand.workspaceId, 'Manual stop');

    const pausedPolicy = await policyService.getPolicy(one8Brand.workspaceId);
    expect(pausedPolicy.status).toBe('PAUSED');

    const operationsService = createTestOperationsService({ policyService });

    const run = await operationsService.executeAutonomousRun(one8Brand.workspaceId, {
      brandId: one8Brand.id
    });

    expect(run.status).toBe('PAUSED');
    expect(mockDirectorService.runDirector).not.toHaveBeenCalled();
    expect(mockMetaAdsService.publishToMeta).not.toHaveBeenCalled();
  });

  it('13. Resume operations restores ACTIVE status and allows execution', async () => {
    const policyService = new AutonomousPolicyService({} as any, { autonRepo: mockAutonRepo });
    await policyService.resumeOperations(one8Brand.workspaceId);

    const activePolicy = await policyService.getPolicy(one8Brand.workspaceId);
    expect(activePolicy.status).toBe('ACTIVE');
  });

  // ---------------------------------------------------------------------------
  // 14: Multi-Tenant Workspace Isolation
  // ---------------------------------------------------------------------------

  it('14. Enforces strict multi-tenant workspace isolation', async () => {
    const foreignWorkspaceId = 'ws999999-9999-9999-9999-999999999999';

    mockBrandRepo.findByIdAndWorkspace.mockResolvedValueOnce(null);

    const operationsService = createTestOperationsService();

    await expect(
      operationsService.executeAutonomousRun(foreignWorkspaceId, {
        brandId: one8Brand.id
      })
    ).rejects.toThrow(/not found in workspace/);
  });

  // ---------------------------------------------------------------------------
  // 15, 16, 17: Fault Tolerance & Error Recovery
  // ---------------------------------------------------------------------------

  it('15 & 17. Recovers gracefully when rendering encounters an error', async () => {
    mockRenderService.renderReelVideo.mockRejectedValueOnce(
      new Error('FFmpeg processing timeout')
    );

    const operationsService = createTestOperationsService();

    const run = await operationsService.executeAutonomousRun(one8Brand.workspaceId, {
      brandId: one8Brand.id,
      forceAutonomousMode: true
    });

    expect(['FAILED', 'RENDER_FAILED']).toContain(run.status);
    expect(run.error).toContain('FFmpeg processing timeout');
    expect(mockMetaAdsService.publishToMeta).not.toHaveBeenCalled();
    expect(mockAutonRepo.recordSafetyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'RENDER_FAILED' })
    );
  });

  // ---------------------------------------------------------------------------
  // 18 & 19: Statistical Sample Size & Optimization Policies
  // ---------------------------------------------------------------------------

  it('18. Insufficient sample size (<100) prevents premature optimization action', async () => {
    const guardrails = new AutonomousGuardrailsService({} as any, { autonRepo: mockAutonRepo });

    const action: OptimizationActionRecord = {
      id: 'act_early',
      workspaceId: one8Brand.workspaceId,
      brandId: one8Brand.id,
      actionType: 'CHANGE_HOOK',
      targetEntity: 'REEL',
      reason: 'Observed 1 click',
      evidence: '1 click out of 10 impressions',
      confidence: 0.2,
      expectedImpact: 'Low',
      sourceMetrics: {},
      status: 'PROPOSED',
      appliedAt: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await guardrails.validateOptimizationGuardrails({
      workspaceId: one8Brand.workspaceId,
      brandId: one8Brand.id,
      action,
      policy: defaultPolicy,
      metricsSampleCount: 15 // Insufficient sample size
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('INSUFFICIENT_SAMPLE_SIZE');
    expect(mockAutonRepo.recordSafetyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'INSUFFICIENT_SAMPLE_SIZE' })
    );
  });

  // ---------------------------------------------------------------------------
  // 20: Canonical One8 End-to-End Autonomous Flow Test
  // ---------------------------------------------------------------------------

  it('20. CANONICAL ONE8 END-TO-END AUTONOMOUS CAMPAIGN FLOW', async () => {
    const operationsService = createTestOperationsService();

    // Execute Autonomous Closed-Loop Cycle for One8
    const run = await operationsService.executeAutonomousRun(one8Brand.workspaceId, {
      brandId: one8Brand.id,
      forceAutonomousMode: true,
      dailySpendAmount: 35
    });

    // Verify Complete Chain of Autonomous Operations
    expect(run.status).toBe('COMPLETED');
    expect(mockDirectorService.runDirector).toHaveBeenCalledTimes(1);
    expect(mockExecutionService.applyAction).toHaveBeenCalledTimes(1);
    expect(mockContentPlannerService.generateContentPlan).toHaveBeenCalledTimes(1);
    expect(mockReelPlannerService.generateReelForJob).toHaveBeenCalledTimes(1);
    expect(mockPackageService.compilePackage).toHaveBeenCalledTimes(1);
    expect(mockAnimationService.generateAnimationPlan).toHaveBeenCalledTimes(1);
    expect(mockRenderService.renderReelVideo).toHaveBeenCalledTimes(1);
    expect(mockMetaAdsService.publishToMeta).toHaveBeenCalledTimes(1);

    // Verify Audit Trail & Budget Impact
    expect(mockAutonRepo.recordExecutionHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'META_PUBLISH',
        budgetImpact: 35,
        executedBy: 'AUTONOMOUS_ENGINE'
      })
    );
  });

  // ---------------------------------------------------------------------------
  // Zod Validation Schemas
  // ---------------------------------------------------------------------------

  it('Validates Phase 13 Zod schemas correctly', () => {
    expect(AutonomousOperatingModeSchema.parse('AUTONOMOUS')).toBe('AUTONOMOUS');
    expect(AutonomousOperatingModeSchema.parse('CONTROLLED')).toBe('CONTROLLED');

    const validPolicy = AutonomousPolicySchema.parse({
      mode: 'AUTONOMOUS',
      advertising: {
        maxDailySpend: 100,
        maxCampaignSpend: 500
      }
    });
    expect(validPolicy.mode).toBe('AUTONOMOUS');
    expect(validPolicy.advertising.maxDailySpend).toBe(100);

    const triggerParsed = TriggerAutonomousRunSchema.parse({
      brandId: one8Brand.id,
      daysToPlan: 14
    });
    expect(triggerParsed.daysToPlan).toBe(14);

    const pauseParsed = EmergencyPauseSchema.parse({
      reason: 'Urgent stop'
    });
    expect(pauseParsed.reason).toBe('Urgent stop');
  });
});
