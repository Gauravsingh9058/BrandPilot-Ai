import type { PlatformSafeAreaSpec } from '@vidsnapai/types';

export type SupportedPlatform = 'INSTAGRAM_REELS' | 'TIKTOK' | 'YOUTUBE_SHORTS' | 'UNIVERSAL';

export class PlatformSafeArea {
  public static readonly DEFAULT_WIDTH = 1080;
  public static readonly DEFAULT_HEIGHT = 1920;

  public static readonly PLATFORM_SPECS: Record<SupportedPlatform, PlatformSafeAreaSpec> = {
    INSTAGRAM_REELS: {
      topMarginPercent: 0.15,     // 288px in 1080x1920
      bottomMarginPercent: 0.22,  // 422px in 1080x1920 (Captions, audio pill, profile)
      sideMarginPercent: 0.12,    // 130px in 1080x1920 (Right interaction buttons)
      safeBox: {
        top: 288,
        bottom: 1498,
        left: 86,
        right: 950
      }
    },
    TIKTOK: {
      topMarginPercent: 0.10,     // 192px
      bottomMarginPercent: 0.25,  // 480px (User handle, description, sound disc)
      sideMarginPercent: 0.15,    // 162px (Sidebar like/share/bookmark column)
      safeBox: {
        top: 192,
        bottom: 1440,
        left: 86,
        right: 918
      }
    },
    YOUTUBE_SHORTS: {
      topMarginPercent: 0.12,     // 230px
      bottomMarginPercent: 0.20,  // 384px (Channel pill, title, remix)
      sideMarginPercent: 0.14,    // 151px (Shorts engagement rail)
      safeBox: {
        top: 230,
        bottom: 1536,
        left: 86,
        right: 929
      }
    },
    UNIVERSAL: {
      topMarginPercent: 0.15,     // 288px
      bottomMarginPercent: 0.25,  // 480px
      sideMarginPercent: 0.15,    // 162px
      safeBox: {
        top: 288,
        bottom: 1440,
        left: 86,
        right: 918
      }
    }
  };

  /**
   * Returns the safe bounding box in pixels for a given platform and resolution.
   */
  public static getSafeBounds(
    platform: SupportedPlatform = 'UNIVERSAL',
    width = this.DEFAULT_WIDTH,
    height = this.DEFAULT_HEIGHT
  ): { top: number; bottom: number; left: number; right: number; width: number; height: number } {
    const spec = this.PLATFORM_SPECS[platform] || this.PLATFORM_SPECS.UNIVERSAL;
    const top = Math.round(height * spec.topMarginPercent);
    const bottom = Math.round(height * (1 - spec.bottomMarginPercent));
    const left = Math.round(width * 0.08); // 8% left margin
    const right = Math.round(width * (1 - spec.sideMarginPercent));

    return {
      top,
      bottom,
      left,
      right,
      width: right - left,
      height: bottom - top
    };
  }

  /**
   * Calculates safe vertical placement ratio (between 0.0 and 1.0)
   * for designated visual elements (e.g. Logo, Feature Badge, Kinetic Captions, CTA Button).
   */
  public static getElementSafePlacement(
    element: 'LOGO_TOP' | 'FEATURE_BADGE' | 'KINETIC_CAPTIONS' | 'CTA_BUTTON' | 'PRODUCT_HERO',
    _platform: SupportedPlatform = 'UNIVERSAL'
  ): { yRatio: number; maxFontSize: number; align: 'center' | 'left' } {
    switch (element) {
      case 'LOGO_TOP':
        return { yRatio: 0.16, maxFontSize: 40, align: 'center' };
      case 'FEATURE_BADGE':
        return { yRatio: 0.24, maxFontSize: 38, align: 'center' };
      case 'PRODUCT_HERO':
        return { yRatio: 0.50, maxFontSize: 48, align: 'center' };
      case 'KINETIC_CAPTIONS':
        // Place in lower-middle section above the platform UI bottom margin
        return { yRatio: 0.62, maxFontSize: 46, align: 'center' };
      case 'CTA_BUTTON':
        // Anchored prominently within safe bottom boundary
        return { yRatio: 0.68, maxFontSize: 44, align: 'center' };
      default:
        return { yRatio: 0.62, maxFontSize: 44, align: 'center' };
    }
  }

  /**
   * Validates if given Y coordinates fall strictly within the universal safe area.
   */
  public static isWithinSafeArea(
    y: number,
    elementHeight: number,
    totalHeight = this.DEFAULT_HEIGHT,
    platform: SupportedPlatform = 'UNIVERSAL'
  ): boolean {
    const bounds = this.getSafeBounds(platform, this.DEFAULT_WIDTH, totalHeight);
    return y >= bounds.top && y + elementHeight <= bounds.bottom;
  }
}
