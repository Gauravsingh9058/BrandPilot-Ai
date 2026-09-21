import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import {
  ProductionAssetValidator
} from '../packages/media/src/productionAssetValidator.js';
import { VisualFrameValidator } from '../packages/video/src/visualFrameValidator.js';
import { VideoRenderService } from '../packages/video/src/videoRenderService.js';
import type { ReelProductionPlan } from '@vidsnapai/types';

describe('Production Asset Validation & Deterministic Provenance Pipeline', () => {
  let tempDir: string;
  let validProductImage: string;
  let emptyMediaFile: string;
  let unsupportedMediaFile: string;
  let testPatternMediaFile: string;
  let solidBlueVideoFile: string;

  beforeAll(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidsnapai_prod_test_'));

    // 1. Create a genuine product test image (gradient with high variance & content)
    validProductImage = path.join(tempDir, 'genuine_hero_sneaker.png');
    await new Promise<void>((resolve, reject) => {
      const ff = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'gradients=s=1080x1920:d=1:c0=0xFF4500:c1=0x1E293B',
        '-vframes', '1',
        '-y',
        validProductImage
      ], { windowsHide: true });
      ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg failed'))));
      ff.on('error', reject);
    });

    // 2. Create an empty (0 bytes) file
    emptyMediaFile = path.join(tempDir, 'empty_asset.png');
    await fs.promises.writeFile(emptyMediaFile, Buffer.alloc(0));

    // 3. Create unsupported format file
    unsupportedMediaFile = path.join(tempDir, 'executable_payload.exe');
    await fs.promises.writeFile(unsupportedMediaFile, Buffer.from('MZ...test'));

    // 4. Create test pattern named file
    testPatternMediaFile = path.join(tempDir, 'smptebars_pattern.png');
    await fs.promises.copyFile(validProductImage, testPatternMediaFile);

    // 5. Create a solid blue video to test VisualFrameValidator uniform detection
    solidBlueVideoFile = path.join(tempDir, 'solid_blue_screen.mp4');
    await new Promise<void>((resolve, reject) => {
      const ff = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'color=c=0x0000FF:s=720x1280:d=2:r=30',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-y',
        solidBlueVideoFile
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
      // ignore cleanup
    }
  });

  describe('1. ProductionAssetValidator - Asset Record Eligibility', () => {
    const defaultContext = {
      workspaceId: 'ws-123',
      brandId: 'brand-456',
      productId: 'prod-789',
      isProduction: true
    };

    it('rejects null or missing asset with PRODUCT_ASSET_REQUIRED', () => {
      const result = ProductionAssetValidator.validateAssetEligibility(null, defaultContext);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRODUCT_ASSET_REQUIRED');
    });

    it('rejects asset marked as isPlaceholder === true with PRODUCT_ASSET_PLACEHOLDER', () => {
      const result = ProductionAssetValidator.validateAssetEligibility(
        {
          id: 'asset-1',
          name: 'Hero Mockup',
          isPlaceholder: true,
          productionEligible: true
        } as any,
        defaultContext
      );
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRODUCT_ASSET_PLACEHOLDER');
    });

    it('rejects asset marked as isTestAsset === true with PRODUCT_ASSET_INVALID', () => {
      const result = ProductionAssetValidator.validateAssetEligibility(
        {
          id: 'asset-2',
          name: 'Test Debug Visual',
          isTestAsset: true,
          productionEligible: true
        } as any,
        defaultContext
      );
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRODUCT_ASSET_INVALID');
    });

    it('rejects asset with productionEligible === false with PRODUCT_ASSET_NOT_PRODUCTION_ELIGIBLE', () => {
      const result = ProductionAssetValidator.validateAssetEligibility(
        {
          id: 'asset-3',
          name: 'Unverified Web Scrape',
          productionEligible: false
        } as any,
        defaultContext
      );
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRODUCT_ASSET_NOT_PRODUCTION_ELIGIBLE');
    });

    it('rejects assets containing synthetic/test-pattern keywords in filename or URL', () => {
      for (const kw of ['smptebars', 'testsrc', 'color_bars', 'zoneplate', 'placeholder_frame']) {
        const result = ProductionAssetValidator.validateAssetEligibility(
          {
            id: `asset-${kw}`,
            filename: `output_${kw}.png`,
            sourceUrl: `https://cdn.example.com/${kw}.png`,
            productionEligible: true
          } as any,
          defaultContext
        );
        expect(result.valid).toBe(false);
        expect(['PRODUCT_ASSET_INVALID', 'PRODUCT_ASSET_PLACEHOLDER']).toContain(result.errorCode);
      }
    });

    it('rejects workspace or brand provenance mismatches', () => {
      const wsMismatch = ProductionAssetValidator.validateAssetEligibility(
        {
          id: 'asset-ws',
          workspaceId: 'other-ws-999',
          brandId: 'brand-456',
          productionEligible: true
        } as any,
        defaultContext
      );
      expect(wsMismatch.valid).toBe(false);
      expect(wsMismatch.errorCode).toBe('PRODUCT_ASSET_INVALID');

      const brandMismatch = ProductionAssetValidator.validateAssetEligibility(
        {
          id: 'asset-brand',
          workspaceId: 'ws-123',
          brandId: 'other-brand-888',
          productionEligible: true
        } as any,
        defaultContext
      );
      expect(brandMismatch.valid).toBe(false);
      expect(brandMismatch.errorCode).toBe('PRODUCT_ASSET_INVALID');
    });

    it('rejects product ID mismatch when asset is bound to a different product', () => {
      const result = ProductionAssetValidator.validateAssetEligibility(
        {
          id: 'asset-prod-mismatch',
          workspaceId: 'ws-123',
          brandId: 'brand-456',
          productId: 'different-product-999',
          productionEligible: true
        } as any,
        defaultContext
      );
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRODUCT_ASSET_INVALID');
    });

    it('allows verified, production-eligible product asset', () => {
      const result = ProductionAssetValidator.validateAssetEligibility(
        {
          id: 'asset-valid',
          workspaceId: 'ws-123',
          brandId: 'brand-456',
          productId: 'prod-789',
          name: 'AirMax_Velocity_Red_Angle1.png',
          sourceUrl: 'https://cdn.example.com/products/AirMax_Velocity_Red_Angle1.png',
          isPlaceholder: false,
          isTestAsset: false,
          productionEligible: true
        } as any,
        defaultContext
      );
      expect(result.valid).toBe(true);
      expect(result.productionEligible).toBe(true);
    });
  });

  describe('2. ProductionAssetValidator - Local File & Container Inspection', () => {
    it('rejects non-existent local file with MEDIA_ASSET_UNAVAILABLE', async () => {
      const result = await ProductionAssetValidator.validateLocalMediaFile(
        path.join(tempDir, 'non_existent_file_xyz.png'),
        { isProduction: true }
      );
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('MEDIA_ASSET_UNAVAILABLE');
    });

    it('rejects 0-byte file with MEDIA_ASSET_DOWNLOAD_FAILED', async () => {
      const result = await ProductionAssetValidator.validateLocalMediaFile(
        emptyMediaFile,
        { isProduction: true }
      );
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('MEDIA_ASSET_DOWNLOAD_FAILED');
    });

    it('rejects unsupported file extension with PRODUCT_ASSET_INVALID', async () => {
      const result = await ProductionAssetValidator.validateLocalMediaFile(
        unsupportedMediaFile,
        { isProduction: true }
      );
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRODUCT_ASSET_INVALID');
    });

    it('rejects test-pattern named files in production mode', async () => {
      const result = await ProductionAssetValidator.validateLocalMediaFile(
        testPatternMediaFile,
        { isProduction: true }
      );
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRODUCT_ASSET_INVALID');
    });

    it('validates genuine product image file dimensions and metadata', async () => {
      const result = await ProductionAssetValidator.validateLocalMediaFile(
        validProductImage,
        { isProduction: true }
      );
      expect(result.valid).toBe(true);
      expect(result.details?.fileSizeBytes).toBeGreaterThan(0);
      expect(result.details?.width).toBe(1080);
      expect(result.details?.height).toBe(1920);
    });
  });

  describe('3. VisualFrameValidator - Advanced Quality Inspection', () => {
    it('detects solid/uniform screen video and fails visual validation', async () => {
      const validation = await VisualFrameValidator.validateVideo(solidBlueVideoFile, {
        durationSeconds: 2
      });
      expect(validation.valid).toBe(false);
      expect(validation.failureReason).toBeDefined();
    });

    it('passes high-variance, multi-chroma video frames', async () => {
      // Create a dynamic high-entropy video using smooth animated color gradient
      const dynamicVideo = path.join(tempDir, 'dynamic_video.mp4');
      await new Promise<void>((resolve, reject) => {
        const ff = spawn('ffmpeg', [
          '-f', 'lavfi',
          '-i', 'gradients=s=720x1280:d=2:r=30:c0=0xFF4500:c1=0x00FF88:speed=0.05',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-y',
          dynamicVideo
        ], { windowsHide: true });
        ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg failed'))));
        ff.on('error', reject);
      });

      const validation = await VisualFrameValidator.validateVideo(dynamicVideo, {
        durationSeconds: 2
      });
      expect(validation.valid).toBe(true);
      expect(validation.averageStdDev).toBeGreaterThan(5);
    }, 30000);
  });

  describe('4. VideoRenderService - Pipeline Pre-Render & Production Gateways', () => {
    const mockDb: any = {};
    const mockReelPlan: ReelProductionPlan = {
      id: 'reel-test-123',
      workspaceId: 'ws-123',
      brandId: 'brand-456',
      title: 'Test Launch Reel',
      status: 'READY_TO_RENDER',
      durationSeconds: 5,
      scenes: [
        {
          sceneNumber: 1,
          visualType: 'HERO',
          purpose: 'Hook',
          narration: 'Introducing our newest line',
          durationSeconds: 5
        }
      ] as any,
      concept: { title: 'Test', caption: 'Test', hashtags: [] } as any,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('rejects render with PRODUCT_ASSET_REQUIRED if package has no product assets in production', async () => {
      const mockReelRepo = {
        findByIdAndWorkspace: async () => mockReelPlan,
        updateStatus: async () => {},
        saveRenderOutput: async () => {}
      };

      const mockPackageService = {
        getPackageByReelPlanId: async () => ({
          reelPlanId: mockReelPlan.id,
          workspaceId: mockReelPlan.workspaceId,
          packagePayload: { assets: [] }
        })
      };

      const renderService = new VideoRenderService(mockDb, {
        reelRepo: mockReelRepo as any,
        packageService: mockPackageService as any
      });

      await expect(
        renderService.renderReelVideo(mockReelPlan.id, mockReelPlan.workspaceId, {
          renderMode: 'PRODUCTION'
        })
      ).rejects.toThrow(/PRODUCT_ASSET_REQUIRED/);
    });

    it('rejects render with PRODUCT_ASSET_PLACEHOLDER if package contains a placeholder asset', async () => {
      const mockReelRepo = {
        findByIdAndWorkspace: async () => mockReelPlan,
        updateStatus: async () => {},
        saveRenderOutput: async () => {}
      };

      const mockPackageService = {
        getPackageByReelPlanId: async () => ({
          reelPlanId: mockReelPlan.id,
          workspaceId: mockReelPlan.workspaceId,
          packagePayload: {
            assets: [
              {
                id: 'asset-placeholder-1',
                assetType: 'PRODUCT_IMAGE',
                name: 'placeholder_product.png',
                isPlaceholder: true,
                productionEligible: true,
                status: 'READY'
              }
            ]
          }
        })
      };

      const renderService = new VideoRenderService(mockDb, {
        reelRepo: mockReelRepo as any,
        packageService: mockPackageService as any
      });

      await expect(
        renderService.renderReelVideo(mockReelPlan.id, mockReelPlan.workspaceId, {
          renderMode: 'PRODUCTION'
        })
      ).rejects.toThrow(/PRODUCT_ASSET_PLACEHOLDER/);
    });

    it('rejects render with PRODUCT_ASSET_INVALID if package contains a test asset', async () => {
      const mockReelRepo = {
        findByIdAndWorkspace: async () => mockReelPlan,
        updateStatus: async () => {},
        saveRenderOutput: async () => {}
      };

      const mockPackageService = {
        getPackageByReelPlanId: async () => ({
          reelPlanId: mockReelPlan.id,
          workspaceId: mockReelPlan.workspaceId,
          packagePayload: {
            assets: [
              {
                id: 'asset-test-1',
                assetType: 'PRODUCT_IMAGE',
                name: 'smptebars_bars.png',
                isTestAsset: true,
                productionEligible: true,
                status: 'READY'
              }
            ]
          }
        })
      };

      const renderService = new VideoRenderService(mockDb, {
        reelRepo: mockReelRepo as any,
        packageService: mockPackageService as any
      });

      await expect(
        renderService.renderReelVideo(mockReelPlan.id, mockReelPlan.workspaceId, {
          renderMode: 'PRODUCTION'
        })
      ).rejects.toThrow(/PRODUCT_ASSET_INVALID/);
    });
  });
});
