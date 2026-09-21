import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import type {
  ReelAsset,
  BrandAsset,
  MediaAsset,
  ProductionErrorCode
} from '@vidsnapai/types';

export interface AssetValidationContext {
  workspaceId?: string;
  brandId?: string;
  productId?: string | null;
  productName?: string;
  isProduction?: boolean;
  sceneNumber?: number;
}

export interface AssetValidationResult {
  valid: boolean;
  errorCode?: ProductionErrorCode;
  errorMessage?: string;
  isPlaceholder: boolean;
  isTestAsset: boolean;
  productionEligible: boolean;
  details?: {
    fileSizeBytes?: number;
    mimeType?: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
  };
}

export const TEST_PATTERN_KEYWORDS = [
  'testsrc',
  'smptebars',
  'smpte_bars',
  'smpte',
  'zoneplate',
  'color_bars',
  'colorbars',
  'test_pattern',
  'testpattern',
  'placeholder',
  'fake_product',
  'mock_product',
  'dummy_asset',
  'dummy_image',
  'test_asset'
];

export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv'];

export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska'
];

export class ProductionAssetValidator {
  /**
   * Evaluates if a given asset record is eligible for production rendering.
   */
  static validateAssetEligibility(
    asset: Partial<ReelAsset | BrandAsset | MediaAsset> | null | undefined,
    context: AssetValidationContext = {}
  ): AssetValidationResult {
    const isProduction = context.isProduction !== false;

    if (!asset) {
      return {
        valid: false,
        errorCode: 'PRODUCT_ASSET_REQUIRED',
        errorMessage: 'Media asset is null or undefined.',
        isPlaceholder: true,
        isTestAsset: false,
        productionEligible: false
      };
    }

    const meta = ((asset as any).metadata || {}) as Record<string, unknown>;

    // 1. Check Explicit Flags
    const isPlaceholder = Boolean(
      (asset as any).isPlaceholder ||
      meta.isPlaceholder ||
      (asset as any).provider === 'fallback_placeholder' ||
      ((asset as any).sourceType === 'EXTERNAL' && !(asset as any).sourceUrl)
    );

    const isTestAsset = Boolean(
      (asset as any).isTestAsset ||
      meta.isTestAsset ||
      meta.isTest ||
      (asset as any).isTest
    );

    const productionEligible =
      (asset as any).productionEligible !== false &&
      meta.productionEligible !== false &&
      !isPlaceholder &&
      !isTestAsset;

    // 2. Check Test Pattern / Placeholder Names or URLs
    const nameToCheck = (
      (asset as any).name ||
      (asset as any).filename ||
      (asset as any).title ||
      (asset as any).sourceUrl ||
      (asset as any).previewUrl ||
      (asset as any).url ||
      ''
    ).toLowerCase();

    const containsTestPatternName = TEST_PATTERN_KEYWORDS.some((kw) => nameToCheck.includes(kw));

    if (isProduction) {
      if (isPlaceholder || (containsTestPatternName && nameToCheck.includes('placeholder'))) {
        return {
          valid: false,
          errorCode: 'PRODUCT_ASSET_PLACEHOLDER',
          errorMessage: `Asset "${(asset as any).name || (asset as any).filename || (asset as any).id}" is marked as a placeholder and cannot be used in production rendering.`,
          isPlaceholder: true,
          isTestAsset,
          productionEligible: false
        };
      }

      if (isTestAsset || containsTestPatternName) {
        return {
          valid: false,
          errorCode: 'PRODUCT_ASSET_INVALID',
          errorMessage: `Asset contains test-pattern/synthetic debug markers ("${nameToCheck}") and is rejected for production renders.`,
          isPlaceholder,
          isTestAsset: true,
          productionEligible: false
        };
      }

      if (!productionEligible) {
        return {
          valid: false,
          errorCode: 'PRODUCT_ASSET_NOT_PRODUCTION_ELIGIBLE',
          errorMessage: `Asset is not eligible for production (productionEligible === false).`,
          isPlaceholder,
          isTestAsset,
          productionEligible: false
        };
      }

      // 3. Workspace Provenance Check
      if (context.workspaceId && (asset as any).workspaceId && (asset as any).workspaceId !== context.workspaceId) {
        return {
          valid: false,
          errorCode: 'PRODUCT_ASSET_INVALID',
          errorMessage: `Asset workspace mismatch: asset belongs to ${(asset as any).workspaceId}, expected ${context.workspaceId}`,
          isPlaceholder,
          isTestAsset,
          productionEligible: false
        };
      }

      // 4. Brand Provenance Check
      if (context.brandId && (asset as any).brandId && (asset as any).brandId !== context.brandId) {
        return {
          valid: false,
          errorCode: 'PRODUCT_ASSET_INVALID',
          errorMessage: `Asset brand mismatch: asset belongs to ${(asset as any).brandId}, expected ${context.brandId}`,
          isPlaceholder,
          isTestAsset,
          productionEligible: false
        };
      }

      // 5. Product Association Check
      if (context.productId) {
        const assetProdId = (asset as any).productId || meta.productId;
        if (assetProdId && assetProdId !== context.productId) {
          return {
            valid: false,
            errorCode: 'PRODUCT_ASSET_INVALID',
            errorMessage: `Asset product mismatch: associated with product ${assetProdId}, expected ${context.productId}`,
            isPlaceholder,
            isTestAsset,
            productionEligible: false
          };
        }
      }
    }

    return {
      valid: true,
      isPlaceholder,
      isTestAsset,
      productionEligible
    };
  }

  /**
   * Validates an on-disk local media file for size, format, MIME type, dimensions, and synthetic test content.
   */
  static async validateLocalMediaFile(
    filePath: string,
    options: {
      isProduction?: boolean;
      expectedType?: 'IMAGE' | 'VIDEO' | 'LOGO';
      minWidth?: number;
      minHeight?: number;
    } = {}
  ): Promise<AssetValidationResult> {
    const isProduction = options.isProduction !== false;
    const minWidth = options.minWidth || 64;
    const minHeight = options.minHeight || 64;

    // 1. File existence
    if (!filePath || !fs.existsSync(filePath)) {
      return {
        valid: false,
        errorCode: 'MEDIA_ASSET_UNAVAILABLE',
        errorMessage: `Media file does not exist on disk at path: ${filePath}`,
        isPlaceholder: false,
        isTestAsset: false,
        productionEligible: false
      };
    }

    // 2. File size > 0
    let stats: fs.Stats;
    try {
      stats = await fs.promises.stat(filePath);
    } catch (err: any) {
      return {
        valid: false,
        errorCode: 'MEDIA_ASSET_DOWNLOAD_FAILED',
        errorMessage: `Failed to stat media file: ${err.message}`,
        isPlaceholder: false,
        isTestAsset: false,
        productionEligible: false
      };
    }

    if (stats.size === 0) {
      return {
        valid: false,
        errorCode: 'MEDIA_ASSET_DOWNLOAD_FAILED',
        errorMessage: `Media file is empty (0 bytes) at ${filePath}`,
        isPlaceholder: false,
        isTestAsset: false,
        productionEligible: false
      };
    }

    // 3. Supported Extension
    const ext = path.extname(filePath).toLowerCase();
    const isImage = SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
    const isVideo = SUPPORTED_VIDEO_EXTENSIONS.includes(ext);

    if (!isImage && !isVideo) {
      return {
        valid: false,
        errorCode: 'PRODUCT_ASSET_INVALID',
        errorMessage: `Unsupported media file extension "${ext}". Supported: ${[...SUPPORTED_IMAGE_EXTENSIONS, ...SUPPORTED_VIDEO_EXTENSIONS].join(', ')}`,
        isPlaceholder: false,
        isTestAsset: false,
        productionEligible: false,
        details: { fileSizeBytes: stats.size }
      };
    }

    // 4. Test pattern filename check
    const baseName = path.basename(filePath).toLowerCase();
    const isTestPatternName = TEST_PATTERN_KEYWORDS.some((kw) => baseName.includes(kw));

    if (isProduction && isTestPatternName) {
      return {
        valid: false,
        errorCode: baseName.includes('placeholder') ? 'PRODUCT_ASSET_PLACEHOLDER' : 'PRODUCT_ASSET_INVALID',
        errorMessage: `Media file contains test-pattern name "${baseName}" which is rejected for production renders.`,
        isPlaceholder: baseName.includes('placeholder'),
        isTestAsset: true,
        productionEligible: false,
        details: { fileSizeBytes: stats.size }
      };
    }

    // 5. Probe dimensions and format via FFprobe
    const probe = await this.probeMediaFile(filePath);
    if (!probe.valid) {
      return {
        valid: false,
        errorCode: 'PRODUCT_ASSET_INVALID',
        errorMessage: probe.error || `Corrupted or invalid media container: ${filePath}`,
        isPlaceholder: false,
        isTestAsset: false,
        productionEligible: false,
        details: { fileSizeBytes: stats.size }
      };
    }

    if (probe.width && probe.height && (probe.width < minWidth || probe.height < minHeight)) {
      return {
        valid: false,
        errorCode: 'PRODUCT_ASSET_INVALID',
        errorMessage: `Asset resolution too low (${probe.width}x${probe.height}). Minimum required is ${minWidth}x${minHeight}.`,
        isPlaceholder: false,
        isTestAsset: false,
        productionEligible: false,
        details: {
          fileSizeBytes: stats.size,
          width: probe.width,
          height: probe.height
        }
      };
    }

    return {
      valid: true,
      isPlaceholder: false,
      isTestAsset: false,
      productionEligible: true,
      details: {
        fileSizeBytes: stats.size,
        mimeType: isImage ? `image/${ext.replace('.', '')}` : `video/${ext.replace('.', '')}`,
        width: probe.width,
        height: probe.height,
        durationSeconds: probe.duration
      }
    };
  }

  /**
   * Helper to probe media dimensions and streams via ffprobe/ffmpeg.
   */
  private static probeMediaFile(filePath: string): Promise<{
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
        filePath
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

        // Fallback: simple inspection via ffmpeg -i
        resolve(this.probeWithFfmpegInfo(filePath));
      });

      proc.on('error', () => {
        // If ffprobe isn't in PATH, fallback to ffmpeg info probe
        resolve(this.probeWithFfmpegInfo(filePath));
      });
    });
  }

  private static probeWithFfmpegInfo(filePath: string): Promise<{
    valid: boolean;
    width?: number;
    height?: number;
    duration?: number;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const proc = spawn('ffmpeg', ['-i', filePath, '-f', 'null', '-'], { windowsHide: true });
      let stderr = '';

      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      proc.on('close', () => {
        // Parse "Video: ..., 1080x1920" or "Video: ..., 800x800"
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
        } else if (stderr.includes('Invalid data found when processing input')) {
          resolve({ valid: false, error: 'Corrupt or unreadable media stream.' });
        } else {
          // If extension is valid image/video and non-empty, assume valid stream
          resolve({ valid: true });
        }
      });

      proc.on('error', () => {
        resolve({ valid: true });
      });
    });
  }
}
