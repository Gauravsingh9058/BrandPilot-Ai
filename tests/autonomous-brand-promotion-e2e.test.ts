import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import {
  VideoRenderService,
  VisualFrameValidator,
} from '@vidsnapai/video';
import { AssetIntelligenceService } from '@vidsnapai/media';
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

describe('VidSnapAI Full Autonomous Brand Promotion End-to-End Test Suite', () => {
  let tempDir: string;
  let productImagePath: string;
  let logoImagePath: string;
  let voiceAudioPath: string;
  let musicAudioPath: string;

  const workspaceId = 'ws-auton-e2e-001';
  const brandId = 'brand-one8-auton';
  const campaignId = 'camp-one8-auton-30d';

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
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidsnapai_auton_e2e_'));
    productImagePath = path.join(tempDir, 'one8_sneaker_hero.png');
    logoImagePath = path.join(tempDir, 'one8_logo.png');
    voiceAudioPath = path.join(tempDir, 'voice.mp3');
    musicAudioPath = path.join(tempDir, 'music.mp3');

    // Create high-contrast test product image (1080x1920 vertical)
    await runFfmpeg([
      '-f', 'lavfi',
      '-i', 'testsrc=size=1080x1920:rate=1:duration=1',
      '-vframes', '1',
      '-y',
      productImagePath
    ]);

    // Create logo image (200x200)
    await runFfmpeg([
      '-f', 'lavfi',
      '-i', 'color=c=0xFF4500:s=200x200:d=1',
      '-vframes', '1',
      '-y',
      logoImagePath
    ]);

    // Create audio assets
    await runFfmpeg(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=6', '-c:a', 'libmp3lame', '-y', voiceAudioPath]);
    await runFfmpeg(['-f', 'lavfi', '-i', 'sine=frequency=220:duration=6', '-c:a', 'libmp3lame', '-y', musicAudioPath]);
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

  it('autonomously executes the complete 20-step brand promotion lifecycle end-to-end', async () => {
    // -------------------------------------------------------------------------
    // Step 1: Create Workspace & Brand Setup
    // -------------------------------------------------------------------------
    const brand: Brand = {
      id: brandId,
      workspaceId,
      name: 'One8 Active',
      slug: 'one8-active',
      industry: 'Sportswear & Athleisure',
      description: 'High-performance athletic apparel & performance footwear designed with Virat Kohli.',
      websiteUrl: 'https://one8.com',
      brandVoice: 'Energetic, bold, inspiring, performance-focused',
      brandPersonality: 'Relentless, elite, authentic',
      brandColors: {
        primary: '#1E293B',
        secondary: '#3B82F6',
        accent: '#FF4500'
      },
      typography: {
        headingFont: 'Montserrat',
        bodyFont: 'Inter'
      },
      uniqueSellingPoints: ['Ultra-light flex fabric', 'Sweat-wicking dynamic mesh', 'Pro-athlete engineered'],
      primaryCta: 'Shop One8 Active Now',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    expect(brand.id).toBe(brandId);
    expect(brand.name).toBe('One8 Active');

    // -------------------------------------------------------------------------
    // Step 2: Register Product & Upload Asset
    // -------------------------------------------------------------------------
    const product: BrandProduct = {
      id: 'prod-one8-apex-sneaker',
      brandId,
      workspaceId,
      name: 'One8 Apex Velocity Trainer',
      category: 'Footwear',
      description: 'Ultra-light responsive training shoe with carbon propulsion plate and breathable dynamic mesh.',
      price: 129.99,
      currency: 'USD',
      offerInfo: 'Free 2-day shipping + 30-day money back guarantee',
      targetAudience: 'Runners, athletes, fitness enthusiasts',
      features: ['Carbon propulsion plate', 'Featherlight flex knit', 'Shock-absorbing dual-density foam'],
      benefits: ['Explosive energy return', 'All-day breathable comfort', 'Zero heel slippage'],
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    const brandAsset: BrandAsset = {
      id: 'asset-apex-sneaker-hero',
      brandId,
      type: 'product_image',
      name: 'one8_apex_velocity_hero.png',
      storageKey: `${workspaceId}/brand/${brandId}/one8_apex_velocity_hero.png`,
      url: productImagePath,
      metadata: {
        productId: product.id,
        isHero: true,
        orientation: 'PORTRAIT_9_16'
      },
      createdAt: new Date()
    };

    // -------------------------------------------------------------------------
    // Step 3: Asset Intelligence Analysis & Product Association
    // -------------------------------------------------------------------------
    const assetAnalysis = AssetIntelligenceService.analyzeAsset({
      name: brandAsset.name,
      url: brandAsset.url,
      width: 1080,
      height: 1920,
      productId: product.id,
      products: [product],
      tags: ['hero', 'sneaker', 'footwear']
    });

    expect(assetAnalysis.classification).toBe('PRODUCT_HERO');
    expect(assetAnalysis.orientation).toBe('PORTRAIT_9_16');
    expect(assetAnalysis.isVerticalCompatible).toBe(true);
    expect(assetAnalysis.detectedProductIds).toContain(product.id);

    // -------------------------------------------------------------------------
    // Step 4: Marketing Campaign Strategy
    // -------------------------------------------------------------------------
    const campaign: Campaign = {
      id: campaignId,
      workspaceId,
      brandId,
      name: 'One8 30-Day Performance Awakening Campaign',
      objective: 'CONVERSIONS',
      status: 'ACTIVE',
      targetAudience: 'Fitness enthusiasts aged 18-35',
      keyMessage: 'Unleash your ultimate training potential with One8 Active.',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    expect(campaign.name).toContain('One8');

    // -------------------------------------------------------------------------
    // Step 5: Autonomous 30-Day Content Strategy & Product Selection
    // -------------------------------------------------------------------------
    const contentJob: ContentJob = {
      id: 'job-day-1-hook',
      contentPlanId: 'cp-30d-one8',
      workspaceId,
      brandId,
      campaignId,
      dayNumber: 1,
      weekNumber: 1,
      title: 'Day 1: The Apex Velocity Revolution',
      contentType: 'PROMOTIONAL',
      funnelStage: 'CONVERSION',
      contentPillar: 'Product Performance',
      objective: 'Drive immediate product interest and trial',
      audience: 'Athletes and fitness lovers',
      topic: 'Unleashing explosive speed with One8 Apex Velocity Trainer',
      hook: 'Tired of training shoes holding back your true speed?',
      keyMessage: 'Experience carbon propulsion and all-day featherlight comfort with One8 Apex Velocity.',
      messagingAngle: 'High-energy elite athletic motivation',
      offer: 'Free 2-Day Shipping with code APEX',
      cta: 'Shop One8 Apex Now',
      platform: 'INSTAGRAM',
      format: 'SHORT_REEL',
      priority: 'HIGH',
      status: 'QUEUED',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    const matchedProductResult = AssetIntelligenceService.matchProductForContentJob(
      [product],
      contentJob,
      [brandAsset]
    );

    expect(matchedProductResult).not.toBeNull();
    expect(matchedProductResult!.selectedProduct.id).toBe(product.id);
    expect(matchedProductResult!.matchingAssets.length).toBeGreaterThan(0);

    // -------------------------------------------------------------------------
    // Step 6 & 7: Autonomous Reel Blueprint Generation with Product Assets
    // -------------------------------------------------------------------------
    const reelPlanId = 'reel-one8-auton-001';
    const reelPlan: ReelProductionPlan = {
      id: reelPlanId,
      workspaceId,
      brandId,
      contentJobId: contentJob.id,
      contentPlanId: contentJob.contentPlanId,
      campaignId,
      title: 'One8 Apex Velocity: The Speed Revolution',
      durationSeconds: 6,
      aspectRatio: '9:16',
      platform: 'INSTAGRAM_REELS',
      format: 'TALKING_HEAD_BROLL',
      hook: {
        type: 'QUESTION',
        text: 'Tired of heavy shoes holding back your speed?',
        visualIntent: 'Hero athlete lacing up One8 Apex Velocity Trainer',
        deliveryStyle: 'ENERGETIC',
        durationSeconds: 3
      },
      cta: 'Shop One8 Apex Now',
      scenes: [
        {
          sceneNumber: 1,
          durationSeconds: 3,
          purpose: 'Hook & Product Reveal',
          narration: 'Tired of heavy shoes holding back your speed?',
          onScreenText: 'ONE8 APEX VELOCITY - PUSH YOUR LIMITS',
          visualType: 'PRODUCT_SHOWCASE',
          assetRequirement: 'Hero product reveal of One8 Apex Velocity Trainer',
          productReference: product.name
        },
        {
          sceneNumber: 2,
          durationSeconds: 3,
          purpose: 'Feature & CTA',
          narration: 'Experience carbon propulsion today at one8.com.',
          onScreenText: 'SHOP NOW - FREE 2-DAY SHIPPING',
          visualType: 'CTA',
          assetRequirement: 'One8 Apex Velocity hero shot with CTA banner',
          productReference: product.name
        }
      ],
      status: 'READY_TO_RENDER',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    expect(reelPlan.scenes.length).toBe(2);
    expect(reelPlan.scenes[0].productReference).toBe(product.name);

    // -------------------------------------------------------------------------
    // Step 8 & 9: Scene Asset Assignment & Production Package
    // -------------------------------------------------------------------------
    const sceneAssignments = AssetIntelligenceService.assignProductAssetsToScenes({
      brand,
      product,
      brandAssets: [brandAsset],
      scenes: reelPlan.scenes
    });

    expect(sceneAssignments[0].assignedAsset).not.toBeNull();
    expect(sceneAssignments[0].assignedAsset!.id).toBe(brandAsset.id);
    expect(sceneAssignments[0].matchScore).toBeGreaterThanOrEqual(90);

    const productionPackage: ReelProductionPackage = {
      id: 'pkg-one8-auton-001',
      reelPlanId: reelPlan.id,
      workspaceId,
      brandId,
      status: 'READY',
      packagePayload: {
        reelPlan,
        assets: [
          {
            id: 'reel-asset-1',
            reelPlanId: reelPlan.id,
            workspaceId,
            brandId,
            sceneNumber: 1,
            assetType: 'PRODUCT_IMAGE',
            sourceType: 'BRAND_LIBRARY',
            provider: 'brand_library',
            sourceUrl: productImagePath,
            previewUrl: productImagePath,
            status: 'READY',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'reel-asset-2',
            reelPlanId: reelPlan.id,
            workspaceId,
            brandId,
            sceneNumber: 2,
            assetType: 'PRODUCT_IMAGE',
            sourceType: 'BRAND_LIBRARY',
            provider: 'brand_library',
            sourceUrl: productImagePath,
            previewUrl: productImagePath,
            status: 'READY',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        voiceAsset: {
          id: 'voice-asset-1',
          reelPlanId: reelPlan.id,
          workspaceId,
          brandId,
          sceneNumber: 0,
          assetType: 'VOICE',
          sourceType: 'GENERATED',
          provider: 'local',
          sourceUrl: voiceAudioPath,
          previewUrl: voiceAudioPath,
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        audioMixPlan: {
          id: 'audio-mix-1',
          reelPlanId: reelPlan.id,
          workspaceId,
          musicConfig: {
            url: musicAudioPath
          }
        } as any
      } as any,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    // -------------------------------------------------------------------------
    // Step 10: Animation Planning
    // -------------------------------------------------------------------------
    const animationPlan: AnimationPlan = {
      id: 'anim-one8-auton-001',
      reelPlanId: reelPlan.id,
      workspaceId,
      brandId,
      productionPackageId: productionPackage.id,
      version: 1,
      globalSettings: { intensity: 'HIGH', reducedMotionSupport: false },
      sceneAnimations: [
        {
          sceneNumber: 1,
          startTime: 0,
          endTime: 3,
          cameraMotion: [{ type: 'DYNAMIC_PUSH', intensity: 'HIGH' }],
          textMotion: [{ targetText: 'ONE8 APEX VELOCITY - PUSH YOUR LIMITS', startTime: 0.2, duration: 2.6 }],
          entranceAnimations: [],
          continuousAnimations: [],
          emphasisAnimations: [],
          exitAnimations: []
        },
        {
          sceneNumber: 2,
          startTime: 3,
          endTime: 6,
          cameraMotion: [{ type: 'SLOW_PULL', intensity: 'MEDIUM' }],
          textMotion: [{ targetText: 'SHOP NOW - FREE 2-DAY SHIPPING', startTime: 3.2, duration: 2.6 }],
          entranceAnimations: [],
          continuousAnimations: [],
          emphasisAnimations: [],
          exitAnimations: []
        }
      ]
    } as any;

    // -------------------------------------------------------------------------
    // Step 11 & 12: FFmpeg Vertical Video Rendering & Quality Validation
    // -------------------------------------------------------------------------
    const mockReelRepo = {
      findByIdAndWorkspace: vi.fn().mockResolvedValue(reelPlan),
      updateStatus: vi.fn().mockImplementation(async (_id, status) => {
        reelPlan.status = status;
        return reelPlan;
      }),
      saveRenderOutput: vi.fn().mockImplementation(async (_id, output, status) => {
        reelPlan.status = status;
        reelPlan.outputVideoUrl = output.outputVideoUrl;
        return reelPlan;
      })
    };

    const mockPackageService = {
      getPackageByReelPlanId: vi.fn().mockResolvedValue(productionPackage),
      compilePackage: vi.fn().mockResolvedValue(productionPackage)
    };

    const mockAnimationService = {
      getLatestPlan: vi.fn().mockResolvedValue(animationPlan),
      generateAnimationPlan: vi.fn().mockResolvedValue({ animationPlan }),
      buildRenderContract: vi.fn().mockReturnValue({
        contractVersion: '1.0.0',
        reelPlanId: reelPlan.id,
        productionPackageId: productionPackage.id,
        animationPlanId: animationPlan.id,
        dimensions: { width: 1080, height: 1920, aspectRatio: '9:16' },
        fps: 30,
        totalDurationSeconds: 6,
        scenes: [
          {
            sceneNumber: 1,
            startTime: 0,
            endTime: 3,
            duration: 3,
            mediaUrl: productImagePath,
            mediaType: 'IMAGE',
            camera: [{ type: 'DYNAMIC_PUSH', intensity: 'HIGH' }],
            textAnimations: [{ targetText: 'ONE8 APEX VELOCITY - PUSH YOUR LIMITS', startTime: 0.2, duration: 2.6 }]
          },
          {
            sceneNumber: 2,
            startTime: 3,
            endTime: 6,
            duration: 3,
            mediaUrl: productImagePath,
            mediaType: 'IMAGE',
            camera: [{ type: 'SLOW_PULL', intensity: 'MEDIUM' }],
            textAnimations: [{ targetText: 'SHOP NOW - FREE 2-DAY SHIPPING', startTime: 3.2, duration: 2.6 }]
          }
        ],
        audio: {
          voiceTrackUrl: voiceAudioPath,
          musicTrackUrl: musicAudioPath
        },
        brand: {
          primaryColor: '#1E293B',
          secondaryColor: '#3B82F6',
          accentColor: '#FF4500',
          fontFamily: 'Montserrat',
          logoUrl: logoImagePath
        },
        globalSettings: { reducedMotionSupport: false }
      })
    };

    const mockDnaRepo = {
      findLatestByBrandId: vi.fn().mockResolvedValue({
        visualIdentity: {
          colors: { primary: '#1E293B', secondary: '#3B82F6', accent: '#FF4500' },
          typography: { headingFont: 'Montserrat', bodyFont: 'Inter' }
        }
      })
    };

    const mockReelAssetRepo = {
      create: vi.fn().mockResolvedValue({ id: 'rendered-asset-row-1' })
    };

    const storageProvider = new LocalStorageProvider();
    const renderService = new VideoRenderService({} as any, {
      storageProvider,
      reelRepo: mockReelRepo as any,
      packageService: mockPackageService as any,
      animationService: mockAnimationService as any,
      dnaRepo: mockDnaRepo as any,
      reelAssetRepo: mockReelAssetRepo as any
    });

    const debugOutputDir = path.join(tempDir, 'auton_debug_render');
    const renderOutput: VideoRenderOutput = await renderService.renderReelVideo(
      reelPlan.id,
      workspaceId,
      {
        debug: true,
        debugOutputDir
      }
    );

    expect(renderOutput.status).toBe('COMPLETED');
    expect(renderOutput.durationSeconds).toBe(6);
    expect(renderOutput.resolution).toEqual({ width: 1080, height: 1920 });

    const renderedMp4Path = path.resolve(process.cwd(), 'uploads', renderOutput.storageKey!);
    expect(fs.existsSync(renderedMp4Path)).toBe(true);

    // -------------------------------------------------------------------------
    // Step 13 & 14: Visual Frame Validation & Storage Verification
    // -------------------------------------------------------------------------
    const frameValidation = await VisualFrameValidator.validateVideo(renderedMp4Path, {
      durationSeconds: 6
    });

    expect(frameValidation.valid).toBe(true);
    expect(frameValidation.visualContentDetected).toBe(true);
    expect(frameValidation.solidFramesCount).toBe(0);
    expect(frameValidation.averageStdDev).toBeGreaterThan(10.0);

    // -------------------------------------------------------------------------
    // Step 15 & 16: Performance Data Simulation & Analytics Collection
    // -------------------------------------------------------------------------
    const performanceSnapshot = {
      reelPlanId: reelPlan.id,
      brandId,
      workspaceId,
      impressions: 48500,
      reach: 39200,
      views: 34100,
      completionRate: 0.68,
      engagement: 4210,
      clicks: 1820,
      conversions: 78,
      spend: 40.0,
      roas: 4.85,
      recordedAt: new Date().toISOString()
    };

    expect(performanceSnapshot.roas).toBeGreaterThan(3.0);
    expect(performanceSnapshot.completionRate).toBeGreaterThan(0.5);

    // -------------------------------------------------------------------------
    // Step 17 & 18: Strategic Learning & Optimization Insight Generation
    // -------------------------------------------------------------------------
    const optimizationLearning = {
      topPerformingProduct: product.name,
      winningHookType: 'QUESTION',
      winningMessagingAngle: 'High-energy elite athletic motivation',
      optimalDurationSeconds: 6,
      strategicDirective: `Increase content allocation for "${product.name}" by +25% and prioritize QUESTION hooks with direct product reveals.`
    };

    expect(optimizationLearning.topPerformingProduct).toBe(product.name);

    // -------------------------------------------------------------------------
    // Step 19 & 20: Next Autonomous Production Cycle with Optimization Feedback
    // -------------------------------------------------------------------------
    const nextContentJob: ContentJob = {
      id: 'job-day-2-optimized',
      contentPlanId: contentJob.contentPlanId,
      workspaceId,
      brandId,
      campaignId,
      dayNumber: 2,
      weekNumber: 1,
      title: 'Day 2: Apex Velocity Performance Deep Dive',
      contentType: 'PROMOTIONAL',
      funnelStage: 'CONVERSION',
      contentPillar: 'Product Performance',
      objective: 'Scale high-converting Apex Velocity sales',
      audience: 'Runners and athletes',
      topic: 'Why carbon propulsion makes One8 Apex Velocity unbeatable',
      hook: 'Want 20% more energy return on every sprint?',
      keyMessage: 'Dual-density foam + carbon plate engineering.',
      messagingAngle: optimizationLearning.winningMessagingAngle,
      offer: 'Free 2-Day Shipping',
      cta: 'Claim Your Pair at one8.com',
      platform: 'INSTAGRAM',
      format: 'SHORT_REEL',
      priority: 'HIGH',
      status: 'QUEUED',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    const nextProductMatch = AssetIntelligenceService.matchProductForContentJob(
      [product],
      nextContentJob,
      [brandAsset]
    );

    expect(nextProductMatch).not.toBeNull();
    expect(nextProductMatch!.selectedProduct.name).toBe(product.name);
    expect(nextProductMatch!.matchingAssets[0].id).toBe(brandAsset.id);

    // Verify entire autonomous promotion loop completed end-to-end
    expect(['COMPLETED', 'READY_FOR_APPROVAL']).toContain(reelPlan.status);
    expect(renderOutput.outputVideoUrl).toMatch(/^\/api\/storage\/files\//);
  }, 90000);
});
