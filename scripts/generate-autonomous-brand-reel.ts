import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import {
  ReelOrchestrator,
  VideoRenderService,
} from '@vidsnapai/video';
import { AnimationPlanner, AnimationService } from '@vidsnapai/animation';
import { LocalStorageProvider } from '@vidsnapai/storage';
import { MockAIProvider } from '@vidsnapai/ai';
import type {
  Brand,
  BrandProduct,
  BrandAsset,
  Campaign,
  ContentJob,
  ReelProductionPlan,
  ReelProductionPackage,
} from '@vidsnapai/types';

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

async function main() {
  console.log('===============================================================');
  console.log('VIDSNAPAI — AUTONOMOUS BRAND REEL PRODUCTION DEMONSTRATION');
  console.log('===============================================================');

  const outputBaseDir = path.resolve(process.cwd(), 'uploads', 'autonomous-brand-reels');
  await fs.promises.mkdir(outputBaseDir, { recursive: true });

  const productImagePath = path.join(outputBaseDir, 'one8_velocity_elite.png');
  const logoImagePath = path.join(outputBaseDir, 'one8_logo.png');
  const voiceAudioPath = path.join(outputBaseDir, 'one8_voiceover.mp3');
  const musicAudioPath = path.join(outputBaseDir, 'one8_bg_music.mp3');

  console.log('[Step 1] Preparing high-contrast One8 test product asset & brand logo...');
  // 1. Generate 1080x1920 real product test visual
  await runFfmpeg([
    '-f', 'lavfi',
    '-i', 'testsrc=size=1080x1920:rate=1:duration=1',
    '-vf', 'drawbox=x=100:y=400:w=880:h=900:color=red@0.8:t=fill,drawtext=text=\'ONE8 VELOCITY ELITE\':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=800',
    '-vframes', '1',
    '-y',
    productImagePath
  ]);

  // 2. Generate 200x200 logo
  await runFfmpeg([
    '-f', 'lavfi',
    '-i', 'color=c=0xEF4444:s=240x240:d=1',
    '-vf', 'drawtext=text=\'one8\':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2',
    '-vframes', '1',
    '-y',
    logoImagePath
  ]);

  // 3. Generate voiceover and background music
  await runFfmpeg(['-f', 'lavfi', '-i', 'sine=frequency=520:duration=6', '-c:a', 'libmp3lame', '-y', voiceAudioPath]);
  await runFfmpeg(['-f', 'lavfi', '-i', 'sine=frequency=260:duration=6', '-c:a', 'libmp3lame', '-y', musicAudioPath]);

  console.log('[Step 2] Configuring Brand Brain & Product Catalog...');
  const brand: Brand = {
    id: 'brand-one8-live',
    workspaceId: 'ws-live-production',
    name: 'One8 Active',
    slug: 'one8-active',
    industry: 'Sportswear & Footwear',
    description: 'High-performance athletic apparel & performance footwear designed with Virat Kohli.',
    brandVoice: 'Bold, energetic, elite athletic performance',
    targetAudience: ['Marathon Runners', 'Competitive Athletes'],
    brandColors: {
      primary: '#0F172A',
      secondary: '#EF4444',
      accent: '#F59E0B',
      background: '#030712',
      text: '#FFFFFF'
    },
    typography: {
      headingFont: 'Montserrat',
      bodyFont: 'Inter'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const product: BrandProduct = {
    id: 'prod-one8-velocity-elite',
    workspaceId: 'ws-live-production',
    brandId: brand.id,
    name: 'One8 Velocity Elite Runner',
    description: 'Carbon-infused responsive running shoes built for peak marathon speed and energy return.',
    price: 189.99,
    features: ['Full-length carbon fiber propulsion plate', 'HydroShield ultra-breathable matrix', 'NitroCharge foam cushioning'],
    benefits: ['40% higher energy return', 'Ultralight 195g racing profile', 'Zero-friction blister protection'],
    primaryAssetId: 'asset-sneaker-01',
    primaryAssetUrl: productImagePath,
    assets: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const brandAsset: BrandAsset = {
    id: 'asset-logo-01',
    workspaceId: 'ws-live-production',
    brandId: brand.id,
    assetType: 'IMAGE',
    fileUrl: logoImagePath,
    fileName: 'one8_logo.png',
    mimeType: 'image/png',
    fileSize: 4800,
    width: 240,
    height: 240,
    tags: ['logo'],
    status: 'READY',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const campaign: Campaign = {
    id: 'camp-one8-velocity',
    workspaceId: 'ws-live-production',
    brandId: brand.id,
    name: 'Q3 Velocity Elite Launch',
    objective: 'CONVERSIONS',
    status: 'ACTIVE',
    targetAudience: 'Marathon Runners',
    keyMessage: 'Engineered for explosive marathon speed',
    callToAction: 'Shop Now at one8.com',
    platforms: ['INSTAGRAM', 'TIKTOK'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const contentJob: ContentJob = {
    id: 'job-one8-velocity-01',
    workspaceId: 'ws-live-production',
    brandId: brand.id,
    campaignId: campaign.id,
    funnelStage: 'CONVERSION',
    topic: 'One8 Velocity Elite Product Showcase',
    hookType: 'STATEMENT',
    format: 'REEL_9_16',
    platform: 'INSTAGRAM',
    status: 'READY',
    suggestedDuration: 6,
    aspectRatio: '9:16',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  console.log('[Step 3] Generating Deterministic 6-Scene Brand Promotion Blueprint...');
  const orchestrator = new ReelOrchestrator(new MockAIProvider());
  const blueprintPartial = await orchestrator.generateReelPlan({
    brand,
    campaign,
    contentJob,
    products: [product],
    brandAssets: [brandAsset]
  });

  const reelPlanId = `reel-one8-prod-${Date.now()}`;
  const reelPlan: ReelProductionPlan = {
    ...blueprintPartial,
    id: reelPlanId,
    durationSeconds: 6,
    scenes: [
      {
        sceneNumber: 1,
        durationSeconds: 2,
        purpose: 'HOOK',
        narration: 'Engineered for explosive marathon speed.',
        onScreenText: 'VELOCITY ELITE REVOLUTION',
        visualType: 'PRODUCT_SHOWCASE',
        subject: 'One8 Velocity Elite Runner',
        environment: 'Sleek cinematic studio with rim lighting',
        composition: 'Centered hero product cutout',
        camera: 'SLOW_PUSH',
        lighting: 'High-contrast studio highlights',
        mood: 'Electric and high-energy',
        transition: 'CROSSFADE',
        animationIntent: 'HERO_REVEAL',
        assetRequirement: 'Product hero image',
        productReference: product.name,
        mediaUrl: productImagePath
      } as any,
      {
        sceneNumber: 2,
        durationSeconds: 2,
        purpose: 'BENEFIT_DEMONSTRATION',
        narration: '40% higher energy return with carbon propulsion.',
        onScreenText: '40% HIGHER ENERGY RETURN',
        visualType: 'PRODUCT_SHOWCASE',
        subject: 'One8 Velocity Elite Carbon Plate',
        environment: 'Sleek cinematic studio',
        composition: 'Centered hero product presentation',
        camera: 'DYNAMIC_PUSH',
        lighting: 'High-contrast studio highlights',
        mood: 'Empowering',
        transition: 'FADE',
        animationIntent: 'FLOATING_PRODUCT',
        assetRequirement: 'Product hero image',
        productReference: product.name,
        mediaUrl: productImagePath
      } as any,
      {
        sceneNumber: 3,
        durationSeconds: 2,
        purpose: 'CTA',
        narration: 'Experience the difference. Shop now at one8.com.',
        onScreenText: 'SHOP NOW AT ONE8.COM',
        visualType: 'CTA',
        subject: 'One8 Brand Logo & CTA Endcard',
        environment: 'Sleek brand dark environment',
        composition: 'Centered brand logo reveal',
        camera: 'STATIC_HERO',
        lighting: 'Spotlight',
        mood: 'Triumphant',
        transition: 'FADE',
        animationIntent: 'PRODUCT_TO_CTA',
        assetRequirement: 'Brand logo',
        brandElement: 'One8 Logo',
        mediaUrl: productImagePath
      } as any
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any;

  console.log('[Step 4] Resolving Media, Voice, Captions & Audio Synthesis...');
  const productionPackage: ReelProductionPackage = {
    id: `pkg-${reelPlan.id}`,
    workspaceId: brand.workspaceId,
    brandId: brand.id,
    reelPlanId: reelPlan.id,
    brand,
    reelPlan,
    packagePayload: {
      reelPlan,
      assets: [
        {
          id: 'asset-scene-1',
          reelPlanId: reelPlan.id,
          workspaceId: brand.workspaceId,
          brandId: brand.id,
          sceneNumber: 1,
          assetType: 'PRODUCT_IMAGE',
          sourceType: 'BRAND_LIBRARY',
          provider: 'FIRST_PARTY',
          sourceUrl: productImagePath,
          status: 'READY',
          localPath: productImagePath,
          role: 'PRODUCT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'asset-scene-2',
          reelPlanId: reelPlan.id,
          workspaceId: brand.workspaceId,
          brandId: brand.id,
          sceneNumber: 2,
          assetType: 'PRODUCT_IMAGE',
          sourceType: 'BRAND_LIBRARY',
          provider: 'FIRST_PARTY',
          sourceUrl: productImagePath,
          status: 'READY',
          localPath: productImagePath,
          role: 'PRODUCT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'asset-scene-3',
          reelPlanId: reelPlan.id,
          workspaceId: brand.workspaceId,
          brandId: brand.id,
          sceneNumber: 3,
          assetType: 'BRAND_LOGO',
          sourceType: 'BRAND_LIBRARY',
          provider: 'FIRST_PARTY',
          sourceUrl: logoImagePath,
          status: 'READY',
          localPath: logoImagePath,
          role: 'BRAND',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      audioMixPlan: {
        id: `audio-mix-${reelPlan.id}`,
        reelPlanId: reelPlan.id,
        workspaceId: brand.workspaceId,
        musicConfig: {
          url: musicAudioPath
        },
        voiceConfig: {
          previewUrl: voiceAudioPath
        }
      }
    } as any,
    assets: [],
    audioTracks: [],
    captions: [],
    metadata: {
      productAssetResolved: true,
      logoResolved: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  console.log('[Step 5] Planning Kinetic Animation, Camera Motion & Product Presets...');
  const animationPlanner = new AnimationPlanner();
  const { plan: animationPlan } = await animationPlanner.planAnimation({
    reelPlan,
    productionPackage
  });

  const animService = new AnimationService();
  const mockAnimationService = {
    getLatestPlan: async () => animationPlan,
    generateAnimationPlan: async () => ({ animationPlan }),
    buildRenderContract: (params: any) => animService.buildRenderContract(params)
  };

  const mockReelRepo = {
    findByIdAndWorkspace: async () => reelPlan,
    updateStatus: async (_id: string, st: any) => { reelPlan.status = st; return reelPlan; },
    saveRenderOutput: async (_id: string, out: any, st: any) => {
      reelPlan.status = st;
      reelPlan.outputVideoUrl = out.outputVideoUrl;
      return reelPlan;
    }
  };

  const mockPackageService = {
    getPackageByReelPlanId: async () => productionPackage,
    compilePackage: async () => productionPackage
  };

  const debugOutputDir = path.join(outputBaseDir, 'debug', reelPlan.id);

  console.log('[Step 6] Executing FFmpeg 1080x1920 (9:16) Multi-Scene Video Render Pipeline...');
  const renderService = new VideoRenderService({} as any, {
    reelRepo: mockReelRepo as any,
    packageService: mockPackageService as any,
    animationService: mockAnimationService as any,
    dnaRepo: { findLatestByBrandId: async () => null } as any,
    reelAssetRepo: { listByReelPlanId: async () => [], create: async () => ({}) } as any,
    storageProvider: new LocalStorageProvider({ basePath: outputBaseDir, baseUrl: 'http://localhost:3000/files' })
  });

  const renderResult = await renderService.renderReelVideo(reelPlan.id, brand.workspaceId, {
    debugOutputDir
  });

  console.log('===============================================================');
  console.log('AUTONOMOUS BRAND PROMOTION REEL PRODUCTION COMPLETE!');
  console.log('===============================================================');
  console.log(`• Status:             ${renderResult.status}`);
  console.log(`• Output Video URL:   ${renderResult.outputVideoUrl}`);
  console.log(`• Video Storage Key:  ${renderResult.storageKey}`);
  console.log(`• Resolution:         ${renderResult.resolution?.width}x${renderResult.resolution?.height}`);
  console.log(`• Aspect Ratio:       ${renderResult.aspectRatio}`);
  console.log(`• Frame Rate:         ${renderResult.fps} FPS`);
  console.log(`• Duration:           ${renderResult.durationSeconds}s`);
  console.log(`• File Size:          ${renderResult.fileSizeBytes} bytes`);
  console.log(`• Debug Artifacts:    ${debugOutputDir}`);

  const qaReportPath = path.join(debugOutputDir, 'qa-report.json');
  if (fs.existsSync(qaReportPath)) {
    const qaReport = JSON.parse(await fs.promises.readFile(qaReportPath, 'utf8'));
    console.log('\n--- QA Report ---');
    console.log(JSON.stringify(qaReport, null, 2));
  }
}

main().catch((err) => {
  console.error('Autonomous demonstration failed:', err);
  process.exit(1);
});
