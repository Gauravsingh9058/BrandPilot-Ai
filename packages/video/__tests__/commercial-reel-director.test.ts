import { describe, it, expect } from 'vitest';
import { ReelProductionDirector } from '../src/directors/reelProductionDirector.js';
import { validateSceneSequence } from '../src/validators/sceneValidator.js';
import { validateAndSanitizeReel } from '../src/validators/reelValidator.js';
import { ReelOrchestrator } from '../src/reelOrchestrator.js';
import { MockAIProvider } from '@vidsnapai/ai';
import type { Brand, BrandProduct, BrandAsset, ContentJob, ReelScene } from '@vidsnapai/types';

describe('ReelProductionDirector & High-Quality Brand Commercial Pipeline', () => {
  const mockBrand: Brand = {
    id: 'brand_lumina_01',
    workspaceId: 'ws_01',
    name: 'Lumina Audio',
    description: 'Precision acoustic engineering meets minimalist Scandinavian design.',
    industry: 'Consumer Electronics',
    tagline: 'Pure Sound. Uncompromised Elegance.',
    uniqueSellingPoints: ['Lossless spatial audio', 'Aerospace aluminum construction', '40-hour battery life'],
    targetAudience: 'Audiophiles, modern creators, and discerning professionals',
    brandVoice: 'Sophisticated, articulate, inspiring',
    brandColors: {
      primary: '#0F172A',
      secondary: '#38BDF8',
      accent: '#F59E0B'
    },
    primaryCta: 'Experience Lumina One',
    websiteUrl: 'https://luminaaudio.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockProduct: BrandProduct = {
    id: 'prod_lumina_one',
    brandId: 'brand_lumina_01',
    name: 'Lumina One Headphones',
    description: 'Flagship wireless spatial headphones with adaptive acoustic calibration.',
    category: 'Audio',
    features: ['Custom 45mm beryllium drivers', 'Adaptive hybrid active noise cancellation', 'Ultra-plush memory foam'],
    benefits: ['Zero listening fatigue', 'Studio-master sound reproduction anywhere', 'Seamless multi-device connectivity'],
    usps: ['Precision beryllium acoustic architecture', 'Pure silent isolation'],
    targetAudience: 'Music producers, executive travelers, and audio purists',
    price: '$399',
    offerInfo: 'Launch edition includes titanium travel case',
    cta: 'Order Lumina One Now',
    metadata: {
      sku: 'LUM-01-TITAN'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockBrandAssets: BrandAsset[] = [
    {
      id: 'asset_logo_01',
      brandId: 'brand_lumina_01',
      type: 'LOGO',
      assetPurpose: 'LOGO',
      name: 'lumina-white-logo.png',
      storageKey: 'brands/lumina/logo.png',
      url: 'https://cdn.vidsnapai.com/brands/lumina/logo.png',
      mimeType: 'image/png',
      fileSize: 45000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const mockProductAssets: BrandAsset[] = [
    {
      id: 'asset_hero_01',
      brandId: 'brand_lumina_01',
      productId: 'prod_lumina_one',
      type: 'PRODUCT_IMAGE',
      assetPurpose: 'HERO',
      name: 'lumina-one-hero-angle.png',
      storageKey: 'products/lumina/lumina-hero.png',
      url: 'https://cdn.vidsnapai.com/products/lumina/lumina-hero.png',
      mimeType: 'image/png',
      fileSize: 1200000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'asset_detail_01',
      brandId: 'brand_lumina_01',
      productId: 'prod_lumina_one',
      type: 'PRODUCT_IMAGE',
      assetPurpose: 'DETAIL',
      name: 'lumina-one-earcup-detail.png',
      storageKey: 'products/lumina/lumina-detail.png',
      url: 'https://cdn.vidsnapai.com/products/lumina/lumina-detail.png',
      mimeType: 'image/png',
      fileSize: 980000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const mockContentJob: ContentJob = {
    id: 'job_commercial_01',
    contentPlanId: 'plan_01',
    workspaceId: 'ws_01',
    title: 'Lumina One Launch Commercial',
    topic: 'Studio Acoustic Precision in a Wireless Headphone',
    funnelStage: 'CONSIDERATION',
    format: 'REEL',
    status: 'READY',
    scheduledDate: new Date().toISOString(),
    hook: 'Stop settling for compressed, lifeless audio.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  describe('30-Second Commercial Blueprint Generation', () => {
    it('generates a 7-scene production commercial blueprint with exact timing and structure', () => {
      const blueprint = ReelProductionDirector.directCommercialBlueprint({
        brand: mockBrand,
        product: mockProduct,
        brandAssets: mockBrandAssets,
        productAssets: mockProductAssets,
        contentJob: mockContentJob,
        targetDurationSeconds: 30
      });

      expect(blueprint.scenes).toHaveLength(7);
      expect(blueprint.durationSeconds).toBe(30);

      // Check scene purposes & structure
      const purposes = blueprint.scenes.map((s) => s.purpose);
      expect(purposes[0]).toBe('HOOK');
      expect(purposes[1]).toBe('PROBLEM / DESIRE');
      expect(purposes[2]).toBe('PRODUCT HERO');
      expect(purposes[3]).toBe('FEATURE');
      expect(purposes[4]).toBe('BENEFIT');
      expect(purposes[5]).toBe('BRAND MOMENT');
      expect(purposes[6]).toBe('CTA');

      // Check scene timings sum to exactly 30s
      const totalSceneDuration = blueprint.scenes.reduce((acc, s) => acc + s.durationSeconds, 0);
      expect(totalSceneDuration).toBeCloseTo(30.0, 1);

      // Scene 1: 0-4s
      expect(blueprint.scenes[0].durationSeconds).toBe(4.0);
      // Scene 2: 4-8s
      expect(blueprint.scenes[1].durationSeconds).toBe(4.0);
      // Scene 3: 8-13s (5s)
      expect(blueprint.scenes[2].durationSeconds).toBe(5.0);
      // Scene 4: 13-18s (5s)
      expect(blueprint.scenes[3].durationSeconds).toBe(5.0);
      // Scene 5: 18-23s (5s)
      expect(blueprint.scenes[4].durationSeconds).toBe(5.0);
      // Scene 6: 23-27s (4s)
      expect(blueprint.scenes[5].durationSeconds).toBe(4.0);
      // Scene 7: 27-30s (3s)
      expect(blueprint.scenes[6].durationSeconds).toBe(3.0);
    });

    it('attaches product assets and Veo 3.1 directives to PRODUCT HERO scene', () => {
      const blueprint = ReelProductionDirector.directCommercialBlueprint({
        brand: mockBrand,
        product: mockProduct,
        brandAssets: mockBrandAssets,
        productAssets: mockProductAssets,
        contentJob: mockContentJob,
        targetDurationSeconds: 30
      });

      const heroScene = blueprint.scenes.find((s) => s.purpose === 'PRODUCT HERO');
      expect(heroScene).toBeDefined();
      expect(heroScene!.productReference).toBe(mockProduct.id);
      expect(heroScene!.referenceAssetIds).toContain('asset_hero_01');
      expect(heroScene!.firstFrameAssetId).toBe('asset_hero_01');

      // Check Veo 3.1 properties
      expect(heroScene!.veoPrompt).toBeDefined();
      expect(heroScene!.veoPrompt).toContain(mockProduct.name);
      expect(heroScene!.cameraMovement).toBeDefined();
      expect(heroScene!.cameraMovement!.toLowerCase()).toContain('orbit');
      expect(heroScene!.motion).toBeDefined();
      expect(heroScene!.productPreservationRules).toBeDefined();
      expect(heroScene!.brandPreservationRules).toBeDefined();
      expect(heroScene!.textSafeComposition).toBeDefined();
    });

    it('populates all 18 required Director fields on every scene', () => {
      const blueprint = ReelProductionDirector.directCommercialBlueprint({
        brand: mockBrand,
        product: mockProduct,
        brandAssets: mockBrandAssets,
        productAssets: mockProductAssets,
        contentJob: mockContentJob,
        targetDurationSeconds: 30
      });

      for (const scene of blueprint.scenes) {
        expect(scene.sceneNumber).toBeGreaterThan(0);
        expect(scene.durationSeconds).toBeGreaterThan(0);
        expect(scene.purpose).toBeTruthy();
        expect(scene.narration).toBeTruthy();
        expect(scene.onScreenText).toBeTruthy();
        expect(scene.visualType).toBeTruthy();
        expect(scene.subject).toBeTruthy();
        expect(scene.environment).toBeTruthy();
        expect(scene.composition).toBeTruthy();
        expect(scene.camera).toBeTruthy();
        expect(scene.lighting).toBeTruthy();
        expect(scene.mood).toBeTruthy();
        expect(scene.transition).toBeTruthy();
        expect(scene.animationIntent).toBeTruthy();
        expect(scene.assetRequirement).toBeTruthy();
        expect(scene.veoPrompt).toBeTruthy();
        expect(scene.veoNegativePrompt).toBeTruthy();
      }
    });
  });

  describe('Short Format Commercial Blueprints (15s and 20s)', () => {
    it('generates a 4-scene commercial blueprint for 20-second target duration', () => {
      const blueprint = ReelProductionDirector.directCommercialBlueprint({
        brand: mockBrand,
        product: mockProduct,
        brandAssets: mockBrandAssets,
        productAssets: mockProductAssets,
        contentJob: mockContentJob,
        targetDurationSeconds: 20
      });

      expect(blueprint.scenes).toHaveLength(4);
      expect(blueprint.durationSeconds).toBe(20);

      const totalDuration = blueprint.scenes.reduce((acc, s) => acc + s.durationSeconds, 0);
      expect(totalDuration).toBeCloseTo(20.0, 1);

      const purposes = blueprint.scenes.map((s) => s.purpose);
      expect(purposes[0]).toBe('HOOK');
      expect(purposes[1]).toBe('PRODUCT HERO');
      expect(purposes[2]).toBe('BENEFIT');
      expect(purposes[3]).toBe('CTA');
    });

    it('generates a 4-scene commercial blueprint for 15-second target duration', () => {
      const blueprint = ReelProductionDirector.directCommercialBlueprint({
        brand: mockBrand,
        product: mockProduct,
        brandAssets: mockBrandAssets,
        productAssets: mockProductAssets,
        contentJob: mockContentJob,
        targetDurationSeconds: 15
      });

      expect(blueprint.scenes).toHaveLength(4);
      expect(blueprint.durationSeconds).toBe(15);

      const totalDuration = blueprint.scenes.reduce((acc, s) => acc + s.durationSeconds, 0);
      expect(totalDuration).toBeCloseTo(15.0, 1);
    });
  });

  describe('Hard Validation Requirements', () => {
    it('rejects a 30s reel blueprint with fewer than 5 scenes', () => {
      const invalidScenes: ReelScene[] = [
        {
          sceneNumber: 1,
          durationSeconds: 10,
          purpose: 'HOOK',
          narration: 'Hook',
          onScreenText: 'HOOK',
          visualType: 'PROBLEM',
          subject: 'Subject',
          environment: 'Studio',
          composition: 'Centered',
          camera: 'Static',
          lighting: 'Studio',
          mood: 'Urgent',
          transition: 'Cut',
          animationIntent: 'Pop',
          assetRequirement: 'Visual'
        },
        {
          sceneNumber: 2,
          durationSeconds: 10,
          purpose: 'PRODUCT HERO',
          narration: 'Meet the product',
          onScreenText: 'PRODUCT',
          visualType: 'PRODUCT_HERO',
          subject: 'Subject',
          environment: 'Studio',
          composition: 'Centered',
          camera: 'Static',
          lighting: 'Studio',
          mood: 'Premium',
          transition: 'Cut',
          animationIntent: 'Pop',
          assetRequirement: 'Visual',
          productReference: 'Lumina One'
        },
        {
          sceneNumber: 3,
          durationSeconds: 10,
          purpose: 'CTA',
          narration: 'Buy now',
          onScreenText: 'CTA',
          visualType: 'CTA',
          subject: 'Subject',
          environment: 'Studio',
          composition: 'Centered',
          camera: 'Static',
          lighting: 'Studio',
          mood: 'Decisive',
          transition: 'Cut',
          animationIntent: 'Pop',
          assetRequirement: 'Visual'
        }
      ];

      const result = validateSceneSequence(invalidScenes, { targetDurationSeconds: 30 });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('requires at least 5 scenes'))).toBe(true);
    });

    it('rejects a 20s or 15s reel blueprint with fewer than 4 scenes', () => {
      const invalidScenes: ReelScene[] = [
        {
          sceneNumber: 1,
          durationSeconds: 7,
          purpose: 'HOOK',
          narration: 'Hook',
          onScreenText: 'HOOK',
          visualType: 'PROBLEM',
          subject: 'Subject',
          environment: 'Studio',
          composition: 'Centered',
          camera: 'Static',
          lighting: 'Studio',
          mood: 'Urgent',
          transition: 'Cut',
          animationIntent: 'Pop',
          assetRequirement: 'Visual'
        },
        {
          sceneNumber: 2,
          durationSeconds: 7,
          purpose: 'PRODUCT HERO',
          narration: 'Meet the product',
          onScreenText: 'PRODUCT',
          visualType: 'PRODUCT_HERO',
          subject: 'Subject',
          environment: 'Studio',
          composition: 'Centered',
          camera: 'Static',
          lighting: 'Studio',
          mood: 'Premium',
          transition: 'Cut',
          animationIntent: 'Pop',
          assetRequirement: 'Visual',
          productReference: 'Lumina One'
        },
        {
          sceneNumber: 3,
          durationSeconds: 6,
          purpose: 'CTA',
          narration: 'Buy now',
          onScreenText: 'CTA',
          visualType: 'CTA',
          subject: 'Subject',
          environment: 'Studio',
          composition: 'Centered',
          camera: 'Static',
          lighting: 'Studio',
          mood: 'Decisive',
          transition: 'Cut',
          animationIntent: 'Pop',
          assetRequirement: 'Visual'
        }
      ];

      const result20 = validateSceneSequence(invalidScenes, { targetDurationSeconds: 20 });
      expect(result20.valid).toBe(false);
      expect(result20.errors.some((e) => e.includes('requires at least 4 scenes'))).toBe(true);

      const result15 = validateSceneSequence(invalidScenes, { targetDurationSeconds: 15 });
      expect(result15.valid).toBe(false);
      expect(result15.errors.some((e) => e.includes('requires at least 4 scenes'))).toBe(true);
    });

    it('enforces total scene duration within 0.5s of target duration in reelValidator', () => {
      const blueprint = ReelProductionDirector.directCommercialBlueprint({
        brand: mockBrand,
        product: mockProduct,
        brandAssets: mockBrandAssets,
        productAssets: mockProductAssets,
        contentJob: mockContentJob,
        targetDurationSeconds: 30
      });

      const validation = validateAndSanitizeReel(blueprint, {
        targetDurationSeconds: 30,
        brand: mockBrand,
        products: [mockProduct]
      });

      expect(validation.valid).toBe(true);
      expect(Math.abs(validation.calculatedDuration - 30)).toBeLessThanOrEqual(0.5);
    });
  });

  describe('End-to-End ReelOrchestrator Integration', () => {
    it('orchestrates commercial reel generation via MockAIProvider adhering to all constraints', async () => {
      const mockAi = new MockAIProvider();
      const orchestrator = new ReelOrchestrator(mockAi);

      const plan = await orchestrator.generateReelPlan({
        brand: mockBrand,
        products: [mockProduct],
        contentJob: mockContentJob,
        input: { durationSeconds: 30 }
      });

      expect(plan.scenes.length).toBeGreaterThanOrEqual(5);
      expect(plan.durationSeconds).toBe(30);
      expect(plan.scenes[0].purpose).toBe('HOOK');
      expect(plan.scenes[plan.scenes.length - 1].purpose).toBe('CTA');

      // Veo 3.1 prompt presence
      for (const scene of plan.scenes) {
        expect(scene.veoPrompt).toBeDefined();
        expect(scene.veoPrompt!.length).toBeGreaterThan(10);
      }
    });
  });
});
