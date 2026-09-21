import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentPlanService } from '../src/contentPlanService.js';
import { ContentPlannerService } from '../src/contentPlannerService.js';
import { analyzeDiversification } from '../src/diversification.js';
import type { Database } from '@vidsnapai/database';
import type {
  AIProvider,
  Brand,
  BrandDNA,
  BrandProduct,
  MarketingStrategy,
  Campaign,
  ContentPlan,
  ContentJob,
  ContentPlanOutput,
  ContentJobOutput
} from '@vidsnapai/types';

describe('Phase 4: 30-Day Autonomous Content Planner Engine', () => {
  let planService: ContentPlanService;
  let plannerService: ContentPlannerService;
  let mockAiProvider: AIProvider;
  let mockDb: any;

  // In-memory test state
  let brands: Brand[] = [];
  let dnaRecords: BrandDNA[] = [];
  let products: BrandProduct[] = [];
  let strategies: MarketingStrategy[] = [];
  let campaigns: Campaign[] = [];
  let plans: ContentPlan[] = [];
  let jobs: ContentJob[] = [];

  const sampleBrand: Brand = {
    id: 'brand-100',
    workspaceId: 'ws-test',
    name: 'Luminary Audio',
    slug: 'luminary-audio',
    description: 'Precision wireless acoustic monitors for audio professionals',
    websiteUrl: 'https://luminaryaudio.com',
    story: 'Engineered zero-latency acoustic monitors for creators.',
    industry: 'Consumer Audio',
    targetAudience: 'Music producers and audio engineers',
    brandVoice: 'Authoritative, crisp, innovative',
    brandPersonality: 'Sophisticated, cutting-edge',
    uniqueSellingPoints: ['Zero latency', 'Dual driver acoustics'],
    pricingInfo: '$299',
    offers: ['15% off preorder bundle'],
    primaryCta: 'Preorder Luminary One',
    socialLinks: {},
    brandColors: { primary: '#0f172a', secondary: '#38bdf8' },
    typography: { headingFont: 'Outfit', bodyFont: 'Inter' },
    contentPillars: ['Studio Tips', 'Acoustics Demystified', 'Product Teardowns', 'Producer Stories'],
    marketingRules: {
      claimsToAvoid: ['Magical sound', 'Cheapest headphones'],
      brandRestrictions: [],
      complianceRules: []
    },
    competitorReferences: ['Shure', 'Audio-Technica'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleProducts: BrandProduct[] = [
    {
      id: 'prod-1',
      brandId: 'brand-100',
      name: 'Luminary Pro Monitor',
      description: 'Zero-latency reference in-ear monitors with planar drivers.',
      category: 'Audio Hardware',
      price: 299,
      currency: 'USD',
      features: ['Ultra-wideband wireless', 'Planar magnetic drivers'],
      benefits: ['Studio accurate audio anywhere', 'Zero bluetooth lag'],
      usps: ['<1ms latency wireless link'],
      targetAudience: 'Producers and audiophiles',
      offerInfo: {},
      cta: 'Preorder Now',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const generateMock30DayAIOutput = (name = 'Luminary Audio 30-Day Growth Content Plan'): ContentPlanOutput => {
    const outputJobs: ContentJobOutput[] = [];
    const funnelStages: Array<'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION'> = [
      'AWARENESS',
      'CONSIDERATION',
      'CONVERSION',
      'RETENTION'
    ];
    const pillars = ['Studio Tips', 'Acoustics Demystified', 'Product Teardowns', 'Producer Stories'];
    const types: Array<any> = [
      'EDUCATIONAL',
      'PROBLEM_AGITATION',
      'STORYTELLING',
      'SOCIAL_PROOF',
      'PROMOTIONAL',
      'AUTHORITY'
    ];
    const formats: Array<any> = [
      'SHORT_REEL',
      'TALKING_HEAD_REEL',
      'PRODUCT_SHOWCASE_REEL',
      'TUTORIAL_REEL',
      'TESTIMONIAL_REEL'
    ];

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
      'Behind the scenes with producer Alex Rivera testing Luminary One.',
      'Top 5 mixing headphone myths you need to stop believing.',
      'Why low impedance monitors matter for dynamic transient response.',
      'Real producer blind test: Wireless Luminary vs Legendary Wired Can.',
      'How to isolate unwanted mud in your low-mids without losing warmth.',
      'What happens when you drop studio-grade planar drivers into wireless IEMs.',
      'The engineering challenge behind zero compression wireless audio.',
      'Why phase alignment is the secret weapon of chart-topping masters.',
      'Studio walkthrough: setting up an acoustic reference workspace.',
      'Comparing THD distortion at 90dB across top reference hardware.',
      'Exclusive first look: Luminary One production line in action.',
      'How to dial in punchy kicks without clipping your master bus.',
      'The real cost of mixing on delayed audio monitoring.',
      'Why top mixing engineers are switching away from legacy cables.',
      'Unboxing the Luminary One founder edition preview kit.',
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

    for (let day = 1; day <= 30; day++) {
      const weekNumber = Math.ceil(day / 7);
      const funnelStage = funnelStages[(day - 1) % funnelStages.length];
      const pillar = pillars[(day - 1) % pillars.length];
      const contentType = types[(day - 1) % types.length];
      const format = formats[(day - 1) % formats.length];

      outputJobs.push({
        dayNumber: day,
        weekNumber,
        title: `Day ${day}: ${uniqueTopics[day - 1]}`,
        contentType,
        funnelStage,
        contentPillar: pillar,
        objective: `Drive engagement and category awareness on Day ${day}`,
        audience: 'Audio engineers and studio producers',
        topic: uniqueTopics[day - 1],
        hook: uniqueHooks[day - 1],
        keyMessage: `Zero latency monitoring unlocks authentic performance on Day ${day}.`,
        messagingAngle: `Focus on clarity and workflow acceleration for day ${day}`,
        offer: day % 7 === 0 ? '15% Off Preorder Bundle' : null,
        cta: day % 7 === 0 ? 'Click link in bio to preorder' : 'Save this tip for your next session',
        platform: 'INSTAGRAM',
        format,
        priority: day % 7 === 0 ? 'HIGH' : 'MEDIUM',
        suggestedVisualHook: `Quick visual zoom on soundwave visualizer (Day ${day})`,
        suggestedAudioConcept: 'Crisp studio voiceover with subtle bass thump',
        keyTakeaway: 'Reference audio precision changes mixing speed.',
        strategicRationale: `Positions Luminary as the authority in zero-latency hardware for Day ${day}.`
      });
    }

    return {
      planName: name,
      objective: 'Drive brand awareness, high social engagement, and 500 preorder conversions.',
      durationDays: 30,
      campaignTheme: 'Precision Sound Without Compromise',
      executiveSummary:
        'A comprehensive 30-day narrative taking creators from wireless frustration to studio-grade freedom.',
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
        contentTypeDistribution: {
          EDUCATIONAL: 8,
          PROBLEM_AGITATION: 6,
          STORYTELLING: 5,
          SOCIAL_PROOF: 5,
          PROMOTIONAL: 4,
          AUTHORITY: 2
        },
        formatDistribution: {
          SHORT_REEL: 10,
          TALKING_HEAD_REEL: 8,
          PRODUCT_SHOWCASE_REEL: 6,
          TUTORIAL_REEL: 4,
          TESTIMONIAL_REEL: 2
        },
        pillarDistribution: {
          'Studio Tips': 8,
          'Acoustics Demystified': 8,
          'Product Teardowns': 7,
          'Producer Stories': 7
        }
      },
      jobs: outputJobs
    };
  };

  beforeEach(() => {
    brands = [sampleBrand];
    products = [...sampleProducts];
    dnaRecords = [];
    strategies = [];
    campaigns = [];
    plans = [];
    jobs = [];

    // Mock AI Provider
    mockAiProvider = {
      providerName: 'mock-gemini',
      generateText: vi.fn(),
      generateStructured: vi.fn().mockImplementation(async () => generateMock30DayAIOutput())
    };

    // Mock Repositories
    const mockPlanRepo: any = {
      create: vi.fn().mockImplementation(async (bId: string, wsId: string, input: any) => {
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
        };
        plans.push(created);
        return created;
      }),
      findByIdAndBrand: vi.fn().mockImplementation(async (pId: string, bId: string) => {
        return plans.find((p) => p.id === pId && p.brandId === bId) || null;
      }),
      listForBrand: vi.fn().mockImplementation(async (bId: string) => {
        return plans.filter((p) => p.brandId === bId);
      }),
      findVersions: vi.fn().mockImplementation(async (groupId: string, bId: string) => {
        return plans.filter((p) => p.planGroupId === groupId && p.brandId === bId);
      }),
      getLatestVersion: vi.fn().mockImplementation(async (groupId: string, bId: string) => {
        const matched = plans.filter((p) => p.planGroupId === groupId && p.brandId === bId);
        return matched.length > 0 ? Math.max(...matched.map((p) => p.version)) : 0;
      }),
      update: vi.fn().mockImplementation(async (pId: string, bId: string, input: any) => {
        const idx = plans.findIndex((p) => p.id === pId && p.brandId === bId);
        if (idx === -1) return null;
        plans[idx] = { ...plans[idx], ...input, updatedAt: new Date() };
        return plans[idx];
      }),
      delete: vi.fn().mockImplementation(async (pId: string, bId: string) => {
        const initial = plans.length;
        plans = plans.filter((p) => !(p.id === pId && p.brandId === bId));
        jobs = jobs.filter((j) => j.contentPlanId !== pId);
        return plans.length < initial;
      })
    };

    const mockJobRepo: any = {
      createMany: vi.fn().mockImplementation(async (planId: string, bId: string, wsId: string, inputs: any[]) => {
        const createdJobs: ContentJob[] = inputs.map((inp, idx) => ({
          id: `job-${planId}-${idx + 1}`,
          contentPlanId: planId,
          brandId: bId,
          campaignId: inp.campaignId || null,
          workspaceId: wsId,
          dayNumber: inp.dayNumber,
          scheduledDate: inp.scheduledDate || new Date(),
          title: inp.title,
          contentType: inp.contentType,
          funnelStage: inp.funnelStage,
          contentPillar: inp.contentPillar,
          objective: inp.objective,
          audience: inp.audience,
          topic: inp.topic,
          hook: inp.hook,
          keyMessage: inp.keyMessage,
          messagingAngle: inp.messagingAngle,
          offer: inp.offer || null,
          cta: inp.cta,
          platform: inp.platform,
          format: inp.format,
          priority: inp.priority || 'MEDIUM',
          status: inp.status || 'PLANNED',
          strategy: inp.strategy || {},
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        jobs.push(...createdJobs);
        return createdJobs;
      }),
      findByIdAndPlan: vi.fn().mockImplementation(async (jobId: string, planId: string) => {
        return jobs.find((j) => j.id === jobId && j.contentPlanId === planId) || null;
      }),
      listForPlan: vi.fn().mockImplementation(async (planId: string, filter?: any) => {
        return jobs.filter((j) => {
          if (j.contentPlanId !== planId) return false;
          if (filter?.status && j.status !== filter.status) return false;
          if (filter?.funnelStage && j.funnelStage !== filter.funnelStage) return false;
          return true;
        });
      }),
      update: vi.fn().mockImplementation(async (jobId: string, planId: string, input: any) => {
        const idx = jobs.findIndex((j) => j.id === jobId && j.contentPlanId === planId);
        if (idx === -1) return null;
        jobs[idx] = { ...jobs[idx], ...input, updatedAt: new Date() };
        return jobs[idx];
      }),
      updateStatus: vi.fn().mockImplementation(async (jobId: string, planId: string, status: any) => {
        const idx = jobs.findIndex((j) => j.id === jobId && j.contentPlanId === planId);
        if (idx === -1) return null;
        jobs[idx] = { ...jobs[idx], status, updatedAt: new Date() };
        return jobs[idx];
      }),
      delete: vi.fn().mockImplementation(async (jobId: string, planId: string) => {
        const initial = jobs.length;
        jobs = jobs.filter((j) => !(j.id === jobId && j.contentPlanId === planId));
        return jobs.length < initial;
      }),
      findApprovedForPlan: vi.fn().mockImplementation(async (planId: string) => {
        return jobs.filter((j) => j.contentPlanId === planId && j.status === 'READY');
      })
    };

    const mockBrandRepo: any = {
      findByIdAndWorkspace: vi.fn().mockImplementation(async (bId: string, wsId: string) => {
        return brands.find((b) => b.id === bId && b.workspaceId === wsId) || null;
      })
    };

    const mockProductRepo: any = {
      listForBrand: vi.fn().mockImplementation(async (bId: string) => {
        return products.filter((p) => p.brandId === bId);
      })
    };

    const mockDnaRepo: any = {
      findLatestByBrandId: vi.fn().mockImplementation(async (bId: string) => {
        return dnaRecords.find((d) => d.brandId === bId) || null;
      })
    };

    const mockStrategyRepo: any = {
      findLatestByBrandId: vi.fn().mockImplementation(async (bId: string) => {
        return strategies.find((s) => s.brandId === bId) || null;
      })
    };

    const mockCampaignRepo: any = {
      findByIdAndBrand: vi.fn().mockImplementation(async (cId: string, bId: string) => {
        return campaigns.find((c) => c.id === cId && c.brandId === bId) || null;
      })
    };

    mockDb = {} as Database;

    planService = new ContentPlanService(mockDb, {
      planRepo: mockPlanRepo,
      jobRepo: mockJobRepo,
      brandRepo: mockBrandRepo
    });

    plannerService = new ContentPlannerService(mockDb, mockAiProvider, {
      planRepo: mockPlanRepo,
      jobRepo: mockJobRepo,
      brandRepo: mockBrandRepo,
      productRepo: mockProductRepo,
      dnaRepo: mockDnaRepo,
      strategyRepo: mockStrategyRepo,
      campaignRepo: mockCampaignRepo
    });
  });

  describe('Autonomous 30-Day Plan Generation', () => {
    it('generates a complete 30-day content calendar with sequential days 1..30', async () => {
      const plan = await plannerService.generateContentPlan('brand-100', 'ws-test', {
        name: 'Luminary Audio 30-Day Launch Sprint',
        durationDays: 30
      });

      expect(plan).toBeDefined();
      expect(plan.id).toBe('plan-1');
      expect(plan.version).toBe(1);
      expect(plan.status).toBe('READY');
      expect(plan.durationDays).toBe(30);
      expect(plan.jobs).toHaveLength(30);

      // Verify sequential day numbers
      for (let day = 1; day <= 30; day++) {
        const job = plan.jobs.find((j) => j.dayNumber === day);
        expect(job).toBeDefined();
        expect(job?.dayNumber).toBe(day);
        expect(job?.title).toContain(`Day ${day}`);
        expect(job?.hook.length).toBeGreaterThan(10);
        expect(job?.cta.length).toBeGreaterThan(3);
        expect(job?.status).toBe('PLANNED');
      }

      // Verify weekly narratives in strategySnapshot
      const narratives = (plan.strategySnapshot as any)?.weeklyNarratives;
      expect(narratives).toHaveLength(5);
      expect(narratives[0].weekNumber).toBe(1);
      expect(narratives[0].funnelFocus).toBe('AWARENESS');
    });

    it('calculates diversification metrics and repetition scores accurately', async () => {
      const plan = await plannerService.generateContentPlan('brand-100', 'ws-test', {
        durationDays: 30
      });

      const metrics = (plan.strategySnapshot as any)?.diversificationMetrics;
      expect(metrics).toBeDefined();
      expect(metrics.score).toBeGreaterThanOrEqual(80);
      expect(metrics.passed).toBe(true);
      expect(metrics.metrics.totalJobs).toBe(30);
      expect(metrics.metrics.uniquePillarsCount).toBeGreaterThanOrEqual(4);
    });

    it('safely handles AI generation failures without corrupting existing records', async () => {
      // First create plan 1
      await plannerService.generateContentPlan('brand-100', 'ws-test', {
        durationDays: 30
      });
      expect(plans).toHaveLength(1);

      // Mock AI failure
      (mockAiProvider.generateStructured as any).mockRejectedValueOnce(new Error('AI rate limit exceeded'));

      await expect(
        plannerService.generateContentPlan('brand-100', 'ws-test', {
          durationDays: 30
        })
      ).rejects.toThrow('AI Content Plan generation failed: AI rate limit exceeded');

      // Existing plan should remain safe and untouched
      expect(plans).toHaveLength(1);
      expect(jobs).toHaveLength(30);
    });

    it('rejects invalid AI schemas via strict Zod validation', async () => {
      (mockAiProvider.generateStructured as any).mockResolvedValue({
        planName: 'Malformed Plan',
        jobs: [] // Empty jobs array violates min(7)
      });

      await expect(
        plannerService.generateContentPlan('brand-100', 'ws-test', {
          durationDays: 30
        })
      ).rejects.toThrow(/AI generated invalid Content Plan structure/);
    });
  });

  describe('Immutable Plan Versioning & Safe Regeneration', () => {
    it('creates version v2 with new plan while preserving approved jobs', async () => {
      // 1. Generate v1
      const v1Plan = await plannerService.generateContentPlan('brand-100', 'ws-test', {
        name: 'Luminary Sprint v1',
        durationDays: 30
      });
      expect(v1Plan.version).toBe(1);

      // 2. Mark Day 3 and Day 7 as APPROVED / READY
      await planService.updateJobStatus(v1Plan.jobs[2].id, v1Plan.id, 'brand-100', 'ws-test', 'READY');
      await planService.updateJobStatus(v1Plan.jobs[6].id, v1Plan.id, 'brand-100', 'ws-test', 'READY');

      // Also customize Day 3's hook
      await planService.updateJob(v1Plan.jobs[2].id, v1Plan.id, 'brand-100', 'ws-test', {
        hook: 'CUSTOM HOOK: The undisputed truth about planar magnetic drivers.'
      });

      // 3. Regenerate plan into v2 with preserveApprovedJobs: true
      const v2Plan = await plannerService.generateContentPlan('brand-100', 'ws-test', {
        name: 'Luminary Sprint v2',
        durationDays: 30,
        planGroupId: v1Plan.planGroupId,
        previousPlanId: v1Plan.id,
        regenerate: true,
        preserveApprovedJobs: true
      });

      expect(v2Plan.version).toBe(2);
      expect(v2Plan.planGroupId).toBe(v1Plan.planGroupId);
      expect(plans).toHaveLength(2);

      // Verify that Day 3 customized hook was preserved into v2
      const v2Day3 = v2Plan.jobs.find((j) => j.dayNumber === 3);
      expect(v2Day3?.hook).toBe('CUSTOM HOOK: The undisputed truth about planar magnetic drivers.');
    });
  });

  describe('Content Plan & Job CRUD Operations', () => {
    it('allows updating job attributes and toggling approval status', async () => {
      const plan = await plannerService.generateContentPlan('brand-100', 'ws-test', {
        durationDays: 30
      });

      const firstJob = plan.jobs[0];

      // Update title and CTA
      const updated = await planService.updateJob(firstJob.id, plan.id, 'brand-100', 'ws-test', {
        title: 'Mastering Studio EQ in 30 Seconds',
        cta: 'Save and share with a producer friend'
      });

      expect(updated?.title).toBe('Mastering Studio EQ in 30 Seconds');
      expect(updated?.cta).toBe('Save and share with a producer friend');

      // Toggle status to READY (Approved)
      const approvedJob = await planService.updateJobStatus(firstJob.id, plan.id, 'brand-100', 'ws-test', 'READY');
      expect(approvedJob?.status).toBe('READY');
    });

    it('enforces brand and workspace authorization', async () => {
      await expect(
        plannerService.generateContentPlan('brand-999', 'ws-test', { durationDays: 30 })
      ).rejects.toThrow('Brand with ID "brand-999" not found in this workspace');
    });

    it('deletes content plan and cascades to all its associated jobs', async () => {
      const plan = await plannerService.generateContentPlan('brand-100', 'ws-test', {
        durationDays: 30
      });
      expect(plans).toHaveLength(1);
      expect(jobs).toHaveLength(30);

      const deleted = await planService.deletePlan(plan.id, 'brand-100', 'ws-test');
      expect(deleted).toBe(true);
      expect(plans).toHaveLength(0);
      expect(jobs).toHaveLength(0);
    });
  });

  describe('Deterministic Diversification Analyzer', () => {
    it('detects duplicate hooks and applies penalty score', () => {
      const jobsWithDuplicates: ContentJobOutput[] = [
        {
          dayNumber: 1,
          weekNumber: 1,
          title: 'Post 1',
          contentType: 'EDUCATIONAL',
          funnelStage: 'AWARENESS',
          contentPillar: 'Studio Tips',
          objective: 'Tips',
          audience: 'Producers',
          topic: 'EQ',
          hook: 'Stop scrolling and listen to this audio tip right now.',
          keyMessage: 'EQ is key',
          messagingAngle: 'Technique',
          cta: 'Save',
          platform: 'INSTAGRAM',
          format: 'SHORT_REEL',
          priority: 'MEDIUM'
        },
        {
          dayNumber: 2,
          weekNumber: 1,
          title: 'Post 2',
          contentType: 'EDUCATIONAL',
          funnelStage: 'AWARENESS',
          contentPillar: 'Studio Tips',
          objective: 'Tips',
          audience: 'Producers',
          topic: 'EQ',
          hook: 'Stop scrolling and listen to this audio tip right now.', // Exact duplicate hook!
          keyMessage: 'EQ is key',
          messagingAngle: 'Technique',
          cta: 'Save',
          platform: 'INSTAGRAM',
          format: 'SHORT_REEL',
          priority: 'MEDIUM'
        }
      ];

      const analysis = analyzeDiversification(jobsWithDuplicates);
      expect(analysis.passed).toBe(false);
      expect(analysis.repetitionIssues.some((r) => r.type === 'DUPLICATE_HOOK')).toBe(true);
    });
  });
});
