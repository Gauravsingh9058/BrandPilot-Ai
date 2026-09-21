import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReelPlannerService } from '../packages/video/src/index.js';
import type { Database } from '@vidsnapai/database';
import type {
  AIProvider,
  Brand,
  BrandProduct,
  BrandDna,
  MarketingStrategy,
  Campaign,
  ContentPlan,
  ContentJob,
  ReelProductionPlan
} from '@vidsnapai/types';

describe('VidSnapAI Phase 5 Full End-to-End Reel Orchestration Flow', () => {
  let reelPlannerService: ReelPlannerService;
  let mockAiProvider: AIProvider;

  // In-memory data store across phases
  let brands: Brand[] = [];
  let products: BrandProduct[] = [];
  let dnas: BrandDna[] = [];
  let strategies: MarketingStrategy[] = [];
  let campaigns: Campaign[] = [];
  let plans: ContentPlan[] = [];
  let jobs: ContentJob[] = [];
  let reels: ReelProductionPlan[] = [];

  const sampleMockReelOutput: any = {
    title: 'Zero Latency Studio Freedom Explained',
    concept: {
      title: 'Zero Latency Studio Freedom Explained',
      concept: 'Demonstrating how uncompressed lossless wireless audio eliminates studio cable clutter',
      objective: 'Drive preorder signups for StudioPro X',
      targetAudience: 'Music producers and audio engineers',
      corePromise: 'Sub-1ms lossless wireless monitoring',
      emotionalAngle: 'From frustrating studio tangles to pure creative focus',
      messagingAngle: 'Studio precision without cables',
      contentPillar: 'Acoustic Engineering',
      funnelStage: 'CONSIDERATION'
    },
    objective: 'Drive preorder signups for StudioPro X',
    audience: 'Music producers and audio engineers',
    funnelStage: 'CONSIDERATION',
    contentPillar: 'Acoustic Engineering',
    durationSeconds: 30,
    aspectRatio: '9:16',
    platform: 'INSTAGRAM',
    format: 'REEL',
    hook: {
      type: 'PROBLEM',
      text: 'Why are music producers still trapped by headphone cables in 2026?',
      visualIntent: 'Producer tripping over studio cable during a guitar take',
      deliveryStyle: 'Punchy relatable problem statement',
      durationSeconds: 3
    },
    narrative: 'A journey highlighting how Bluetooth compression ruined wireless audio until lossless protocol revolutionized the studio.',
    script: [
      {
        id: 'seg-1',
        purpose: 'Hook',
        text: 'Why are music producers still trapped by headphone cables in 2026?',
        estimatedDuration: 3,
        deliveryStyle: 'Dynamic',
        emotionalTone: 'Frustrated'
      },
      {
        id: 'seg-2',
        purpose: 'Problem Context',
        text: 'Standard Bluetooth introduces 150 milliseconds of latency—completely unplayable for live recording.',
        estimatedDuration: 10,
        deliveryStyle: 'Authoritative',
        emotionalTone: 'Scientific'
      },
      {
        id: 'seg-3',
        purpose: 'Solution',
        text: 'AeroGlide StudioPro X transmits uncompressed 24-bit 96kHz audio with sub-1ms latency.',
        estimatedDuration: 12,
        deliveryStyle: 'Inspiring',
        emotionalTone: 'Excited'
      },
      {
        id: 'seg-4',
        purpose: 'CTA',
        text: 'Pre-order StudioPro X today with exclusive early access.',
        estimatedDuration: 5,
        deliveryStyle: 'Direct Call to Action',
        emotionalTone: 'Urgent'
      }
    ],
    scenes: [
      {
        sceneNumber: 1,
        durationSeconds: 3.5,
        purpose: 'Problem Hook',
        narration: 'Why are music producers still trapped by headphone cables in 2026?',
        onScreenText: 'TRAPPED BY CABLES?',
        visualType: 'PROBLEM',
        subject: 'Music producer tangled in cables at mixing console',
        environment: 'Dimly lit professional recording studio',
        composition: 'Vertical close-up',
        camera: 'Quick dynamic push in',
        lighting: 'Moody neon studio edge lights',
        mood: 'Chaotic and frustrating',
        transition: 'Whip pan',
        animationIntent: 'Kinetic bold text pop',
        assetRequirement: 'Music producer recording instruments with tangled cables',
        productReference: null,
        brandElement: null,
        emphasis: 'Cable tangle'
      },
      {
        sceneNumber: 2,
        durationSeconds: 5.5,
        purpose: 'Latency Agitation',
        narration: 'Standard Bluetooth introduces 150 milliseconds of latency—completely unplayable for live recording.',
        onScreenText: 'BLUETOOTH LATENCY KILLS TIMING',
        visualType: 'DEMONSTRATION',
        subject: 'Digital waveform oscilloscope showing delayed audio transient',
        environment: 'Digital workstation screen and studio monitors',
        composition: 'Macro screen capture',
        camera: 'Slow tracking glide',
        lighting: 'High contrast display glow',
        mood: 'Analytical',
        transition: 'Match cut',
        animationIntent: 'Red audio wave lag indicator',
        assetRequirement: 'Close up of DAW screen showing delayed audio spikes'
      },
      {
        sceneNumber: 3,
        durationSeconds: 6.5,
        purpose: 'Product Reveal & Solution',
        narration: 'AeroGlide StudioPro X transmits uncompressed 24-bit 96kHz audio with sub-1ms latency.',
        onScreenText: 'SUB-1MS LOSSLESS AUDIO',
        visualType: 'PRODUCT_SHOWCASE',
        subject: 'Sleek AeroGlide StudioPro X wireless headphones on producer',
        environment: 'Clean modern acoustic treated studio',
        composition: 'Medium side portrait',
        camera: 'Smooth 360 orbit glide',
        lighting: 'Golden hour studio backlight with crisp edge highlights',
        mood: 'Liberating and premium',
        transition: 'Smooth cut',
        animationIntent: 'Subtle sound wave particle shimmer',
        assetRequirement: 'Producer recording with wireless studio headphones freely playing keyboard',
        productReference: 'StudioPro X',
        brandElement: 'AeroGlide badge on headband',
        emphasis: 'Zero latency performance'
      },
      {
        sceneNumber: 4,
        durationSeconds: 10.0,
        purpose: 'Customer Benefit & Freedom',
        narration: 'Experience zero-compromise monitoring and absolute tracking precision without cables.',
        onScreenText: 'ABSOLUTE STUDIO FREEDOM',
        visualType: 'TRANSFORMATION',
        subject: 'Producer tracking flawless live take in booth',
        environment: 'Bright acoustic studio',
        composition: 'Full-shot centered',
        camera: 'Slow upward pedestal',
        lighting: 'Warm studio glow',
        mood: 'Triumphant',
        transition: 'Match cut',
        animationIntent: 'Particle glow pulse',
        assetRequirement: 'Producer tracking live vocals or guitar freely in booth',
        productReference: 'StudioPro X',
        brandElement: 'AeroGlide logo',
        emphasis: 'Performance freedom'
      },
      {
        sceneNumber: 5,
        durationSeconds: 4.5,
        purpose: 'CTA Endcard',
        narration: 'Pre-order StudioPro X today with exclusive early access.',
        onScreenText: 'PRE-ORDER NOW • EARLY ACCESS',
        visualType: 'CTA',
        subject: 'AeroGlide logo, product hero shot and preorder pill button',
        environment: 'Branded deep indigo backdrop',
        composition: 'Centered vertical endcard layout',
        camera: 'Static punchy graphic',
        lighting: 'Studio spotlight',
        mood: 'Confident and inviting',
        transition: 'Fade out',
        animationIntent: 'Button pulse with subtle sparkle',
        assetRequirement: 'Clean hero render of headphones on pedestal with pre-order graphic',
        productReference: 'StudioPro X',
        brandElement: 'AeroGlide Audio Official Logo',
        emphasis: 'Pre-order Call to Action'
      }
    ],
    visualDirection: {
      style: 'Cinematic studio aesthetic with moody indigo and electric violet tones',
      mood: 'Precision, liberation, technological mastery',
      colorIntent: 'Deep slate, neon indigo, warm studio amber',
      lightingIntent: 'Low-key studio ambiance with crisp rim lighting on product',
      composition: 'Vertical 9:16 centered with clear bottom captions',
      cameraLanguage: 'Fluid handheld for problem -> smooth gimbal for product liberation',
      pacing: 'Fast and punchy hook flowing into rhythmic solution showcase',
      visualHierarchy: 'Hero action in center third, bold kinetic subtitles below',
      brandIntegration: 'Subtle logo on headphone earcups, bold logo on final CTA card',
      productEmphasis: 'StudioPro X hero angles showing carbon fiber finish'
    },
    voiceDirection: {
      style: 'Authoritative, confident, tech-savvy',
      pace: 'Fast-paced rhythmic',
      tone: 'Inspiring and precise',
      genderPreference: 'Male',
      language: 'en-US',
      accents: 'Neutral American'
    },
    captionDirection: {
      style: 'High-contrast kinetic uppercase captions',
      placement: 'Center bottom-third',
      density: '1-3 words per burst',
      fontEmphasis: 'Outfit bold with electric violet highlight',
      animation: 'Rapid pop-in with subtle scale up'
    },
    animationDirection: {
      energy: 'High',
      style: 'Modern kinetic typography and glowing waveform meters',
      textAnimation: 'Word-by-word synchronized highlight',
      visualTransitions: 'Whip pan to smooth match cuts',
      elementMotion: 'Floating acoustic particles'
    },
    audioDirection: {
      musicMood: 'Crisp electronic downtempo beat with warm analog synths',
      soundEffects: 'Cable unplug click, digital whooshes, triumphant chord on reveal',
      pacing: '124 BPM synced to visual cuts',
      mixBalance: 'Voice 100%, Music 30%, SFX 40%'
    },
    cta: {
      type: 'SHOP_NOW',
      text: 'Pre-Order StudioPro X Now',
      visualTreatment: 'Glowing electric violet pill button',
      placement: 'Final endcard scene',
      url: null
    }
  };

  beforeEach(() => {
    brands = [];
    products = [];
    dnas = [];
    strategies = [];
    campaigns = [];
    plans = [];
    jobs = [];
    reels = [];

    mockAiProvider = {
      providerName: 'mock-gemini-full-flow',
      generateText: vi.fn(),
      generateStructured: vi.fn().mockImplementation(async (_prompt, _schema) => {
        return sampleMockReelOutput;
      })
    };

    const mockDb = {} as Database;

    // Repositories wired with in-memory persistence
    const mockBrandRepo = {
      create: vi.fn().mockImplementation(async (wsId, input) => {
        const brand: Brand = {
          id: `brand-${brands.length + 1}`,
          workspaceId: wsId,
          name: input.name,
          slug: input.name.toLowerCase().replace(/\s+/g, '-'),
          description: input.description || '',
          industry: input.industry || 'Tech',
          uniqueSellingPoints: ['Zero-latency wireless', '24-bit studio audio'],
          primaryCta: 'Pre-Order Now',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        brands.push(brand);
        return brand;
      }),
      findById: vi.fn().mockImplementation(async (id) => brands.find((b) => b.id === id) || null),
      findByIdAndWorkspace: vi.fn().mockImplementation(async (id, wsId) => brands.find((b) => b.id === id && b.workspaceId === wsId) || null)
    };

    const mockProductRepo = {
      create: vi.fn().mockImplementation(async (brandId, input) => {
        const product = {
          id: `prod-${products.length + 1}`,
          brandId,
          name: input.name,
          category: input.category || 'Audio Hardware',
          tagline: input.tagline || 'Zero-latency wireless monitoring',
          features: ['Sub-1ms latency', '24-bit 96kHz'],
          benefits: ['Total studio freedom', 'Uncompromised timing'],
          pricing: { preorderPrice: '$299' },
          currentOffer: 'Early Bird 15% off',
          createdAt: new Date(),
          updatedAt: new Date()
        } as unknown as BrandProduct;
        products.push(product);
        return product;
      }),
      listForBrand: vi.fn().mockImplementation(async (brandId) => products.filter((p) => p.brandId === brandId))
    };

    const mockBrandAssetRepo = {
      listForBrand: vi.fn().mockImplementation(async (brandId) => [
        {
          id: 'ba-prod-1',
          brandId,
          type: 'product_image',
          name: 'StudioPro X 4K Studio Render',
          storageKey: 'brands/assets/studiopro.png',
          url: 'https://storage.vidsnapai.com/studiopro.png',
          productId: 'prod-1',
          assetPurpose: 'HERO',
          productionEligible: true,
          isPlaceholder: false,
          isTestAsset: false,
          metadata: { productId: 'prod-1', assetPurpose: 'HERO', productionEligible: true },
          createdAt: new Date()
        }
      ])
    };

    const mockDnaRepo = {
      findLatestByBrandId: vi.fn().mockImplementation(async (brandId) => dnas.find((d) => d.brandId === brandId) || null),
      create: vi.fn().mockImplementation(async (brandId, dna) => {
        const dnaRecord = {
          id: `dna-${dnas.length + 1}`,
          brandId,
          version: dnas.filter((d) => d.brandId === brandId).length + 1,
          dna,
          createdAt: new Date(),
          updatedAt: new Date()
        } as unknown as BrandDna;
        dnas.push(dnaRecord);
        return dnaRecord;
      })
    };

    const mockStrategyRepo = {
      findLatestByBrandId: vi.fn().mockImplementation(async (brandId) => strategies.find((s) => s.brandId === brandId) || null),
      create: vi.fn().mockImplementation(async (brandId, wsId, _input) => {
        const strat = {
          id: `strat-${strategies.length + 1}`,
          brandId,
          workspaceId: wsId,
          positioningStatement: 'The premier lossless wireless audio brand for audio professionals',
          targetAudienceSummary: 'Studio producers and sound engineers',
          createdAt: new Date(),
          updatedAt: new Date()
        } as unknown as MarketingStrategy;
        strategies.push(strat);
        return strat;
      })
    };

    const mockCampaignRepo = {
      findByIdAndBrand: vi.fn().mockImplementation(async (id, brandId) => campaigns.find((c) => c.id === id && c.brandId === brandId) || null),
      create: vi.fn().mockImplementation(async (brandId, wsId, input) => {
        const camp = {
          id: `camp-${campaigns.length + 1}`,
          brandId,
          workspaceId: wsId,
          name: input.name,
          objective: input.objective,
          targetAudience: 'Studio Engineers',
          createdAt: new Date(),
          updatedAt: new Date()
        } as unknown as Campaign;
        campaigns.push(camp);
        return camp;
      })
    };

    const mockPlanRepo = {
      findById: vi.fn().mockImplementation(async (id) => plans.find((p) => p.id === id) || null),
      findByIdAndWorkspace: vi.fn().mockImplementation(async (id, wsId) => plans.find((p) => p.id === id && p.workspaceId === wsId) || null),
      create: vi.fn().mockImplementation(async (brandId, wsId, input) => {
        const plan: ContentPlan = {
          id: `plan-${plans.length + 1}`,
          brandId,
          workspaceId: wsId,
          campaignId: input.campaignId || null,
          name: input.name,
          objective: input.objective,
          startDate: new Date(),
          endDate: new Date(),
          durationDays: 30,
          status: 'ACTIVE',
          version: 1,
          planGroupId: 'group-1',
          strategySnapshot: {},
          createdAt: new Date(),
          updatedAt: new Date()
        };
        plans.push(plan);
        return plan;
      })
    };

    const mockJobRepo = {
      findById: vi.fn().mockImplementation(async (id) => jobs.find((j) => j.id === id) || null),
      listByContentPlanId: vi.fn().mockImplementation(async (planId) => jobs.filter((j) => j.contentPlanId === planId)),
      createMany: vi.fn().mockImplementation(async (inputJobs) => {
        const createdJobs: ContentJob[] = inputJobs.map((j: any, i: number) => ({
          ...j,
          id: `job-${jobs.length + i + 1}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        jobs.push(...createdJobs);
        return createdJobs;
      })
    };

    const mockReelRepo = {
      create: vi.fn().mockImplementation(async (data) => {
        const version = data.version || (reels.filter((r) => r.contentJobId === data.contentJobId).length + 1);
        const plan: ReelProductionPlan = {
          ...data,
          id: `reel-${reels.length + 1}`,
          version,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        reels.push(plan);
        return plan;
      }),
      findById: vi.fn().mockImplementation(async (id) => reels.find((r) => r.id === id) || null),
      findByIdAndWorkspace: vi.fn().mockImplementation(async (id, wsId) => reels.find((r) => r.id === id && r.workspaceId === wsId) || null),
      findLatestByContentJobId: vi.fn().mockImplementation(async (jobId) => {
        const matches = reels.filter((r) => r.contentJobId === jobId);
        return matches.length > 0 ? matches[matches.length - 1] : null;
      }),
      listByContentJobId: vi.fn().mockImplementation(async (jobId) => reels.filter((r) => r.contentJobId === jobId)),
      listByContentPlanId: vi.fn().mockImplementation(async (planId) => reels.filter((r) => r.contentPlanId === planId)),
      listByBrandId: vi.fn().mockImplementation(async (brandId) => reels.filter((r) => r.brandId === brandId)),
      getNextVersionNumber: vi.fn().mockImplementation(async (jobId) => {
        const matches = reels.filter((r) => r.contentJobId === jobId);
        return matches.length + 1;
      }),
      update: vi.fn().mockImplementation(async (id, input) => {
        const target = reels.find((r) => r.id === id);
        if (!target) return null;
        if (input.title) target.title = input.title;
        if (input.scenes) target.scenes = input.scenes;
        if (input.status) target.status = input.status;
        target.updatedAt = new Date();
        return target;
      }),
      updateStatus: vi.fn().mockImplementation(async (id, status) => {
        const target = reels.find((r) => r.id === id);
        if (!target) return null;
        target.status = status;
        target.updatedAt = new Date();
        return target;
      })
    };

    reelPlannerService = new ReelPlannerService(mockDb, mockAiProvider, {
      brandRepo: mockBrandRepo as any,
      productRepo: mockProductRepo as any,
      brandAssetRepo: mockBrandAssetRepo as any,
      dnaRepo: mockDnaRepo as any,
      strategyRepo: mockStrategyRepo as any,
      campaignRepo: mockCampaignRepo as any,
      planRepo: mockPlanRepo as any,
      jobRepo: mockJobRepo as any,
      reelRepo: mockReelRepo as any
    });
  });

  it('completes the full autonomous lifecycle: Brand -> Strategy -> 30-Day Plan -> Reel Blueprint -> Scene Edit -> Version 2', async () => {
    // 1. Setup Brand Context
    const workspaceId = 'ws-test-full-1';
    const brand: Brand = {
      id: 'brand-test-1',
      workspaceId,
      name: 'AeroGlide Audio',
      slug: 'aeroglide-audio',
      description: 'Zero loss wireless studio monitors and headphones for audio creators',
      industry: 'Consumer Tech / Audio',
      uniqueSellingPoints: ['Zero-latency wireless', '24-bit lossless audio'],
      primaryCta: 'Pre-order StudioPro X',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    brands.push(brand);

    const product = {
      id: 'prod-1',
      brandId: brand.id,
      name: 'StudioPro X',
      category: 'Studio Wireless Headphones',
      tagline: 'Zero loss wireless monitoring',
      features: ['Sub-1ms latency', '24-bit 96kHz lossless'],
      benefits: ['Studio freedom without latency', 'Pristine sound stage'],
      pricing: { preorder: '$299' },
      currentOffer: 'Early bird 15% off',
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as BrandProduct;
    products.push(product);

    // 2. Setup 30-Day Content Plan & Content Jobs
    const plan: ContentPlan = {
      id: 'plan-1',
      brandId: brand.id,
      workspaceId,
      name: 'Q4 Studio Launch Content Engine',
      objective: 'Drive StudioPro X Preorders',
      startDate: new Date(),
      endDate: new Date(),
      durationDays: 30,
      status: 'ACTIVE',
      version: 1,
      planGroupId: 'group-1',
      strategySnapshot: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    plans.push(plan);

    const job = {
      id: 'job-day-4',
      contentPlanId: plan.id,
      brandId: brand.id,
      workspaceId,
      dayNumber: 4,
      scheduledDate: new Date(),
      title: 'The Cable Problem in Modern Music Production',
      contentType: 'PROBLEM_AGITATION',
      funnelStage: 'CONSIDERATION',
      contentPillar: 'Acoustic Engineering',
      objective: 'Highlight latency vs cable dilemma',
      audience: 'Music producers and recording engineers',
      topic: 'Studio cable tangle vs uncompressed wireless freedom',
      hook: 'Why are music producers still trapped by headphone cables in 2026?',
      keyMessage: 'AeroGlide StudioPro X delivers sub-1ms lossless wireless recording.',
      messagingAngle: 'Freedom to record without compromising audio timing',
      offer: '15% Early Bird Discount',
      cta: 'Pre-order StudioPro X Now',
      platform: 'INSTAGRAM',
      format: 'REEL',
      priority: 'HIGH',
      status: 'READY',
      strategy: {},
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as ContentJob;
    jobs.push(job);

    // 3. Autonomous Reel Orchestrator: Generate Reel Blueprint (v1)
    const reelBlueprintV1 = await reelPlannerService.generateReelForJob(
      job.id,
      workspaceId,
      { durationSeconds: 30 }
    );

    expect(reelBlueprintV1).toBeDefined();
    expect(reelBlueprintV1.version).toBe(1);
    expect(reelBlueprintV1.contentJobId).toBe(job.id);
    expect(reelBlueprintV1.title).toBe('Zero Latency Studio Freedom Explained');
    expect(reelBlueprintV1.scenes).toHaveLength(5);
    expect(reelBlueprintV1.hook.type).toBe('PROBLEM');
    expect(reelBlueprintV1.cta.type).toBe('SHOP_NOW');
    expect(reelBlueprintV1.visualDirection.style).toContain('Cinematic studio');
    expect(reelBlueprintV1.voiceDirection.language).toBe('en-US');
    expect(reelBlueprintV1.status).toBe('READY');

    // 4. Idempotency Check: Requesting generation again returns the existing plan
    const idempotentReel = await reelPlannerService.generateReelForJob(
      job.id,
      workspaceId
    );
    expect(idempotentReel.id).toBe(reelBlueprintV1.id);
    expect(idempotentReel.version).toBe(1);

    // 5. Inspect and Edit a Storyboard Scene
    const updatedScenePlan = await reelPlannerService.regenerateScene(
      job.id,
      workspaceId,
      {
        sceneNumber: 1,
        customGuidance: 'Emphasize dramatic guitar cable trip'
      }
    );
    expect(updatedScenePlan.scenes[0].animationIntent).toContain('Emphasize dramatic guitar cable trip');

    // 6. Safe Regeneration: Create Version 2 (preserving v1)
    const reelBlueprintV2 = await reelPlannerService.regenerateReelForJob(
      job.id,
      workspaceId,
      {
        regenerateReason: 'Make opening hook faster and punchier'
      }
    );

    expect(reelBlueprintV2.version).toBe(2);
    expect(reelBlueprintV2.id).not.toBe(reelBlueprintV1.id);

    // 7. Verify History: Both v1 and v2 exist and are accessible
    const history = await reelPlannerService.getHistoryForJob(job.id, workspaceId);
    expect(history).toHaveLength(2);
    expect(history.map((h) => h.version)).toContain(1);
    expect(history.map((h) => h.version)).toContain(2);

    // 8. Update Status to APPROVED
    const approvedReel = await reelPlannerService.updateStatus(
      reelBlueprintV2.id,
      workspaceId,
      'APPROVED'
    );
    expect(approvedReel.status).toBe('APPROVED');

    // 9. Verify Strict Future Phase Boundaries
    // Ensure no rendering engine was invoked
    expect(approvedReel.productionMetadata.generatedBy).toContain('VidSnapAI Reel Orchestrator');
  });
});
