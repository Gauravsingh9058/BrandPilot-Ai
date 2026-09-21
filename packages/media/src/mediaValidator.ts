export interface MediaValidationResult {
  isValid: boolean;
  isVerticalCompatible: boolean;
  aspectRatio: number | null;
  warnings: string[];
  errors: string[];
}

export class MediaValidator {
  /**
   * Checks if media dimensions match target vertical format (9:16).
   */
  static validateDimensions(
    width?: number | null,
    height?: number | null
  ): { isVertical: boolean; aspectRatio: number | null; warning?: string } {
    if (!width || !height || width <= 0 || height <= 0) {
      return {
        isVertical: true, // Default to true if dimensions are unknown from third-party preview
        aspectRatio: null,
        warning: 'Dimensions are not specified; assuming vertical compatibility.'
      };
    }

    const aspectRatio = width / height;
    // 9:16 is 0.5625. We allow tolerance between 0.45 and 0.75 for vertical video framing.
    const isVertical = aspectRatio <= 0.75;
    const warning = !isVertical
      ? `Asset aspect ratio (${aspectRatio.toFixed(2)}) is horizontal/landscape. Phase 8 will center-crop to 9:16.`
      : undefined;

    return {
      isVertical,
      aspectRatio,
      warning
    };
  }

  /**
   * Validates media suitability for Reel scene requirements.
   */
  static validateMediaAsset(options: {
    type: 'video' | 'image';
    width?: number | null;
    height?: number | null;
    durationSeconds?: number | null;
    targetDurationSeconds?: number;
    mimeType?: string | null;
  }): MediaValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    const dimCheck = this.validateDimensions(options.width, options.height);
    if (dimCheck.warning) {
      warnings.push(dimCheck.warning);
    }

    // Minimum resolution guidance (recommended height >= 960)
    if (options.height && options.height < 720) {
      warnings.push(`Low resolution media (${options.width}x${options.height}). Recommended minimum is 720x1280.`);
    }

    // Duration check for video
    if (options.type === 'video' && options.durationSeconds !== undefined && options.durationSeconds !== null) {
      if (options.durationSeconds <= 0) {
        errors.push('Video duration must be greater than 0 seconds.');
      } else if (
        options.targetDurationSeconds &&
        options.durationSeconds < options.targetDurationSeconds * 0.5
      ) {
        warnings.push(
          `Video duration (${options.durationSeconds.toFixed(1)}s) is shorter than target scene duration (${options.targetDurationSeconds.toFixed(1)}s). May require looping.`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      isVerticalCompatible: dimCheck.isVertical,
      aspectRatio: dimCheck.aspectRatio,
      warnings,
      errors
    };
  }
}
