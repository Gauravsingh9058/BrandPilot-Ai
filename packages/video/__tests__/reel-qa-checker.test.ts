import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { ReelQAChecker } from '../src/reelQAChecker.js';
import type { ReelProductionPlan, Brand, BrandProduct, ReelScene, SceneVideoArtifact } from '@vidsnapai/types';

describe('ReelQAChecker & Strict QA Guardrails', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidsnapai_test_qa_'));
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  const brand: Brand = {
    id: 'brand-qa-1',
    workspaceId: 'ws-qa-1',
    name: 'Velocity Audio Labs',
    slug: 'velocity-audio-labs',
    description: 'Precision studio acoustic hardware',
    industry: 'Consumer Electronics',
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
    id: 'prod-velocity-x',
    brandId: brand.id,
    name: 'Velocity X Pro Earphones',
    category: 'Audio',
    description: 'Spatial wireless earphones',
    price: 199,
    currency: 'USD',
    features: ['Spatial Audio', 'Active ANC'],
    benefits: ['Immersive sound'],
    usps: ['Sub-20ms latency'],
    cta: 'Shop Velocity X Now',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const dummyScenes: ReelScene[] = [
    {
      sceneNumber: 1,
      durationSeconds: 2.0,
      purpose: 'HOOK',
      narration: 'Ready for sound like never before?',
      onScreenText: 'REVOLUTIONARY AUDIO',
      visualType: 'PRODUCT_SHOWCASE',
      subject: 'Velocity X reveal',
      environment: 'Gradient studio',
      composition: 'Center',
      camera: 'Push in',
      lighting: 'Studio',
      mood: 'Electric',
      transition: 'Whip',
      animationIntent: 'Pop',
      assetRequirement: 'Product photo',
      productReference: product.id,
      brandElement: brand.name
    },
    {
      sceneNumber: 2,
      durationSeconds: 2.0,
      purpose: 'CTA',
      narration: 'Get yours at velocityaudio.com today.',
      onScreenText: 'SHOP NOW',
      visualType: 'CTA',
      subject: 'CTA card',
      environment: 'Clean dark gradient',
      composition: 'Center card',
      camera: 'Static',
      lighting: 'Spotlight',
      mood: 'Urgent',
      transition: 'Fade',
      animationIntent: 'Pulse',
      assetRequirement: 'Endcard',
      productReference: product.id,
      brandElement: brand.name
    }
  ];

  const reelPlan: ReelProductionPlan = {
    id: 'reel-plan-qa-test',
    contentJobId: 'job-qa-1',
    brandId: brand.id,
    workspaceId: brand.workspaceId,
    version: 1,
    title: 'Velocity X Commercial Showcase',
    concept: {
      title: 'Velocity X Commercial',
      concept: 'High impact showcase',
      objective: 'Conversion',
      targetAudience: 'Audiophiles',
      corePromise: 'Immersive sound',
      emotionalAngle: 'Delight',
      messagingAngle: 'Precision',
      contentPillar: 'Product Showcase',
      funnelStage: 'CONVERSION'
    },
    objective: 'Drive Sales',
    audience: 'Audiophiles',
    funnelStage: 'CONVERSION',
    contentPillar: 'Product Showcase',
    durationSeconds: 4.0,
    aspectRatio: '9:16',
    platform: 'INSTAGRAM',
    format: 'REEL',
    hook: {
      type: 'QUESTION',
      text: 'Ready for sound like never before?',
      visualIntent: 'Reveal',
      deliveryStyle: 'Punchy',
      durationSeconds: 2.0
    },
    narrative: 'High impact showcase',
    script: [],
    scenes: dummyScenes,
    visualDirection: {
      style: 'Cinematic',
      mood: 'Energetic',
      colorIntent: 'Brand Colors',
      lightingIntent: 'Studio',
      composition: 'Vertical Center',
      cameraLanguage: 'Dynamic',
      pacing: 'Fast',
      visualHierarchy: 'Product first',
      brandIntegration: 'Logo & Colors',
      productEmphasis: 'Hero presence'
    },
    voiceDirection: { style: 'Confident', pace: 'Fast', tone: 'Energetic' },
    captionDirection: { style: 'Kinetic', placement: 'bottom-third', density: '2-3 words' },
    animationDirection: { energy: 'High', style: 'Kinetic' },
    audioDirection: { musicMood: 'Electronic' },
    cta: { type: 'SHOP_NOW', text: 'SHOP NOW' },
    targetProductId: product.id,
    productId: product.id,
    status: 'READY',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  /**
   * Helper to generate a valid 1080x1920 test video with real visual variation and audio.
   */
  async function createTestVideo(params: {
    duration: number;
    width?: number;
    height?: number;
    includeAudio?: boolean;
    solidColor?: string;
  }): Promise<string> {
    const {
      duration,
      width = 1080,
      height = 1920,
      includeAudio = true,
      solidColor
    } = params;

    const outputPath = path.join(tempDir, `test_video_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
    const args: string[] = [];

    if (solidColor) {
      args.push('-f', 'lavfi', '-i', `color=c=${solidColor}:s=${width}x${height}:d=${duration}:r=30`);
    } else {
      // Dynamic high-contrast animated gradient with real visual entropy
      args.push(
        '-f', 'lavfi',
        '-i', `gradients=s=${width}x${height}:d=${duration}:r=30:c0=0x6366F1:c1=0xEC4899:speed=0.02`
      );
    }

    let filterComplex = '[0:v]format=yuv420p';

    // Add high-contrast text overlay to provide rich color variation
    if (!solidColor) {
      filterComplex += `,drawtext=text='VELOCITY X PRO':fontcolor=white:fontsize=56:box=1:boxcolor=0x000000@0.85:boxborderw=16:x=(w-text_w)/2:y=h*0.50[v]`;
    } else {
      filterComplex += '[v]';
    }

    if (includeAudio) {
      args.push('-f', 'lavfi', '-i', `sine=frequency=440:duration=${duration}`);
      filterComplex += ';[1:a]volume=0.5[a]';
    }

    args.push(
      '-t', `${duration}`,
      '-filter_complex', filterComplex,
      '-map', '[v]'
    );

    if (includeAudio) {
      args.push('-map', '[a]', '-c:a', 'aac', '-b:a', '192k');
    }

    args.push(
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-y',
      outputPath
    );

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('ffmpeg', args);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg test video generation failed: ${stderr.slice(-300)}`));
      });
      proc.on('error', reject);
    });

    return outputPath;
  }

  describe('Comprehensive QA Pass Scenarios', () => {
    it('passes a fully compliant 1080x1920 commercial reel with audio, product metadata, and high variance', async () => {
      const validVideoPath = await createTestVideo({ duration: 4.0, width: 1080, height: 1920, includeAudio: true });

      const sceneArtifacts: SceneVideoArtifact[] = [
        {
          sceneNumber: 1,
          duration: 2.0,
          provider: 'veo-3.1-generate-preview',
          source: 'VEO',
          videoUrl: `file://${validVideoPath}`,
          localPath: validVideoPath,
          width: 1080,
          height: 1920,
          fps: 30,
          status: 'READY'
        },
        {
          sceneNumber: 2,
          duration: 2.0,
          provider: 'local_composer',
          source: 'GENERATED',
          videoUrl: `file://${validVideoPath}`,
          localPath: validVideoPath,
          width: 1080,
          height: 1920,
          fps: 30,
          status: 'READY'
        }
      ];

      const report = await ReelQAChecker.inspectReel(validVideoPath, reelPlan, sceneArtifacts, {
        targetDurationSeconds: 4.0,
        targetWidth: 1080,
        targetHeight: 1920
      });

      if (!report.valid) {
        console.error('QA Failure Reasons:', report.failureReasons);
      }

      expect(report.failureReasons).toHaveLength(0);
      expect(report.valid).toBe(true);
      expect(report.duration.passed).toBe(true);
      expect(report.dimensions.passed).toBe(true);
      expect(report.codecs.passed).toBe(true);
      expect(report.audioCheck.passed).toBe(true);
      expect(report.visualVariance.passed).toBe(true);
      expect(report.sceneCoverage.passed).toBe(true);
      expect(report.productPresence.passed).toBe(true);
      expect(report.ctaPresence.passed).toBe(true);
      expect(report.frameIntegrity.passed).toBe(true);
    });
  });

  describe('Strict Rejection Guardrails: Setting Status to FAILED', () => {
    it('rejects a solid blue/blank video with low variance', async () => {
      const solidBlueVideoPath = await createTestVideo({
        duration: 4.0,
        width: 1080,
        height: 1920,
        includeAudio: true,
        solidColor: 'blue'
      });

      const report = await ReelQAChecker.inspectReel(solidBlueVideoPath, reelPlan, [], {
        targetDurationSeconds: 4.0
      });

      expect(report.valid).toBe(false);
      expect(report.failureReasons.some((r) => r.includes('variance') || r.includes('blank') || r.includes('Solid'))).toBe(true);
    });

    it('rejects a video with duration mismatch', async () => {
      // Generated 2.0s video when 4.0s expected (drift > 1s)
      const shortVideoPath = await createTestVideo({ duration: 2.0, width: 1080, height: 1920, includeAudio: true });

      const report = await ReelQAChecker.inspectReel(shortVideoPath, reelPlan, [], {
        targetDurationSeconds: 4.0
      });

      expect(report.valid).toBe(false);
      expect(report.failureReasons.some((r) => r.includes('Duration mismatch'))).toBe(true);
    });

    it('rejects a video missing audio', async () => {
      const silentVideoPath = await createTestVideo({ duration: 4.0, width: 1080, height: 1920, includeAudio: false });

      const report = await ReelQAChecker.inspectReel(silentVideoPath, reelPlan, [], {
        targetDurationSeconds: 4.0
      });

      expect(report.valid).toBe(false);
      expect(report.failureReasons.some((r) => r.includes('audio'))).toBe(true);
    });

    it('rejects a video with resolution mismatch', async () => {
      const landscapeVideoPath = await createTestVideo({ duration: 4.0, width: 1920, height: 1080, includeAudio: true });

      const report = await ReelQAChecker.inspectReel(landscapeVideoPath, reelPlan, [], {
        targetDurationSeconds: 4.0,
        targetWidth: 1080,
        targetHeight: 1920
      });

      expect(report.valid).toBe(false);
      expect(report.failureReasons.some((r) => r.includes('Resolution mismatch'))).toBe(true);
    });

    it('rejects if a required scene clip was missing or not rendered', async () => {
      const validVideoPath = await createTestVideo({ duration: 4.0, width: 1080, height: 1920, includeAudio: true });

      // Only scene 1 rendered, scene 2 missing
      const incompleteArtifacts: SceneVideoArtifact[] = [
        {
          sceneNumber: 1,
          duration: 2.0,
          provider: 'veo-3.1-generate-preview',
          source: 'VEO',
          videoUrl: `file://${validVideoPath}`,
          localPath: validVideoPath,
          width: 1080,
          height: 1920,
          fps: 30,
          status: 'READY'
        }
      ];

      const report = await ReelQAChecker.inspectReel(validVideoPath, reelPlan, incompleteArtifacts, {
        targetDurationSeconds: 4.0
      });

      expect(report.valid).toBe(false);
      expect(report.failureReasons.some((r) => r.includes('Scene coverage incomplete'))).toBe(true);
    });
  });
});
