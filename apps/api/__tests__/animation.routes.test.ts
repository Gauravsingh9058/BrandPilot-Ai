import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { type Express } from 'express';
import type { Server } from 'http';
import cookieParser from 'cookie-parser';
import { animationRouter } from '../src/routes/animation.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { AuthService } from '../src/services/auth.service.js';
import { AnimationService } from '@vidsnapai/animation';
import type { Database } from '@vidsnapai/database';
import type {
  User,
  Session,
  Brand,
  ReelProductionPlan,
  ReelProductionPackage,
  AnimationPlan
} from '@vidsnapai/types';

let mockUsers: User[] = [];
let mockSessions: Session[] = [];
let mockBrands: Brand[] = [];
let mockReelPlans: ReelProductionPlan[] = [];
let mockPackages: ReelProductionPackage[] = [];
let mockAnimationPlans: AnimationPlan[] = [];

vi.mock('@vidsnapai/database', () => ({
  getDatabase: () => ({} as Database),
  WorkspaceRepository: class {
    async getUserRole(wsId: string, userId: string) {
      if (wsId === 'ws-api-1' && userId === 'user-api-1') return 'OWNER';
      return null;
    }
    async listForUser(userId: string) {
      if (userId === 'user-api-1') {
        return [{ id: 'ws-api-1', name: 'Alex Studio', ownerId: 'user-api-1', role: 'OWNER', memberCount: 1, createdAt: new Date(), updatedAt: new Date() }];
      }
      return [];
    }
  },
  UserRepository: class {
    async findById(id: string) {
      return mockUsers.find((u) => u.id === id) || null;
    }
  },
  SessionRepository: class {
    async findByToken(token: string) {
      return mockSessions.find((s) => s.tokenHash === token) || null;
    }
  }
}));

vi.mock('../src/lib/redis.js', () => ({
  getRedisClient: () => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn()
  })
}));

vi.mock('@vidsnapai/video', () => ({
  ReelProductionPlanRepository: class {
    async findByIdAndWorkspace(id: string, wsId: string) {
      return mockReelPlans.find((r) => r.id === id && r.workspaceId === wsId) || null;
    }
  },
  ProductionPackageService: class {
    async getPackageByReelPlanId(reelPlanId: string, wsId: string) {
      return mockPackages.find((p) => p.reelPlanId === reelPlanId && p.workspaceId === wsId) || null;
    }
    async compilePackage(reelPlanId: string, wsId: string) {
      const reel = mockReelPlans.find((r) => r.id === reelPlanId && r.workspaceId === wsId);
      const pkg: ReelProductionPackage = {
        id: `pkg-${reelPlanId}`,
        reelPlanId,
        workspaceId: wsId,
        brandId: reel?.brandId || 'brand-api-1',
        readiness: {
          status: 'READY_FOR_ANIMATION',
          checks: {
            media: { status: 'READY' },
            voice: { status: 'READY' },
            captions: { status: 'READY' },
            music: { status: 'READY' },
            sfx: { status: 'READY' },
            brandAssets: { status: 'READY' }
          },
          blockers: [],
          evaluatedAt: new Date().toISOString()
        },
        packagePayload: {
          reelPlan: reel!,
          assets: []
        },
        status: 'READY',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockPackages.push(pkg);
      return pkg;
    }
  }
}));

vi.mock('@vidsnapai/brand', () => ({
  BrandRepository: class {
    async findById(id: string) {
      return mockBrands.find((b) => b.id === id) || null;
    }
  },
  DnaRepository: class {
    async findLatestByBrandId() {
      return null;
    }
  }
}));

vi.mock('@vidsnapai/campaign', () => ({
  MarketingStrategyRepository: class {
    async findLatestByBrandId() {
      return null;
    }
  },
  CampaignRepository: class {
    async findByIdAndBrand() {
      return null;
    }
  }
}));

describe('Animation Intelligence Routes (/api/reels/:id/animation)', () => {
  let app: Express;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    vi.spyOn(AuthService.prototype, 'validateSession').mockImplementation(async (token: string) => {
      if (token === 'valid-session-token') {
        return {
          user: {
            id: 'user-api-1',
            email: 'alex@example.com',
            name: 'Alex Director',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          session: {
            id: 'sess-1',
            userId: 'user-api-1',
            tokenHash: 'valid-session-token',
            expiresAt: new Date(Date.now() + 86400000),
            createdAt: new Date()
          }
        };
      }
      return null;
    });

    vi.spyOn(AnimationService.prototype, 'getLatestPlan').mockImplementation(async (reelPlanId: string, wsId: string) => {
      return mockAnimationPlans.find((p) => p.reelPlanId === reelPlanId && p.workspaceId === wsId) || null;
    });

    vi.spyOn(AnimationService.prototype, 'getReadinessReport').mockImplementation(async (_reelPlanId: string, _wsId: string) => {
      return {
        score: 95,
        status: 'READY',
        breakdown: {
          motionCoverage: 95,
          audioSync: 90,
          hierarchy: 100,
          pacing: 95,
          brandAlignment: 95
        },
        checks: [
          { name: 'Hook Motion', passed: true, score: 100, detail: 'Dynamic hook entrance' },
          { name: 'Word Sync', passed: true, score: 90, detail: 'Word cues aligned' }
        ],
        warnings: [],
        suggestions: []
      };
    });

    vi.spyOn(AnimationService.prototype, 'generateAnimationPlan').mockImplementation(async (params) => {
      const plan: AnimationPlan = {
        id: `anim-plan-${mockAnimationPlans.length + 1}`,
        reelPlanId: params.reelPlan.id,
        workspaceId: params.workspaceId,
        brandId: params.brandId,
        productionPackageId: params.productionPackage.id,
        version: mockAnimationPlans.length + 1,
        status: 'READY',
        animationLanguage: params.input?.animationLanguage || 'CINEMATIC',
        globalSettings: {
          intensity: params.input?.intensity || 'MEDIUM',
          reducedMotion: false,
          colorTheme: { primary: '#EC4899', accent: '#F472B6' }
        },
        sceneAnimations: [
          {
            sceneNumber: 1,
            startTime: 0,
            endTime: 3,
            cameraMotion: [{ type: 'SLOW_PUSH', startZoom: 1.0, endZoom: 1.1, duration: 3, easing: 'easeOut', focalPoint: { x: 50, y: 50 } }],
            productAnimations: [],
            logoAnimations: [],
            textAnimations: [{ style: 'KINETIC_WORD_POP', entrance: 'scale-bounce', startTime: 0.2, duration: 2.5, wordLevelTiming: true }],
            transitionOut: { toScene: 2, type: 'CUT', duration: 0.3, easing: 'easeOut', rationale: 'Impact' },
            syncCues: []
          },
          {
            sceneNumber: 2,
            startTime: 3,
            endTime: 8,
            cameraMotion: [{ type: 'PAN_HORIZONTAL', startZoom: 1.0, endZoom: 1.0, duration: 5, easing: 'easeInOut', focalPoint: { x: 50, y: 50 } }],
            productAnimations: [],
            logoAnimations: [],
            textAnimations: [{ style: 'ELEGANT_SLIDE', entrance: 'slide-up', startTime: 3.2, duration: 4.5, wordLevelTiming: true }],
            transitionOut: { toScene: 3, type: 'CROSSFADE', duration: 0.5, easing: 'easeInOut', rationale: 'Smooth' },
            syncCues: []
          }
        ],
        transitionPlan: [],
        textAnimationPlan: [],
        cameraPlan: [],
        productAnimationPlan: [],
        logoAnimationPlan: [],
        syncPlan: [],
        metadata: {
          totalDuration: 8,
          generatedBy: 'ai',
          generatedAt: new Date().toISOString()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockAnimationPlans.push(plan);
      return {
        animationPlan: plan,
        readiness: {
          score: 95,
          status: 'READY',
          breakdown: { motionCoverage: 95, audioSync: 90, hierarchy: 100, pacing: 95, brandAlignment: 95 },
          checks: [],
          warnings: [],
          suggestions: []
        },
        fallbackUsed: false
      };
    });

    vi.spyOn(AnimationService.prototype, 'updatePlan').mockImplementation(async (id, wsId, updates) => {
      const target = mockAnimationPlans.find((p) => p.id === id && p.workspaceId === wsId);
      if (!target) return null;
      Object.assign(target, updates);
      return target;
    });

    vi.spyOn(AnimationService.prototype, 'updateStatus').mockImplementation(async (id, wsId, status) => {
      const target = mockAnimationPlans.find((p) => p.id === id && p.workspaceId === wsId);
      if (!target) return null;
      target.status = status;
      return target;
    });

    vi.spyOn(AnimationService.prototype, 'getHistory').mockImplementation(async (reelPlanId, wsId) => {
      return mockAnimationPlans.filter((p) => p.reelPlanId === reelPlanId && p.workspaceId === wsId);
    });

    vi.spyOn(AnimationService.prototype, 'buildRenderContract').mockImplementation(() => {
      return {
        contractVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        reelPlanId: 'reel-api-1',
        productionPackageId: 'pkg-reel-api-1',
        dimensions: { width: 1080, height: 1920, fps: 30 },
        totalDurationSeconds: 8,
        totalFrames: 240,
        audioTracks: [],
        sceneContracts: [],
        globalTokens: { primaryColor: '#EC4899', secondaryColor: '#F472B6', headingFont: 'Outfit', bodyFont: 'Inter' },
        exportSettings: { codec: 'h264', crf: 18, preset: 'medium', audioBitrate: '320k' }
      };
    });

    mockUsers = [
      { id: 'user-api-1', email: 'alex@example.com', name: 'Alex Director', createdAt: new Date(), updatedAt: new Date() }
    ];
    mockSessions = [
      { id: 'sess-1', userId: 'user-api-1', tokenHash: 'valid-session-token', expiresAt: new Date(Date.now() + 86400000), createdAt: new Date() }
    ];
    mockBrands = [
      { id: 'brand-api-1', workspaceId: 'ws-api-1', name: 'Luxe Glow', slug: 'luxe-glow', description: 'Beauty', industry: 'Beauty', createdAt: new Date(), updatedAt: new Date() }
    ];
    mockPackages = [];
    mockAnimationPlans = [];
    mockReelPlans = [
      {
        id: 'reel-api-1',
        contentJobId: 'job-api-1',
        brandId: 'brand-api-1',
        contentPlanId: 'plan-api-1',
        workspaceId: 'ws-api-1',
        version: 1,
        title: 'Glow Serum Launch',
        concept: {
          title: 'Glow',
          concept: 'Reveal',
          objective: 'Sales',
          targetAudience: 'Women',
          corePromise: 'Glow',
          emotionalAngle: 'Joy',
          messagingAngle: 'Clean',
          contentPillar: 'Product',
          funnelStage: 'CONVERSION'
        },
        objective: 'Sales',
        audience: 'Women',
        funnelStage: 'CONVERSION',
        contentPillar: 'Product',
        durationSeconds: 10,
        aspectRatio: '9:16',
        platform: 'INSTAGRAM',
        format: 'REEL',
        hook: { type: 'PROBLEM', text: 'Tired skin?', visualIntent: 'Close up', deliveryStyle: 'Empathic', durationSeconds: 3 },
        narrative: 'Narrative',
        script: [],
        scenes: [
          {
            sceneNumber: 1,
            durationSeconds: 4,
            purpose: 'Hook',
            narration: 'Tired skin?',
            onScreenText: 'Tired Skin Solved',
            visualType: 'PROBLEM',
            subject: 'Woman',
            environment: 'Studio',
            composition: 'Center',
            camera: 'Slow push',
            lighting: 'Clean',
            mood: 'Somber',
            transition: 'wipe',
            animationIntent: 'Fast hook',
            assetRequirement: 'Model'
          },
          {
            sceneNumber: 2,
            durationSeconds: 6,
            purpose: 'CTA',
            narration: 'Shop now',
            onScreenText: 'Get 20% Off',
            visualType: 'CTA',
            subject: 'Bottle',
            environment: 'Studio',
            composition: 'Center',
            camera: 'Hero focus',
            lighting: 'Bright',
            mood: 'Joyful',
            transition: 'none',
            animationIntent: 'CTA pulse',
            assetRequirement: 'Product bottle'
          }
        ],
        visualDirection: {
          style: 'Cinematic',
          mood: 'Luminous',
          colorIntent: 'Gold',
          lightingIntent: 'Bright',
          composition: 'Center',
          cameraLanguage: 'Slow push',
          pacing: 'Dynamic',
          visualHierarchy: 'Top',
          brandIntegration: 'Logo',
          productEmphasis: 'Hero'
        },
        voiceDirection: { style: 'Warm', pace: 'Medium', tone: 'Friendly' },
        captionDirection: { style: 'Pop', placement: 'Bottom', density: '2 words', fontEmphasis: 'Bold', animation: 'Pop' },
        animationDirection: { energy: 'Medium', style: 'Cinematic', textAnimation: 'Pop', visualTransitions: 'Wipe', elementMotion: 'Drift' },
        audioDirection: { musicMood: 'Lo-Fi', soundEffects: 'Whoosh', pacing: 'Upbeat', mixBalance: 'Voice 100%' },
        cta: { type: 'SHOP_NOW', text: 'Shop Now', visualTreatment: 'Button', placement: 'End' },
        productionMetadata: {
          totalScenes: 2,
          estimatedWordCount: 15,
          targetDurationSeconds: 10,
          calculatedDurationSeconds: 10,
          generatedBy: 'VidSnapAI',
          contentJobId: 'job-api-1',
          generatedAt: new Date().toISOString()
        },
        status: 'READY',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    app = express();
    app.use(express.json());
    app.use(cookieParser('test-secret'));
    app.use('/api', animationRouter);
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/api/reels/reel-api-1/animation`);
    expect(res.status).toBe(401);
  });

  it('generates an animation plan for a reel blueprint (POST /api/reels/:id/animation/generate)', async () => {
    const res = await fetch(`${baseUrl}/api/reels/reel-api-1/animation/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-session-token',
        'x-workspace-id': 'ws-api-1'
      },
      body: JSON.stringify({
        animationLanguage: 'CINEMATIC',
        intensity: 'MEDIUM'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.animationPlan).toBeDefined();
    expect(body.data.animationPlan.animationLanguage).toBe('CINEMATIC');
    expect(body.data.animationPlan.sceneAnimations).toHaveLength(2);
    expect(body.data.readiness).toBeDefined();
    expect(body.data.readiness.score).toBeGreaterThanOrEqual(80);
  });

  it('fetches latest animation plan (GET /api/reels/:id/animation)', async () => {
    const res = await fetch(`${baseUrl}/api/reels/reel-api-1/animation`, {
      headers: {
        Authorization: 'Bearer valid-session-token',
        'x-workspace-id': 'ws-api-1'
      }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('fetches Phase 8 render contract (GET /api/reels/:id/animation/render-contract)', async () => {
    // Generate plan first
    await fetch(`${baseUrl}/api/reels/reel-api-1/animation/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-session-token',
        'x-workspace-id': 'ws-api-1'
      },
      body: JSON.stringify({
        animationLanguage: 'CINEMATIC',
        intensity: 'MEDIUM'
      })
    });

    const res = await fetch(`${baseUrl}/api/reels/reel-api-1/animation/render-contract`, {
      headers: {
        Authorization: 'Bearer valid-session-token',
        'x-workspace-id': 'ws-api-1'
      }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.contractVersion).toBe('1.0.0');
    expect(body.data.dimensions.width).toBe(1080);
    expect(body.data.dimensions.height).toBe(1920);
  });
});
