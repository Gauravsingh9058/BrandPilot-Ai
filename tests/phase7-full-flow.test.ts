import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaService } from '../packages/media/src/index.js';
import { VoiceService, MockVoiceProvider } from '../packages/voice/src/index.js';
import { CaptionService } from '../packages/captions/src/index.js';
import { AudioService } from '../packages/audio/src/index.js';
import { MemoryStorageProvider } from '../packages/storage/src/index.js';
import { ProductionPackageService } from '../packages/video/src/index.js';
import { AnimationService } from '../packages/animation/src/index.js';
import type {
  Brand,
  BrandDna,
  BrandProduct,
  BrandAsset,
  ReelProductionPlan,
  ReelAsset,
  CaptionTrack,
  AudioMixPlan,
  ReelProductionPackage,
  AnimationPlan
} from '@vidsnapai/types';

describe('VidSnapAI Phase 7 Full End-to-End Animation Intelligence Flow', () => {
  let brands: Brand[] = [];
  let brandDnas: BrandDna[] = [];
  let products: BrandProduct[] = [];
  let brandAssets: BrandAsset[] = [];
  let reels: ReelProductionPlan[] = [];
  let reelAssets: ReelAsset[] = [];
  let captionTracks: CaptionTrack[] = [];
  let audioMixPlans: AudioMixPlan[] = [];
  let packages: ReelProductionPackage[] = [];
  let animationPlans: AnimationPlan[] = [];

  let storageProvider: MemoryStorageProvider;
  let mediaService: MediaService;
  let voiceService: VoiceService;
  let captionService: CaptionService;
  let audioService: AudioService;
  let packageService: ProductionPackageService;
  let animationService: AnimationService;

  beforeEach(() => {
    brands = [];
    brandDnas = [];
    products = [];
    brandAssets = [];
    reels = [];
    reelAssets = [];
    captionTracks = [];
    audioMixPlans = [];
    packages = [];
    animationPlans = [];

    storageProvider = new MemoryStorageProvider();

    const mockBrandRepo = {
      findById: vi.fn().mockImplementation(async (id: string) => brands.find((b) => b.id === id) || null),
      findByIdAndWorkspace: vi.fn().mockImplementation(async (id: string, wsId: string) => brands.find((b) => b.id === id && b.workspaceId === wsId) || null)
    };

    const mockProductRepo = {
      listForBrand: vi.fn().mockImplementation(async (brandId: string) => products.filter((p) => p.brandId === brandId))
    };

    const mockBrandAssetRepo = {
      listForBrand: vi.fn().mockImplementation(async (brandId: string) => brandAssets.filter((a) => a.brandId === brandId))
    };

    const mockMediaProvider = {
      providerName: 'mock_pexels',
      searchVideos: vi.fn().mockResolvedValue({
        assets: [
          {
            id: 'pexels-vid-1',
            provider: 'pexels',
            type: 'video' as const,
            title: 'Luminous face serum',
            url: 'https://pexels.com/vid1.mp4',
            previewUrl: 'https://pexels.com/vid1.jpg',
            width: 1080,
            height: 1920,
            durationSeconds: 15,
            photographer: 'Beauty Cam'
          }
        ],
        totalResults: 1,
        page: 1,
        perPage: 10
      }),
      searchImages: vi.fn().mockResolvedValue({ assets: [], totalResults: 0, page: 1, perPage: 10 })
    };

    const mockReelAssetRepo = {
      create: vi.fn().mockImplementation(async (data: any) => {
        const asset = { id: `asset-${reelAssets.length + 1}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        reelAssets.push(asset);
        return asset;
      }),
      listForReel: vi.fn().mockImplementation(async (reelId: string) => reelAssets.filter((a) => a.reelPlanId === reelId)),
      listByReelPlanId: vi.fn().mockImplementation(async (reelId: string) => reelAssets.filter((a) => a.reelPlanId === reelId)),
      deleteForReel: vi.fn().mockImplementation(async (reelId: string) => {
        reelAssets = reelAssets.filter((a) => a.reelPlanId !== reelId);
      })
    };

    const mockCaptionRepo = {
      create: vi.fn().mockImplementation(async (track: any) => {
        const saved = { id: `cap-${captionTracks.length + 1}`, ...track, createdAt: new Date(), updatedAt: new Date() };
        captionTracks.push(saved);
        return saved;
      }),
      saveTrack: vi.fn().mockImplementation(async (track: any) => {
        const saved = { id: `cap-${captionTracks.length + 1}`, ...track, createdAt: new Date(), updatedAt: new Date() };
        captionTracks.push(saved);
        return saved;
      }),
      getNextVersionNumber: vi.fn().mockImplementation(async (reelId: string) => {
        return captionTracks.filter((c) => c.reelPlanId === reelId).length + 1;
      }),
      findLatestByReelPlanId: vi.fn().mockImplementation(async (reelId: string) => captionTracks.filter((c) => c.reelPlanId === reelId).pop() || null)
    };

    const mockAudioRepo = {
      saveMixPlan: vi.fn().mockImplementation(async (plan: any) => {
        const saved = { id: `mix-${audioMixPlans.length + 1}`, ...plan, createdAt: new Date(), updatedAt: new Date() };
        audioMixPlans.push(saved);
        return saved;
      }),
      createOrUpdate: vi.fn().mockImplementation(async (plan: any) => {
        const saved = { id: `mix-${audioMixPlans.length + 1}`, ...plan, createdAt: new Date(), updatedAt: new Date() };
        audioMixPlans.push(saved);
        return saved;
      }),
      findLatestByReelPlanId: vi.fn().mockImplementation(async (reelId: string) => audioMixPlans.filter((a) => a.reelPlanId === reelId).pop() || null),
      findByReelPlanId: vi.fn().mockImplementation(async (reelId: string) => audioMixPlans.filter((a) => a.reelPlanId === reelId).pop() || null)
    };

    const mockPackageRepo = {
      save: vi.fn().mockImplementation(async (pkg: any) => {
        const saved: ReelProductionPackage = { id: `pkg-${packages.length + 1}`, ...pkg, createdAt: new Date(), updatedAt: new Date() };
        packages.push(saved);
        return saved;
      }),
      createOrUpdate: vi.fn().mockImplementation(async (pkg: any) => {
        const saved: ReelProductionPackage = { id: `pkg-${packages.length + 1}`, ...pkg, createdAt: new Date(), updatedAt: new Date() };
        packages.push(saved);
        return saved;
      }),
      findByReelPlanId: vi.fn().mockImplementation(async (reelId: string) => packages.filter((p) => p.reelPlanId === reelId).pop() || null),
      getLatestByReelPlanId: vi.fn().mockImplementation(async (reelId: string) => packages.filter((p) => p.reelPlanId === reelId).pop() || null)
    };

    const mockAnimationRepo = {
      createVersion: vi.fn().mockImplementation(async (reelId: string, wsId: string, brandId: string, packageId: string, planData: any) => {
        const plan: AnimationPlan = {
          id: `anim-${animationPlans.length + 1}`,
          workspaceId: wsId,
          brandId,
          reelPlanId: reelId,
          productionPackageId: packageId,
          version: animationPlans.length + 1,
          ...planData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        animationPlans.push(plan);
        return plan;
      }),
      getLatestByReelPlanId: vi.fn().mockImplementation(async (reelId: string, wsId: string) => animationPlans.filter((p) => p.reelPlanId === reelId && p.workspaceId === wsId).pop() || null)
    };

    const mockReelRepo = {
      findByIdAndWorkspace: vi.fn().mockImplementation(async (id: string) => reels.find((r) => r.id === id) || null)
    };

    mediaService = new MediaService({} as any, mockMediaProvider as any, {
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
      audioMixRepo: mockAudioRepo as any
    });
    packageService = new ProductionPackageService({} as any, {
      packageRepo: mockPackageRepo as any,
      reelPlanRepo: mockReelRepo as any,
      reelAssetRepo: mockReelAssetRepo as any,
      captionRepo: mockCaptionRepo as any,
      audioMixRepo: mockAudioRepo as any
    });

    animationService = new AnimationService(undefined, mockAnimationRepo as any);
  });

  it('runs complete autonomous production pipeline from Brand Brain -> Blueprint -> Media/Audio -> Animation Intelligence -> Render Contract', async () => {
    // 1. Setup Brand DNA
    const brand: Brand = {
      id: 'brand-glow-1',
      workspaceId: 'ws-test-1',
      name: 'Aura Skin',
      slug: 'aura-skin',
      description: 'Clean Botanical Peptides',
      industry: 'Beauty',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    brands.push(brand);

    const brandDna: BrandDna = {
      id: 'dna-1',
      brandId: brand.id,
      version: 1,
      identity: {
        brandName: 'Aura Skin',
        industry: 'Beauty',
        story: 'Natural botanicals',
        mission: 'Healthy glowing skin',
        personality: ['Modern', 'Radiant', 'Cinematic']
      },
      audience: {
        primaryAudience: 'Women 20-35',
        demographics: ['20-35'],
        painPoints: ['Dullness'],
        desires: ['Glow'],
        buyingMotivations: ['Clean']
      },
      messaging: {
        positioning: 'Botanical Radiance',
        coreMessage: 'Glow from within',
        valueProposition: 'Noticeable radiance in 7 days',
        usps: ['Vegan Peptides'],
        proofPoints: ['94% saw radiance'],
        tone: ['Modern', 'Cinematic', 'Inspiring'],
        forbiddenMessaging: ['miracle fix']
      },
      products: [],
      visualIdentity: {
        colors: { primary: '#EC4899', secondary: '#F472B6' },
        typography: { headingFont: 'Outfit', bodyFont: 'Inter' },
        visualStyle: 'Modern luxury',
        imageStyle: 'Luminous'
      },
      contentStrategy: {
        contentPillars: ['Glow Tips'],
        preferredTopics: ['Serum'],
        educationalTopics: [],
        promotionalTopics: [],
        storytellingTopics: []
      },
      promotionRules: {
        primaryCTA: 'Shop Aura Serum',
        offers: ['15% off'],
        claimsToAvoid: [],
        complianceRules: [],
        brandRestrictions: ['No neon flashing']
      },
      generatedBy: 'VidSnapAI Brand Brain',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    brandDnas.push(brandDna);

    const product: BrandProduct = {
      id: 'prod-serum',
      brandId: brand.id,
      name: 'Aura Glow Serum',
      category: 'Skincare',
      description: 'Clean Botanical Peptide Radiance Serum',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    products.push(product);

    const brandAsset: BrandAsset = {
      id: 'ba-serum-hero',
      brandId: brand.id,
      type: 'product_image',
      name: 'Aura Glow Serum Hero 4K',
      storageKey: 'brands/assets/serum-hero.png',
      url: 'https://storage.vidsnapai.com/serum-hero.png',
      productId: 'prod-serum',
      assetPurpose: 'HERO',
      productionEligible: true,
      isPlaceholder: false,
      isTestAsset: false,
      metadata: { productId: 'prod-serum', assetPurpose: 'HERO', productionEligible: true },
      createdAt: new Date()
    };
    brandAssets.push(brandAsset);

    // 2. Setup Planned Reel
    const reelPlan: ReelProductionPlan = {
      id: 'reel-flow-1',
      contentJobId: 'job-1',
      brandId: brand.id,
      contentPlanId: 'plan-1',
      workspaceId: 'ws-test-1',
      version: 1,
      title: '7-Day Glow Transformation',
      concept: {
        title: '7-Day Glow',
        concept: 'Transformation',
        objective: 'Conversion',
        targetAudience: 'Women 20-35',
        corePromise: 'Glow in 7 days',
        emotionalAngle: 'Confidence',
        messagingAngle: 'Botanical Peptide Power',
        contentPillar: 'Product Demo',
        funnelStage: 'CONVERSION'
      },
      objective: 'Drive Sales',
      audience: 'Women 20-35',
      funnelStage: 'CONVERSION',
      contentPillar: 'Product Demo',
      durationSeconds: 15,
      aspectRatio: '9:16',
      platform: 'INSTAGRAM',
      format: 'REEL',
      hook: { type: 'PROBLEM', text: 'Tired of dull morning skin?', visualIntent: 'Close up', deliveryStyle: 'Empathic', durationSeconds: 3 },
      narrative: 'Problem -> Solution -> CTA',
      script: [],
      scenes: [
        {
          sceneNumber: 1,
          durationSeconds: 3,
          purpose: 'Hook',
          narration: 'Tired of dull morning skin?',
          onScreenText: 'Dull Skin No More',
          visualType: 'PROBLEM',
          subject: 'Model',
          environment: 'Bathroom',
          composition: 'Center',
          camera: 'Slow Push',
          lighting: 'Dim',
          mood: 'Somber',
          transition: 'Light wipe',
          animationIntent: 'Fast hook pop',
          assetRequirement: 'Tired face'
        },
        {
          sceneNumber: 2,
          durationSeconds: 6,
          purpose: 'Hero Reveal',
          narration: 'Meet Aura Glow Serum with botanical peptides.',
          onScreenText: 'Botanical Peptides + 5% Niacinamide',
          visualType: 'PRODUCT_SHOWCASE',
          subject: 'Serum Bottle',
          environment: 'Marble',
          composition: 'Hero Center',
          camera: 'Slow push',
          lighting: 'Luminous',
          mood: 'Radiant',
          transition: 'Smooth crossfade',
          animationIntent: 'Hero reveal',
          assetRequirement: 'Serum hero',
          productReference: 'Aura Glow Serum'
        },
        {
          sceneNumber: 3,
          durationSeconds: 6,
          purpose: 'CTA Climax',
          narration: 'Get 15% off your first bottle today.',
          onScreenText: '15% Off | Link in Bio',
          visualType: 'CTA',
          subject: 'Model with bottle',
          environment: 'Sunlight',
          composition: 'Center',
          camera: 'Static',
          lighting: 'Golden hour',
          mood: 'Inspiring',
          transition: 'None',
          animationIntent: 'CTA button pulse',
          assetRequirement: 'Glowing skin model',
          brandElement: 'Logo'
        }
      ],
      visualDirection: {
        style: 'Cinematic Modern',
        mood: 'Radiant',
        colorIntent: 'Rose gold',
        lightingIntent: 'Luminous',
        composition: 'Vertical 9:16',
        cameraLanguage: 'Slow push and hero focus',
        pacing: 'Dynamic',
        visualHierarchy: 'Subject -> Text -> CTA',
        brandIntegration: 'Corner seal',
        productEmphasis: 'Hero'
      },
      voiceDirection: { style: 'Warm', pace: 'Medium', tone: 'Friendly' },
      captionDirection: { style: 'Word pop', placement: 'Bottom', density: '2-3 words', fontEmphasis: 'Outfit', animation: 'Pop' },
      animationDirection: { energy: 'Medium-High', style: 'Cinematic', textAnimation: 'Word pop', visualTransitions: 'Light wipe and crossfade', elementMotion: 'Drift' },
      audioDirection: { musicMood: 'Lo-Fi Upbeat', soundEffects: 'Whoosh, Pop', pacing: 'Upbeat', mixBalance: 'Voice 100%' },
      cta: { type: 'SHOP_NOW', text: 'Shop Now', visualTreatment: 'Rose button', placement: 'End card' },
      productionMetadata: {
        totalScenes: 3,
        estimatedWordCount: 25,
        targetDurationSeconds: 15,
        calculatedDurationSeconds: 15,
        generatedBy: 'VidSnapAI',
        contentJobId: 'job-1',
        generatedAt: new Date().toISOString()
      },
      status: 'READY',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    reels.push(reelPlan);

    // 3. Resolve Media & Synthesize Audio / Captions (Phase 6)
    await mediaService.resolveReelMedia(reelPlan, 'ws-test-1');
    await voiceService.generateVoiceTrack(reelPlan, 'ws-test-1', { voiceConfig: { voiceId: 'en-fem-1', voiceName: 'Emma', provider: 'mock_voice', style: 'Conversational', tone: 'Warm' } });
    await captionService.generateCaptionTrack(reelPlan, 'ws-test-1');
    await audioService.resolveAudioPlan(reelPlan, 'ws-test-1');

    const productionPackage = await packageService.compilePackage(reelPlan.id, 'ws-test-1');
    expect(productionPackage).toBeDefined();
    expect(productionPackage.readiness.status).toBe('READY_FOR_ANIMATION');

    // 4. Generate Animation Intelligence Plan (Phase 7)
    const { animationPlan, readiness } = await animationService.generateAnimationPlan({
      workspaceId: 'ws-test-1',
      brandId: brand.id,
      reelPlan,
      productionPackage,
      brandDna,
      input: {
        animationLanguage: 'CINEMATIC',
        intensity: 'MEDIUM'
      }
    });

    expect(animationPlan).toBeDefined();
    expect(animationPlan.version).toBe(1);
    expect(animationPlan.sceneAnimations).toHaveLength(3);
    expect(readiness.score).toBeGreaterThanOrEqual(80);
    expect(readiness.status).toBe('READY');

    // 5. Verify Scene 1 (Hook Retention)
    const scene1 = animationPlan.sceneAnimations[0];
    expect(scene1.sceneNumber).toBe(1);
    expect(scene1.startTime).toBe(0);
    expect(scene1.endTime).toBe(3);
    expect(scene1.cameraMotion[0].type).toBe('SLOW_PUSH');

    // 6. Verify Scene 2 (Hero Product Reveal)
    const scene2 = animationPlan.sceneAnimations[1];
    expect(scene2.sceneNumber).toBe(2);
    expect(scene2.productMotion).toHaveLength(1);
    expect(scene2.productMotion[0].isHeroMoment).toBe(true);

    // 7. Verify Scene 3 (CTA Climax)
    const scene3 = animationPlan.sceneAnimations[2];
    expect(scene3.sceneNumber).toBe(3);
    expect(scene3.textMotion[0].entrance).toBe('EMPHASIS_PULSE');
    expect(scene3.logoMotion).toHaveLength(1);

    // 8. Compile Phase 8 Handoff Contract
    const renderContract = animationService.buildRenderContract({
      animationPlan,
      productionPackage,
      brandDna
    });

    expect(renderContract.contractVersion).toBe('1.0.0');
    expect(renderContract.dimensions.aspectRatio).toBe('9:16');
    expect(renderContract.scenes).toHaveLength(3);
    expect(renderContract.audio.duckingConfig).toBeDefined();
    expect(renderContract.brand.primaryColor).toBe('#EC4899');
  });
});
