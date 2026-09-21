import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import type { Database } from '@vidsnapai/database';
import { VideoRenderService } from '@vidsnapai/video';
import { LocalStorageProvider } from '@vidsnapai/storage';
import type {
  ReelProductionPlan,
  BrandDna,
  ReelProductionPackage,
  AnimationPlan,
  ReelAsset,
  VideoRenderOutput
} from '@vidsnapai/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

describe('Phase 8 Video Rendering & Persistence', () => {
  const reelPlanId = '5acd975d-3fb6-4f1e-8692-324bd4a3fb78';
  const workspaceId = '20928673-358e-4ec1-9b0f-0d3a986c671c';
  const brandId = 'd3e93a53-51c3-40a1-9e07-73097b2fcfe2';

  let tempDir: string;
  let sampleProductImage: string;

  let reels: ReelProductionPlan[] = [];
  let dnas: BrandDna[] = [];
  let packages: ReelProductionPackage[] = [];
  let animationPlans: AnimationPlan[] = [];
  let reelAssets: ReelAsset[] = [];

  let mockReelRepo: any;
  let mockDnaRepo: any;
  let mockPackageService: any;
  let mockAnimationService: any;
  let mockReelAssetRepo: any;
  let storageProvider: LocalStorageProvider;
  let renderService: VideoRenderService;

  beforeAll(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidsnapai_p8_'));
    sampleProductImage = path.join(tempDir, 'product.png');

    await new Promise<void>((resolve, reject) => {
      const ff = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'testsrc=size=720x1280:rate=1:duration=1',
        '-vframes', '1',
        '-y',
        sampleProductImage
      ], { windowsHide: true });
      ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg failed'))));
      ff.on('error', reject);
    });
  });

  afterAll(async () => {
    try {
      if (tempDir && fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  });

  beforeEach(() => {
    reels = [
      {
        id: reelPlanId,
        workspaceId,
        brandId,
        title: 'One8 Energetic Performance Reel',
        concept: {
          title: 'One8 Energetic Performance Reel',
          caption: 'Elevate your everyday hustle with One8',
          hashtags: ['#vidsnapai', '#one8']
        },
        durationSeconds: 3,
        status: 'READY_TO_RENDER',
        createdAt: new Date(),
        updatedAt: new Date()
      } as unknown as ReelProductionPlan
    ];

    dnas = [
      {
        id: 'dna-1',
        brandId,
        visualStyle: {
          primaryColor: '#FF4500',
          secondaryColor: '#1A1A1A',
          accentColor: '#FFD700',
          typography: {
            headlineFont: 'Montserrat',
            bodyFont: 'Inter'
          }
        },
        voiceTone: {
          primaryTone: 'Energetic and Bold'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      } as unknown as BrandDna
    ];

    packages = [
      {
        id: 'pkg-1',
        reelPlanId,
        workspaceId,
        brandId,
        status: 'COMPILED',
        packageData: {
          version: '1.0',
          assets: [
            {
              id: 'asset-prod-1',
              type: 'IMAGE',
              role: 'PRODUCT',
              localPath: sampleProductImage,
              storageUrl: sampleProductImage
            }
          ],
          scenes: [
            {
              sceneNumber: 1,
              durationSeconds: 3,
              visualPrompt: 'High energy fitness hero shot',
              voiceoverText: 'Transform your limits today.'
            }
          ]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      } as unknown as ReelProductionPackage
    ];

    animationPlans = [
      {
        id: 'anim-1',
        reelPlanId,
        workspaceId,
        brandId,
        productionPackageId: 'pkg-1',
        version: 1,
        stylePreset: 'BOLD_MINIMAL',
        colorPalette: {
          primary: '#FF4500',
          secondary: '#1A1A1A',
          accent: '#FFD700',
          text: '#FFFFFF',
          background: '#000000'
        },
        typography: {
          primaryFont: 'Montserrat',
          headingFont: 'Montserrat'
        },
        scenes: [
          {
            sceneNumber: 1,
            sceneDurationSeconds: 3,
            cameraMotion: {
              type: 'ZOOM_IN',
              intensity: 'SUBTLE',
              startScale: 1.0,
              endScale: 1.08,
              easing: 'EASE_IN_OUT'
            },
            layers: []
          }
        ],
        audioSync: {
          backgroundMusic: {
            bpm: 120,
            energyLevel: 'HIGH',
            volumeMultiplier: 0.5
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      } as unknown as AnimationPlan
    ];

    reelAssets = [];

    mockReelRepo = {
      findByIdAndWorkspace: vi.fn().mockImplementation(async (id: string, wsId: string) => {
        return reels.find((r) => r.id === id && r.workspaceId === wsId) || null;
      }),
      findById: vi.fn().mockImplementation(async (id: string) => {
        return reels.find((r) => r.id === id) || null;
      }),
      listByBrandId: vi.fn().mockImplementation(async (bId: string) => {
        return reels.filter((r) => r.brandId === bId);
      }),
      updateStatus: vi.fn().mockImplementation(async (id: string, status: any) => {
        const reel = reels.find((r) => r.id === id);
        if (reel) reel.status = status;
        return reel;
      }),
      saveRenderOutput: vi.fn().mockImplementation(async (id: string, renderOutput: VideoRenderOutput, status: any) => {
        const reel = reels.find((r) => r.id === id);
        if (reel) {
          reel.status = status;
          reel.outputVideoUrl = renderOutput.outputVideoUrl;
          reel.renderOutput = renderOutput;
        }
        return reel;
      })
    };

    mockDnaRepo = {
      findLatestByBrandId: vi.fn().mockImplementation(async (bId: string) => {
        return dnas.find((d) => d.brandId === bId) || null;
      })
    };

    mockPackageService = {
      getPackageByReelPlanId: vi.fn().mockImplementation(async (reelId: string) => {
        return packages.find((p) => p.reelPlanId === reelId) || null;
      }),
      compilePackage: vi.fn().mockImplementation(async (reelId: string) => {
        return packages.find((p) => p.reelPlanId === reelId) || packages[0];
      })
    };

    mockAnimationService = {
      getLatestPlan: vi.fn().mockImplementation(async (reelId: string) => {
        return animationPlans.find((a) => a.reelPlanId === reelId) || null;
      }),
      generateAnimationPlan: vi.fn().mockImplementation(async () => {
        return { animationPlan: animationPlans[0] };
      }),
      buildRenderContract: vi.fn().mockImplementation(() => {
        return {
          contractVersion: '1.0',
          reelPlanId,
          totalDurationSeconds: 3,
          fps: 30,
          resolution: { width: 1080, height: 1920 },
          brand: {
            brandId,
            primaryColor: '#FF4500',
            secondaryColor: '#1A1A1A',
            accentColor: '#FFD700',
            fontFamily: 'Montserrat'
          },
          scenes: [
            {
              sceneNumber: 1,
              startTime: 0,
              endTime: 3,
              duration: 3,
              cameraMotion: [{ type: 'ZOOM_IN', intensity: 0.08, startScale: 1.0, endScale: 1.08, easing: 'ease_in_out' }],
              layers: []
            }
          ],
          audioMix: {
            duckingConfig: { duckVolume: 0.2, fadeDurationMs: 300 }
          }
        };
      })
    };

    mockReelAssetRepo = {
      create: vi.fn().mockImplementation(async (data: any) => {
        const asset = { id: `asset-${reelAssets.length + 1}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        reelAssets.push(asset);
        return asset;
      })
    };

    storageProvider = new LocalStorageProvider();
    const mockDb = {} as Database;

    renderService = new VideoRenderService(mockDb, {
      storageProvider,
      reelRepo: mockReelRepo,
      packageService: mockPackageService as any,
      animationService: mockAnimationService as any,
      dnaRepo: mockDnaRepo as any,
      reelAssetRepo: mockReelAssetRepo as any
    });
  });

  it('renders a real One8 vertical video with FFmpeg, uploads to storage, and persists COMPLETED status', async () => {
    // 1. Verify input reel exists
    const existingReel = await mockReelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
    expect(existingReel).not.toBeNull();
    expect(existingReel!.brandId).toBe(brandId);

    // 2. Execute real render
    const output = await renderService.renderReelVideo(reelPlanId, workspaceId);

    expect(output).toBeDefined();
    expect(output.status).toBe('COMPLETED');
    expect(output.outputVideoUrl).toMatch(/^\/api\/storage\/files\//);
    expect(output.durationSeconds).toBeGreaterThan(0);
    expect(output.fileSizeBytes).toBeGreaterThan(0);
    expect(output.resolution).toEqual({ width: 1080, height: 1920 });

    // 3. Verify MP4 file actually exists on disk
    const relativeKey = output.storageKey!;
    const filePath = path.resolve(process.cwd(), 'uploads', relativeKey);
    expect(fs.existsSync(filePath)).toBe(true);
    const stats = fs.statSync(filePath);
    expect(stats.size).toBeGreaterThan(1000); // Real MP4 file size

    // 4. Verify database record is updated
    const updatedReel = await mockReelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
    expect(updatedReel).not.toBeNull();
    expect(updatedReel!.status).toBe('COMPLETED');
    expect(updatedReel!.outputVideoUrl).toBe(output.outputVideoUrl);
    expect(updatedReel!.renderOutput).toBeDefined();
    expect(updatedReel!.renderOutput!.status).toBe('COMPLETED');
    expect(updatedReel!.renderOutput!.fileSizeBytes).toBe(stats.size);
  }, 60000);

  it('verifies listByBrandId returns the completed render output and videoUrl', async () => {
    await renderService.renderReelVideo(reelPlanId, workspaceId);

    const brandReels = await mockReelRepo.listByBrandId(brandId);
    expect(brandReels.length).toBeGreaterThan(0);

    const renderedReel = brandReels.find((r: ReelProductionPlan) => r.id === reelPlanId);
    expect(renderedReel).toBeDefined();
    expect(renderedReel!.status).toBe('COMPLETED');
    expect(renderedReel!.outputVideoUrl).toMatch(/^\/api\/storage\/files\//);
  }, 60000);
});
