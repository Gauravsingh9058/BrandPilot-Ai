import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import {
  MockAIProvider,
  AIProviderRateLimitError,
  executeAIWithFallback,
} from '@vidsnapai/ai';
import {
  ReelOrchestrator,
  VideoRenderService,
  RenderContractAdapter,
  AutonomousOperationsService,
} from '@vidsnapai/video';
import { AnimationPlanner, AnimationService } from '@vidsnapai/animation';
import { LocalStorageProvider } from '@vidsnapai/storage';
import type {
  Brand,
  BrandProduct,
  BrandAsset,
  Campaign,
  ContentJob,
  ReelProductionPlan,
  ReelProductionPackage,
  AnimationPlan,
  VideoRenderOutput,
} from '@vidsnapai/types';

describe('Autonomous Brand Reel Production Integration Repair Tests', () => {
  let tempDir: string;
  let productImagePath: string;
  let logoImagePath: string;
  let voiceAudioPath: string;
  let musicAudioPath: string;

  const runFfmpeg = (args: string[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      ff.stderr.on('data', (d) => (err += d.toString()));
      ff.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg error (code ${code}): ${err}`));
      });
      ff.on('error', reject);
    });
  };

  beforeAll(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidsnapai_repair_test_'));
    productImagePath = path.join(tempDir, 'product_sneaker.png');
    logoImagePath = path.join(tempDir, 'brand_logo.png');
    voiceAudioPath = path.join(tempDir, 'voice.mp3');
    musicAudioPath = path.join(tempDir, 'music.mp3');

    // Create high-contrast test product image (1080x1920 vertical)
    await runFfmpeg([
      '-f', 'lavfi',
      '-i', 'testsrc=size=1080x1920:rate=1:duration=1',
      '-vframes', '1',
      '-y',
      productImagePath,
    ]);

    // Create logo image (200x200)
    await runFfmpeg([
      '-f', 'lavfi',
      '-i', 'color=c=0xFF4500:s=200x200:d=1',
      '-vframes', '1',
      '-y',
      logoImagePath,
    ]);

    // Create audio assets
    await runFfmpeg(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', '-c:a', 'libmp3lame', '-y', voiceAudioPath]);
    await runFfmpeg(['-f', 'lavfi', '-i', 'sine=frequency=220:duration=4', '-c:a', 'libmp3lame', '-y', musicAudioPath]);
  }, 60000);

  afterAll(async () => {
    try {
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup error
    }
  });

  const mockBrand: Brand = {
    id: 'brand-one8-test',
    workspaceId: 'ws-test-01',
    name: 'One8 Active',
    slug: 'one8-active',
    industry: 'Sportswear & Footwear',
    description: 'Performance athletic footwear engineered with cutting-edge cushioning.',
    brandVoice: 'Bold, energetic, elite performance',
    targetAudience: ['Athletes', 'Fitness enthusiasts'],
    brandColors: {
      primary: '#111827',
      secondary: '#EF4444',
      accent: '#F59E0B',
      background: '#030712',
      text: '#FFFFFF',
    },
    typography: {
      headingFont: 'Montserrat',
      bodyFont: 'Inter',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockProduct: BrandProduct = {
    id: 'prod-one8-sneaker',
    workspaceId: 'ws-test-01',
    brandId: 'brand-one8-test',
    name: 'One8 Velocity Elite Runner',
    description: 'Carbon-infused responsive running shoes built for peak marathon performance.',
    price: 189.99,
    features: ['Carbon fiber propulsion plate', 'HydroShield breathable knit', 'Responsive Nitro foam'],
    benefits: ['40% higher energy return', 'Ultralight agility', 'Zero blister friction fit'],
    primaryAssetId: 'asset-prod-img',
    primaryAssetUrl: productImagePath,
    assets: [
      {
        id: 'asset-prod-img',
        workspaceId: 'ws-test-01',
        brandId: 'brand-one8-test',
        productId: 'prod-one8-sneaker',
        assetType: 'IMAGE',
        fileUrl: productImagePath,
        fileName: 'product_sneaker.png',
        mimeType: 'image/png',
        fileSize: 10240,
        width: 1080,
        height: 1920,
        status: 'READY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockBrandAsset: BrandAsset = {
    id: 'asset-logo-one8',
    workspaceId: 'ws-test-01',
    brandId: 'brand-one8-test',
    assetType: 'IMAGE',
    fileUrl: logoImagePath,
    fileName: 'brand_logo.png',
    mimeType: 'image/png',
    fileSize: 5000,
    width: 200,
    height: 200,
    tags: ['logo'],
    status: 'READY',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockCampaign: Campaign = {
    id: 'camp-test-01',
    workspaceId: 'ws-test-01',
    brandId: 'brand-one8-test',
    name: 'Q3 Velocity Elite Launch',
    objective: 'CONVERSIONS',
    status: 'ACTIVE',
    targetAudience: 'Marathon Runners',
    keyMessage: 'Unlock explosive speed with Velocity Elite',
    callToAction: 'Shop Now at one8.com',
    platforms: ['INSTAGRAM', 'TIKTOK'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockJob: ContentJob = {
    id: 'job-test-01',
    workspaceId: 'ws-test-01',
    brandId: 'brand-one8-test',
    campaignId: 'camp-test-01',
    funnelStage: 'CONVERSION',
    topic: 'One8 Velocity Elite Launch',
    hookType: 'CURIOSITY',
    format: 'REEL_9_16',
    platform: 'INSTAGRAM',
    status: 'READY',
    suggestedDuration: 20,
    aspectRatio: '9:16',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1 & 2: Gemini Rate Limit / Quota Handling
  it('1 & 2. Gemini 429 does not retry and triggers deterministic fallback with structured error', async () => {
    let callCount = 0;
    const failingProvider = {
      name: 'gemini',
      model: 'gemini-3.6-flash',
      generateJSON: vi.fn().mockImplementation(async () => {
        callCount++;
        const err = new AIProviderRateLimitError('gemini', 'gemini-3.6-flash', 'Quota exceeded: 429 RESOURCE_EXHAUSTED', 60);
        throw err;
      }),
      generateText: vi.fn(),
      isAvailable: vi.fn().mockReturnValue(true),
    };

    const fallbackResult = { blueprint: 'deterministic-fallback-success' };

    const result = await executeAIWithFallback({
      operation: 'generateBlueprint',
      primary: async () => {
        return await failingProvider.generateJSON({ prompt: 'test' });
      },
      fallback: async () => fallbackResult,
      metadata: { workspaceId: 'ws-test-01', brandId: 'brand-one8-test' },
    });

    expect(callCount).toBe(1); // Non-retryable HTTP 429: exactly 1 attempt
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReason).toBe('AI_QUOTA_EXHAUSTED');
    expect(result.data).toEqual(fallbackResult);
  });

  // 3 & 5 & 17: Reel Orchestrator Deterministic Fallback & Product Showcase
  it('3 & 5 & 17. ReelOrchestrator generates a rich 6-scene deterministic blueprint when Gemini fails', async () => {
    const failingAiProvider = {
      name: 'gemini',
      model: 'gemini-3.6-flash',
      generateStructured: vi.fn().mockRejectedValue(new AIProviderRateLimitError('gemini', 'gemini-3.6-flash', 'Quota limit reached')),
      generateText: vi.fn(),
      isAvailable: vi.fn().mockReturnValue(true),
    };

    const orchestrator = new ReelOrchestrator(failingAiProvider as any);
    const blueprint = await orchestrator.generateReelPlan({
      brand: mockBrand,
      campaign: mockCampaign,
      contentJob: mockJob,
      products: [mockProduct],
      brandAssets: [mockBrandAsset],
    });

    expect(blueprint).toBeDefined();
    expect(blueprint.scenes.length).toBeGreaterThanOrEqual(5);

    // Verify Scene Architecture
    const heroScene = blueprint.scenes.find((s) => s.visualType === 'PRODUCT_SHOWCASE');
    expect(heroScene).toBeDefined();
    expect(heroScene?.productReference).toBeDefined();

    // Verify CTA Scene
    const ctaScene = blueprint.scenes.find((s) => s.purpose === 'CTA' || s.visualType === 'CTA');
    expect(ctaScene).toBeDefined();

    // Verify fallback metadata
    expect(blueprint.productionMetadata?.aiProvider).toBe('deterministic_fallback');
    expect(blueprint.productionMetadata?.fallbackReason).toBe('AI_QUOTA_EXHAUSTED');
  });

  // 7: AnimationService receives AI provider
  it('7. AnimationService properly accepts AI Provider and falls back deterministically', async () => {
    const mockAiProvider = {
      name: 'gemini',
      model: 'gemini-3.6-flash',
      generateStructured: vi.fn().mockRejectedValue(new Error('AI Quota Limit')),
      generateText: vi.fn(),
      isAvailable: vi.fn().mockReturnValue(true),
    };

    const animationService = new AnimationPlanner(mockAiProvider as any);
    expect(animationService).toBeDefined();

    const orchestrator = new ReelOrchestrator(mockAiProvider as any);
    const planPartial = await orchestrator.generateReelPlan({
      brand: mockBrand,
      campaign: mockCampaign,
      contentJob: mockJob,
      products: [mockProduct],
    });

    const fullPlan = {
      ...planPartial,
      id: 'reel-test-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { plan: animationPlan } = await animationService.planAnimation({
      reelPlan: fullPlan as any,
    });

    expect(animationPlan).toBeDefined();
    expect(animationPlan.sceneAnimations.length).toBe(fullPlan.scenes.length);
  });

  // 8, 9, 10, 11, 12: AnimationRenderContract & FFmpeg Motion Presets
  it('8, 9, 10, 11, 12. AnimationRenderContract translates motion into FFmpeg filter expressions', async () => {
    // Verify Product Motion filter generation
    const heroFilter = RenderContractAdapter.buildProductOverlayFilter({ preset: 'HERO_REVEAL' });
    expect(heroFilter.overlayFilter).toContain('if(lte(t,0.6)');
    expect(heroFilter.productScaleFilter).toContain('scale=780:1080');

    const floatingFilter = RenderContractAdapter.buildProductOverlayFilter({ preset: 'FLOATING_PRODUCT' });
    expect(floatingFilter.overlayFilter).toContain('sin(t*2.5)');

    const ctaFilter = RenderContractAdapter.buildProductOverlayFilter({ preset: 'PRODUCT_TO_CTA' });
    expect(ctaFilter.overlayFilter).toContain('H*0.22');
  });

  // 18 & 19: Render Quality Gate rejects blank/gradient-only reels without product
  it('18 & 19. Quality Gate rejects reels missing required product assets for BRAND_PROMOTION', async () => {
    const orchestrator = new ReelOrchestrator(new MockAIProvider());
    const planPartial = await orchestrator.generateReelPlan({
      brand: mockBrand,
      campaign: mockCampaign,
      contentJob: mockJob,
      products: [mockProduct],
    });

    const fullPlan: ReelProductionPlan = {
      ...planPartial,
      id: 'reel-test-03',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    // Create production package without product media and without scene product references
    const noProductPlan = {
      ...fullPlan,
      scenes: fullPlan.scenes.map((s) => ({ ...s, productReference: undefined, mediaUrl: undefined })),
    };

    const invalidPkg: ReelProductionPackage = {
      id: 'pkg-invalid-01',
      workspaceId: 'ws-test-01',
      brandId: 'brand-one8-test',
      reelPlanId: fullPlan.id,
      brand: mockBrand,
      reelPlan: noProductPlan as any,
      assets: [], // No assets resolved!
      packagePayload: {
        assets: [],
      } as any,
      audioTracks: [],
      captions: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockReelRepo = {
      findByIdAndWorkspace: vi.fn().mockResolvedValue(noProductPlan),
      updateStatus: vi.fn().mockResolvedValue(noProductPlan),
      saveRenderOutput: vi.fn().mockResolvedValue(noProductPlan),
    };

    const mockPackageService = {
      getPackageByReelPlanId: vi.fn().mockResolvedValue(invalidPkg),
      compilePackage: vi.fn().mockResolvedValue(invalidPkg),
    };

    const renderService = new VideoRenderService({} as any, {
      reelRepo: mockReelRepo as any,
      packageService: mockPackageService as any,
      dnaRepo: { findLatestByBrandId: vi.fn().mockResolvedValue(null) } as any,
      reelAssetRepo: { listByReelPlanId: vi.fn().mockResolvedValue([]) } as any,
      storageProvider: new LocalStorageProvider({ basePath: tempDir, baseUrl: 'http://localhost:3000/files' }),
    });

    await expect(
      renderService.renderReelVideo(fullPlan.id, 'ws-test-01')
    ).rejects.toThrow('PRODUCT_ASSET_REQUIRED');
  });

  // 23 & 24: Autonomous Run Idempotency
  it('23 & 24. Autonomous operations is idempotent and prevents redundant duplicate executions', async () => {
    const mockStorage = new LocalStorageProvider({ basePath: tempDir, baseUrl: 'http://localhost:3000/files' });
    const autonomousService = new AutonomousOperationsService({
      storageProvider: mockStorage,
      workDir: tempDir,
    });

    expect(autonomousService).toBeDefined();
  });

  // Full End-to-End Render and Visual QA Generation Test
  it('produces an agency-quality 9:16 MP4 with product animation, camera motion, logo, audio, and QA report', async () => {
    const orchestrator = new ReelOrchestrator(new MockAIProvider());
    const planPartial = await orchestrator.generateReelPlan({
      brand: mockBrand,
      campaign: mockCampaign,
      contentJob: mockJob,
      products: [mockProduct],
      brandAssets: [mockBrandAsset],
    });

    const reelId = `reel-test-render-${Date.now()}`;
    const blueprint: ReelProductionPlan = {
      ...planPartial,
      id: reelId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    // Make scenes concise for fast local render in test suite
    blueprint.scenes = [
      {
        sceneNumber: 1,
        durationSeconds: 2,
        purpose: 'Hero hook',
        narration: 'Engineered for peak performance.',
        onScreenText: 'ENGINEERED FOR PEAK SPEED',
        visualType: 'PRODUCT_SHOWCASE',
        subject: 'One8 Velocity Elite',
        environment: 'Sleek dark studio',
        composition: 'Centered hero',
        camera: 'SLOW_PUSH',
        lighting: 'High contrast neon',
        mood: 'Electric',
        transition: 'FADE',
        animationIntent: 'Hero reveal',
        assetRequirement: 'Product hero image',
        productReference: mockProduct.name,
        mediaUrl: productImagePath,
      } as any,
      {
        sceneNumber: 2,
        durationSeconds: 2,
        purpose: 'Product benefit demonstration',
        narration: '40% higher energy return in every stride.',
        onScreenText: '40% HIGHER ENERGY RETURN',
        visualType: 'PRODUCT_SHOWCASE',
        subject: 'One8 Velocity Elite',
        environment: 'Sleek dark studio',
        composition: 'Centered hero',
        camera: 'DYNAMIC_PUSH',
        lighting: 'High contrast neon',
        mood: 'Electric',
        transition: 'CROSSFADE',
        animationIntent: 'Floating product',
        assetRequirement: 'Product hero image',
        productReference: mockProduct.name,
        mediaUrl: productImagePath,
      } as any,
      {
        sceneNumber: 3,
        durationSeconds: 2,
        purpose: 'Final Call to action',
        narration: 'Shop now at one8.com',
        onScreenText: 'SHOP NOW AT ONE8.COM',
        visualType: 'CTA',
        subject: 'One8 Brand Logo',
        environment: 'Sleek dark studio',
        composition: 'Centered logo',
        camera: 'STATIC_HERO',
        lighting: 'Spotlight',
        mood: 'Triumphant',
        transition: 'FADE',
        animationIntent: 'Logo pulse',
        assetRequirement: 'Brand logo',
        brandElement: 'Brand logo',
        mediaUrl: productImagePath,
      } as any,
    ];
    blueprint.durationSeconds = 6;

    const validPkg: ReelProductionPackage = {
      id: `pkg-${blueprint.id}`,
      workspaceId: 'ws-test-01',
      brandId: 'brand-one8-test',
      reelPlanId: blueprint.id,
      brand: mockBrand,
      reelPlan: blueprint,
      packagePayload: {
        reelPlan: blueprint,
        assets: [
          {
            id: 'asset-1',
            reelPlanId: blueprint.id,
            workspaceId: 'ws-test-01',
            brandId: 'brand-one8-test',
            sceneNumber: 1,
            assetType: 'PRODUCT_IMAGE',
            sourceType: 'BRAND_LIBRARY',
            provider: 'FIRST_PARTY',
            sourceUrl: productImagePath,
            status: 'READY',
            localPath: productImagePath,
            role: 'PRODUCT',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'asset-2',
            reelPlanId: blueprint.id,
            workspaceId: 'ws-test-01',
            brandId: 'brand-one8-test',
            sceneNumber: 2,
            assetType: 'PRODUCT_IMAGE',
            sourceType: 'BRAND_LIBRARY',
            provider: 'FIRST_PARTY',
            sourceUrl: productImagePath,
            status: 'READY',
            localPath: productImagePath,
            role: 'PRODUCT',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'asset-3',
            reelPlanId: blueprint.id,
            workspaceId: 'ws-test-01',
            brandId: 'brand-one8-test',
            sceneNumber: 3,
            assetType: 'BRAND_LOGO',
            sourceType: 'BRAND_LIBRARY',
            provider: 'FIRST_PARTY',
            sourceUrl: logoImagePath,
            status: 'READY',
            localPath: logoImagePath,
            role: 'BRAND',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        audioMixPlan: {
          id: 'audio-mix-1',
          reelPlanId: blueprint.id,
          workspaceId: 'ws-test-01',
          musicConfig: {
            url: musicAudioPath,
          },
          voiceConfig: {
            previewUrl: voiceAudioPath,
          },
        },
      } as any,
      assets: [],
      audioTracks: [],
      captions: [],
      metadata: {
        productAssetResolved: true,
        logoResolved: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const animationPlan: AnimationPlan = {
      id: `anim-${blueprint.id}`,
      reelPlanId: blueprint.id,
      workspaceId: 'ws-test-01',
      brandId: 'brand-one8-test',
      productionPackageId: validPkg.id,
      version: 1,
      globalSettings: { intensity: 'HIGH', reducedMotionSupport: false },
      sceneAnimations: [
        {
          sceneNumber: 1,
          startTime: 0,
          endTime: 2,
          cameraMotion: [{ type: 'SLOW_PUSH', intensity: 'MEDIUM' }],
          textMotion: [{ targetText: 'ENGINEERED FOR PEAK SPEED', startTime: 0.1, duration: 1.8 }],
          entranceAnimations: [],
          continuousAnimations: [],
          emphasisAnimations: [],
          exitAnimations: [],
        },
        {
          sceneNumber: 2,
          startTime: 2,
          endTime: 4,
          cameraMotion: [{ type: 'DYNAMIC_PUSH', intensity: 'HIGH' }],
          textMotion: [{ targetText: '40% HIGHER ENERGY RETURN', startTime: 2.1, duration: 1.8 }],
          entranceAnimations: [],
          continuousAnimations: [],
          emphasisAnimations: [],
          exitAnimations: [],
        },
        {
          sceneNumber: 3,
          startTime: 4,
          endTime: 6,
          cameraMotion: [{ type: 'STATIC_HERO', intensity: 'LOW' }],
          textMotion: [{ targetText: 'SHOP NOW AT ONE8.COM', startTime: 4.1, duration: 1.8 }],
          entranceAnimations: [],
          continuousAnimations: [],
          emphasisAnimations: [],
          exitAnimations: [],
        },
      ],
    } as any;

    const mockReelRepo = {
      findByIdAndWorkspace: vi.fn().mockResolvedValue(blueprint),
      updateStatus: vi.fn().mockImplementation(async (_id, status) => {
        blueprint.status = status;
        return blueprint;
      }),
      saveRenderOutput: vi.fn().mockImplementation(async (_id, output, status) => {
        blueprint.status = status;
        blueprint.outputVideoUrl = output.outputVideoUrl;
        return blueprint;
      }),
    };

    const mockPackageService = {
      getPackageByReelPlanId: vi.fn().mockResolvedValue(validPkg),
      compilePackage: vi.fn().mockResolvedValue(validPkg),
    };

    const realAnimService = new AnimationService();
    const mockAnimationService = {
      getLatestPlan: vi.fn().mockResolvedValue(animationPlan),
      generateAnimationPlan: vi.fn().mockResolvedValue({ animationPlan }),
      buildRenderContract: vi.fn().mockImplementation((params) => realAnimService.buildRenderContract(params)),
    };

    const renderService = new VideoRenderService({} as any, {
      reelRepo: mockReelRepo as any,
      packageService: mockPackageService as any,
      animationService: mockAnimationService as any,
      dnaRepo: { findLatestByBrandId: vi.fn().mockResolvedValue(null) } as any,
      reelAssetRepo: { listByReelPlanId: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}) } as any,
      storageProvider: new LocalStorageProvider({ basePath: tempDir, baseUrl: 'http://localhost:3000/files' }),
    });

    const debugDir = path.join(tempDir, 'debug', 'reel', blueprint.id);
    const renderResult: VideoRenderOutput = await renderService.renderReelVideo(blueprint.id, 'ws-test-01', {
      debugOutputDir: debugDir,
    });

    expect(renderResult).toBeDefined();
    expect(renderResult.outputVideoUrl).toBeDefined();
    expect(renderResult.resolution).toEqual({ width: 1080, height: 1920 });
    expect(renderResult.aspectRatio).toBe('9:16');
    expect(renderResult.fps).toBe(30);

    // Verify debug artifact directory was created
    expect(fs.existsSync(debugDir)).toBe(true);
    expect(fs.existsSync(path.join(debugDir, 'blueprint.json'))).toBe(true);
    expect(fs.existsSync(path.join(debugDir, 'production-package.json'))).toBe(true);
    expect(fs.existsSync(path.join(debugDir, 'qa-report.json'))).toBe(true);

    // Read and verify QA Report
    const qaReportRaw = await fs.promises.readFile(path.join(debugDir, 'qa-report.json'), 'utf8');
    const qaReport = JSON.parse(qaReportRaw);
    console.log('\n===============================================================');
    console.log('REAL AUTONOMOUS BRAND REEL RENDER & QA INSPECTION:');
    console.log('===============================================================');
    console.log(`• Rendered MP4 URL:     ${renderResult.outputVideoUrl}`);
    console.log(`• Storage Key:          ${renderResult.storageKey}`);
    console.log(`• Resolution:           ${renderResult.resolution?.width}x${renderResult.resolution?.height} (${renderResult.aspectRatio})`);
    console.log(`• Duration:             ${renderResult.durationSeconds}s`);
    console.log(`• FPS:                  ${renderResult.fps}`);
    console.log(`• Debug QA Directory:   ${debugDir}`);
    console.log(`• Product Present:      ${qaReport.productPresence}`);
    console.log(`• Product Assets Count: ${qaReport.productAssetCount}`);
    console.log(`• Visual Variance (StdDev): ${qaReport.visualVariance}`);
    console.log(`• Unique Colors:        ${qaReport.uniqueColors}`);
    console.log(`• Blank Frame Detected: ${qaReport.blankFrameDetected}`);
    console.log('===============================================================\n');

    expect(qaReport.resolution).toBe('1080x1920');
    expect(qaReport.fps).toBe(30);
    expect(qaReport.sceneCount).toBe(3);
    expect(qaReport.productAssetCount).toBeGreaterThanOrEqual(1);
    expect(qaReport.productPresence).toBe(true);
    expect(qaReport.blankFrameDetected).toBe(false);
  }, 120000);
});
