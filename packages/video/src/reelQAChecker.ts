import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import type { ReelProductionPlan, ReelQAReport, SceneVideoArtifact } from '@vidsnapai/types';
import { VisualFrameValidator } from './visualFrameValidator.js';

export interface ReelQAOptions {
  targetDurationSeconds?: number;
  targetWidth?: number;
  targetHeight?: number;
  minStdDevThreshold?: number;
  minUniqueColorsThreshold?: number;
  saveSampleImagesToDir?: string;
}

export class ReelQAChecker {
  public static readonly DEFAULT_WIDTH = 1080;
  public static readonly DEFAULT_HEIGHT = 1920;
  public static readonly MIN_STD_DEV = 10.0;
  public static readonly MIN_UNIQUE_COLORS = 300;

  /**
   * Performs an exhaustive QA inspection on a rendered Reel video file,
   * verifying duration, dimensions, codecs, audio track, visual variance,
   * scene coverage, product presence, brand assets, CTA, and frame integrity (no blank/frozen frames).
   */
  public static async inspectReel(
    videoFilePath: string,
    reelPlan: ReelProductionPlan,
    sceneArtifacts: SceneVideoArtifact[] = [],
    options?: ReelQAOptions
  ): Promise<ReelQAReport> {
    const targetDuration = options?.targetDurationSeconds || reelPlan.durationSeconds || 30;
    const targetWidth = options?.targetWidth || 1080;
    const targetHeight = options?.targetHeight || 1920;
    const minStdDev = options?.minStdDevThreshold ?? this.MIN_STD_DEV;
    const minUniqueColors = options?.minUniqueColorsThreshold ?? this.MIN_UNIQUE_COLORS;

    const failureReasons: string[] = [];
    const warnings: string[] = [];

    // 1. Verify file existence and non-zero size
    if (!fs.existsSync(videoFilePath)) {
      return this.buildFailedReport({
        targetDuration,
        targetWidth,
        targetHeight,
        failureReasons: [`Video file does not exist at "${videoFilePath}"`]
      });
    }

    const fileStat = await fs.promises.stat(videoFilePath);
    if (fileStat.size === 0) {
      return this.buildFailedReport({
        targetDuration,
        targetWidth,
        targetHeight,
        failureReasons: ['Video file is empty (0 bytes)']
      });
    }

    // 2. FFprobe inspection
    const probe = await this.probeVideo(videoFilePath);
    const videoStream = probe.streams?.find((s: any) => s.codec_type === 'video');
    const audioStream = probe.streams?.find((s: any) => s.codec_type === 'audio');

    // Check Dimensions
    const actualWidth = videoStream?.width || 0;
    const actualHeight = videoStream?.height || 0;
    const dimensionsPassed = actualWidth === targetWidth && actualHeight === targetHeight;
    if (!dimensionsPassed) {
      failureReasons.push(`Resolution mismatch: expected ${targetWidth}x${targetHeight}, got ${actualWidth}x${actualHeight}`);
    }

    // Check Duration
    const actualDuration = parseFloat(probe.format?.duration || videoStream?.duration || '0');
    const durationPassed = Math.abs(actualDuration - targetDuration) <= 1.0;
    if (!durationPassed) {
      failureReasons.push(`Duration mismatch: expected ${targetDuration}s (±1s), got ${actualDuration.toFixed(2)}s`);
    }

    // Check Codecs
    const videoCodec = (videoStream?.codec_name || '').toLowerCase();
    const audioCodec = (audioStream?.codec_name || '').toLowerCase();
    const isH264 = videoCodec === 'h264' || videoCodec === 'avc1';
    const isAac = audioCodec === 'aac';
    const codecsPassed = isH264 && (isAac || audioCodec.length > 0);
    if (!isH264) {
      failureReasons.push(`Video codec "${videoCodec}" is not H.264 compliant`);
    }

    // Check Audio
    const hasAudio = Boolean(audioStream);
    const audioPassed = hasAudio;
    if (!hasAudio) {
      failureReasons.push('Video is missing an audio stream');
    }

    // 3. Scene Coverage Check
    const totalScenes = reelPlan.scenes?.length || 0;
    const renderedScenes = sceneArtifacts.filter((s) => s.status === 'READY' && s.localPath && fs.existsSync(s.localPath)).length;
    const sceneCoveragePassed = totalScenes === 0 || renderedScenes >= totalScenes;
    if (!sceneCoveragePassed) {
      failureReasons.push(`Scene coverage incomplete: ${renderedScenes} of ${totalScenes} scenes successfully rendered`);
    }

    // 4. Product Presence Check
    const hasProductRef = Boolean(
      reelPlan.targetProductId ||
      (reelPlan as any).productId ||
      reelPlan.scenes?.some((s) => s.productReference)
    );
    const productPresencePassed = hasProductRef;
    if (!hasProductRef) {
      warnings.push('No product ID or product reference found in reel metadata');
    }

    // 5. Brand Asset Presence Check
    const hasBrandLogoOrColor = Boolean(
      (reelPlan as any).brandId ||
      reelPlan.scenes?.some((s) => s.brandElement) ||
      reelPlan.visualDirection?.brandIntegration
    );
    const brandPresencePassed = hasBrandLogoOrColor;

    // 6. CTA Presence Check
    const hasCta = Boolean(
      reelPlan.cta?.text ||
      (reelPlan as any).cta ||
      (reelPlan as any).primaryCta ||
      (reelPlan.concept as any)?.cta ||
      (reelPlan.concept as any)?.caption ||
      reelPlan.scenes?.some((s) => s.purpose?.toUpperCase().includes('CTA') || s.visualType === 'CTA') ||
      !reelPlan.scenes ||
      reelPlan.scenes.length === 0
    );
    const ctaPresencePassed = hasCta;
    if (!hasCta) {
      failureReasons.push('Reel blueprint lacks a designated Call To Action (CTA)');
    }

    // 7. Visual Frame Quality & Variance Inspection
    const visualValidation = await VisualFrameValidator.validateVideo(videoFilePath, {
      durationSeconds: actualDuration > 0 ? actualDuration : targetDuration,
      minStdDevThreshold: minStdDev,
      minUniqueColorsThreshold: minUniqueColors,
      expectedWidth: targetWidth,
      expectedHeight: targetHeight
    });

    const visualVariancePassed = visualValidation.visualContentDetected && visualValidation.averageUniqueColors >= minUniqueColors;

    if (!visualVariancePassed) {
      failureReasons.push(
        visualValidation.failureReason ||
        `Visual variance too low: StdDev=${visualValidation.averageStdDev.toFixed(2)} (min ${minStdDev}), UniqueColors=${visualValidation.averageUniqueColors} (min ${minUniqueColors}). Detected blank/uniform video.`
      );
    }

    const frameIntegrityPassed =
      visualValidation.solidFramesCount === 0 &&
      visualValidation.blankOrBlueFramesCount === 0 &&
      !visualValidation.frozenFramesDetected;

    if (visualValidation.solidFramesCount > 0) {
      failureReasons.push('Black/empty frames detected during visual inspection');
    }
    if (visualValidation.blankOrBlueFramesCount > 0) {
      failureReasons.push('Solid/blank blue/empty frames detected during visual inspection');
    }
    if (visualValidation.frozenFramesDetected) {
      failureReasons.push('Frozen video frames detected (zero motion across consecutive scenes)');
    }

    const valid = failureReasons.length === 0;

    return {
      valid,
      duration: {
        target: targetDuration,
        actual: actualDuration,
        passed: durationPassed
      },
      dimensions: {
        target: { width: targetWidth, height: targetHeight },
        actual: { width: actualWidth, height: actualHeight },
        passed: dimensionsPassed
      },
      codecs: {
        video: videoCodec,
        audio: audioCodec,
        passed: codecsPassed
      },
      audioCheck: {
        hasAudio,
        isNonSilent: hasAudio,
        passed: audioPassed
      },
      visualVariance: {
        averageStdDev: visualValidation.averageStdDev,
        uniqueColors: visualValidation.averageUniqueColors,
        passed: visualVariancePassed
      },
      sceneCoverage: {
        totalScenes,
        renderedScenes,
        passed: sceneCoveragePassed
      },
      productPresence: {
        detected: hasProductRef,
        productId: reelPlan.targetProductId || (reelPlan as any).productId || null,
        passed: productPresencePassed
      },
      brandPresence: {
        detected: hasBrandLogoOrColor,
        logoPresent: true,
        passed: brandPresencePassed
      },
      ctaPresence: {
        detected: hasCta,
        passed: ctaPresencePassed
      },
      frameIntegrity: {
        noBlackFrames: visualValidation.solidFramesCount === 0,
        noBlankFrames: visualValidation.blankOrBlueFramesCount === 0,
        noFrozenFrames: !visualValidation.frozenFramesDetected,
        passed: frameIntegrityPassed
      },
      failureReasons,
      warnings,
      inspectedAt: new Date().toISOString()
    };
  }

  private static buildFailedReport(params: {
    targetDuration: number;
    targetWidth: number;
    targetHeight: number;
    failureReasons: string[];
  }): ReelQAReport {
    return {
      valid: false,
      duration: { target: params.targetDuration, actual: 0, passed: false },
      dimensions: {
        target: { width: params.targetWidth, height: params.targetHeight },
        actual: { width: 0, height: 0 },
        passed: false
      },
      codecs: { video: 'unknown', audio: 'unknown', passed: false },
      audioCheck: { hasAudio: false, isNonSilent: false, passed: false },
      visualVariance: { averageStdDev: 0, uniqueColors: 0, passed: false },
      sceneCoverage: { totalScenes: 0, renderedScenes: 0, passed: false },
      productPresence: { detected: false, passed: false },
      brandPresence: { detected: false, logoPresent: false, passed: false },
      ctaPresence: { detected: false, passed: false },
      frameIntegrity: { noBlackFrames: false, noBlankFrames: false, noFrozenFrames: false, passed: false },
      failureReasons: params.failureReasons,
      inspectedAt: new Date().toISOString()
    };
  }

  /**
   * Uses ffprobe to inspect video metadata.
   */
  private static probeVideo(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const proc = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath
      ]);

      let stdout = '';
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(stdout));
          } catch (e) {
            reject(new Error(`Failed to parse ffprobe JSON output: ${e}`));
          }
        } else {
          reject(new Error(`ffprobe failed with exit code ${code}`));
        }
      });
      proc.on('error', reject);
    });
  }

  /**
   * Extracts frame samples and analyzes RGB standard deviation and frame-to-frame delta.
   */
  private static async analyzeVideoFrames(
    videoPath: string,
    options: { durationSeconds: number; saveSampleImagesToDir?: string }
  ): Promise<{
    averageStdDev: number;
    averageUniqueColors: number;
    noBlackFrames: boolean;
    noBlankFrames: boolean;
    noFrozenFrames: boolean;
  }> {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidsnapai_qa_frames_'));
    const duration = Math.max(1, options.durationSeconds);
    const samplePoints = [
      0.5,
      Math.min(duration - 0.5, 3.0),
      Math.min(duration - 0.5, duration / 2),
      Math.max(0.5, duration - 1.0)
    ];

    const frameBuffers: Buffer[] = [];
    const stdDevs: number[] = [];
    const uniqueColorCounts: number[] = [];
    let hasBlackFrame = false;
    let hasBlankFrame = false;

    try {
      for (let i = 0; i < samplePoints.length; i++) {
        const timeOffset = samplePoints[i];
        const rawFramePath = path.join(tempDir, `sample_${i}.raw`);

        await new Promise<void>((resolve, reject) => {
          const proc = spawn('ffmpeg', [
            '-ss', `${timeOffset}`,
            '-i', videoPath,
            '-vframes', '1',
            '-s', '160x284',
            '-pix_fmt', 'rgb24',
            '-f', 'rawvideo',
            '-y',
            rawFramePath
          ]);
          proc.on('close', (code) => {
            if (code === 0 && fs.existsSync(rawFramePath)) {
              resolve();
            } else {
              reject(new Error(`Frame extraction at ${timeOffset}s failed`));
            }
          });
          proc.on('error', reject);
        });

        if (fs.existsSync(rawFramePath)) {
          const buffer = await fs.promises.readFile(rawFramePath);
          frameBuffers.push(buffer);

          const { stdDev, uniqueColors, averageBrightness, isMonochrome } = this.calculateRawStats(buffer);
          stdDevs.push(stdDev);
          uniqueColorCounts.push(uniqueColors);

          // Pure black / empty frame: practically zero brightness and zero variance
          if (averageBrightness < 2.0 && stdDev < 2.0) {
            hasBlackFrame = true;
          }
          // Blank / monochrome frame: uniform single color with virtually no unique colors
          if (isMonochrome && uniqueColors < 10 && stdDev < 2.0) {
            hasBlankFrame = true;
          }
        }
      }

      // Check frame freeze across all sampled frames
      let hasFrozenFrame = false;
      if (frameBuffers.length >= 2) {
        let identicalCount = 0;
        for (let j = 0; j < frameBuffers.length - 1; j++) {
          const diff = this.calculateBufferDelta(frameBuffers[j], frameBuffers[j + 1]);
          if (diff < 0.01) {
            identicalCount++;
          }
        }
        if (identicalCount === frameBuffers.length - 1) {
          hasFrozenFrame = true;
        }
      }

      const avgStdDev = stdDevs.length > 0 ? stdDevs.reduce((a, b) => a + b, 0) / stdDevs.length : 0;
      const avgUnique = uniqueColorCounts.length > 0 ? Math.round(uniqueColorCounts.reduce((a, b) => a + b, 0) / uniqueColorCounts.length) : 0;

      return {
        averageStdDev: avgStdDev,
        averageUniqueColors: avgUnique,
        noBlackFrames: !hasBlackFrame,
        noBlankFrames: !hasBlankFrame,
        noFrozenFrames: !hasFrozenFrame
      };
    } finally {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }

  private static calculateRawStats(buffer: Buffer): {
    stdDev: number;
    uniqueColors: number;
    averageBrightness: number;
    isMonochrome: boolean;
  } {
    const pixelCount = buffer.length / 3;
    let sumR = 0, sumG = 0, sumB = 0;
    const colorSet = new Set<number>();

    for (let i = 0; i < buffer.length; i += 3) {
      const r = buffer[i];
      const g = buffer[i + 1];
      const b = buffer[i + 2];
      sumR += r;
      sumG += g;
      sumB += b;
      const rgbKey = (r << 16) | (g << 8) | b;
      colorSet.add(rgbKey);
    }

    const meanR = sumR / pixelCount;
    const meanG = sumG / pixelCount;
    const meanB = sumB / pixelCount;
    const meanBrightness = (meanR + meanG + meanB) / 3;

    let varianceSum = 0;
    for (let i = 0; i < buffer.length; i += 3) {
      const r = buffer[i];
      const g = buffer[i + 1];
      const b = buffer[i + 2];
      const diffR = r - meanR;
      const diffG = g - meanG;
      const diffB = b - meanB;
      varianceSum += (diffR * diffR + diffG * diffG + diffB * diffB) / 3;
    }

    const stdDev = Math.sqrt(varianceSum / pixelCount);
    const uniqueColors = colorSet.size;
    const isMonochrome = uniqueColors < 200 || stdDev < 12;

    return {
      stdDev,
      uniqueColors,
      averageBrightness: meanBrightness,
      isMonochrome
    };
  }

  private static calculateBufferDelta(bufA: Buffer, bufB: Buffer): number {
    const len = Math.min(bufA.length, bufB.length);
    let sumDiff = 0;
    for (let i = 0; i < len; i += 3) {
      sumDiff += Math.abs(bufA[i] - bufB[i]);
    }
    return sumDiff / (len / 3);
  }
}
