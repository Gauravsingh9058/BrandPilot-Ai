import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
  ReelProductionPlan,
  ReelProductionPackage,
  ReelAsset,
  AnimationPlan,
  SceneAnimation,
  VideoRenderOutput
} from '@vidsnapai/types';

describe('VidSnapAI Reel Rendering & Motion Graphics Suite', () => {
  let tempDir: string;
  let productImagePath: string;
  let logoImagePath: string;
  let voiceAudioPath: string;
  let musicAudioPath: string;

  const workspaceId = 'ws-motion-qa-001';
  const brandId = 'brand-one8-motion';

  const brand: Brand = {
    id: brandId,
    workspaceId,
    name: 'One8 Activewear',
    slug: 'one8-activewear',
    websiteUrl: 'https://one8.com',
    industry: 'Athletic Apparel & Footwear',
    description: 'Performance athletic wear founded by Virat Kohli.',
    brandVoice: 'Dynamic, High-Energy, Premium',
    brandColors: {
      primary: '#0F172A',
      secondary: '#E11D48',
      accent: '#F59E0B'
    },
    typography: {
      primaryFont: 'Inter, sans-serif'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const product: BrandProduct = {
    id: 'prod-one8-sneaker-01',
    brandId,
    name: 'One8 Velocity Pro Sneaker',
    description: 'Ultra-lightweight responsive cushioning engineered for peak speed.',
    category: 'Footwear',
    price: 129.99,
    currency: 'USD',
    features: ['Featherweight mesh', 'Carbon-fiber propulsion', 'Responsive foam'],
    benefits: ['Explosive acceleration', 'All-day comfort', 'Premium street style'],
    targetAudience: 'Athletes, Runners, Urban Trendsetters',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeAll(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidsnapai_motion_test_'));
    productImagePath = path.join(tempDir, 'product_sneaker.png');
    logoImagePath = path.join(tempDir, 'brand_logo.png');
    voiceAudioPath = path.join(tempDir, 'voice.mp3');
    musicAudioPath = path.join(tempDir, 'music.mp3');

    // 1. Generate crisp textured product image
    await new Promise<void>((resolve, reject) => {
      const args = [
        '-f', 'lavfi',
        '-i', 'color=c=0x0F172A:s=800x800:d=1',
        '-vf', 'drawtext=text=ONE8 SNEAKER:fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2',
        '-vframes', '1',
        '-y',
        productImagePath
      ];
      const proc = spawn('ffmpeg', args, { windowsHide: true });
      proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Failed product gen, code ${code}`))));
    });

    // 2. Generate logo image
    await new Promise<void>((resolve, reject) => {
      const args = [
        '-f', 'lavfi',
        '-i', 'color=c=0xE11D48:s=400x120:d=1',
        '-vf', 'drawtext=text=ONE8:fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2',
        '-vframes', '1',
        '-y',
        logoImagePath
      ];
      const proc = spawn('ffmpeg', args, { windowsHide: true });
      proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Failed logo gen, code ${code}`))));
    });

    // 3. Generate silent/sine audio tracks
    await new Promise<void>((resolve, reject) => {
      const args = ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', '-c:a', 'mp3', '-y', voiceAudioPath];
      const proc = spawn('ffmpeg', args, { windowsHide: true });
      proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Failed voice gen, code ${code}`))));
    });

    await new Promise<void>((resolve, reject) => {
      const args = ['-f', 'lavfi', '-i', 'sine=frequency=220:duration=4', '-c:a', 'mp3', '-y', musicAudioPath];
      const proc = spawn('ffmpeg', args, { windowsHide: true });
      proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Failed music gen, code ${code}`))));
    });
  });

  afterAll(async () => {
    try {
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup errors on locked temporary files
    }
  });

  it('1. Product Asset Intelligence classifies asset and orientation', async () => {
    const analysis = await AssetIntelligenceService.analyzeAsset({
      name: 'One8 Velocity Pro Sneaker Studio Shot',
      url: productImagePath,
      productId: product.id,
      width: 800,
      height: 800
    });

    expect(analysis).toBeDefined();
    expect(analysis.aspectRatio).toBe('1:1');
    expect(analysis.classification).toBe('PRODUCT_IMAGE');
    expect(analysis.productId).toBe(product.id);
  });

  it('2. Enforces PRODUCT_ASSET_REQUIRED when no product asset is provided', async () => {
    const emptyReel: ReelProductionPlan = {
      id: 'reel-empty-001',
      contentJobId: 'job-empty-001',
      brandId,
      contentPlanId: 'plan-empty-001',
      workspaceId,
      version: 1,
      title: 'Empty Product Reel',
      concept: {
        title: 'Empty',
        concept: 'Empty',
        objective: 'Test',
        targetAudience: 'All',
        corePromise: 'None',
        emotionalAngle: 'None',
        messagingAngle: 'None',
        contentPillar: 'Product',
        funnelStage: 'AWARENESS'
      },
      objective: 'AWARENESS',
      audience: 'All',
      funnelStage: 'AWARENESS',
      contentPillar: 'Product',
      durationSeconds: 4,
      aspectRatio: '9:16',
      platform: 'INSTAGRAM',
      format: 'REEL',
      hook: { type: 'STATEMENT', text: 'Hook without product', visualIntent: 'text', deliveryStyle: 'fast', durationSeconds: 2 },
      narrative: 'None',
      script: [],
      scenes: [],
      visualDirection: {} as any,
      voiceDirection: {} as any,
      captionDirection: {} as any,
      animationDirection: {} as any,
      audioDirection: {} as any,
      cta: { type: 'SHOP_NOW', text: 'Shop Now', visualTreatment: 'button', placement: 'bottom' },
      productionMetadata: {} as any,
      status: 'QUEUED',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const emptyPackage: ReelProductionPackage = {
      id: 'pkg-empty-001',
      reelPlanId: 'reel-empty-001',
      workspaceId,
      brandId,
      readiness: { isReady: false, blockers: [] } as any,
      status: 'COMPILED',
      packagePayload: {
        reelPlan: emptyReel,
        assets: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockDb: any = {};
    const mockReelRepo: any = {
      findByIdAndWorkspace: async () => emptyReel,
      updateStatus: async () => {},
      saveRenderOutput: async () => {}
    };
    const mockPkgService: any = {
      getPackageByReelPlanId: async () => emptyPackage,
      compilePackage: async () => emptyPackage
    };

    const renderService = new VideoRenderService(mockDb, {
      reelRepo: mockReelRepo,
      packageService: mockPkgService
    });

    await expect(
      renderService.renderReelVideo('reel-empty-001', workspaceId)
    ).rejects.toThrow('PRODUCT_ASSET_REQUIRED');
  });

  it('3. Renders multi-scene motion graphics reel with ambient backdrop, product hero, logo, and CTA', async () => {
    const reelPlan: ReelProductionPlan = {
      id: 'reel-motion-001',
      contentJobId: 'job-motion-001',
      brandId,
      contentPlanId: 'plan-motion-001',
      workspaceId,
      version: 1,
      title: 'One8 Velocity Pro Launch Reel',
      concept: {
        title: 'Velocity Pro Launch',
        concept: 'High-energy sneaker showcase',
        objective: 'CONVERSION',
        targetAudience: 'Athletes & Runners',
        corePromise: 'Unstoppable propulsion',
        emotionalAngle: 'Empowerment',
        messagingAngle: 'Speed & Tech',
        contentPillar: 'Product Showcase',
        funnelStage: 'CONVERSION'
      },
      objective: 'CONVERSION',
      audience: 'Athletes',
      funnelStage: 'CONVERSION',
      contentPillar: 'Product Showcase',
      durationSeconds: 4,
      aspectRatio: '9:16',
      platform: 'INSTAGRAM',
      format: 'REEL',
      hook: {
        type: 'STATEMENT',
        text: 'Engineered for Pure Speed',
        visualIntent: 'Hook with product reveal',
        deliveryStyle: 'Energetic',
        durationSeconds: 2
      },
      narrative: 'Showcase revolutionary carbon propulsion',
      script: [
        { id: 's1', purpose: 'Hook', text: 'Engineered for Pure Speed', estimatedDuration: 2, deliveryStyle: 'Bold', emotionalTone: 'Excited' },
        { id: 's2', purpose: 'CTA', text: 'Get Yours Today at one8.com', estimatedDuration: 2, deliveryStyle: 'Decisive', emotionalTone: 'Action' }
      ],
      scenes: [
        {
          sceneNumber: 1,
          durationSeconds: 2,
          purpose: 'Hook & Reveal',
          narration: 'Engineered for Pure Speed',
          onScreenText: 'Engineered for Pure Speed',
          visualType: 'PRODUCT_SHOWCASE',
          subject: 'Velocity Pro Sneaker',
          environment: 'Studio',
          composition: 'Hero Center',
          camera: 'SLOW_PUSH',
          lighting: 'Spotlight',
          mood: 'High Energy',
          transition: 'CROSSFADE',
          animationIntent: 'Hero Reveal',
          assetRequirement: 'Product Image',
          productReference: product.id,
          background: { type: 'AMBIENT_BLUR' },
          product: { visible: true, animationPreset: 'CINEMATIC_PUSH_IN' }
        },
        {
          sceneNumber: 2,
          durationSeconds: 2,
          purpose: 'CTA End Card',
          narration: 'Get Yours Today',
          onScreenText: 'SHOP NOW • ONE8.COM',
          visualType: 'CTA',
          subject: 'Logo & Sneaker',
          environment: 'Studio',
          composition: 'Product Top, CTA Bottom',
          camera: 'STATIC',
          lighting: 'Clean Studio',
          mood: 'Decisive',
          transition: 'CUT',
          animationIntent: 'CTA Pulse',
          assetRequirement: 'Logo & Product',
          productReference: product.id,
          background: { type: 'AMBIENT_BLUR' },
          product: { visible: true, animationPreset: 'PRODUCT_TO_CTA' }
        }
      ],
      visualDirection: {
        style: 'Dynamic Commercial',
        mood: 'High Energy',
        colorIntent: '#0F172A primary with #E11D48 accent',
        lightingIntent: 'Sharp spotlight',
        composition: 'Vertical 9:16 safe zones',
        cameraLanguage: 'Fluid motions',
        pacing: 'Rapid',
        visualHierarchy: 'Product 1st, text 2nd, logo 3rd',
        brandIntegration: 'One8 logo overlay',
        productEmphasis: 'Max visibility'
      },
      voiceDirection: { style: 'Energetic', pace: 'Fast', tone: 'Confident' },
      captionDirection: { style: 'Pop', placement: 'Center-bottom', density: 'Low', fontEmphasis: 'Bold', animation: 'POP' },
      animationDirection: { energy: 'HIGH', style: 'Dynamic', textAnimation: 'POP', visualTransitions: 'CROSSFADE', elementMotion: 'SMOOTH' },
      audioDirection: { musicMood: 'High-energy electronic', soundEffects: 'Swoosh', pacing: 'Fast', mixBalance: 'Voice 100%, Music 25%' },
      cta: { type: 'SHOP_NOW', text: 'SHOP NOW • ONE8.COM', visualTreatment: 'Pill Button', placement: 'bottom' },
      productionMetadata: {
        totalScenes: 2,
        estimatedWordCount: 15,
        targetDurationSeconds: 4,
        calculatedDurationSeconds: 4,
        generatedBy: 'ReelDirectorAI',
        contentJobId: 'job-motion-001',
        generatedAt: new Date().toISOString()
      },
      status: 'QUEUED',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const productionPackage: ReelProductionPackage = {
      id: 'pkg-motion-001',
      reelPlanId: reelPlan.id,
      workspaceId,
      brandId,
      readiness: { isReady: true, blockers: [] } as any,
      status: 'COMPILED',
      packagePayload: {
        reelPlan,
        assets: [
          {
            id: 'asset-prod-hero-1',
            reelPlanId: reelPlan.id,
            workspaceId,
            brandId,
            assetType: 'PRODUCT_IMAGE',
            sourceUrl: productImagePath,
            previewUrl: productImagePath,
            sceneNumber: 1,
            role: 'HERO',
            status: 'READY',
            createdAt: new Date(),
            updatedAt: new Date()
          } as unknown as ReelAsset,
          {
            id: 'asset-prod-hero-2',
            reelPlanId: reelPlan.id,
            workspaceId,
            brandId,
            assetType: 'PRODUCT_IMAGE',
            sourceUrl: productImagePath,
            previewUrl: productImagePath,
            sceneNumber: 2,
            role: 'HERO',
            status: 'READY',
            createdAt: new Date(),
            updatedAt: new Date()
          } as unknown as ReelAsset
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const animationPlan: AnimationPlan = {
      id: 'anim-motion-001',
      workspaceId,
      brandId,
      reelPlanId: reelPlan.id,
      productionPackageId: productionPackage.id,
      version: 1,
      status: 'READY',
      animationLanguage: 'ENERGETIC',
      globalSettings: {
        animationLanguage: 'ENERGETIC',
        intensity: 'HIGH',
        pacing: 'FAST',
        smoothness: 0.9,
        defaultEasing: 'CUBIC_OUT',
        defaultTransition: 'CROSSFADE',
        motionBlurIntent: true,
        maxSimultaneousAnimations: 3,
        reducedMotionSupport: false
      },
      sceneAnimations: [
        {
          sceneNumber: 1,
          startTime: 0,
          endTime: 2,
          animationIntensity: 'HIGH',
          entranceAnimations: [],
          continuousAnimations: [],
          emphasisAnimations: [],
          exitAnimations: [],
          cameraMotion: [{ type: 'SLOW_PUSH', startTime: 0, duration: 2, intensity: 'HIGH', easing: 'CUBIC_OUT' }],
          textMotion: [{ targetText: 'Engineered for Pure Speed', startTime: 0, duration: 2, entrance: 'WORD_POP', easing: 'SPRING', emphasisWords: ['Speed'] }],
          mediaMotion: [],
          productMotion: [{ productId: product.id, revealType: 'HERO_REVEAL', startTime: 0, duration: 2, emphasis: true }],
          logoMotion: [{ assetId: 'logo', startTime: 0, duration: 2, style: 'SLIDE', easing: 'QUAD_OUT' }],
          synchronizationCues: [],
          rationale: 'Hook hero moment'
        },
        {
          sceneNumber: 2,
          startTime: 2,
          endTime: 4,
          animationIntensity: 'MEDIUM',
          entranceAnimations: [],
          continuousAnimations: [],
          emphasisAnimations: [],
          exitAnimations: [],
          cameraMotion: [{ type: 'STATIC', startTime: 2, duration: 2, intensity: 'LOW', easing: 'LINEAR' }],
          textMotion: [{ targetText: 'SHOP NOW • ONE8.COM', startTime: 2, duration: 2, entrance: 'EMPHASIS_PULSE', easing: 'SPRING', emphasisWords: ['SHOP NOW'] }],
          mediaMotion: [],
          productMotion: [{ productId: product.id, revealType: 'HERO_REVEAL', startTime: 2, duration: 2, emphasis: true }],
          logoMotion: [{ assetId: 'logo', startTime: 2, duration: 2, style: 'SCALE', easing: 'QUAD_OUT' }],
          synchronizationCues: [],
          rationale: 'Action card'
        }
      ],
      transitionPlan: [],
      textAnimationPlan: [],
      cameraPlan: [],
      productAnimationPlan: [],
      logoAnimationPlan: [],
      syncPlan: [],
      metadata: { generatedBy: 'AI', generatedAt: new Date().toISOString() } as any,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    let updatedStatus = '';
    let savedRenderOutput: VideoRenderOutput | undefined;

    const mockDb: any = {};
    const mockReelRepo: any = {
      findByIdAndWorkspace: async () => reelPlan,
      updateStatus: async (_id: string, s: string) => {
        updatedStatus = s;
      },
      saveRenderOutput: async (_id: string, out: VideoRenderOutput, status: string) => {
        savedRenderOutput = out;
        updatedStatus = status;
      }
    };
    const mockPkgService: any = {
      getPackageByReelPlanId: async () => productionPackage,
      compilePackage: async () => productionPackage
    };
    const mockAnimService: any = {
      getLatestPlan: async () => animationPlan,
      buildRenderContract: () => ({
        contractVersion: '1.0',
        reelPlanId: reelPlan.id,
        totalDurationSeconds: 4,
        dimensions: { width: 1080, height: 1920, aspectRatio: '9:16' },
        fps: 30,
        brand: {
          primaryColor: brand.brandColors?.primary || '#0F172A',
          secondaryColor: brand.brandColors?.secondary || '#E11D48',
          accentColor: brand.brandColors?.accent || '#F59E0B',
          fontFamily: brand.typography?.primaryFont || 'Inter',
          logoUrl: logoImagePath
        },
        scenes: animationPlan.sceneAnimations.map((sa: SceneAnimation) => ({
          sceneNumber: sa.sceneNumber,
          startTime: sa.startTime,
          endTime: sa.endTime,
          duration: sa.endTime - sa.startTime,
          mediaUrl: productImagePath,
          camera: sa.cameraMotion,
          textAnimations: sa.textMotion,
          productAnimations: sa.productMotion,
          logoAnimations: sa.logoMotion,
          syncCues: []
        })),
        audio: {
          voiceTrackUrl: voiceAudioPath,
          musicTrackUrl: musicAudioPath
        },
        globalSettings: animationPlan.globalSettings
      })
    };
    const mockDnaRepo: any = {
      findLatestByBrandId: async () => null
    };

    const storageProvider = new LocalStorageProvider({ baseDir: tempDir, publicUrlPrefix: '/api/storage/files' });

    const renderService = new VideoRenderService(mockDb, {
      reelRepo: mockReelRepo,
      packageService: mockPkgService,
      animationService: mockAnimService,
      dnaRepo: mockDnaRepo,
      storageProvider
    });

    const result = await renderService.renderReelVideo(reelPlan.id, workspaceId, {
      width: 1080,
      height: 1920,
      fps: 30
    });

    // 4. Assert video output specifications
    expect(result).toBeDefined();
    expect(result.status).toBe('COMPLETED');
    expect(result.resolution).toEqual({ width: 1080, height: 1920 });
    expect(result.durationSeconds).toBe(4);
    expect(result.outputVideoUrl).toContain('reel-motion-001');
    expect(result.fileSizeBytes).toBeGreaterThan(5000);
    expect(result.diagnostics).toBeDefined();

    // 5. Assert database status transition
    expect(['COMPLETED', 'READY_FOR_APPROVAL']).toContain(updatedStatus);
    expect(savedRenderOutput).toBeDefined();
    expect(savedRenderOutput?.status).toBe('COMPLETED');

    // 6. Assert multi-point visual frame validation
    expect(result.diagnostics?.visualVariance).toBeGreaterThan(10.0);
    expect(result.diagnostics?.uniqueColors).toBeGreaterThan(500);
    expect(result.diagnostics?.validatedSampleCount).toBe(7);
  }, 45000);

  it('4. Post-Render Visual Quality Gate rejects artificial uniform solid-blue frames', async () => {
    const blankVideoPath = path.join(tempDir, 'blank_solid_blue.mp4');

    // Generate a uniform solid blue 1080x1920 video
    await new Promise<void>((resolve, reject) => {
      const args = [
        '-f', 'lavfi',
        '-i', 'color=c=0x003366:s=1080x1920:d=3:r=30',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-y',
        blankVideoPath
      ];
      const proc = spawn('ffmpeg', args, { windowsHide: true });
      proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Failed solid video gen, code ${code}`))));
    });

    const validation = await VisualFrameValidator.validateVideo(blankVideoPath, {
      durationSeconds: 3
    });

    expect(validation.valid).toBe(false);
    expect(validation.failureCode).toBe('REEL_RENDER_VALIDATION_FAILED');
    expect(validation.averageStdDev).toBeLessThan(2.0);
  }, 25000);
});
