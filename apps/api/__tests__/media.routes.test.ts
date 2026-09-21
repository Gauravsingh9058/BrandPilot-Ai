import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { type Express } from 'express';
import type { Server } from 'http';
import cookieParser from 'cookie-parser';
import { mediaRouter } from '../src/routes/media.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import type { Database } from '@vidsnapai/database';
import type {
  User,
  Session,
  Brand,
  ReelProductionPlan,
  ReelAsset,
  CaptionTrack,
  AudioMixPlan,
  ReelProductionPackage
} from '@vidsnapai/types';

// Mock DB and Services
let mockUsers: User[] = [];
let mockSessions: Session[] = [];
let mockBrands: Brand[] = [];
let mockReelPlans: ReelProductionPlan[] = [];
let mockReelAssets: ReelAsset[] = [];
let mockCaptionTracks: CaptionTrack[] = [];
let mockAudioMixPlans: AudioMixPlan[] = [];
let mockPackages: ReelProductionPackage[] = [];

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

vi.mock('@vidsnapai/brand', () => {
  return {
    BrandRepository: class {
      async findById(id: string) {
        return mockBrands.find((b) => b.id === id) || null;
      }
      async findByIdAndWorkspace(id: string, wsId: string) {
        return mockBrands.find((b) => b.id === id && b.workspaceId === wsId) || null;
      }
    },
    ProductRepository: class {
      async listForBrand(_brandId: string) {
        return [];
      }
    },
    AssetRepository: class {
      async listForBrand(_brandId: string) {
        return [];
      }
    }
  };
});

vi.mock('@vidsnapai/video', () => {
  return {
    ReelProductionPlanRepository: class {
      async findById(id: string) {
        return mockReelPlans.find((r) => r.id === id) || null;
      }
      async findByIdAndWorkspace(id: string, wsId: string) {
        return mockReelPlans.find((r) => r.id === id && r.workspaceId === wsId) || null;
      }
    },
    ProductionPackageService: class {
      async compilePackage(reelPlanId: string, wsId: string) {
        const pkg: ReelProductionPackage = {
          id: `pkg-${mockPackages.length + 1}`,
          reelPlanId,
          workspaceId: wsId,
          brandId: 'brand-api-1',
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
            reelPlan: mockReelPlans.find((r) => r.id === reelPlanId)!,
            assets: mockReelAssets.filter((a) => a.reelPlanId === reelPlanId)
          },
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockPackages.push(pkg);
        return pkg;
      }
      async getPackage(reelPlanId: string, _wsId: string) {
        return mockPackages.find((p) => p.reelPlanId === reelPlanId) || null;
      }
    }
  };
});

vi.mock('@vidsnapai/media', () => {
  return {
    MediaService: class {
      async resolveReelMedia(reelPlan: ReelProductionPlan, wsId: string) {
        const asset: ReelAsset = {
          id: `asset-${mockReelAssets.length + 1}`,
          reelPlanId: reelPlan.id,
          workspaceId: wsId,
          brandId: reelPlan.brandId,
          sceneNumber: 1,
          assetType: 'VIDEO',
          sourceType: 'PEXELS',
          provider: 'pexels',
          providerAssetId: 'pex-123',
          sourceUrl: 'https://images.pexels.com/video.mp4',
          previewUrl: 'https://images.pexels.com/preview.jpg',
          storageKey: null,
          filename: 'studio_shot.mp4',
          mimeType: 'video/mp4',
          width: 1080,
          height: 1920,
          durationSeconds: 4,
          metadata: {},
          licenseMetadata: { provider: 'Pexels' },
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockReelAssets.push(asset);
        return {
          assets: [asset],
          summary: { totalScenes: 1, resolvedScenes: 1, brandAssetMatches: 0, pexelsMatches: 1, fallbacks: 0 }
        };
      }
      async listReelAssets(reelPlanId: string) {
        return mockReelAssets.filter((a) => a.reelPlanId === reelPlanId);
      }
    },
    ReelAssetRepository: class {
      async listByBrandId(brandId: string) {
        return mockReelAssets.filter((a) => a.brandId === brandId);
      }
      async findById(id: string) {
        return mockReelAssets.find((a) => a.id === id) || null;
      }
      async update(id: string, _wsId: string, updates: any) {
        const target = mockReelAssets.find((a) => a.id === id);
        if (!target) return null;
        Object.assign(target, updates);
        return target;
      }
    },
    PexelsProvider: class {}
  };
});

vi.mock('@vidsnapai/voice', () => {
  return {
    VoiceService: class {
      async listAvailableVoices() {
        return [{ id: 'v-1', name: 'Marcus', gender: 'male', provider: 'google_cloud' }];
      }
      async generateVoiceTrack(reelPlan: ReelProductionPlan, wsId: string) {
        const voiceAsset: ReelAsset = {
          id: `voice-${mockReelAssets.length + 1}`,
          reelPlanId: reelPlan.id,
          workspaceId: wsId,
          brandId: reelPlan.brandId,
          sceneNumber: null,
          assetType: 'VOICE',
          sourceType: 'GENERATED',
          provider: 'google_cloud',
          providerAssetId: null,
          sourceUrl: 'https://storage.vidsnapai.com/voice.wav',
          previewUrl: 'https://storage.vidsnapai.com/voice.wav',
          storageKey: 'voice.wav',
          filename: 'voice.wav',
          mimeType: 'audio/wav',
          width: null,
          height: null,
          durationSeconds: 30,
          metadata: {},
          licenseMetadata: {},
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockReelAssets.push(voiceAsset);
        return voiceAsset;
      }
      async uploadVoiceTrack(reelPlan: ReelProductionPlan, wsId: string, _file: any) {
        return this.generateVoiceTrack(reelPlan, wsId);
      }
    }
  };
});

vi.mock('@vidsnapai/captions', () => {
  return {
    CaptionService: class {
      async generateCaptionTrack(reelPlan: ReelProductionPlan, wsId: string) {
        const track: CaptionTrack = {
          id: `caption-${mockCaptionTracks.length + 1}`,
          reelPlanId: reelPlan.id,
          workspaceId: wsId,
          brandId: reelPlan.brandId,
          version: 1,
          cues: [{ id: 'cue-1', startTime: 0, endTime: 2, words: ['Why', 'cables', 'in', '2026?'] }],
          style: { fontFamily: 'Outfit', fontSize: 32, primaryColor: '#ffffff', highlightColor: '#6366f1', animationStyle: 'kinetic', position: 'bottom', maxWordsPerLine: 4 },
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockCaptionTracks.push(track);
        return track;
      }
      async getCaptionTrack(reelPlanId: string) {
        return mockCaptionTracks.find((c) => c.reelPlanId === reelPlanId) || null;
      }
    }
  };
});

vi.mock('@vidsnapai/audio', () => {
  return {
    AudioService: class {
      async resolveAudioPlan(reelPlan: ReelProductionPlan, wsId: string) {
        const plan: AudioMixPlan = {
          id: `mix-${mockAudioMixPlans.length + 1}`,
          reelPlanId: reelPlan.id,
          workspaceId: wsId,
          brandId: reelPlan.brandId,
          musicConfig: { id: 'music-1', title: 'Energetic Beat', genre: 'Electronic', tempo: 124, mood: 'Dynamic', url: 'https://storage.vidsnapai.com/beat.mp3', durationSeconds: 60, volume: 0.25 },
          sfxConfigs: [],
          mixSettings: { voiceVolume: 1.0, musicVolume: 0.25, sfxVolume: 0.8, ducking: true, duckingAmountDb: 12, duckingAttackMs: 50, duckingReleaseMs: 250, masterVolume: 1.0 },
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockAudioMixPlans.push(plan);
        return plan;
      }
      async getAudioMixPlan(reelPlanId: string) {
        return mockAudioMixPlans.find((p) => p.reelPlanId === reelPlanId) || null;
      }
      async uploadLocalMusic(reelPlan: ReelProductionPlan, wsId: string, _file: any) {
        return this.resolveAudioPlan(reelPlan, wsId);
      }
      async uploadLocalSFX(reelPlan: ReelProductionPlan, wsId: string, _file: any) {
        return this.resolveAudioPlan(reelPlan, wsId);
      }
    }
  };
});

vi.mock('@vidsnapai/storage', () => {
  return {
    LocalStorageProvider: class {
      public providerName = 'local_filesystem';
      async uploadBuffer(_buf: any, key: string, mime: string, name?: string) {
        return { url: `/api/storage/files/${key}`, key, sizeBytes: 100, mimeType: mime, filename: name };
      }
    }
  };
});

import { AuthService } from '../src/services/auth.service.js';

describe('Phase 6: Media Studio API Routes', () => {
  let app: Express;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    mockUsers = [
      {
        id: 'user-api-1',
        email: 'creator@vidsnapai.com',
        name: 'Alex Creator',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockSessions = [
      {
        id: 'sess-api-1',
        userId: 'user-api-1',
        tokenHash: 'valid-media-token',
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date()
      }
    ];

    mockBrands = [
      {
        id: 'brand-api-1',
        workspaceId: 'ws-api-1',
        name: 'AeroGlide Audio',
        slug: 'aeroglide',
        description: 'Studio monitors',
        industry: 'Audio',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockReelPlans = [
      {
        id: 'reel-api-1',
        contentJobId: 'job-1',
        brandId: 'brand-api-1',
        contentPlanId: 'plan-1',
        workspaceId: 'ws-api-1',
        version: 1,
        title: 'Studio Freedom API Test',
        concept: { title: 'Studio Freedom' },
        objective: 'Drive preorders',
        audience: 'Producers',
        funnelStage: 'CONSIDERATION',
        contentPillar: 'Audio',
        durationSeconds: 30,
        aspectRatio: '9:16',
        platform: 'INSTAGRAM',
        format: 'REEL',
        hook: { text: 'Why cables in 2026?' },
        narrative: 'A journey of wireless freedom',
        script: [],
        scenes: [{ sceneNumber: 1, durationSeconds: 4, purpose: 'Hook', visualType: 'PROBLEM' }],
        visualDirection: {},
        voiceDirection: {},
        captionDirection: {},
        animationDirection: {},
        audioDirection: {},
        cta: { text: 'Preorder Now' },
        productionMetadata: {},
        status: 'READY',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'reel-foreign-1',
        contentJobId: 'job-foreign',
        brandId: 'brand-api-1',
        contentPlanId: 'plan-foreign',
        workspaceId: 'ws-foreign-999', // Foreign workspace
        version: 1,
        title: 'Foreign Reel',
        concept: {},
        objective: 'Test',
        audience: 'Test',
        funnelStage: 'AWARENESS',
        contentPillar: 'Test',
        durationSeconds: 30,
        aspectRatio: '9:16',
        platform: 'INSTAGRAM',
        format: 'REEL',
        hook: {},
        narrative: 'Test',
        script: [],
        scenes: [],
        visualDirection: {},
        voiceDirection: {},
        captionDirection: {},
        animationDirection: {},
        audioDirection: {},
        cta: {},
        productionMetadata: {},
        status: 'READY',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockReelAssets = [];
    mockCaptionTracks = [];
    mockAudioMixPlans = [];
    mockPackages = [];

    vi.spyOn(AuthService.prototype, 'validateSession').mockImplementation(async (token: string) => {
      if (token === 'valid-media-token') {
        return {
          user: {
            id: 'user-api-1',
            email: 'creator@vidsnapai.com',
            name: 'Alex Creator',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          session: {
            id: 'sess-api-1',
            userId: 'user-api-1',
            tokenHash: 'valid-media-token',
            expiresAt: new Date(Date.now() + 86400000),
            createdAt: new Date()
          }
        };
      }
      return null;
    });

    app = express();
    app.use(express.json());
    app.use(cookieParser('test-secret'));
    app.use('/api', mediaRouter);
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address !== null) {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const authHeader = {
    authorization: 'Bearer valid-media-token'
  };

  describe('Media Resolution Routes', () => {
    it('resolves scene media assets via POST /api/reels/:reelId/media/resolve', async () => {
      const res = await fetch(`${baseUrl}/api/reels/reel-api-1/media/resolve`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.assets.length).toBeGreaterThan(0);
    });

    it('synthesizes voice narration via POST /api/reels/:reelId/voice/generate', async () => {
      const res = await fetch(`${baseUrl}/api/reels/reel-api-1/voice/generate`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.data.voiceAsset.assetType).toBe('VOICE');
    });

    it('generates kinetic captions via POST /api/reels/:reelId/captions/generate', async () => {
      const res = await fetch(`${baseUrl}/api/reels/reel-api-1/captions/generate`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.data.captionTrack.cues.length).toBeGreaterThan(0);
    });

    it('resolves audio mix plan via POST /api/reels/:reelId/audio/resolve', async () => {
      const res = await fetch(`${baseUrl}/api/reels/reel-api-1/audio/resolve`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.data.audioMixPlan.mixSettings.ducking).toBe(true);
    });

    it('evaluates and retrieves production package via GET /api/reels/:reelId/production-package', async () => {
      const res = await fetch(`${baseUrl}/api/reels/reel-api-1/production-package`, {
        method: 'GET',
        headers: authHeader
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.data.productionPackage.readiness.status).toBe('READY_FOR_ANIMATION');
    });
  });

  describe('Security & Multi-Tenant Isolation', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/reels/reel-api-1/media/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(res.status).toBe(401);
    });

    it('denies access to foreign workspace Reel with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/reels/reel-foreign-1/media/resolve`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' }
      });

      expect(res.status).toBe(403);
    });
  });
});
