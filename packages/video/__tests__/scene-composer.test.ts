import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SceneComposer } from '../src/sceneComposer.js';
import { PlatformSafeArea } from '../src/safeAreas.js';
import type { Brand, BrandProduct, ReelScene, SceneVideoArtifact } from '@vidsnapai/types';

describe('SceneComposer & Platform Safe Areas', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidsnapai_test_scene_composer_'));
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  const brand: Brand = {
    id: 'brand-test-lumina',
    workspaceId: 'ws-test-1',
    name: 'LuminaTech Acoustics',
    slug: 'luminatech-acoustics',
    description: 'High performance noise-canceling headphones',
    industry: 'Consumer Audio',
    brandColors: {
      primary: '#6366F1',
      secondary: '#EC4899',
      accent: '#10B981',
      background: '#0F172A',
      text: '#FFFFFF'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const product: BrandProduct = {
    id: 'prod-lumina-one',
    brandId: brand.id,
    name: 'Lumina One Studio Pro',
    category: 'Audio',
    description: 'Titanium acoustic studio headphones',
    price: 399,
    currency: 'USD',
    features: ['Titanium Drivers', 'Zero Distortion'],
    benefits: ['Audiophile Sound', 'All-Day Comfort'],
    usps: ['Active Noise Cancellation'],
    cta: 'Order Lumina One Today',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('Platform Safe Area Geometry & Placement', () => {
    it('calculates accurate safe boundaries for Instagram Reels, TikTok, and YouTube Shorts', () => {
      const igBounds = PlatformSafeArea.getSafeBounds('INSTAGRAM_REELS', 1080, 1920);
      expect(igBounds.top).toBe(288); // 15% of 1920
      expect(igBounds.bottom).toBe(1498); // 100% - 22% = 78% of 1920
      expect(igBounds.left).toBe(86);
      expect(igBounds.right).toBe(950);

      const ttBounds = PlatformSafeArea.getSafeBounds('TIKTOK', 1080, 1920);
      expect(ttBounds.top).toBe(192); // 10%
      expect(ttBounds.bottom).toBe(1440); // 100% - 25% = 75% of 1920
      expect(ttBounds.right).toBe(918);

      const universalBounds = PlatformSafeArea.getSafeBounds('UNIVERSAL', 1080, 1920);
      expect(universalBounds.top).toBe(288);
      expect(universalBounds.bottom).toBe(1440);
    });

    it('positions critical motion graphics elements within designated platform safe zones', () => {
      const logoPlacement = PlatformSafeArea.getElementSafePlacement('LOGO_TOP', 'UNIVERSAL');
      expect(logoPlacement.yRatio).toBe(0.16);

      const badgePlacement = PlatformSafeArea.getElementSafePlacement('FEATURE_BADGE', 'UNIVERSAL');
      expect(badgePlacement.yRatio).toBe(0.24);

      const heroPlacement = PlatformSafeArea.getElementSafePlacement('PRODUCT_HERO', 'UNIVERSAL');
      expect(heroPlacement.yRatio).toBe(0.50);

      const captionPlacement = PlatformSafeArea.getElementSafePlacement('KINETIC_CAPTIONS', 'UNIVERSAL');
      expect(captionPlacement.yRatio).toBe(0.62);

      const ctaPlacement = PlatformSafeArea.getElementSafePlacement('CTA_BUTTON', 'UNIVERSAL');
      expect(ctaPlacement.yRatio).toBe(0.68);

      // Verify pixel placement is within universal safe boundaries
      const captionY = 1920 * captionPlacement.yRatio;
      expect(PlatformSafeArea.isWithinSafeArea(captionY, 80, 1920, 'UNIVERSAL')).toBe(true);

      const ctaY = 1920 * ctaPlacement.yRatio;
      expect(PlatformSafeArea.isWithinSafeArea(ctaY, 80, 1920, 'UNIVERSAL')).toBe(true);
    });
  });

  describe('String Sanitization for FFmpeg Drawtext Filters', () => {
    it('escapes special characters, quotes, and colons safely', () => {
      const raw = "Discover the world's best 100% titanium sound: pure & clear\\bold";
      const sanitized = SceneComposer.sanitizeTextForFfmpeg(raw);
      expect(sanitized).not.toContain("'");
      expect(sanitized).toContain("\u2019");
      expect(sanitized).toContain('\\:');
      expect(sanitized).toContain('100 percent');
      expect(sanitized).toContain('\\\\');
    });
  });

  describe('Scene Video Artifact Generation & Master Timeline Assembly', () => {
    it('generates a valid SceneVideoArtifact for a single scene clip', async () => {
      const scene: ReelScene = {
        sceneNumber: 1,
        durationSeconds: 3.0,
        purpose: 'HOOK',
        narration: 'Experience revolutionary sound.',
        onScreenText: 'UNMATCHED CLARITY',
        visualType: 'PRODUCT_SHOWCASE',
        subject: 'Lumina One Headphone Reveal',
        environment: 'Sleek luxury gradient backdrop',
        composition: 'Macro central portrait',
        camera: 'Push in',
        lighting: 'Neon rim',
        mood: 'Electric',
        transition: 'Whip cut',
        animationIntent: 'Kinetic pop',
        assetRequirement: 'Hero image of Lumina One',
        productReference: product.id,
        brandElement: brand.name
      };

      const outputPath = path.join(tempDir, 'scene-1.mp4');

      const artifact = await SceneComposer.composeSceneClip({
        scene,
        sceneNumber: 1,
        duration: 3.0,
        brand,
        product,
        platform: 'UNIVERSAL',
        featureText: 'TITANIUM DRIVERS',
        outputPath
      });

      expect(artifact).toBeDefined();
      expect(artifact.sceneNumber).toBe(1);
      expect(artifact.duration).toBe(3.0);
      expect(artifact.width).toBe(1080);
      expect(artifact.height).toBe(1920);
      expect(artifact.fps).toBe(30);
      expect(artifact.status).toBe('READY');
      expect(artifact.localPath).toBe(outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);
      const stat = await fs.promises.stat(outputPath);
      expect(stat.size).toBeGreaterThan(1000);
    });

    it('assembles multiple SceneVideoArtifacts with transitions into a final master video', async () => {
      const scene1: ReelScene = {
        sceneNumber: 1,
        durationSeconds: 2.0,
        purpose: 'HOOK',
        narration: 'Stop settling for ordinary.',
        onScreenText: 'STOP SETTLING',
        visualType: 'PRODUCT_SHOWCASE',
        subject: 'Hero reveal',
        environment: 'Dark gradient',
        composition: 'Center',
        camera: 'Push in',
        lighting: 'Studio',
        mood: 'Fast',
        transition: 'Whip cut',
        animationIntent: 'Bold pop',
        assetRequirement: 'Product photo',
        productReference: product.id,
        brandElement: brand.name
      };

      const scene2: ReelScene = {
        sceneNumber: 2,
        durationSeconds: 2.0,
        purpose: 'CTA',
        narration: 'Get Lumina One today.',
        onScreenText: 'SHOP NOW',
        visualType: 'CTA',
        subject: 'CTA endcard',
        environment: 'Clean gradient',
        composition: 'Center card',
        camera: 'Locked',
        lighting: 'Studio',
        mood: 'Urgent',
        transition: 'Fade',
        animationIntent: 'Pulse',
        assetRequirement: 'Endcard',
        productReference: product.id,
        brandElement: brand.name
      };

      const path1 = path.join(tempDir, 'scene-1-clip.mp4');
      const path2 = path.join(tempDir, 'scene-2-clip.mp4');
      const masterPath = path.join(tempDir, 'master-reel.mp4');

      const art1 = await SceneComposer.composeSceneClip({
        scene: scene1,
        sceneNumber: 1,
        duration: 2.0,
        brand,
        product,
        outputPath: path1
      });

      const art2 = await SceneComposer.composeSceneClip({
        scene: scene2,
        sceneNumber: 2,
        duration: 2.0,
        brand,
        product,
        isCtaScene: true,
        ctaText: 'SHOP NOW',
        outputPath: path2
      });

      const artifacts: SceneVideoArtifact[] = [art1, art2];

      await SceneComposer.assembleMasterTimeline({
        sceneArtifacts: artifacts,
        totalDuration: 4.0,
        width: 1080,
        height: 1920,
        fps: 30,
        outputPath: masterPath
      });

      expect(fs.existsSync(masterPath)).toBe(true);
      const masterStat = await fs.promises.stat(masterPath);
      expect(masterStat.size).toBeGreaterThan(10000);
    });
  });
});
