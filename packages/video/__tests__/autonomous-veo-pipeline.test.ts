import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutonomousOperationsService } from '../src/autonomous/autonomousOperationsService.js';
import { VeoQuotaExhaustedError, MockAIProvider } from '@vidsnapai/ai';
import type {
  Brand,
  BrandProduct,
  BrandAsset,
  AutonomousPolicy,
  AutonomousRun,
  AutonomousRunStep,
  ReelProductionPlan
} from '@vidsnapai/types';

describe('Autonomous Veo Reel Engine Pipeline (DECIDE → PRODUCE → VALIDATE → LEARN → ACT)', () => {
  const workspaceId = 'ws_auton_test_01';
  const brandId = 'brand_velox_01';

  const mockBrand: Brand = {
    id: brandId,
    workspaceId,
    name: 'Velox Running',
    description: 'Next-generation carbon-plated marathon footwear engineered for speed.',
    industry: 'Athletic Footwear',
    tagline: 'Defy Friction. Dominate Distance.',
    uniqueSellingPoints: ['Dual-density carbon propulsion plate', 'Ultralight foam cushioning'],
    targetAudience: 'Marathon runners and competitive athletes',
    brandVoice: 'Energetic, confident, performance-obsessed',
    brandColors: {
      primary: '#0F172A',
      secondary: '#00F0FF',
      accent: '#FF0055'
    },
    primaryCta: 'Shop Velox Carbon One',
    websiteUrl: 'https://veloxrunning.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockProduct: BrandProduct = {
    id: 'prod_velox_carbon_one',
    brandId,
    name: 'Velox Carbon One',
    description: 'World-class marathon racing shoe with full-length articulated carbon fiber plate.',
    category: 'Running Shoes',
    features: ['Aerospace-grade carbon plate', 'Sub-180g ultralight weight', 'Supercritical nitrogen-infused midsole'],
    benefits: ['Maximum energy return per stride', 'Substantial fatigue reduction over 42km'],
    usps: ['Sub-180g race-day weight', 'Propulsive carbon rebound'],
    targetAudience: 'Marathoners seeking personal bests',
    price: '$260',
    offerInfo: 'Free expedited race-week shipping',
    cta: 'Get Velox Carbon One Today',
    metadata: { sku: 'VLX-CRBN-01' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockBrandAssets: BrandAsset[] = [
    {
      id: 'asset_hero_shoe',
      brandId,
      productId: mockProduct.id,
      type: 'IMAGE',
      assetType: 'PRODUCT_IMAGE',
      assetPurpose: 'HERO',
      name: 'velox-carbon-hero-packshot.png',
      storageKey: 'brands/velox/hero.png',
      url: 'https://cdn.vidsnapai.com/brands/velox/hero.png',
      mimeType: 'image/png',
      width: 1080,
      height: 1920,
      productionEligible: true,
      metadata: { productId: mockProduct.id, assetPurpose: 'HERO' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'asset_detail_carbon',
      brandId,
      productId: mockProduct.id,
      type: 'IMAGE',
      assetType: 'PRODUCT_IMAGE',
      assetPurpose: 'DETAIL',
      name: 'velox-carbon-plate-detail.png',
      storageKey: 'brands/velox/detail.png',
      url: 'https://cdn.vidsnapai.com/brands/velox/detail.png',
      mimeType: 'image/png',
      width: 1080,
      height: 1920,
      productionEligible: true,
      metadata: { productId: mockProduct.id, assetPurpose: 'DETAIL' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const mockBrandDna = {
    id: 'dna_velox',
    brandId,
    brandName: 'Velox Running',
    promotionRules: {
      primaryCTA: 'Get Velox Carbon One Today',
      claimsToAvoid: ['Guaranteed Olympic gold medal', 'Impossible zero gravity flight'],
      brandRestrictions: ['Maintain authentic athletic integrity']
    }
  };

  const mockAutonomousPolicy: AutonomousPolicy = {
    id: 'pol_auton_01',
    workspaceId,
    mode: 'AUTONOMOUS',
    status: 'ACTIVE',
    advertising: {
      autoPublishAds: true,
      autoCreateCampaigns: true,
      maxDailySpend: 100,
      requireAdReview: false,
      enableMetaAdsIntegration: true
    },
    content: {
      autoGeneratePlans: true,
      autoApproveBlueprints: true,
      maxReelsPerDay: 5,
      allowedThemes: ['Performance', 'Speed', 'Marathon']
    },
    optimization: {
      autoApply: true,
      confidenceThreshold: 0.75,
      maxActionsPerCycle: 3
    },
    targeting: {
      allowedGeos: ['US', 'GB'],
      allowedAgeMin: 18,
      allowedAgeMax: 65
    },
    brand: {
      strictBrandGuidelines: true,
      enforceApprovedAssets: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockReelPlan: ReelProductionPlan = {
    id: 'reel_velox_01',
    contentJobId: 'job_01',
    brandId,
    contentPlanId: 'cplan_01',
    workspaceId,
    targetProductId: mockProduct.id,
    productId: mockProduct.id,
    version: 1,
    title: 'Defy Friction with Velox Carbon One',
    objective: 'CONVERSION',
    audience: 'Competitive runners',
    funnelStage: 'CONVERSION',
    contentPillar: 'Product Showcase',
    durationSeconds: 30,
    aspectRatio: '9:16',
    platform: 'INSTAGRAM',
    format: 'SHORT_REEL',
    hook: {
      text: 'Every second counts when you are chasing a PR.',
      type: 'QUESTION' as any,
      targetDurationSeconds: 3
    },
    narrative: 'Showcase explosive energy return and ultra-low weight of Velox Carbon One.',
    concept: {
      id: 'concept_01',
      title: 'Defy Friction with Velox Carbon One',
      rationale: 'High-speed commercial reel',
      targetDuration: 30
    } as any,
    script: [],
    scenes: [
      {
        sceneNumber: 1,
        durationSeconds: 4,
        purpose: 'VISUAL_HOOK',
        narration: 'Every second counts when you are chasing a PR.',
        onScreenText: 'SHATTER YOUR PB',
        visualType: 'PRODUCT_SHOWCASE',
        subject: 'Velox Carbon One shoe in motion',
        environment: 'Sleek dark asphalt track with neon lighting',
        composition: 'Extreme low-angle dynamic tracking',
        camera: 'Fast tracking low dolly',
        lighting: 'High-contrast cyan rim lighting',
        mood: 'Electric and urgent',
        transition: 'cinematic_crossfade',
        animationIntent: 'Bold kinetic headline pop',
        assetRequirement: 'First-party hero packshot',
        productReference: mockProduct.id,
        veoPrompt: 'Cinematic 9:16 tracking shot of carbon running shoe striking wet asphalt track with neon cyan reflections.'
      },
      {
        sceneNumber: 2,
        durationSeconds: 5,
        purpose: 'PRODUCT_HERO',
        narration: 'Engineered with aerospace-grade carbon propulsion.',
        onScreenText: 'FULL CARBON PLATE',
        visualType: 'PRODUCT_HERO',
        subject: 'Articulated carbon fiber plate flex and rebound',
        environment: 'High-tech testing studio',
        composition: 'Macro close up of carbon weave',
        camera: 'Macro orbit',
        lighting: 'Precision studio spotlights',
        mood: 'Sophisticated engineering',
        transition: 'cinematic_crossfade',
        animationIntent: 'Feature callout badge expansion',
        assetRequirement: 'Product detail asset',
        productReference: mockProduct.id,
        veoPrompt: 'Macro slow-motion cinematic camera orbiting the carbon fiber plate structure of the racing shoe.'
      },
      {
        sceneNumber: 3,
        durationSeconds: 4,
        purpose: 'CALL_TO_ACTION',
        narration: 'Equip your race day now with free expedited shipping.',
        onScreenText: 'GET VELOX CARBON ONE',
        visualType: 'CTA',
        subject: 'Velox Carbon One hero lockup with branding',
        environment: 'Clean dark gradient aesthetic',
        composition: 'Centered hero portrait',
        camera: 'Slow pull back',
        lighting: 'Vibrant edge highlights',
        mood: 'Decisive and empowering',
        transition: 'cut',
        animationIntent: 'CTA button bounce and glow',
        assetRequirement: 'Hero product packshot',
        productReference: mockProduct.id,
        veoPrompt: 'Hero studio packshot of the shoe centered with vibrant particle glow and clean dark backdrop.'
      }
    ],
    visualDirection: {
      style: 'Cinematic Dark Modern',
      mood: 'Urgent, high-tech, premium',
      colorIntent: 'Deep slate with electric cyan and magenta accents',
      lightingIntent: 'Sharp rim lighting with high contrast',
      composition: 'Strict 9:16 vertical with 15% safe margins',
      cameraLanguage: 'Fluid tracking and macro pans',
      pacing: 'Dynamic and rhythmic',
      visualHierarchy: 'Product first, kinetic text second, branding persistent',
      brandIntegration: 'Velox logo pinned in top header safe area',
      productEmphasis: 'Hero product featured across 100% of scenes'
    },
    voiceDirection: {
      style: 'Energetic and commanding',
      pace: 'Fast and rhythmic',
      tone: 'Confident'
    },
    captionDirection: {
      style: 'Kinetic Punchy',
      placement: 'Center Safe Zone',
      density: 'Key phrases only',
      fontEmphasis: 'Heavy sans-serif Outfit',
      animation: 'Scale in with color highlight'
    },
    animationDirection: {
      energy: 'High',
      style: 'Modern Kinetic',
      textAnimation: 'Kinetic pop and highlight',
      visualTransitions: 'Directional whip and crossfade',
      elementMotion: 'Fluid spring physics'
    },
    audioDirection: {
      musicMood: 'Driving electronic beat with heavy sub bass',
      soundEffects: 'Shoe impact whoosh, carbon flex riser',
      pacing: '128 BPM energetic',
      mixBalance: 'Voice -2dB, Music -14dB, SFX -8dB'
    },
    cta: {
      type: 'DIRECT_PURCHASE',
      text: 'Get Velox Carbon One Today',
      visualTreatment: 'Pulsing pill badge with brand cyan glow',
      placement: 'Lower Center Platform Safe Area'
    },
    productionMetadata: {
      totalScenes: 3,
      estimatedWordCount: 45,
      targetDurationSeconds: 30,
      calculatedDurationSeconds: 30,
      generatedBy: 'ReelProductionDirector',
      contentJobId: 'job_01',
      generatedAt: new Date().toISOString()
    },
    status: 'GENERATING',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Mock Repositories & In-Memory Store
  let persistedRuns: Record<string, AutonomousRun> = {};
  let persistedSteps: Record<string, AutonomousRunStep[]> = {};
  let executionHistory: any[] = [];
  let safetyEvents: any[] = [];
  let budgetEvents: any[] = [];

  const createMockAutonRepo = () => ({
    createRun: vi.fn(async (data: any) => {
      const run: AutonomousRun = {
        id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        workspaceId: data.workspaceId,
        brandId: data.brandId,
        campaignId: data.campaignId,
        triggerType: data.triggerType || 'MANUAL',
        status: 'PENDING',
        policySnapshot: data.policySnapshot,
        idempotencyKey: data.idempotencyKey,
        details: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      persistedRuns[run.id] = run;
      persistedSteps[run.id] = [];
      return run;
    }),
    updateRun: vi.fn(async (id: string, _workspaceId: string, updates: any) => {
      const existing = persistedRuns[id] || { id, workspaceId };
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      persistedRuns[id] = updated;
      return updated;
    }),
    createRunStep: vi.fn(async (data: any) => {
      const step: AutonomousRunStep = {
        id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        runId: data.runId,
        workspaceId: data.workspaceId,
        stepName: data.stepName,
        status: 'RUNNING',
        inputPayload: data.inputPayload || {},
        startedAt: new Date(),
        createdAt: new Date()
      };
      if (!persistedSteps[data.runId]) persistedSteps[data.runId] = [];
      persistedSteps[data.runId].push(step);
      return step;
    }),
    updateRunStep: vi.fn(async (stepId: string, _workspaceId: string, updates: any) => {
      for (const runId of Object.keys(persistedSteps)) {
        const step = persistedSteps[runId].find((s) => s.id === stepId);
        if (step) {
          Object.assign(step, updates);
          return step;
        }
      }
      return null;
    }),
    recordExecutionHistory: vi.fn(async (record: any) => {
      executionHistory.push(record);
      return { id: `hist_${Date.now()}`, ...record };
    }),
    recordSafetyEvent: vi.fn(async (evt: any) => {
      safetyEvents.push(evt);
      return { id: `evt_${Date.now()}`, ...evt };
    }),
    recordBudgetEvent: vi.fn(async (evt: any) => {
      budgetEvents.push(evt);
      return { id: `bdgt_${Date.now()}`, ...evt };
    }),
    incrementLimits: vi.fn(async () => {})
  });

  const createMockBrandRepo = () => ({
    findByIdAndWorkspace: vi.fn(async () => mockBrand)
  });

  const createMockDnaRepo = () => ({
    findLatestByBrandId: vi.fn(async () => mockBrandDna)
  });

  const createMockProductRepo = (products: BrandProduct[] = [mockProduct]) => ({
    listForBrand: vi.fn(async () => products)
  });

  const createMockBrandAssetRepo = (assets: BrandAsset[] = mockBrandAssets) => ({
    listForBrand: vi.fn(async () => assets)
  });

  const createMockDirectorService = () => ({
    runDirector: vi.fn(async () => ({
      run: {
        id: 'director_run_01',
        winningPatterns: ['High-energy question hook (+28% CTR)', 'Macro product detail cut (+19% CVR)'],
        weakPatterns: ['Generic static text slides (-35% Retention)'],
        strategicDirectives: ['Prioritize macro carbon weave closeups with dynamic lighting'],
        contentRequirements: [{ suggestedCTA: 'Shop Velox Carbon One', suggestedDurationSeconds: 30 }]
      },
      proposedActions: [
        { id: 'opt_01', actionType: 'HOOK_ROTATION', targetEntity: 'REEL', reason: 'Adopt high-converting hook', evidence: 'A/B Test Lift' }
      ]
    }))
  });

  const createMockContentPlannerService = () => ({
    generateContentPlan: vi.fn(async () => ({
      id: 'cplan_velox_01',
      jobs: [
        {
          id: 'job_01',
          productId: mockProduct.id,
          title: 'Velox Carbon Propulsion Reel',
          funnelStage: 'CONVERSION',
          suggestedDurationSeconds: 30
        }
      ]
    }))
  });

  const createMockReelPlannerService = (reel: ReelProductionPlan = mockReelPlan) => ({
    generateReelForJob: vi.fn(async () => reel)
  });

  const createMockMediaService = () => ({
    resolveReelMedia: vi.fn(async () => ({
      summary: 'Resolved 2 first-party production assets for Velox Carbon One',
      assets: mockBrandAssets
    }))
  });

  const createMockVoiceService = () => ({
    generateVoiceTrack: vi.fn(async () => ({ id: 'voice_01', provider: 'elevenlabs', url: 'https://cdn.vidsnapai.com/voice.mp3' }))
  });

  const createMockCaptionService = () => ({
    generateCaptionTrack: vi.fn(async () => ({ id: 'captions_01', cues: [{ text: 'SHATTER YOUR PB', startTime: 0, endTime: 3 }] }))
  });

  const createMockAudioService = () => ({
    resolveAudioPlan: vi.fn(async () => ({ id: 'audio_01', musicConfig: { title: 'High Voltage Electro' } }))
  });

  const createMockPackageService = () => ({
    compilePackage: vi.fn(async () => ({ id: 'pkg_01' }))
  });

  const createMockAnimationService = () => ({
    generateAnimationPlan: vi.fn(async () => ({ animationPlan: { id: 'anim_plan_01' } }))
  });

  const createMockRenderService = (shouldFail: boolean = false, failErrorMsg: string = 'Render failed') => ({
    renderReelVideo: vi.fn(async () => {
      if (shouldFail) {
        throw new Error(failErrorMsg);
      }
      return {
        outputVideoUrl: 'https://cdn.vidsnapai.com/renders/velox_master.mp4',
        localPath: '/tmp/renders/velox_master.mp4',
        durationSeconds: 30,
        sceneArtifacts: [
          { sceneNumber: 1, duration: 4, provider: 'veo-3.1-generate-preview', status: 'READY' },
          { sceneNumber: 2, duration: 5, provider: 'veo-3.1-generate-preview', status: 'READY' },
          { sceneNumber: 3, duration: 4, provider: 'veo-3.1-generate-preview', status: 'READY' }
        ]
      };
    })
  });

  const createMockMetaAdsService = () => ({
    publishToMeta: vi.fn(async () => ({
      publicationId: 'pub_meta_01',
      campaignId: 'meta_camp_12345',
      adSetId: 'meta_adset_12345',
      adId: 'meta_ad_12345',
      adsManagerUrl: 'https://adsmanager.facebook.com/ads/12345'
    }))
  });

  const createMockPolicyService = (policy: AutonomousPolicy = mockAutonomousPolicy) => ({
    getPolicy: vi.fn(async () => policy)
  });

  const createMockGuardrailsService = (options?: {
    eligibilityAllowed?: boolean;
    eligibilityReason?: string;
    brandSafetyAllowed?: boolean;
    brandSafetyReason?: string;
    budgetAllowed?: boolean;
    budgetReason?: string;
  }) => ({
    validateEngineEligibility: vi.fn(async () => ({
      allowed: options?.eligibilityAllowed ?? true,
      reason: options?.eligibilityReason || 'Workspace active and eligible'
    })),
    validateOptimizationGuardrails: vi.fn(async () => ({ allowed: true })),
    validateBrandSafety: vi.fn(async () => ({
      allowed: options?.brandSafetyAllowed ?? true,
      reason: options?.brandSafetyReason || 'Brand safety passed'
    })),
    validateBudgetGuardrails: vi.fn(async () => ({
      allowed: options?.budgetAllowed ?? true,
      reason: options?.budgetReason || 'Budget guardrails authorized'
    }))
  });

  const createMockReelRepo = () => ({
    updateStatus: vi.fn(async () => {})
  });

  const createMockExecutionService = () => ({
    applyAction: vi.fn(async () => {})
  });

  beforeEach(() => {
    persistedRuns = {};
    persistedSteps = {};
    executionHistory = [];
    safetyEvents = [];
    budgetEvents = [];
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Test Case 1: Full 27-Step End-to-End Autonomous Cycle (DECIDE → PRODUCE → VALIDATE → LEARN → ACT)
  // ===========================================================================
  it('executes full 27-step autonomous operations cycle end-to-end and persists every step', async () => {
    const mockAutonRepo = createMockAutonRepo();
    const service = new AutonomousOperationsService(
      {} as any,
      new MockAIProvider(),
      {
        autonRepo: mockAutonRepo as any,
        brandRepo: createMockBrandRepo() as any,
        dnaRepo: createMockDnaRepo() as any,
        productRepo: createMockProductRepo() as any,
        brandAssetRepo: createMockBrandAssetRepo() as any,
        directorService: createMockDirectorService() as any,
        contentPlannerService: createMockContentPlannerService() as any,
        reelPlannerService: createMockReelPlannerService() as any,
        mediaService: createMockMediaService() as any,
        voiceService: createMockVoiceService() as any,
        captionService: createMockCaptionService() as any,
        audioService: createMockAudioService() as any,
        packageService: createMockPackageService() as any,
        animationService: createMockAnimationService() as any,
        renderService: createMockRenderService() as any,
        metaAdsService: createMockMetaAdsService() as any,
        policyService: createMockPolicyService() as any,
        guardrailsService: createMockGuardrailsService() as any,
        reelRepo: createMockReelRepo() as any,
        executionService: createMockExecutionService() as any
      }
    );

    const runResult = await service.executeAutonomousRun(workspaceId, {
      brandId,
      triggerType: 'SCHEDULED',
      dailySpendAmount: 25
    });

    // Verify Final Run Status
    expect(runResult.status).toBe('COMPLETED');
    expect(runResult.currentStep).toBe('COMPLETED');
    expect(runResult.summary).toContain('DECIDE → PRODUCE → VALIDATE → LEARN → ACT');

    // Verify All Explicit Autonomous Run Steps were Persisted in autonomous_run_steps
    const steps = persistedSteps[runResult.id];
    expect(steps).toBeDefined();
    expect(steps.length).toBeGreaterThanOrEqual(14);

    const stepNames = steps.map((s) => s.stepName);
    expect(stepNames).toContain('DIRECTOR_EVALUATION');
    expect(stepNames).toContain('OPTIMIZATION_APPLY');
    expect(stepNames).toContain('CONTENT_PLAN_GENERATION');
    expect(stepNames).toContain('PRODUCT_SELECTION');
    expect(stepNames).toContain('BLUEPRINT_GENERATION');
    expect(stepNames).toContain('PRODUCT_ASSET_VALIDATION');
    expect(stepNames).toContain('VEO_SCENE_GENERATION');
    expect(stepNames).toContain('VEO_POLLING');
    expect(stepNames).toContain('MEDIA_RESOLUTION');
    expect(stepNames).toContain('VOICE_GENERATION');
    expect(stepNames).toContain('CAPTION_GENERATION');
    expect(stepNames).toContain('AUDIO_RESOLUTION');
    expect(stepNames).toContain('VIDEO_ASSEMBLY');
    expect(stepNames).toContain('BRAND_SAFETY');
    expect(stepNames).toContain('COMMERCIAL_CLAIM_VALIDATION');
    expect(stepNames).toContain('VIDEO_QA');
    expect(stepNames).toContain('APPROVAL');
    expect(stepNames).toContain('BUDGET_GUARDRAILS_CHECK');
    expect(stepNames).toContain('PUBLISH');
    expect(stepNames).toContain('LEARNING');

    // Verify Every Step Completed Successfully
    for (const step of steps) {
      expect(step.status).toBe('COMPLETED');
    }

    // Verify Closed-Loop Learning & Feedback was Persisted
    const learningStep = steps.find((s) => s.stepName === 'LEARNING');
    expect(learningStep?.outputPayload).toBeDefined();
    expect(learningStep?.outputPayload?.appliedHook).toBe(mockReelPlan.hook.text);
    expect(learningStep?.outputPayload?.productFeatured).toBe(mockProduct.name);

    // Verify Execution History was Recorded for Auditing
    const intelligenceHistory = executionHistory.find((h) => h.targetEntity === 'AUTONOMOUS_INTELLIGENCE');
    expect(intelligenceHistory).toBeDefined();
    expect(intelligenceHistory.status).toBe('SUCCESS');

    const publishHistory = executionHistory.find((h) => h.actionType === 'META_PUBLISH');
    expect(publishHistory).toBeDefined();
    expect(publishHistory.targetId).toBe('meta_ad_12345');
  });

  // ===========================================================================
  // Test Case 2: Missing Product Assets Transitions to WAITING_FOR_ASSET
  // ===========================================================================
  it('transitions to WAITING_FOR_ASSET when product has no uploaded media assets', async () => {
    const mockAutonRepo = createMockAutonRepo();
    const emptyBrandAssetRepo = createMockBrandAssetRepo([]); // No assets uploaded

    const service = new AutonomousOperationsService(
      {} as any,
      new MockAIProvider(),
      {
        autonRepo: mockAutonRepo as any,
        brandRepo: createMockBrandRepo() as any,
        dnaRepo: createMockDnaRepo() as any,
        productRepo: createMockProductRepo([mockProduct]) as any,
        brandAssetRepo: emptyBrandAssetRepo as any,
        directorService: createMockDirectorService() as any,
        contentPlannerService: createMockContentPlannerService() as any,
        reelPlannerService: createMockReelPlannerService() as any,
        policyService: createMockPolicyService() as any,
        guardrailsService: createMockGuardrailsService() as any,
        reelRepo: createMockReelRepo() as any,
        executionService: createMockExecutionService() as any
      }
    );

    const runResult = await service.executeAutonomousRun(workspaceId, {
      brandId,
      triggerType: 'MANUAL'
    });

    expect(runResult.status).toBe('WAITING_FOR_ASSET');
    expect(runResult.currentStep).toBe('PRODUCT_ASSET_VALIDATION');
    expect(runResult.summary).toContain('PRODUCT_ASSET_REQUIRED');
    expect(runResult.details?.userActionRequired).toContain('Upload product image or video');

    const steps = persistedSteps[runResult.id];
    const assetStep = steps.find((s) => s.stepName === 'PRODUCT_ASSET_VALIDATION');
    expect(assetStep).toBeDefined();
    expect(assetStep?.status).toBe('FAILED');
    expect(assetStep?.errorMessage).toContain('PRODUCT_ASSET_REQUIRED');
  });

  // ===========================================================================
  // Test Case 3: Veo Quota Exhaustion Transitions to WAITING_FOR_PROVIDER
  // ===========================================================================
  it('transitions to WAITING_FOR_PROVIDER on Veo quota exhaustion without endless retries', async () => {
    const mockAutonRepo = createMockAutonRepo();

    // Mock RenderService that throws a VeoQuotaExhaustedError
    const quotaFailingRenderService = {
      renderReelVideo: vi.fn(async () => {
        throw new VeoQuotaExhaustedError('Veo 3.1 quota limit exceeded (429 Resource Exhausted)', 'veo-3.1-generate-preview');
      })
    };

    const service = new AutonomousOperationsService(
      {} as any,
      new MockAIProvider(),
      {
        autonRepo: mockAutonRepo as any,
        brandRepo: createMockBrandRepo() as any,
        dnaRepo: createMockDnaRepo() as any,
        productRepo: createMockProductRepo() as any,
        brandAssetRepo: createMockBrandAssetRepo() as any,
        directorService: createMockDirectorService() as any,
        contentPlannerService: createMockContentPlannerService() as any,
        reelPlannerService: createMockReelPlannerService() as any,
        mediaService: createMockMediaService() as any,
        voiceService: createMockVoiceService() as any,
        captionService: createMockCaptionService() as any,
        audioService: createMockAudioService() as any,
        packageService: createMockPackageService() as any,
        animationService: createMockAnimationService() as any,
        renderService: quotaFailingRenderService as any,
        metaAdsService: createMockMetaAdsService() as any,
        policyService: createMockPolicyService() as any,
        guardrailsService: createMockGuardrailsService() as any,
        reelRepo: createMockReelRepo() as any,
        executionService: createMockExecutionService() as any
      }
    );

    const runResult = await service.executeAutonomousRun(workspaceId, {
      brandId,
      triggerType: 'MANUAL'
    });

    expect(runResult.status).toBe('WAITING_FOR_PROVIDER');
    expect(runResult.currentStep).toBe('VIDEO_ASSEMBLY');
    expect(runResult.summary).toContain('Veo provider quota limit reached');

    // Verify it halted and did not proceed to publish
    const steps = persistedSteps[runResult.id];
    const publishStep = steps.find((s) => s.stepName === 'PUBLISH');
    expect(publishStep).toBeUndefined();

    // Verify only called once without endless retries
    expect(quotaFailingRenderService.renderReelVideo).toHaveBeenCalledTimes(1);
  });

  // ===========================================================================
  // Test Case 4: Brand Safety Violation Transitions to BLOCKED
  // ===========================================================================
  it('transitions to BLOCKED when Brand Safety guardrail fails', async () => {
    const mockAutonRepo = createMockAutonRepo();
    const failingGuardrails = createMockGuardrailsService({
      brandSafetyAllowed: false,
      brandSafetyReason: 'Unapproved medical claim detected in voiceover script'
    });

    const service = new AutonomousOperationsService(
      {} as any,
      new MockAIProvider(),
      {
        autonRepo: mockAutonRepo as any,
        brandRepo: createMockBrandRepo() as any,
        dnaRepo: createMockDnaRepo() as any,
        productRepo: createMockProductRepo() as any,
        brandAssetRepo: createMockBrandAssetRepo() as any,
        directorService: createMockDirectorService() as any,
        contentPlannerService: createMockContentPlannerService() as any,
        reelPlannerService: createMockReelPlannerService() as any,
        mediaService: createMockMediaService() as any,
        voiceService: createMockVoiceService() as any,
        captionService: createMockCaptionService() as any,
        audioService: createMockAudioService() as any,
        packageService: createMockPackageService() as any,
        animationService: createMockAnimationService() as any,
        renderService: createMockRenderService() as any,
        metaAdsService: createMockMetaAdsService() as any,
        policyService: createMockPolicyService() as any,
        guardrailsService: failingGuardrails as any,
        reelRepo: createMockReelRepo() as any,
        executionService: createMockExecutionService() as any
      }
    );

    const runResult = await service.executeAutonomousRun(workspaceId, {
      brandId,
      triggerType: 'MANUAL'
    });

    expect(runResult.status).toBe('BLOCKED');
    expect(runResult.currentStep).toBe('BRAND_SAFETY');
    expect(runResult.summary).toContain('Brand Safety guardrail');

    // Verify Safety event was logged
    expect(safetyEvents.length).toBeGreaterThan(0);
    expect(safetyEvents[0].eventType).toBe('POLICY_VIOLATION');
  });

  // ===========================================================================
  // Test Case 5: Controlled Operating Mode Stops at APPROVAL_REQUIRED
  // ===========================================================================
  it('stops at APPROVAL_REQUIRED in CONTROLLED mode without publishing', async () => {
    const mockAutonRepo = createMockAutonRepo();
    const controlledPolicy: AutonomousPolicy = {
      ...mockAutonomousPolicy,
      mode: 'CONTROLLED'
    };
    const mockMetaAds = createMockMetaAdsService();

    const service = new AutonomousOperationsService(
      {} as any,
      new MockAIProvider(),
      {
        autonRepo: mockAutonRepo as any,
        brandRepo: createMockBrandRepo() as any,
        dnaRepo: createMockDnaRepo() as any,
        productRepo: createMockProductRepo() as any,
        brandAssetRepo: createMockBrandAssetRepo() as any,
        directorService: createMockDirectorService() as any,
        contentPlannerService: createMockContentPlannerService() as any,
        reelPlannerService: createMockReelPlannerService() as any,
        mediaService: createMockMediaService() as any,
        voiceService: createMockVoiceService() as any,
        captionService: createMockCaptionService() as any,
        audioService: createMockAudioService() as any,
        packageService: createMockPackageService() as any,
        animationService: createMockAnimationService() as any,
        renderService: createMockRenderService() as any,
        metaAdsService: mockMetaAds as any,
        policyService: createMockPolicyService(controlledPolicy) as any,
        guardrailsService: createMockGuardrailsService() as any,
        reelRepo: createMockReelRepo() as any,
        executionService: createMockExecutionService() as any
      }
    );

    const runResult = await service.executeAutonomousRun(workspaceId, {
      brandId,
      triggerType: 'SCHEDULED'
    });

    expect(runResult.status).toBe('APPROVAL_REQUIRED');
    expect(runResult.currentStep).toBe('APPROVAL');
    expect(runResult.summary).toContain('awaiting human approval');

    // Meta Ads Publishing should NEVER be called in Controlled Mode
    expect(mockMetaAds.publishToMeta).not.toHaveBeenCalled();

    const steps = persistedSteps[runResult.id];
    const approvalStep = steps.find((s) => s.stepName === 'APPROVAL');
    expect(approvalStep).toBeDefined();
    expect(approvalStep?.outputPayload?.approvalRequired).toBe(true);

    const publishStep = steps.find((s) => s.stepName === 'PUBLISH');
    expect(publishStep).toBeUndefined();
  });

  // ===========================================================================
  // Test Case 6: Video QA Failure Transitions to RENDER_FAILED
  // ===========================================================================
  it('transitions to RENDER_FAILED when video QA inspection rejects rendered reel', async () => {
    const mockAutonRepo = createMockAutonRepo();

    // Mock RenderService that throws a video render / QA error
    const renderFailingService = {
      renderReelVideo: vi.fn(async () => {
        throw new Error('Visual QA inspection failed: Resolution mismatch; Frozen video frames detected');
      })
    };

    const service = new AutonomousOperationsService(
      {} as any,
      new MockAIProvider(),
      {
        autonRepo: mockAutonRepo as any,
        brandRepo: createMockBrandRepo() as any,
        dnaRepo: createMockDnaRepo() as any,
        productRepo: createMockProductRepo() as any,
        brandAssetRepo: createMockBrandAssetRepo() as any,
        directorService: createMockDirectorService() as any,
        contentPlannerService: createMockContentPlannerService() as any,
        reelPlannerService: createMockReelPlannerService() as any,
        mediaService: createMockMediaService() as any,
        voiceService: createMockVoiceService() as any,
        captionService: createMockCaptionService() as any,
        audioService: createMockAudioService() as any,
        packageService: createMockPackageService() as any,
        animationService: createMockAnimationService() as any,
        renderService: renderFailingService as any,
        metaAdsService: createMockMetaAdsService() as any,
        policyService: createMockPolicyService() as any,
        guardrailsService: createMockGuardrailsService() as any,
        reelRepo: createMockReelRepo() as any,
        executionService: createMockExecutionService() as any
      }
    );

    const runResult = await service.executeAutonomousRun(workspaceId, {
      brandId,
      triggerType: 'MANUAL'
    });

    expect(runResult.status).toBe('RENDER_FAILED');
    expect(runResult.currentStep).toBe('VIDEO_ASSEMBLY');
    expect(runResult.summary).toContain('Video render failed');

    // Verify it did not proceed to approval or publishing
    const steps = persistedSteps[runResult.id];
    const publishStep = steps.find((s) => s.stepName === 'PUBLISH');
    expect(publishStep).toBeUndefined();
  });
});
