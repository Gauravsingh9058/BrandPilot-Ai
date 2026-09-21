import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaService } from '../packages/media/src/index.js';
import { VoiceService, MockVoiceProvider } from '../packages/voice/src/index.js';
import { CaptionService } from '../packages/captions/src/index.js';
import { AudioService } from '../packages/audio/src/index.js';
import { MemoryStorageProvider } from '../packages/storage/src/index.js';
import { ProductionPackageService } from '../packages/video/src/index.js';
import type {
  Brand,
  BrandProduct,
  BrandAsset,
  ReelProductionPlan,
  ReelAsset,
  CaptionTrack,
  AudioMixPlan,
  ReelProductionPackage
} from '@vidsnapai/types';

describe('VidSnapAI Phase 6 Full End-to-End Media + Audio Integration Flow', () => {
  // In-memory data persistence across the phases
  let brands: Brand[] = [];
  let products: BrandProduct[] = [];
  let brandAssets: BrandAsset[] = [];
  let reels: ReelProductionPlan[] = [];
  let reelAssets: ReelAsset[] = [];
  let captionTracks: CaptionTrack[] = [];
  let audioMixPlans: AudioMixPlan[] = [];
  let packages: ReelProductionPackage[] = [];

  let storageProvider: MemoryStorageProvider;
  let mediaService: MediaService;
  let voiceService: VoiceService;
  let captionService: CaptionService;
  let audioService: AudioService;
  let packageService: ProductionPackageService;

  beforeEach(() => {
    brands = [];
    products = [];
    brandAssets = [];
    reels = [];
    reelAssets = [];
    captionTracks = [];
    audioMixPlans = [];
    packages = [];

    storageProvider = new MemoryStorageProvider();

    // Mock Repositories
    const mockBrandRepo = {
      findById: vi.fn().mockImplementation(async (id) => brands.find((b) => b.id === id) || null),
      findByIdAndWorkspace: vi.fn().mockImplementation(async (id, wsId) => brands.find((b) => b.id === id && b.workspaceId === wsId) || null)
    };

    const mockProductRepo = {
      listForBrand: vi.fn().mockImplementation(async (bId) => products.filter((p) => p.brandId === bId))
    };

    const mockBrandAssetRepo = {
      listForBrand: vi.fn().mockImplementation(async (bId) => brandAssets.filter((a) => a.brandId === bId))
    };

    const mockReelPlanRepo = {
      findById: vi.fn().mockImplementation(async (id) => reels.find((r) => r.id === id) || null),
      findByIdAndWorkspace: vi.fn().mockImplementation(async (id, wsId) => reels.find((r) => r.id === id && r.workspaceId === wsId) || null)
    };

    const mockReelAssetRepo = {
      create: vi.fn().mockImplementation(async (data) => {
        const asset: ReelAsset = {
          ...data,
          id: `asset-${reelAssets.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        reelAssets.push(asset);
        return asset;
      }),
      listByReelPlanId: vi.fn().mockImplementation(async (planId) => reelAssets.filter((a) => a.reelPlanId === planId)),
      delete: vi.fn().mockImplementation(async (id) => {
        const idx = reelAssets.findIndex((a) => a.id === id);
        if (idx >= 0) {
          reelAssets.splice(idx, 1);
          return true;
        }
        return false;
      }),
      deleteForReelPlan: vi.fn().mockImplementation(async (planId) => {
        const initial = reelAssets.length;
        reelAssets = reelAssets.filter((a) => a.reelPlanId !== planId);
        return initial - reelAssets.length;
      }),
      deleteForScene: vi.fn().mockImplementation(async (planId, scNum) => {
        const initial = reelAssets.length;
        reelAssets = reelAssets.filter((a) => !(a.reelPlanId === planId && a.sceneNumber === scNum));
        return initial - reelAssets.length;
      })
    };

    const mockCaptionRepo = {
      getNextVersionNumber: vi.fn().mockImplementation(async (planId) => {
        const matches = captionTracks.filter((t) => t.reelPlanId === planId);
        return matches.length + 1;
      }),
      create: vi.fn().mockImplementation(async (data) => {
        const track: CaptionTrack = {
          ...data,
          id: `caption-${captionTracks.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        captionTracks.push(track);
        return track;
      }),
      findLatestByReelPlanId: vi.fn().mockImplementation(async (planId) => {
        const matches = captionTracks.filter((t) => t.reelPlanId === planId);
        return matches.length > 0 ? matches[matches.length - 1] : null;
      }),
      update: vi.fn().mockImplementation(async (id, _wsId, updates) => {
        const track = captionTracks.find((t) => t.id === id);
        if (!track) return null;
        Object.assign(track, updates);
        return track;
      })
    };

    const mockAudioMixRepo = {
      createOrUpdate: vi.fn().mockImplementation(async (data) => {
        const existing = audioMixPlans.find((p) => p.reelPlanId === data.reelPlanId);
        if (existing) {
          Object.assign(existing, data);
          return existing;
        }
        const plan: AudioMixPlan = {
          ...data,
          id: `mix-${audioMixPlans.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        audioMixPlans.push(plan);
        return plan;
      }),
      findByReelPlanId: vi.fn().mockImplementation(async (planId) => audioMixPlans.find((p) => p.reelPlanId === planId) || null)
    };

    const mockPackageRepo = {
      createOrUpdate: vi.fn().mockImplementation(async (data) => {
        const existing = packages.find((p) => p.reelPlanId === data.reelPlanId);
        if (existing) {
          Object.assign(existing, data);
          return existing;
        }
        const pkg: ReelProductionPackage = {
          ...data,
          id: `pkg-${packages.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        packages.push(pkg);
        return pkg;
      }),
      findByReelPlanId: vi.fn().mockImplementation(async (planId) => packages.find((p) => p.reelPlanId === planId) || null)
    };

    const mockStockMediaProvider = {
      providerName: 'mock_pexels',
      searchVideos: vi.fn().mockResolvedValue({
        assets: [
          {
            id: 'pexels-vid-101',
            provider: 'pexels',
            type: 'video' as const,
            title: 'Music producer at console',
            url: 'https://pexels.com/video101.mp4',
            previewUrl: 'https://pexels.com/preview101.jpg',
            width: 1080,
            height: 1920,
            durationSeconds: 10,
            photographer: 'Stock Artist'
          }
        ],
        totalResults: 1,
        page: 1,
        perPage: 10
      }),
      searchImages: vi.fn().mockResolvedValue({ assets: [], totalResults: 0, page: 1, perPage: 10 })
    };

    mediaService = new MediaService({} as any, mockStockMediaProvider, {
      reelAssetRepo: mockReelAssetRepo as any,
      brandRepo: mockBrandRepo as any,
      productRepo: mockProductRepo as any,
      brandAssetRepo: mockBrandAssetRepo as any
    });

    voiceService = new VoiceService({} as any, {
      voiceProvider: new MockVoiceProvider(),
      storageProvider,
      reelAssetRepo: mockReelAssetRepo as any
    });

    captionService = new CaptionService({} as any, {
      captionRepo: mockCaptionRepo as any
    });

    audioService = new AudioService({} as any, {
      audioMixRepo: mockAudioMixRepo as any,
      reelAssetRepo: mockReelAssetRepo as any,
      storageProvider
    });

    packageService = new ProductionPackageService({} as any, {
      packageRepo: mockPackageRepo as any,
      reelPlanRepo: mockReelPlanRepo as any,
      reelAssetRepo: mockReelAssetRepo as any,
      captionRepo: mockCaptionRepo as any,
      audioMixRepo: mockAudioMixRepo as any
    });
  });

  it('completes the entire Phase 6 production asset assembly and reaches READY_FOR_ANIMATION', async () => {
    const workspaceId = 'ws-test-full-6';

    // 1. Setup Brand Context & Registered First-Party Assets (Phase 2)
    const brand: Brand = {
      id: 'brand-test-full',
      workspaceId,
      name: 'AeroGlide Studio Audio',
      slug: 'aeroglide-studio',
      description: 'Zero loss wireless audio hardware for professional studios',
      industry: 'Consumer Tech',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    brands.push(brand);

    const product: BrandProduct = {
      id: 'prod-studio-x',
      brandId: brand.id,
      name: 'StudioPro X',
      category: 'Headphones',
      description: 'Zero loss wireless studio headphones with sub-1ms latency',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    products.push(product);

    const heroBrandAsset: BrandAsset = {
      id: 'ba-prod-hero',
      brandId: brand.id,
      type: 'product_image',
      name: 'StudioPro X Hero Studio Shot',
      storageKey: 'brands/assets/hero.jpg',
      url: 'https://storage.vidsnapai.com/brands/hero.jpg',
      metadata: { productId: 'prod-studio-x', tags: ['studiopro x', 'hero', 'wireless'] },
      createdAt: new Date()
    };
    brandAssets.push(heroBrandAsset);

    // 2. Setup 30-Day Content Job & Phase 5 Reel Blueprint
    const reelPlan: ReelProductionPlan = {
      id: 'reel-full-1',
      contentJobId: 'job-1',
      brandId: brand.id,
      contentPlanId: 'plan-1',
      workspaceId,
      version: 1,
      title: 'Zero Latency Studio Freedom Explained',
      concept: { title: 'Zero Latency Studio Freedom' },
      objective: 'Drive preorders',
      audience: 'Producers',
      funnelStage: 'CONSIDERATION',
      contentPillar: 'Audio',
      durationSeconds: 30,
      aspectRatio: '9:16',
      platform: 'INSTAGRAM',
      format: 'REEL',
      hook: { text: 'Why are music producers still trapped by cables in 2026?' },
      narrative: 'A story of studio liberation through lossless wireless audio.',
      script: [
        { id: 'seg-1', purpose: 'Hook', text: 'Why are music producers still trapped by cables in 2026?', estimatedDuration: 4 },
        { id: 'seg-2', purpose: 'Reveal', text: 'Meet StudioPro X: sub-1ms lossless wireless monitoring.', estimatedDuration: 6 }
      ],
      scenes: [
        {
          sceneNumber: 1,
          durationSeconds: 4,
          purpose: 'Hook Agitation',
          narration: 'Why are music producers still trapped by cables in 2026?',
          onScreenText: 'TRAPPED BY CABLES?',
          visualType: 'PROBLEM',
          subject: 'Producer tangled in cables',
          environment: 'Studio console',
          assetRequirement: 'Producer tangled in studio cables'
        },
        {
          sceneNumber: 2,
          durationSeconds: 6,
          purpose: 'Product Reveal',
          narration: 'Meet StudioPro X: sub-1ms lossless wireless monitoring.',
          onScreenText: 'SUB-1MS LOSSLESS',
          visualType: 'PRODUCT_SHOWCASE',
          subject: 'StudioPro X wireless headphones on studio desk',
          environment: 'Clean modern studio',
          productReference: 'StudioPro X',
          assetRequirement: 'StudioPro X hero studio shot'
        }
      ],
      visualDirection: { style: 'Moody cinematic studio aesthetic' },
      voiceDirection: { style: 'Authoritative and empowering', genderPreference: 'Male' },
      captionDirection: { style: 'Kinetic uppercase bursts' },
      animationDirection: { energy: 'High' },
      audioDirection: { musicMood: 'Electronic downtempo analog synths' },
      cta: { text: 'Preorder StudioPro X Now' },
      productionMetadata: {},
      status: 'READY',
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as ReelProductionPlan;
    reels.push(reelPlan);

    // Initial check: Package should be BLOCKED because no media/voice/captions/audio are resolved yet
    let pkg = await packageService.compilePackage(reelPlan.id, workspaceId);
    expect(pkg.readiness.status).toBe('BLOCKED');
    expect(pkg.readiness.blockers).toContain('MEDIA_MISSING');
    expect(pkg.readiness.blockers).toContain('VOICE_MISSING');
    expect(pkg.readiness.blockers).toContain('CAPTIONS_MISSING');
    expect(pkg.readiness.blockers).toContain('AUDIO_MISSING');

    // STEP A: Multi-Scene Visual Media Resolution
    const mediaResolution = await mediaService.resolveReelMedia(reelPlan, workspaceId);
    expect(mediaResolution.summary.resolvedScenes).toBe(2);
    expect(mediaResolution.summary.brandAssetMatches).toBe(1); // Scene 2 matched first-party brand asset
    expect(mediaResolution.summary.pexelsMatches).toBe(1); // Scene 1 matched Pexels stock video
    expect(mediaResolution.assets.length).toBe(2);

    // STEP B: Synthetic Voice Narration Generation
    const voiceAsset = await voiceService.generateVoiceTrack(reelPlan, workspaceId);
    expect(voiceAsset.assetType).toBe('VOICE');
    expect(voiceAsset.status).toBe('READY');
    expect(voiceAsset.durationSeconds).toBeGreaterThan(0);

    // STEP C: Timed Kinetic Captions Generation
    const captionTrack = await captionService.generateCaptionTrack(reelPlan, workspaceId);
    expect(captionTrack.cues.length).toBeGreaterThanOrEqual(2);
    expect(captionTrack.cues[0].startTime).toBe(0);

    // STEP D: Audio Mix Resolution with Ducking Settings
    const audioMixPlan = await audioService.resolveAudioPlan(reelPlan, workspaceId);
    expect(audioMixPlan.mixSettings.ducking).toBe(true);
    expect(audioMixPlan.mixSettings.priorityOrder).toEqual(['VOICE', 'SFX', 'MUSIC']);

    // STEP E: Local Gallery Music Upload Demonstration
    const localMusicUpload = await audioService.uploadLocalMusic(reelPlan, workspaceId, {
      buffer: Buffer.from('custom-mastered-audio-stream'),
      filename: 'studio_master_soundtrack.mp3',
      mimeType: 'audio/mpeg',
      durationSeconds: 30
    });
    expect(localMusicUpload.musicConfig.source).toBe('LOCAL_GALLERY');
    expect(localMusicUpload.musicConfig.title).toBe('studio_master_soundtrack.mp3');

    // STEP F: Re-Evaluate Production Readiness Matrix
    pkg = await packageService.compilePackage(reelPlan.id, workspaceId);

    expect(pkg.readiness.status).toBe('READY_FOR_ANIMATION');
    expect(pkg.readiness.blockers.length).toBe(0);
    expect(pkg.readiness.checks.media.status).toBe('READY');
    expect(pkg.readiness.checks.voice.status).toBe('READY');
    expect(pkg.readiness.checks.captions.status).toBe('READY');
    expect(pkg.readiness.checks.music.status).toBe('READY');

    // STEP G: Verify Phase 7 & 8 Handoff Contract
    expect(pkg.packagePayload.reelPlan.id).toBe(reelPlan.id);
    expect(pkg.packagePayload.assets.length).toBeGreaterThanOrEqual(2);
    expect(pkg.packagePayload.voiceAsset?.assetType).toBe('VOICE');
    expect(pkg.packagePayload.captionTrack?.cues.length).toBeGreaterThan(0);
    expect(pkg.packagePayload.audioMixPlan?.mixSettings.ducking).toBe(true);
  });
});
