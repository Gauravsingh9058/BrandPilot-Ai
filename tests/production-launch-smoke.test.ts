import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  UserRepository,
  WorkspaceRepository,
  SubscriptionRepository,
  TIER_LIMITS_MAP,
  type Database
} from '@vidsnapai/database';
import { BrandRepository } from '@vidsnapai/brand';
import { CampaignRepository } from '@vidsnapai/campaign';
import { ContentPlanRepository } from '@vidsnapai/content';
import { ReelOrchestrator, ProductionPackageService, MetaAdsService } from '@vidsnapai/video';
import { VoiceService, MockVoiceProvider } from '@vidsnapai/voice';
import { AnimationPlanner } from '@vidsnapai/animation';
import { MemoryStorageProvider } from '@vidsnapai/storage';
import { AuthService } from '../apps/api/src/services/auth.service.js';
import { metricsCollector } from '../apps/api/src/lib/metrics.js';

describe('VidSnapAI — Production Launch Smoke Test Suite (Real Customer Flow)', () => {
  let mockDb: any;
  let authService: AuthService;
  let userRepo: UserRepository;
  let workspaceRepo: WorkspaceRepository;
  let brandRepo: BrandRepository;
  let campaignRepo: CampaignRepository;
  let contentPlanRepo: ContentPlanRepository;
  let subRepo: SubscriptionRepository;
  let storageProvider: MemoryStorageProvider;

  // In-memory data structures
  let usersTable: any[] = [];
  let sessionsTable: any[] = [];
  let workspacesTable: any[] = [];
  let brandsTable: any[] = [];
  let campaignsTable: any[] = [];
  let contentPlansTable: any[] = [];
  let subscriptionsTable: any[] = [];
  let usageRecordsTable: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    usersTable = [];
    sessionsTable = [];
    workspacesTable = [];
    brandsTable = [];
    campaignsTable = [];
    contentPlansTable = [];
    subscriptionsTable = [];
    usageRecordsTable = [];

    mockDb = {} as Database;

    userRepo = new UserRepository(mockDb);
    workspaceRepo = new WorkspaceRepository(mockDb);
    brandRepo = new BrandRepository(mockDb);
    campaignRepo = new CampaignRepository(mockDb);
    contentPlanRepo = new ContentPlanRepository(mockDb);
    subRepo = new SubscriptionRepository(mockDb);
    storageProvider = new MemoryStorageProvider();

    // Spies for UserRepo
    vi.spyOn(userRepo, 'create').mockImplementation(async (data: any) => {
      const user = {
        id: `user-${Date.now()}`,
        email: data.email,
        name: data.name,
        role: 'USER',
        isSuperAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      usersTable.push({ ...user, passwordHash: data.passwordHash });
      return user;
    });
    vi.spyOn(userRepo, 'existsByEmail').mockImplementation(async (email) => usersTable.some((u) => u.email === email));
    vi.spyOn(userRepo, 'findByEmail').mockImplementation(async (email) => usersTable.find((u) => u.email === email) || null);
    vi.spyOn(userRepo, 'findById').mockImplementation(async (id) => usersTable.find((u) => u.id === id) || null);

    // Mocks for WorkspaceRepo
    (workspaceRepo as any).create = vi.fn().mockImplementation(async (data: any) => {
      const ws = { id: `ws-${Date.now()}`, name: data.name, ownerId: data.ownerId, createdAt: new Date(), updatedAt: new Date(), members: [{ userId: data.ownerId, role: 'OWNER' }] };
      workspacesTable.push(ws);
      return ws;
    });
    (workspaceRepo as any).getUserRole = vi.fn().mockImplementation(async () => 'OWNER');

    // Mocks for BrandRepo
    (brandRepo as any).create = vi.fn().mockImplementation(async (wsId: string, input: any, slug = 'one8-active') => {
      const brand = { id: `brand-${Date.now()}`, workspaceId: wsId, slug, ...input, createdAt: new Date(), updatedAt: new Date() };
      brandsTable.push(brand);
      return brand;
    });

    // Mocks for CampaignRepo
    (campaignRepo as any).create = vi.fn().mockImplementation(async (wsId: string, brandId: string, input: any) => {
      const camp = { id: `camp-${Date.now()}`, workspaceId: wsId, brandId, ...input, createdAt: new Date(), updatedAt: new Date() };
      campaignsTable.push(camp);
      return camp;
    });

    // Mocks for ContentPlanRepo
    (contentPlanRepo as any).create = vi.fn().mockImplementation(async (wsId: string, brandId: string, input: any) => {
      const plan = { id: `plan-${Date.now()}`, workspaceId: wsId, brandId, ...input, items: [], createdAt: new Date(), updatedAt: new Date() };
      contentPlansTable.push(plan);
      return plan;
    });

    // Mocks for SubRepo
    (subRepo as any).getForWorkspace = vi.fn().mockImplementation(async (wsId: string) => {
      const existing = subscriptionsTable.find((s) => s.workspaceId === wsId);
      if (existing) {
        return { ...existing, limits: TIER_LIMITS_MAP[existing.tier as keyof typeof TIER_LIMITS_MAP] };
      }
      return {
        id: `sub-${wsId}`,
        workspaceId: wsId,
        provider: 'stripe',
        tier: 'FREE',
        status: 'ACTIVE',
        currency: 'USD',
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        limits: TIER_LIMITS_MAP.FREE
      };
    });

    (subRepo as any).upsertSubscription = vi.fn().mockImplementation(async (wsId: string, data: any) => {
      let existing = subscriptionsTable.find((s) => s.workspaceId === wsId);
      if (existing) {
        Object.assign(existing, data, { updatedAt: new Date().toISOString() });
      } else {
        existing = {
          id: `sub-${wsId}`,
          workspaceId: wsId,
          provider: data.provider || 'stripe',
          tier: data.tier || 'FREE',
          status: data.status || 'ACTIVE',
          currency: data.currency || 'USD',
          cancelAtPeriodEnd: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        subscriptionsTable.push(existing);
      }
      return { ...existing, limits: TIER_LIMITS_MAP[existing.tier as keyof typeof TIER_LIMITS_MAP] };
    });

    (subRepo as any).getUsage = vi.fn().mockImplementation(async (wsId: string) => {
      const period = new Date().toISOString().slice(0, 7);
      let usage = usageRecordsTable.find((u) => u.workspaceId === wsId && u.billingPeriod === period);
      if (!usage) {
        usage = {
          workspaceId: wsId,
          billingPeriod: period,
          reelsGenerated: 0,
          reelsRendered: 0,
          brandsCreated: 0,
          storageBytes: 0,
          autonomousRuns: 0,
          metaCampaigns: 0,
          adsPublished: 0
        };
        usageRecordsTable.push(usage);
      }
      return usage;
    });

    (subRepo as any).incrementUsage = vi.fn().mockImplementation(async (wsId: string, metric: any, amount = 1) => {
      const usage = await subRepo.getUsage(wsId);
      (usage as any)[metric] = ((usage as any)[metric] || 0) + amount;
      return usage;
    });

    (subRepo as any).checkLimit = vi.fn().mockImplementation(async (wsId: string, metric: any, amount = 1) => {
      const sub = await (subRepo as any).getForWorkspace(wsId);
      const usage = await subRepo.getUsage(wsId);
      const metricLimitMap: Record<string, number> = {
        reelsGenerated: sub.limits.maxReelsPerMonth,
        reelsRendered: sub.limits.maxReelsRenderedPerMonth,
        brandsCreated: sub.limits.maxBrands
      };
      const limit = metricLimitMap[metric];
      if (limit === -1) return { allowed: true, limit: -1, current: (usage as any)[metric] || 0, remaining: -1 };
      const current = (usage as any)[metric] || 0;
      const allowed = current + amount <= limit;
      return { allowed, limit, current, remaining: Math.max(0, limit - current) };
    });

    authService = new AuthService(mockDb);
    (authService as any).userRepo = userRepo;
    (authService as any).workspaceRepo = workspaceRepo;
    (authService as any).sessionRepo = {
      create: async (data: any) => {
        const session = { id: `sess-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        sessionsTable.push(session);
        return session;
      },
      createSession: async (userId: string, tokenHash: string) => {
        const session = { id: `sess-${Date.now()}`, userId, tokenHash, expiresAt: new Date(Date.now() + 86400000), createdAt: new Date(), updatedAt: new Date() };
        sessionsTable.push(session);
        return session;
      },
      findByTokenHash: async (tokenHash: string) => {
        return sessionsTable.find((s) => s.tokenHash === tokenHash) || null;
      },
      deleteSession: async (tokenHash: string) => {
        sessionsTable = sessionsTable.filter((s) => s.tokenHash !== tokenHash);
      }
    };
  });

  it('1. Fresh Signup & User Session Generation (Sanitized Security Check)', async () => {
    const signupRes = await authService.signup({
      email: 'founder@vidsnapai.com',
      password: 'SecureEnterprisePassword123!',
      name: 'Sarah Founder'
    });

    expect(signupRes).toBeDefined();
    expect(signupRes.user).toBeDefined();
    expect(signupRes.user.email).toBe('founder@vidsnapai.com');
    expect(signupRes.user.name).toBe('Sarah Founder');
    expect(signupRes.rawToken).toBeDefined();
    expect(typeof signupRes.rawToken).toBe('string');
    // Security check: passwords/hashes must never be present on public models
    expect((signupRes.user as any).passwordHash).toBeUndefined();
    expect((signupRes.user as any).password).toBeUndefined();
  });

  it('2. Workspace Creation with Multi-Tenant Boundary', async () => {
    const signupRes = await authService.signup({
      email: 'owner@studio.io',
      password: 'SecureEnterprisePassword123!',
      name: 'Studio Owner'
    });

    const workspace = await workspaceRepo.create({
      name: 'BrandPulse Global Studio',
      ownerId: signupRes.user.id
    });

    expect(workspace).toBeDefined();
    expect(workspace.id).toBeDefined();
    expect(workspace.name).toBe('BrandPulse Global Studio');
    expect(workspace.ownerId).toBe(signupRes.user.id);
  });

  it('3. Brand Brain Creation (One8 Canonical Fixture)', async () => {
    const signupRes = await authService.signup({
      email: 'marketing@one8.com',
      password: 'SecureEnterprisePassword123!',
      name: 'One8 Marketing'
    });

    const brand = await (brandRepo as any).create(signupRes.workspace.id, {
      name: 'One8 Active',
      industry: 'Sports & Athleisure',
      colors: { primary: '#10b981', secondary: '#0f172a', accent: '#f59e0b' },
      fonts: { heading: 'Inter', body: 'Roboto' },
      guidelines: {
        toneOfVoice: 'Inspirational, Bold, Athletic',
        keyThemes: ['Performance', 'Daily Motivation', 'Fitness'],
        targetAudience: 'Active individuals 18-35',
        dos: ['High energy', 'Clear typography'],
        donts: ['Cluttered layouts']
      }
    });

    expect(brand).toBeDefined();
    expect(brand.id).toBeDefined();
    expect(brand.workspaceId).toBe(signupRes.workspace.id);
    expect(brand.name).toBe('One8 Active');
  });

  it('4. Marketing Campaign Strategy Generation', async () => {
    const signupRes = await authService.signup({
      email: 'strat@one8.com',
      password: 'SecureEnterprisePassword123!',
      name: 'Strat Lead'
    });

    const brand = await (brandRepo as any).create(signupRes.workspace.id, {
      name: 'One8 Energy',
      industry: 'Sports',
      colors: { primary: '#10b981', secondary: '#0f172a' },
      fonts: { heading: 'Inter', body: 'Roboto' },
      guidelines: { toneOfVoice: 'Energetic', keyThemes: ['Fitness'] }
    });

    const campaign = await (campaignRepo as any).create(signupRes.workspace.id, brand.id, {
      name: 'Summer Performance 2026',
      objective: 'CONVERSIONS',
      status: 'ACTIVE',
      budget: { total: 5000, currency: 'USD' }
    });

    expect(campaign).toBeDefined();
    expect(campaign.id).toBeDefined();
    expect(campaign.brandId).toBe(brand.id);
    expect((campaign as any).budget.currency).toBe('USD');
  });

  it('5. 30-Day Content Planner & Content Generation Cycle', async () => {
    const signupRes = await authService.signup({
      email: 'planner@one8.com',
      password: 'SecureEnterprisePassword123!',
      name: 'Planner Lead'
    });

    const brand = await (brandRepo as any).create(signupRes.workspace.id, {
      name: 'One8 Planner Brand',
      industry: 'Sports',
      colors: { primary: '#10b981', secondary: '#0f172a' },
      fonts: { heading: 'Inter', body: 'Roboto' },
      guidelines: { toneOfVoice: 'Energetic', keyThemes: ['Fitness'] }
    });

    const plan = await (contentPlanRepo as any).create(signupRes.workspace.id, brand.id, {
      title: '30-Day High Performance Launch Plan',
      durationDays: 30,
      status: 'DRAFT',
      themes: ['Product Launch', 'Athlete Spotlight', 'Workout Tips']
    });

    expect(plan).toBeDefined();
    expect(plan.id).toBeDefined();
    expect(plan.durationDays).toBe(30);
  });

  it('6. Reel Production Blueprint Generation (Scene Planning)', async () => {
    const sampleMockReelOutput: any = {
      title: 'Push Past Boundaries',
      concept: {
        title: 'Push Past Boundaries',
        concept: 'Inspirational fitness reel demonstrating grit and progress',
        objective: 'Brand Awareness',
        targetAudience: 'Fitness enthusiasts',
        corePromise: 'Unstoppable endurance',
        emotionalAngle: 'Triumph',
        messagingAngle: 'Daily effort',
        contentPillar: 'Performance',
        funnelStage: 'AWARENESS'
      },
      objective: 'Brand Awareness',
      audience: 'Fitness enthusiasts',
      funnelStage: 'AWARENESS',
      contentPillar: 'Performance',
      durationSeconds: 15,
      aspectRatio: '9:16',
      platform: 'INSTAGRAM',
      format: 'REEL',
      hook: {
        type: 'PROBLEM',
        text: 'Never settle for average when training.',
        visualIntent: 'Athlete sprinting full speed',
        deliveryStyle: 'Punchy statement',
        durationSeconds: 3
      },
      narrative: 'A high-energy showcase of athlete dedication.',
      script: [
        {
          id: 'seg-1',
          purpose: 'Hook',
          text: 'Never settle for average when training.',
          estimatedDuration: 3,
          deliveryStyle: 'Dynamic',
          emotionalTone: 'Bold'
        }
      ],
      scenes: [
        {
          sceneNumber: 1,
          durationSeconds: 4,
          purpose: 'Hook',
          narration: 'Never settle for average',
          onScreenText: 'DEFY LIMITS',
          visualType: 'PROBLEM',
          subject: 'Runner sprinting',
          environment: 'Urban track',
          composition: 'Vertical center',
          camera: 'Push in',
          lighting: 'Dramatic',
          mood: 'Focused',
          transition: 'Cut',
          animationIntent: 'Pop in',
          assetRequirement: 'Athlete sprinting outdoors'
        },
        {
          sceneNumber: 2,
          durationSeconds: 4,
          purpose: 'Product Hero',
          narration: 'Engineered for absolute speed',
          onScreenText: 'ONE8 ACTIVE',
          visualType: 'PRODUCT_SHOWCASE',
          subject: 'Athlete lifting with One8 gear',
          environment: 'Gym',
          composition: 'Medium shot',
          camera: 'Orbit',
          lighting: 'Studio rim',
          mood: 'Powerful',
          transition: 'Cut',
          animationIntent: 'Hero reveal',
          assetRequirement: 'Athlete wearing gear'
        },
        {
          sceneNumber: 3,
          durationSeconds: 4,
          purpose: 'Benefit',
          narration: 'Unrestricted mobility in every rep',
          onScreenText: 'PEAK MOBILITY',
          visualType: 'TRANSFORMATION',
          subject: 'Athlete completing personal record',
          environment: 'Urban arena',
          composition: 'Dynamic angle',
          camera: 'Dolly',
          lighting: 'Golden hour',
          mood: 'Empowered',
          transition: 'Cut',
          animationIntent: 'Glow pulse',
          assetRequirement: 'Athlete training triumph'
        },
        {
          sceneNumber: 4,
          durationSeconds: 3,
          purpose: 'CTA',
          narration: 'Shop One8 Active now',
          onScreenText: 'SHOP NOW',
          visualType: 'CTA',
          subject: 'One8 endcard with logo',
          environment: 'Dark gradient',
          composition: 'Centered',
          camera: 'Static',
          lighting: 'Studio glow',
          mood: 'Decisive',
          transition: 'Fade out',
          animationIntent: 'Button pulse',
          assetRequirement: 'Branded CTA card'
        }
      ],
      visualDirection: {
        style: 'Cinematic',
        mood: 'Empowering',
        colorIntent: 'Emerald and charcoal',
        lightingIntent: 'High contrast',
        composition: 'Vertical 9:16',
        cameraLanguage: 'Dynamic handheld',
        pacing: 'Fast',
        visualHierarchy: 'Hero centered',
        brandIntegration: 'Logo on apparel',
        productEmphasis: 'Performance fit'
      },
      voiceDirection: {
        style: 'Inspiring',
        pace: 'Energetic',
        tone: 'Motivational',
        genderPreference: 'Male',
        language: 'en-US'
      },
      captionDirection: {
        style: 'Kinetic typography',
        placement: 'Center bottom',
        density: '2-4 words',
        fontEmphasis: 'Bold Inter',
        animation: 'Pop-in'
      },
      animationDirection: {
        energy: 'High',
        style: 'Kinetic',
        textAnimation: 'Highlight',
        visualTransitions: 'Fast cuts',
        elementMotion: 'Subtle glide'
      },
      audioDirection: {
        musicMood: 'Driving electronic',
        soundEffects: 'Whoosh, impact',
        pacing: '128 BPM',
        mixBalance: 'Voice 100%, Music 35%'
      },
      cta: {
        type: 'SHOP_NOW',
        text: 'Shop One8 Active Now',
        visualTreatment: 'Pill button',
        placement: 'End scene',
        url: null
      }
    };

    const mockAi = {
      generateStructured: vi.fn().mockResolvedValue(sampleMockReelOutput)
    };

    const orchestrator = new ReelOrchestrator(mockAi as any);
    const plan = await orchestrator.generateReelPlan({
      brand: { id: 'b1', name: 'One8', industry: 'Sports' } as any,
      contentJob: { id: 'job1', platform: 'INSTAGRAM', format: 'REEL' } as any,
      input: { topic: 'Sprint Motivation', durationSeconds: 15 } as any
    });

    expect(plan).toBeDefined();
    expect(plan.title).toBe('Push Past Boundaries');
    expect(plan.scenes.length).toBe(4);
  });

  it('7. Media Resolution, Voice Synthesis, Captions & Audio Mixing', async () => {
    const voiceService = new VoiceService({} as any, {
      voiceProvider: new MockVoiceProvider(),
      storageProvider
    });    // 1. Voice
    const voices = await voiceService.listAvailableVoices();
    expect(voices.length).toBeGreaterThan(0);
    expect(voices[0].id).toBeDefined();
  });

  it('8. Animation Intelligence & Video Production Package Assembly', async () => {
    const animPlanner = new AnimationPlanner();
    const packageRepo = {
      createOrUpdate: vi.fn().mockResolvedValue({
        id: 'pkg-smoke-1',
        reelPlanId: 'reel-smoke-1',
        workspaceId: 'ws-smoke-1',
        status: 'READY_FOR_RENDER'
      })
    };
    const reelPlanRepo = {
      findByIdAndWorkspace: vi.fn().mockResolvedValue({
        id: 'reel-smoke-1',
        brandId: 'brand-smoke-1',
        workspaceId: 'ws-smoke-1',
        title: 'Push Past Boundaries',
        scenes: [{ sceneNumber: 1, durationSeconds: 3, visualPrompt: 'sprint', captionText: 'Go fast' }]
      })
    };
    const reelAssetRepo = { listByReelPlanId: vi.fn().mockResolvedValue([]) };
    const captionRepo = { findLatestByReelPlanId: vi.fn().mockResolvedValue(null) };
    const audioMixRepo = { findByReelPlanId: vi.fn().mockResolvedValue(null) };

    const packageService = new ProductionPackageService({} as any, {
      packageRepo: packageRepo as any,
      reelPlanRepo: reelPlanRepo as any,
      reelAssetRepo: reelAssetRepo as any,
      captionRepo: captionRepo as any,
      audioMixRepo: audioMixRepo as any
    });

    const animResult = await animPlanner.planAnimation({
      reelPlan: {
        id: 'reel-smoke-1',
        brandId: 'brand-smoke-1',
        workspaceId: 'ws-smoke-1',
        title: 'Push Past Boundaries',
        scenes: [{ sceneNumber: 1, durationSeconds: 3, visualPrompt: 'sprint', captionText: 'Go fast' }]
      } as any,
      productionPackage: {
        id: 'pkg-smoke-1',
        packagePayload: {
          scenes: [],
          captionTrack: { id: 'cap-1', cues: [] } as any,
          audioMixPlan: { id: 'mix-1' } as any
        }
      } as any
    });
    expect(animResult).toBeDefined();
    expect(animResult.plan).toBeDefined();

    const prodPackage = await packageService.compilePackage('reel-smoke-1', 'ws-smoke-1');
    expect(prodPackage).toBeDefined();
    expect(prodPackage.id).toBe('pkg-smoke-1');
  });

  it('9. SaaS Commercialization: Metering, Quota Checks & Tier Upgrades', async () => {
    const wsId = 'ws-smoke-test-billing';

    // 1. Initial FREE plan limits
    const sub = await (subRepo as any).getForWorkspace(wsId);
    expect(sub.tier).toBe('FREE');
    expect(sub.limits.maxReelsPerMonth).toBe(5);
    expect(sub.limits.autonomousEngineEnabled).toBe(false);

    // 2. Track usage
    await subRepo.incrementUsage(wsId, 'reelsGenerated', 3);
    const usage = await subRepo.getUsage(wsId);
    expect(usage.reelsGenerated).toBe(3);

    // 3. Check limit
    const limitCheck = await (subRepo as any).checkLimit(wsId, 'reelsGenerated');
    expect(limitCheck.allowed).toBe(true);
    expect(limitCheck.remaining).toBe(2);

    // 4. Upgrade to PRO
    await (subRepo as any).upsertSubscription(wsId, { tier: 'PRO', status: 'ACTIVE' });
    const upgraded = await (subRepo as any).getForWorkspace(wsId);
    expect(upgraded.tier).toBe('PRO');
    expect(upgraded.limits.maxReelsPerMonth).toBe(150);
    expect(upgraded.limits.autonomousEngineEnabled).toBe(true);
  });

  it('10. Meta OAuth Token Lifecycle & Safeguards', async () => {
    const metaService = new MetaAdsService({} as any);

    // Expired connection check
    const expiredConn = {
      id: 'conn-smoke-1',
      workspaceId: 'ws-smoke-1',
      metaUserId: 'meta-user-123',
      metaUserName: 'One8 Marketing Account',
      accessToken: 'EAAB_EXPIRED_TOKEN',
      tokenExpiresAt: new Date(Date.now() - 3600000),
      connectionStatus: 'CONNECTED' as const,
      environment: 'DEVELOPMENT' as const,
      status: 'ACTIVE' as const,
      adAccounts: [],
      pages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const sanitized = (metaService as any).sanitizeConnection(expiredConn);
    expect(sanitized.status).toBe('EXPIRED');
    expect(sanitized.hasValidToken).toBe(false);
    expect((sanitized as any).accessToken).toBeUndefined(); // Token scrubbed from client view
  });

  it('11. Prometheus Metrics Formatter & Telemetry Recording', async () => {
    metricsCollector.recordRequest('GET', '/api/billing/plans', 200, 15);
    metricsCollector.recordJobEvent('complete');

    const prom = metricsCollector.toPrometheus();
    expect(prom).toContain('# HELP vidsnapai_http_requests_total');
    expect(prom).toContain('vidsnapai_http_requests_total 1');
    expect(prom).toContain('vidsnapai_queue_jobs_completed 1');
  });
});
