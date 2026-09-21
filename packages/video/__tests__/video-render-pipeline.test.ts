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

describe('End-to-End Multi-Scene Video Rendering Pipeline', () => {
  let tempDir: string;
  let sampleImage1: string;
  let sampleImage2: string;
  let sampleVoiceTrack: string;
  let sampleMusicTrack: string;
  let storageProvider: LocalStorageProvider;
  let renderService: VideoRenderService;

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
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidsnapai_pipeline_test_'));
    sampleImage1 = path.join(tempDir, 'scene1_photo.jpg');
    sampleImage2 = path.join(tempDir, 'scene2_photo.jpg');
    sampleVoiceTrack = path.join(tempDir, 'voice.mp3');
    sampleMusicTrack = path.join(tempDir, 'music.mp3');

    // Create realistic test media assets with distinct visual textures
    // Image 1: High energy fitness gradient with geometry
    await runFfmpeg([
      '-f', 'lavfi',
      '-i', 'testsrc=size=1080x1920:rate=1:duration=1',
      '-vframes', '1',
      '-y',
      sampleImage1
    ]);

    // Image 2: High contrast lifestyle visual
    await runFfmpeg([
      '-f', 'lavfi',
      '-i', 'smptebars=size=1080x1920:rate=1:duration=1',
      '-vframes', '1',
      '-y',
      sampleImage2
    ]);

    // Audio 1: 3-second voice test tone
    await runFfmpeg([
      '-f', 'lavfi',
      '-i', 'sine=frequency=440:duration=6',
      '-c:a', 'libmp3lame',
      '-y',
      sampleVoiceTrack
    ]);

    // Audio 2: 6-second background music tone
    await runFfmpeg([
      '-f', 'lavfi',
      '-i', 'sine=frequency=220:duration=6',
      '-c:a', 'libmp3lame',
      '-y',
      sampleMusicTrack
    ]);
  }, 45000);

  afterAll(async () => {
    try {
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup error
    }
  });

  it('renders a complete multi-scene reel with real media, text overlays, and audio, and passes visual frame validation', async () => {
    const reelPlanId = 'reel-pipeline-001';
    const workspaceId = 'ws-pipeline-001';
    const brandId = 'brand-one8-001';

    const reelPlan: ReelProductionPlan = {
      id: reelPlanId,
      workspaceId,
      brandId,
      contentJobId: 'job-1',
      contentPlanId: 'cp-1',
      title: 'One8 Active Performance Launch',
      durationSeconds: 6,
      aspectRatio: '9:16',
      platform: 'INSTAGRAM_REELS',
      format: 'TALKING_HEAD_BROLL',
      hook: {
        type: 'QUESTION',
        text: 'Ready to elevate your training?',
        visualIntent: 'Hero athlete in motion',
        deliveryStyle: 'ENERGETIC',
        durationSeconds: 3
      },
      cta: 'Shop One8 Active Now',
      scenes: [
        {
          sceneNumber: 1,
          durationSeconds: 3,
          purpose: 'Hook',
          narration: 'Ready to elevate your training?',
          onScreenText: 'UNLEASH YOUR LIMITS',
          visualType: 'PRODUCT_SHOWCASE',
          assetRequirement: 'Athlete training in One8 gear'
        },
        {
          sceneNumber: 2,
          durationSeconds: 3,
          purpose: 'CTA',
          narration: 'Shop One8 Active today.',
          onScreenText: 'SHOP ONE8 ACTIVE NOW',
          visualType: 'CTA',
          assetRequirement: 'One8 brand CTA screen'
        }
      ],
      status: 'READY_TO_RENDER',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    const brandDna: BrandDna = {
      id: 'dna-one8',
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
      id: 'pkg-pipeline-001',
      reelPlanId,
      workspaceId,
      brandId,
      status: 'READY',
      packagePayload: {
        reelPlan,
        assets: [
          {
            id: 'asset-scene-1',
            reelPlanId,
            workspaceId,
            brandId,
            sceneNumber: 1,
            assetType: 'IMAGE',
            sourceType: 'BRAND_LIBRARY',
            provider: 'brand_library',
            sourceUrl: sampleImage1,
            previewUrl: sampleImage1,
            status: 'READY',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'asset-scene-2',
            reelPlanId,
            workspaceId,
            brandId,
            sceneNumber: 2,
            assetType: 'IMAGE',
            sourceType: 'BRAND_LIBRARY',
            provider: 'brand_library',
            sourceUrl: sampleImage2,
            previewUrl: sampleImage2,
            status: 'READY',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        voiceAsset: {
          id: 'voice-1',
          reelPlanId,
          workspaceId,
          brandId,
          sceneNumber: 0,
          assetType: 'VOICE',
          sourceType: 'GENERATED',
          provider: 'local',
          sourceUrl: sampleVoiceTrack,
          previewUrl: sampleVoiceTrack,
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        audioMixPlan: {
          id: 'audio-mix-1',
          reelPlanId,
          workspaceId,
          musicConfig: {
            url: sampleMusicTrack
          }
        } as any
      } as any,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    const animationPlan: AnimationPlan = {
      id: 'anim-pipeline-001',
      reelPlanId,
      workspaceId,
      brandId,
      productionPackageId: 'pkg-pipeline-001',
      version: 1,
      globalSettings: {
        intensity: 'HIGH',
        reducedMotionSupport: false
      },
      sceneAnimations: [
        {
          sceneNumber: 1,
          startTime: 0,
          endTime: 3,
          cameraMotion: [{ type: 'SLOW_PUSH', intensity: 'MEDIUM' }],
          textMotion: [{ targetText: 'UNLEASH YOUR LIMITS', startTime: 0.2, duration: 2.6 }],
          entranceAnimations: [],
          continuousAnimations: [],
          emphasisAnimations: [],
          exitAnimations: []
        },
        {
          sceneNumber: 2,
          startTime: 3,
          endTime: 6,
          cameraMotion: [{ type: 'DYNAMIC_PULL', intensity: 'HIGH' }],
          textMotion: [{ targetText: 'SHOP ONE8 ACTIVE NOW', startTime: 3.2, duration: 2.6 }],
          entranceAnimations: [],
          continuousAnimations: [],
          emphasisAnimations: [],
          exitAnimations: []
        }
      ]
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
        reelPlanId,
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
            mediaUrl: sampleImage1,
            mediaType: 'IMAGE',
            camera: [{ type: 'SLOW_PUSH', intensity: 'MEDIUM' }],
            textAnimations: [{ targetText: 'UNLEASH YOUR LIMITS', startTime: 0.2, duration: 2.6 }]
          },
          {
            sceneNumber: 2,
            startTime: 3,
            endTime: 6,
            duration: 3,
            mediaUrl: sampleImage2,
            mediaType: 'IMAGE',
            camera: [{ type: 'DYNAMIC_PULL', intensity: 'HIGH' }],
            textAnimations: [{ targetText: 'SHOP ONE8 ACTIVE NOW', startTime: 3.2, duration: 2.6 }]
          }
        ],
        audio: {
          voiceTrackUrl: sampleVoiceTrack,
          musicTrackUrl: sampleMusicTrack
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
      create: vi.fn().mockResolvedValue({ id: 'rendered-asset-1' })
    };

    storageProvider = new LocalStorageProvider();
    const debugOutputDir = path.join(tempDir, 'debug_reel_001');

    renderService = new VideoRenderService({} as any, {
      storageProvider,
      reelRepo: mockReelRepo as any,
      packageService: mockPackageService as any,
      animationService: mockAnimationService as any,
      dnaRepo: mockDnaRepo as any,
      reelAssetRepo: mockReelAssetRepo as any
    });

    const output: VideoRenderOutput = await renderService.renderReelVideo(
      reelPlanId,
      workspaceId,
      {
        debug: true,
        debugOutputDir
      }
    );

    // 1. Verify Output Properties
    expect(output).toBeDefined();
    expect(output.status).toBe('COMPLETED');
    expect(output.durationSeconds).toBe(6);
    expect(output.resolution).toEqual({ width: 1080, height: 1920 });
    expect(output.fileSizeBytes).toBeGreaterThan(5000);

    // 2. Verify Output File Exists on Disk
    const relativeKey = output.storageKey!;
    const savedPath = path.resolve(process.cwd(), 'uploads', relativeKey);
    expect(fs.existsSync(savedPath)).toBe(true);

    // 3. Verify Debug Artifacts were preserved
    expect(fs.existsSync(path.join(debugOutputDir, 'blueprint.json'))).toBe(true);
    expect(fs.existsSync(path.join(debugOutputDir, 'scene-1-render.mp4'))).toBe(true);
    expect(fs.existsSync(path.join(debugOutputDir, 'scene-2-render.mp4'))).toBe(true);
    expect(fs.existsSync(path.join(debugOutputDir, 'final.mp4'))).toBe(true);
    expect(fs.existsSync(path.join(debugOutputDir, 'ffmpeg-command.txt'))).toBe(true);

    // 4. Verify Visual Frame Validation
    const validation = await VisualFrameValidator.validateVideo(savedPath, {
      durationSeconds: 6,
      saveSampleImagesToDir: path.join(debugOutputDir, 'frame-samples')
    });

    expect(validation.valid).toBe(true);
    expect(validation.visualContentDetected).toBe(true);
    expect(validation.solidFramesCount).toBe(0);
    expect(validation.averageStdDev).toBeGreaterThan(10.0);
    expect(validation.averageUniqueColors).toBeGreaterThan(50);

    // Verify sampled frame PNG images exist
    const frameSamplesDir = path.join(debugOutputDir, 'frame-samples');
    expect(fs.existsSync(frameSamplesDir)).toBe(true);
    const frameFiles = await fs.promises.readdir(frameSamplesDir);
    expect(frameFiles.length).toBeGreaterThanOrEqual(3);
  }, 180000);
});
