import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

export interface FrameSampleMetric {
  timestampSeconds: number;
  pixelCount: number;
  meanY: number;
  stdDevY: number;
  uniqueColorCount: number;
  entropy: number;
  dominantColorRatio: number;
  meanRGB: { r: number; g: number; b: number };
  isSolidColor: boolean;
  isBlankOrBlue: boolean;
  savedImagePath?: string;
  signature?: Buffer;
}

export interface FrameValidationResult {
  valid: boolean;
  totalDurationSeconds: number;
  actualDurationSeconds?: number;
  width?: number;
  height?: number;
  samplePointsCount: number;
  solidFramesCount: number;
  blankOrBlueFramesCount: number;
  averageStdDev: number;
  averageUniqueColors: number;
  averageEntropy: number;
  visualContentDetected: boolean;
  frozenFramesDetected: boolean;
  samples: FrameSampleMetric[];
  failureCode?: 'RENDER_VISUAL_VALIDATION_FAILED' | 'REEL_RENDER_VALIDATION_FAILED' | 'MEDIA_ASSET_UNAVAILABLE' | 'SCENE_RENDER_FAILED';
  failureReason?: string;
  warnings?: string[];
}

export class VisualFrameValidator {
  /**
   * Validates that a rendered MP4 video contains genuine, dynamic visual content
   * and is NOT solid color, uniform blue/black, frozen frames, or low-entropy test visuals.
   */
  static async validateVideo(
    videoPath: string,
    options?: {
      durationSeconds?: number;
      expectedWidth?: number;
      expectedHeight?: number;
      sampleTimestamps?: number[];
      minStdDevThreshold?: number;
      minUniqueColorsThreshold?: number;
      minEntropyThreshold?: number;
      saveSampleImagesToDir?: string;
      toleranceDurationSec?: number;
    }
  ): Promise<FrameValidationResult> {
    if (!fs.existsSync(videoPath)) {
      return {
        valid: false,
        totalDurationSeconds: options?.durationSeconds || 0,
        samplePointsCount: 0,
        solidFramesCount: 0,
        blankOrBlueFramesCount: 0,
        averageStdDev: 0,
        averageUniqueColors: 0,
        averageEntropy: 0,
        visualContentDetected: false,
        frozenFramesDetected: false,
        samples: [],
        failureCode: 'RENDER_VISUAL_VALIDATION_FAILED',
        failureReason: `Video file does not exist at ${videoPath}`
      };
    }

    const duration = options?.durationSeconds || 30;
    const minStdDev = options?.minStdDevThreshold ?? 2.5;
    const minUniqueColors = options?.minUniqueColorsThreshold ?? 5;
    const minEntropy = options?.minEntropyThreshold ?? 1.5;

    // 1. Probe video container properties (dimensions, duration)
    const probe = await this.probeVideoContainer(videoPath);
    if (!probe.valid) {
      return {
        valid: false,
        totalDurationSeconds: duration,
        samplePointsCount: 0,
        solidFramesCount: 0,
        blankOrBlueFramesCount: 0,
        averageStdDev: 0,
        averageUniqueColors: 0,
        averageEntropy: 0,
        visualContentDetected: false,
        frozenFramesDetected: false,
        samples: [],
        failureCode: 'RENDER_VISUAL_VALIDATION_FAILED',
        failureReason: probe.error || `Invalid or unreadable MP4 video file at ${videoPath}`
      };
    }

    const actualWidth = probe.width || 1080;
    const actualHeight = probe.height || 1920;
    const actualDuration = probe.duration || duration;

    // Check dimensions if expected
    if (options?.expectedWidth && options?.expectedHeight) {
      if (actualWidth !== options.expectedWidth || actualHeight !== options.expectedHeight) {
        return {
          valid: false,
          totalDurationSeconds: duration,
          actualDurationSeconds: actualDuration,
          width: actualWidth,
          height: actualHeight,
          samplePointsCount: 0,
          solidFramesCount: 0,
          blankOrBlueFramesCount: 0,
          averageStdDev: 0,
          averageUniqueColors: 0,
          averageEntropy: 0,
          visualContentDetected: false,
          frozenFramesDetected: false,
          samples: [],
          failureCode: 'RENDER_VISUAL_VALIDATION_FAILED',
          failureReason: `Rendered dimensions (${actualWidth}x${actualHeight}) do not match expected (${options.expectedWidth}x${options.expectedHeight})`
        };
      }
    }

    // Check duration tolerance
    const durationTolerance = options?.toleranceDurationSec ?? Math.max(2.0, duration * 0.2);
    if (Math.abs(actualDuration - duration) > durationTolerance && actualDuration < 1.0) {
      return {
        valid: false,
        totalDurationSeconds: duration,
        actualDurationSeconds: actualDuration,
        width: actualWidth,
        height: actualHeight,
        samplePointsCount: 0,
        solidFramesCount: 0,
        blankOrBlueFramesCount: 0,
        averageStdDev: 0,
        averageUniqueColors: 0,
        averageEntropy: 0,
        visualContentDetected: false,
        frozenFramesDetected: false,
        samples: [],
        failureCode: 'RENDER_VISUAL_VALIDATION_FAILED',
        failureReason: `Rendered video duration (${actualDuration.toFixed(1)}s) is invalid (expected ~${duration}s)`
      };
    }

    // 2. Determine sampling timestamps across the video timeline (0%, 10%, 25%, 50%, 75%, 90%, 98%)
    let timestamps: number[] = options?.sampleTimestamps || [];
    if (timestamps.length === 0) {
      const percentages = [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.98];
      timestamps = percentages.map((p) => Number((p * actualDuration).toFixed(2)));
    }

    timestamps = timestamps.filter((t) => t >= 0 && t <= actualDuration);

    if (options?.saveSampleImagesToDir && !fs.existsSync(options.saveSampleImagesToDir)) {
      await fs.promises.mkdir(options.saveSampleImagesToDir, { recursive: true });
    }

    const samples: FrameSampleMetric[] = [];

    for (const ts of timestamps) {
      const sample = await this.analyzeFrameAtTimestamp(
        videoPath,
        ts,
        options?.saveSampleImagesToDir
      );
      samples.push(sample);
    }

    if (samples.length === 0) {
      return {
        valid: false,
        totalDurationSeconds: duration,
        actualDurationSeconds: actualDuration,
        width: actualWidth,
        height: actualHeight,
        samplePointsCount: 0,
        solidFramesCount: 0,
        blankOrBlueFramesCount: 0,
        averageStdDev: 0,
        averageUniqueColors: 0,
        averageEntropy: 0,
        visualContentDetected: false,
        frozenFramesDetected: false,
        samples: [],
        failureCode: 'RENDER_VISUAL_VALIDATION_FAILED',
        failureReason: 'No frame samples could be extracted from video'
      };
    }

    const solidFrames = samples.filter(
      (s) => s.isSolidColor || s.stdDevY < minStdDev || s.uniqueColorCount < minUniqueColors || s.dominantColorRatio > 0.90
    );
    const blankOrBlueFrames = samples.filter((s) => s.isBlankOrBlue);

    const avgStdDev = samples.reduce((acc, s) => acc + s.stdDevY, 0) / samples.length;
    const avgUniqueColors = samples.reduce((acc, s) => acc + s.uniqueColorCount, 0) / samples.length;
    const avgEntropy = samples.reduce((acc, s) => acc + s.entropy, 0) / samples.length;

    // Check for frozen/repeated identical frames across multiple timestamps
    let frozenFramesDetected = false;
    if (samples.length >= 4 && duration >= 10) {
      let identicalPairs = 0;
      for (let i = 1; i < samples.length; i++) {
        const diff = this.computeFrameDifference(samples[i - 1], samples[i]);
        if (diff < 0.05) {
          identicalPairs++;
        }
      }
      // If all sampled timestamps across a multi-scene reel are completely identical and low entropy
      if (identicalPairs === samples.length - 1 && avgStdDev < 5.0) {
        frozenFramesDetected = true;
      }
    }

    // Comprehensive validation checks
    const isAllSolid = solidFrames.length === samples.length || avgStdDev < minStdDev;
    const isExcessiveBlankOrBlue = blankOrBlueFrames.length >= Math.ceil(samples.length * 0.8) && avgStdDev < 15;
    const isVeryLowEntropy = avgEntropy < minEntropy && avgStdDev < 5.0;

    let failureReason: string | undefined;

    if (isAllSolid) {
      failureReason = `Final MP4 contains uniform frames (solidFrames: ${solidFrames.length}/${samples.length}, avgStdDev: ${avgStdDev.toFixed(2)}, avgUniqueColors: ${Math.round(avgUniqueColors)})`;
    } else if (isExcessiveBlankOrBlue) {
      failureReason = `Final MP4 contains excessive blank/blue screen regions (blankOrBlueFrames: ${blankOrBlueFrames.length}/${samples.length})`;
    } else if (isVeryLowEntropy) {
      failureReason = `Final MP4 frames have low visual entropy (${avgEntropy.toFixed(2)} bits/px, threshold: ${minEntropy})`;
    } else if (frozenFramesDetected) {
      failureReason = `Final MP4 appears frozen with identical static frames across all timestamps without scene motion`;
    }

    const valid = !failureReason;

    return {
      valid,
      totalDurationSeconds: duration,
      actualDurationSeconds: actualDuration,
      width: actualWidth,
      height: actualHeight,
      samplePointsCount: samples.length,
      solidFramesCount: solidFrames.length,
      blankOrBlueFramesCount: blankOrBlueFrames.length,
      averageStdDev: Number(avgStdDev.toFixed(2)),
      averageUniqueColors: Math.round(avgUniqueColors),
      averageEntropy: Number(avgEntropy.toFixed(2)),
      visualContentDetected: !isAllSolid && avgStdDev >= minStdDev,
      frozenFramesDetected,
      samples,
      ...(valid
        ? {}
        : {
            failureCode: 'REEL_RENDER_VALIDATION_FAILED' as const,
            failureReason
          })
    };
  }

  /**
   * Extracts raw RGB pixels for a specific timestamp and computes spatial statistics & entropy.
   */
  private static analyzeFrameAtTimestamp(
    videoPath: string,
    timestamp: number,
    saveDir?: string
  ): Promise<FrameSampleMetric> {
    return new Promise((resolve) => {
      // 1. Extract raw 160x284 rgb24 frame for statistical analysis
      const args = [
        '-ss', timestamp.toFixed(2),
        '-i', videoPath,
        '-vf', 'scale=160:284',
        '-frames:v', '1',
        '-f', 'rawvideo',
        '-pix_fmt', 'rgb24',
        'pipe:1'
      ];

      const ffmpeg = spawn('ffmpeg', args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore']
      });

      const chunks: Buffer[] = [];

      ffmpeg.stdout.on('data', (data: Buffer) => {
        chunks.push(data);
      });

      ffmpeg.on('close', async () => {
        const buffer = Buffer.concat(chunks);
        const pixelCount = Math.floor(buffer.length / 3);

        if (pixelCount === 0) {
          resolve({
            timestampSeconds: timestamp,
            pixelCount: 0,
            meanY: 0,
            stdDevY: 0,
            uniqueColorCount: 0,
            entropy: 0,
            dominantColorRatio: 1.0,
            meanRGB: { r: 0, g: 0, b: 0 },
            isSolidColor: true,
            isBlankOrBlue: true
          });
          return;
        }

        let sumY = 0;
        let sqSumY = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        const uniqueColors = new Set<number>();
        const colorHistogram = new Map<number, number>();
        const yHistogram = new Array(256).fill(0);

        for (let i = 0; i < buffer.length - 2; i += 3) {
          const r = buffer[i];
          const g = buffer[i + 1];
          const b = buffer[i + 2];

          sumR += r;
          sumG += g;
          sumB += b;

          const y = Math.min(255, Math.max(0, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
          sumY += y;
          sqSumY += y * y;
          yHistogram[y]++;

          // Quantized color key for dominant color detection
          const qColor = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
          colorHistogram.set(qColor, (colorHistogram.get(qColor) || 0) + 1);

          uniqueColors.add((r << 16) | (g << 8) | b);
        }

        const meanY = sumY / pixelCount;
        const varianceY = Math.max(0, sqSumY / pixelCount - meanY * meanY);
        const stdDevY = Math.sqrt(varianceY);

        const meanRGB = {
          r: Math.round(sumR / pixelCount),
          g: Math.round(sumG / pixelCount),
          b: Math.round(sumB / pixelCount)
        };

        // Compute Shannon entropy over luminance distribution
        let entropy = 0;
        for (let i = 0; i < 256; i++) {
          const count = yHistogram[i];
          if (count > 0) {
            const p = count / pixelCount;
            entropy -= p * Math.log2(p);
          }
        }

        // Compute dominant color ratio
        let maxColorCount = 0;
        for (const count of colorHistogram.values()) {
          if (count > maxColorCount) maxColorCount = count;
        }
        const dominantColorRatio = maxColorCount / pixelCount;

        const isSolidColor = stdDevY < 0.8 && (uniqueColors.size <= 4 || dominantColorRatio > 0.95);

        // Detect solid blue blank screen (e.g., #003366, #001f3f) or pure black blank
        const isSolidBlack = meanRGB.r < 10 && meanRGB.g < 10 && meanRGB.b < 10 && stdDevY < 1.0;
        const isSolidBlue =
          meanRGB.b > 50 &&
          meanRGB.b > meanRGB.r * 1.5 &&
          meanRGB.b > meanRGB.g * 1.2 &&
          stdDevY < 2.0;

        const isBlankOrBlue = isSolidBlack || isSolidBlue || (isSolidColor && dominantColorRatio > 0.90);

        let savedImagePath: string | undefined;

        // Optionally extract high-res PNG frame to disk for QA inspection
        if (saveDir) {
          try {
            const pngName = `frame_${timestamp.toFixed(1).replace('.', '_')}s.png`;
            const pngPath = path.join(saveDir, pngName);
            await VisualFrameValidator.extractFrameImage(videoPath, timestamp, pngPath);
            savedImagePath = pngPath;
          } catch {
            // ignore frame image export error
          }
        }

        resolve({
          timestampSeconds: timestamp,
          pixelCount,
          meanY: Number(meanY.toFixed(2)),
          stdDevY: Number(stdDevY.toFixed(2)),
          uniqueColorCount: uniqueColors.size,
          entropy: Number(entropy.toFixed(2)),
          dominantColorRatio: Number(dominantColorRatio.toFixed(2)),
          meanRGB,
          isSolidColor,
          isBlankOrBlue,
          savedImagePath,
          signature: buffer.slice(0, 500)
        });
      });

      ffmpeg.on('error', () => {
        resolve({
          timestampSeconds: timestamp,
          pixelCount: 0,
          meanY: 0,
          stdDevY: 0,
          uniqueColorCount: 0,
          entropy: 0,
          dominantColorRatio: 1.0,
          meanRGB: { r: 0, g: 0, b: 0 },
          isSolidColor: true,
          isBlankOrBlue: true
        });
      });
    });
  }

  /**
   * Computes Mean Absolute Difference between two frame sample signatures.
   */
  private static computeFrameDifference(a: FrameSampleMetric, b: FrameSampleMetric): number {
    if (!a.signature || !b.signature || a.signature.length !== b.signature.length) {
      return Math.abs(a.meanY - b.meanY) + Math.abs(a.stdDevY - b.stdDevY);
    }
    let totalDiff = 0;
    const len = Math.min(a.signature.length, b.signature.length);
    for (let i = 0; i < len; i++) {
      totalDiff += Math.abs(a.signature[i] - b.signature[i]);
    }
    return totalDiff / len;
  }

  /**
   * Probes video width, height, and duration via ffprobe or ffmpeg.
   */
  private static probeVideoContainer(videoPath: string): Promise<{
    valid: boolean;
    width?: number;
    height?: number;
    duration?: number;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const args = [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,duration:format=duration',
        '-of', 'json',
        videoPath
      ];

      const proc = spawn('ffprobe', args, { windowsHide: true });
      const chunks: Buffer[] = [];

      proc.stdout.on('data', (d) => chunks.push(d));

      proc.on('close', (code) => {
        if (code === 0) {
          try {
            const raw = Buffer.concat(chunks).toString('utf8');
            const data = JSON.parse(raw);
            const stream = data.streams?.[0];
            const width = stream?.width ? parseInt(stream.width, 10) : undefined;
            const height = stream?.height ? parseInt(stream.height, 10) : undefined;
            const duration = parseFloat(stream?.duration || data.format?.duration || '0');

            if (width && height && width > 0 && height > 0) {
              resolve({ valid: true, width, height, duration });
              return;
            }
          } catch {
            // fallback
          }
        }

        // Fallback probe via ffmpeg
        const fallback = spawn('ffmpeg', ['-i', videoPath, '-f', 'null', '-'], { windowsHide: true });
        let stderr = '';
        fallback.stderr.on('data', (d) => (stderr += d.toString()));
        fallback.on('close', () => {
          const dimMatch = stderr.match(/Video:.*?,\s*(\d{2,5})x(\d{2,5})/i);
          const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/i);

          if (dimMatch) {
            const width = parseInt(dimMatch[1], 10);
            const height = parseInt(dimMatch[2], 10);
            let duration: number | undefined;
            if (durMatch) {
              const h = parseFloat(durMatch[1]);
              const m = parseFloat(durMatch[2]);
              const s = parseFloat(durMatch[3]);
              duration = h * 3600 + m * 60 + s;
            }
            resolve({ valid: true, width, height, duration });
          } else {
            resolve({ valid: true });
          }
        });
        fallback.on('error', () => resolve({ valid: true }));
      });

      proc.on('error', () => {
        resolve({ valid: true });
      });
    });
  }

  /**
   * Extracts a single frame to a PNG/JPEG image file on disk.
   */
  static extractFrameImage(
    videoPath: string,
    timestampSeconds: number,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-ss', timestampSeconds.toFixed(2),
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2',
        '-y',
        outputPath
      ];

      const ffmpeg = spawn('ffmpeg', args, {
        windowsHide: true,
        stdio: ['ignore', 'ignore', 'pipe']
      });

      let stderr = '';
      ffmpeg.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve();
        } else {
          reject(new Error(`Failed to extract frame at ${timestampSeconds}s: ${stderr.slice(-200)}`));
        }
      });

      ffmpeg.on('error', reject);
    });
  }
}

