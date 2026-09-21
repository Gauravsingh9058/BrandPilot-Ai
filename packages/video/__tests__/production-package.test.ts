import { describe, it, expect, vi } from 'vitest';
import {
  ProductionReadinessChecker,
  ProductionPackageService
} from '../src/index.js';
import type {
  ReelProductionPlan,
  ReelAsset,
  CaptionTrack,
  AudioMixPlan
} from '@vidsnapai/types';

describe('Phase 6: Production Package & Readiness Evaluation Tests', () => {
  const mockReelPlan: ReelProductionPlan = {
    id: 'reel-pkg-1',
    contentJobId: 'job-1',
    brandId: 'brand-1',
    contentPlanId: 'plan-1',
    workspaceId: 'ws-1',
    version: 1,
    title: 'Zero Latency Studio Freedom',
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
    scenes: [
      { sceneNumber: 1, durationSeconds: 4, purpose: 'Hook', visualType: 'PROBLEM' },
      { sceneNumber: 2, durationSeconds: 6, purpose: 'Solution', visualType: 'PRODUCT_SHOWCASE' }
    ],
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
  };

  describe('ProductionReadinessChecker', () => {
    it('reports BLOCKED status with specific blockers when assets are missing', () => {
      const emptyReadiness = ProductionReadinessChecker.evaluate({
        reelPlan: mockReelPlan,
        assets: [],
        captionTrack: null,
        audioMixPlan: null
      });

      expect(emptyReadiness.status).toBe('BLOCKED');
      expect(emptyReadiness.blockers).toContain('MEDIA_MISSING');
      expect(emptyReadiness.blockers).toContain('VOICE_MISSING');
      expect(emptyReadiness.blockers).toContain('CAPTIONS_MISSING');
      expect(emptyReadiness.blockers).toContain('AUDIO_MISSING');
    });

    it('reports READY_FOR_ANIMATION when all scene media, voice, captions, and music are present', () => {
      const readyAssets: ReelAsset[] = [
        {
          id: 'asset-s1',
          reelPlanId: 'reel-pkg-1',
          workspaceId: 'ws-1',
          brandId: 'brand-1',
          sceneNumber: 1,
          assetType: 'VIDEO',
          sourceType: 'PEXELS',
          provider: 'pexels',
          metadata: {},
          licenseMetadata: {},
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'asset-s2',
          reelPlanId: 'reel-pkg-1',
          workspaceId: 'ws-1',
          brandId: 'brand-1',
          sceneNumber: 2,
          assetType: 'PRODUCT_IMAGE',
          sourceType: 'BRAND_LIBRARY',
          provider: 'brand_library',
          metadata: {},
          licenseMetadata: {},
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'asset-voice',
          reelPlanId: 'reel-pkg-1',
          workspaceId: 'ws-1',
          brandId: 'brand-1',
          sceneNumber: null,
          assetType: 'VOICE',
          sourceType: 'GENERATED',
          provider: 'mock_voice',
          durationSeconds: 10,
          metadata: {},
          licenseMetadata: {},
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const readyCaptions: CaptionTrack = {
        id: 'cap-1',
        reelPlanId: 'reel-pkg-1',
        workspaceId: 'ws-1',
        brandId: 'brand-1',
        version: 1,
        cues: [{ id: 'cue-1', startTime: 0, endTime: 4, text: 'Trapped by cables?', style: 'STANDARD' }],
        style: {},
        status: 'READY',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const readyAudio: AudioMixPlan = {
        id: 'mix-1',
        reelPlanId: 'reel-pkg-1',
        workspaceId: 'ws-1',
        brandId: 'brand-1',
        voiceConfig: { voiceId: 'v1', provider: 'mock_voice' },
        musicConfig: { source: 'AI_RECOMMENDED', title: 'Studio Beat', volume: 0.3 },
        sfxConfigs: [],
        mixSettings: {
          voiceVolume: 1.0,
          musicVolume: 0.3,
          sfxVolume: 0.4,
          ducking: true,
          duckingLevel: 0.2,
          fadeInSeconds: 0.5,
          fadeOutSeconds: 1.0,
          priorityOrder: ['VOICE', 'SFX', 'MUSIC']
        },
        status: 'READY',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const completeReadiness = ProductionReadinessChecker.evaluate({
        reelPlan: mockReelPlan,
        assets: readyAssets,
        captionTrack: readyCaptions,
        audioMixPlan: readyAudio
      });

      expect(completeReadiness.status).toBe('READY_FOR_ANIMATION');
      expect(completeReadiness.blockers.length).toBe(0);
      expect(completeReadiness.checks.media.status).toBe('READY');
      expect(completeReadiness.checks.voice.status).toBe('READY');
      expect(completeReadiness.checks.captions.status).toBe('READY');
      expect(completeReadiness.checks.music.status).toBe('READY');
    });
  });

  describe('ProductionPackageService', () => {
    it('compiles and persists full ReelProductionPackage payload', async () => {
      let savedPkg: any = null;
      const mockPkgRepo = {
        createOrUpdate: vi.fn().mockImplementation(async (data) => {
          savedPkg = { ...data, id: 'pkg-1', createdAt: new Date(), updatedAt: new Date() };
          return savedPkg;
        }),
        findByReelPlanId: vi.fn().mockImplementation(async () => savedPkg)
      };

      const mockReelPlanRepo = {
        findByIdAndWorkspace: vi.fn().mockResolvedValue(mockReelPlan)
      };
      const mockReelAssetRepo = {
        listByReelPlanId: vi.fn().mockResolvedValue([])
      };
      const mockCaptionRepo = {
        findLatestByReelPlanId: vi.fn().mockResolvedValue(null)
      };
      const mockAudioMixRepo = {
        findByReelPlanId: vi.fn().mockResolvedValue(null)
      };

      const packageService = new ProductionPackageService({} as any, {
        packageRepo: mockPkgRepo as any,
        reelPlanRepo: mockReelPlanRepo as any,
        reelAssetRepo: mockReelAssetRepo as any,
        captionRepo: mockCaptionRepo as any,
        audioMixRepo: mockAudioMixRepo as any
      });

      const compiled = await packageService.compilePackage('reel-pkg-1', 'ws-1');

      expect(compiled.id).toBe('pkg-1');
      expect(compiled.packagePayload.reelPlan.title).toBe('Zero Latency Studio Freedom');
      expect(compiled.readiness.status).toBe('BLOCKED');
    });
  });
});
