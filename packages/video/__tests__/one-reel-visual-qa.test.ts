import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { VideoRenderService } from '../src/videoRenderService.js';
import { LocalStorageProvider } from '@vidsnapai/storage';
import { VisualFrameValidator } from '../src/visualFrameValidator.js';
import type {
  ReelProductionPlan,
  BrandDna,
  ReelProductionPackage,
  AnimationPlan,
  VideoRenderOutput
} from '@vidsnapai/types';

describe('One-Reel Visual QA & 30s Multi-Scene Render Acceptance', () => {
  let tempDir: string;
  let debugOutputDir: string;
  let mediaPaths: string[] = [];
  let voicePath: string;
  let musicPath: string;
  let storageProvider: LocalStorageProvider;
  let renderService: VideoRenderService;
  const reelId = 'one8-qa-reel-30s';
  const workspaceId = 'ws-one8-qa';
  const brandId = 'brand-one8';

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
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidsnapai_qa_test_'));
    debugOutputDir = path.resolve(process.cwd(), 'debug', 'reel', reelId);
    await fs.promises.mkdir(debugOutputDir, { recursive: true });

    // Create 4 distinct high-contrast visual scene assets (test patterns + geometric gradients)
    const patterns = ['testsrc', 'smptebars', 'gradients', 'zoneplate'];
    mediaPaths = [];

    for (let i = 0; i < 4; i++) {
      const imgPath = path.join(tempDir, `scene_${i + 1}_asset.png`);
      await runFfmpeg([
        '-f', 'lavfi',
        '-i', `${patterns[i]}=size=1080x1920:rate=1:duration=1`,
        '-vframes', '1',
        '-y',
        imgPath
      ]);
      mediaPaths.push(imgPath);
    }

    voicePath = path.join(tempDir, 'voice.mp3');
    musicPath = path.join(tempDir, 'music.mp3');
    await runFfmpeg(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=30', '-c:a', 'libmp3lame', '-y', voicePath]);
    await runFfmpeg(['-f', 'lavfi', '-i', 'sine=frequency=220:duration=30', '-c:a', 'libmp3lame', '-y', musicPath]);
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

  it('renders a 30s One8 multi-scene reel and verifies real visual content on all extracted frames (0s, 3s, 6s, 10s, 15s, 20s, 25s, 29s)', async () => {
    const reelPlan: ReelProductionPlan = {
      id: reelId,
      workspaceId,
      brandId,
      contentJobId: 'job-one8-launch',
      contentPlanId: 'cp-one8-30d',
      title: 'One8 Active Performance Launch Reel',
      durationSeconds: 30,
      aspectRatio: '9:16',
      platform: 'INSTAGRAM_REELS',
      format: 'TALKING_HEAD_BROLL',
      hook: {
        type: 'QUESTION',
        text: 'Are you pushing your limits every single day?',
        visualIntent: 'Hero runner in motion with One8 gear',
        deliveryStyle: 'ENERGETIC',
        durationSeconds: 7.5
      },
      cta: 'Shop One8 Active Today',
      scenes: [
        {
          sceneNumber: 1,
          durationSeconds: 7.5,
          purpose: 'Hook',
          narration: 'Are you pushing your limits every single day?',
          onScreenText: 'UNLEASH YOUR POWER - ONE8 ACTIVE',
          visualType: 'PRODUCT_SHOWCASE',
          assetRequirement: 'Hero athlete training in One8 athletic wear'
        },
        {
          sceneNumber: 2,
          durationSeconds: 7.5,
          purpose: 'Problem/Agitation',
          narration: 'Standard gear slows you down when intensity rises.',
          onScreenText: 'DESIGNED FOR PEAK PERFORMANCE',
          visualType: 'DEMONSTRATION',
          assetRequirement: 'Breathable fabric close-up with sweat-wicking tech'
        },
        {
          sceneNumber: 3,
          durationSeconds: 7.5,
          purpose: 'Solution/Features',
          narration: 'Engineered with ultra-light flex fabric and bold style.',
          onScreenText: 'FEATHERLIGHT FLEX + PRO BREATHABILITY',
          visualType: 'LIFESTYLE',
          assetRequirement: 'Athlete sprinting across urban track'
        },
        {
          sceneNumber: 4,
          durationSeconds: 7.5,
          purpose: 'CTA',
          narration: 'Upgrade your training wardrobe now at one8.com.',
          onScreenText: 'SHOP ONE8 ACTIVE - LINK IN BIO',
          visualType: 'CTA',
          assetRequirement: 'One8 logo reveal and official product collection'
        }
      ],
      status: 'READY_TO_RENDER',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    const brandDna: BrandDna = {
      id: 'dna-one8-brand',
      brandId,
      visualIdentity: {
        colors: {
          primary: '#1E293B',
          secondary: '#3B82F6',
          accent: '#FF4500'
        },
        typography: {
          headingFont: 'Montserrat',
          bodyFont: 'Inter'
        }
      }
    } as any;

    const productionPackage: ReelProductionPackage = {
      id: 'pkg-one8-001',
      reelPlanId: reelId,
      workspaceId,
      brandId,
      status: 'READY',
      packagePayload: {
        reelPlan,
        assets: mediaPaths.map((mp, idx) => ({
          id: `asset-scene-${idx + 1}`,
          reelPlanId: reelId,
          workspaceId,
          brandId,
          sceneNumber: idx + 1,
          assetType: 'IMAGE',
          sourceType: 'BRAND_LIBRARY',
          provider: 'brand_library',
          sourceUrl: mp,
          previewUrl: mp,
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        voiceAsset: {
          id: 'voice-one8-001',
          reelPlanId: reelId,
          workspaceId,
          brandId,
          sceneNumber: 0,
          assetType: 'VOICE',
          sourceType: 'GENERATED',
          provider: 'local',
          sourceUrl: voicePath,
          previewUrl: voicePath,
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        audioMixPlan: {
          id: 'audio-mix-one8-001',
          reelPlanId: reelId,
          workspaceId,
          musicConfig: {
            url: musicPath
          }
        } as any
      } as any,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    const animationPlan: AnimationPlan = {
      id: 'anim-one8-001',
      reelPlanId: reelId,
      workspaceId,
      brandId,
      productionPackageId: 'pkg-one8-001',
      version: 1,
      globalSettings: {
        intensity: 'HIGH',
        reducedMotionSupport: false
      },
      sceneAnimations: reelPlan.scenes.map((s, idx) => ({
        sceneNumber: s.sceneNumber,
        startTime: idx * 7.5,
        endTime: (idx + 1) * 7.5,
        cameraMotion: [{ type: idx % 2 === 0 ? 'SLOW_PUSH' : 'DYNAMIC_PULL', intensity: 'MEDIUM' }],
        textMotion: [{ targetText: s.onScreenText || '', startTime: idx * 7.5 + 0.5, duration: 6.5 }],
        entranceAnimations: [],
        continuousAnimations: [],
        emphasisAnimations: [],
        exitAnimations: []
      }))
    } as any;

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
        reelPlanId: reelId,
        productionPackageId: productionPackage.id,
        animationPlanId: animationPlan.id,
        dimensions: { width: 1080, height: 1920, aspectRatio: '9:16' },
        fps: 30,
        totalDurationSeconds: 30,
        scenes: reelPlan.scenes.map((s, idx) => ({
          sceneNumber: s.sceneNumber,
          startTime: idx * 7.5,
          endTime: (idx + 1) * 7.5,
          duration: 7.5,
          mediaUrl: mediaPaths[idx],
          mediaType: 'IMAGE',
          camera: [{ type: idx % 2 === 0 ? 'SLOW_PUSH' : 'DYNAMIC_PULL', intensity: 'MEDIUM' }],
          textAnimations: [{ targetText: s.onScreenText || '', startTime: idx * 7.5 + 0.5, duration: 6.5 }]
        })),
        audio: {
          voiceTrackUrl: voicePath,
          musicTrackUrl: musicPath
        },
        brand: {
          primaryColor: '#1E293B',
          secondaryColor: '#3B82F6',
          accentColor: '#FF4500',
          fontFamily: 'Montserrat'
        },
        globalSettings: { reducedMotionSupport: false }
      })
    };

    const mockDnaRepo = {
      findLatestByBrandId: vi.fn().mockResolvedValue(brandDna)
    };

    const mockReelAssetRepo = {
      create: vi.fn().mockResolvedValue({ id: 'asset-rendered-final' })
    };

    storageProvider = new LocalStorageProvider();
    renderService = new VideoRenderService({} as any, {
      storageProvider,
      reelRepo: mockReelRepo as any,
      packageService: mockPackageService as any,
      animationService: mockAnimationService as any,
      dnaRepo: mockDnaRepo as any,
      reelAssetRepo: mockReelAssetRepo as any
    });

    const output: VideoRenderOutput = await renderService.renderReelVideo(
      reelId,
      workspaceId,
      {
        debug: true,
        debugOutputDir
      }
    );

    // 1. Output Metadata
    expect(output).toBeDefined();
    expect(output.status).toBe('COMPLETED');
    expect(output.durationSeconds).toBe(30);
    expect(output.resolution).toEqual({ width: 1080, height: 1920 });
    expect(output.fileSizeBytes).toBeGreaterThan(50000);

    // 2. Intermediate & Master Files in Debug Directory
    expect(fs.existsSync(path.join(debugOutputDir, 'blueprint.json'))).toBe(true);
    expect(fs.existsSync(path.join(debugOutputDir, 'scene-1-render.mp4'))).toBe(true);
    expect(fs.existsSync(path.join(debugOutputDir, 'scene-2-render.mp4'))).toBe(true);
    expect(fs.existsSync(path.join(debugOutputDir, 'scene-3-render.mp4'))).toBe(true);
    expect(fs.existsSync(path.join(debugOutputDir, 'scene-4-render.mp4'))).toBe(true);
    expect(fs.existsSync(path.join(debugOutputDir, 'final.mp4'))).toBe(true);
    expect(fs.existsSync(path.join(debugOutputDir, 'ffmpeg-command.txt'))).toBe(true);

    // 3. Extract and Inspect Specific Sample Frames (0s, 3s, 6s, 10s, 15s, 20s, 25s, 29s)
    const finalMp4Path = path.resolve(process.cwd(), 'uploads', output.storageKey!);
    const frameSampleDir = path.join(debugOutputDir, 'frame-samples');
    const timestamps = [0.5, 3.0, 6.0, 10.0, 15.0, 20.0, 25.0, 29.0];

    const validation = await VisualFrameValidator.validateVideo(finalMp4Path, {
      durationSeconds: 30,
      sampleTimestamps: timestamps,
      saveSampleImagesToDir: frameSampleDir
    });

    // 4. Assert Visual Content on ALL Frames (Zero solid frames!)
    expect(validation.valid).toBe(true);
    expect(validation.visualContentDetected).toBe(true);
    expect(validation.solidFramesCount).toBe(0);
    expect(validation.averageStdDev).toBeGreaterThan(15.0);
    expect(validation.averageUniqueColors).toBeGreaterThan(50);

    for (const sample of validation.samples) {
      expect(sample.isSolidColor).toBe(false);
      expect(sample.stdDevY).toBeGreaterThan(5.0); // Real luminance variance on every single frame
      expect(sample.uniqueColorCount).toBeGreaterThan(20);
      expect(sample.savedImagePath).toBeDefined();
      expect(fs.existsSync(sample.savedImagePath!)).toBe(true);
    }
  }, 180000);
});
