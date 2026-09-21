import type {
  Brand,
  BrandProduct,
  BrandAsset,
  MediaAsset,
  MediaRequirement,
  MediaAssetMatch,
  VisualDirection
} from '@vidsnapai/types';
import { ProductionAssetValidator } from './productionAssetValidator.js';

export class AssetResolver {
  /**
   * Matches first-party brand assets and product assets based on scene requirements.
   */
  static matchBrandAssets(context: {
    brand: Brand;
    products: BrandProduct[];
    brandAssets: BrandAsset[];
    requirement: MediaRequirement;
    visualDirection?: VisualDirection;
    isProduction?: boolean;
  }): MediaAssetMatch[] {
    const matches: MediaAssetMatch[] = [];
    const { brand, products, brandAssets, requirement, isProduction = true } = context;

    // Filter brandAssets to only production eligible assets if in production mode
    const eligibleBrandAssets = brandAssets.filter((ba) => {
      if (!isProduction) return true;
      const validation = ProductionAssetValidator.validateAssetEligibility(ba, {
        brandId: brand.id,
        isProduction: true
      });
      return validation.valid;
    });

    const reqText = `${requirement.assetRequirement} ${requirement.purpose} ${requirement.subject} ${requirement.environment} ${requirement.visualType}`.toLowerCase();
    const productRef = requirement.productReference?.toLowerCase();
    const brandElement = requirement.brandElement?.toLowerCase();

    // 1. Check Product-Specific Assets
    for (const product of products) {
      const prodName = product.name.toLowerCase();
      const isProductMentioned = productRef
        ? (productRef.includes(prodName) || prodName.includes(productRef))
        : (reqText.includes(prodName) ||
           requirement.purpose === 'PRODUCT_HERO' ||
           requirement.visualType === 'PRODUCT_SHOWCASE');

      if (isProductMentioned) {
        // Find brand assets associated with this product
        const matchedAssets = eligibleBrandAssets.filter((ba) => {
          const meta = (ba.metadata || {}) as Record<string, unknown>;
          const boundProductId = (ba.productId || meta.productId) as string | undefined;

          // Strict isolation: if bound to a different product, NEVER match
          if (boundProductId && boundProductId !== product.id) {
            return false;
          }

          // Directly bound to this product
          if (boundProductId === product.id) {
            return true;
          }

          // Unbound product image with matching name
          if (!boundProductId && ba.type === 'product_image' && ba.name.toLowerCase().includes(prodName)) {
            return true;
          }

          return false;
        });

        for (const ba of matchedAssets) {
          const meta = (ba.metadata || {}) as Record<string, unknown>;
          const purpose = ba.assetPurpose || (meta.assetPurpose as string);
          let score = 90; // High base score for product match

          if (ba.productId === product.id || meta.productId === product.id) {
            score += 5; // Bonus for explicit binding
          }

          if (purpose === 'HERO' && (requirement.purpose === 'PRODUCT_HERO' || requirement.purpose === 'HOOK' || requirement.visualType === 'PRODUCT_SHOWCASE')) {
            score = 100;
          } else if (purpose === 'DETAIL' && requirement.purpose === 'BENEFIT_DEMONSTRATION') {
            score = 98;
          } else if (purpose === 'PACKSHOT' && (requirement.purpose === 'CTA' || requirement.visualType === 'CTA')) {
            score = 98;
          } else if (purpose === 'FEATURE' && requirement.purpose === 'BENEFIT_DEMONSTRATION') {
            score = 95;
          } else if (purpose === 'LIFESTYLE' && requirement.purpose === 'PROBLEM_AGITATION') {
            score = 95;
          }

          matches.push({
            asset: {
              id: ba.id,
              provider: 'brand_library',
              type: ba.type.includes('video') ? 'video' : 'image',
              title: ba.name,
              url: ba.url,
              previewUrl: ba.url,
              isPlaceholder: false,
              isTestAsset: false,
              productId: product.id,
              assetPurpose: purpose as any,
              productionEligible: true
            },
            score,
            matchSource: 'BRAND_LIBRARY',
            rationale: `Direct first-party match for product "${product.name}" (purpose: ${purpose || 'UNSPECIFIED'})`,
            isFirstParty: true
          });
        }
      }
    }

    // 2. Check Brand Elements (e.g. Logos, Brand Badges, Brand Overlays)
    if (brandElement || requirement.visualType === 'CTA') {
      const logoAssets = eligibleBrandAssets.filter(
        (ba) =>
          ba.type === 'logo' ||
          ba.name.toLowerCase().includes('logo') ||
          ba.name.toLowerCase().includes('badge')
      );

      for (const la of logoAssets) {
        matches.push({
          asset: {
            id: la.id,
            provider: 'brand_library',
            type: 'image',
            title: la.name,
            url: la.url,
            previewUrl: la.url,
            isPlaceholder: false,
            isTestAsset: false,
            productionEligible: true
          },
          score: 95,
          matchSource: 'BRAND_LIBRARY',
          rationale: `First-party brand element match for "${brand.name} Logo/Badge"`,
          isFirstParty: true
        });
      }
    }

    // 3. Check General Brand Asset library with semantic tag matching
    // Do NOT match general brand assets if the scene strictly requires a product hero
    const isProductHeroScene = requirement.purpose === 'PRODUCT_HERO' || requirement.visualType === 'PRODUCT_SHOWCASE';
    if (!isProductHeroScene) {
      for (const ba of eligibleBrandAssets) {
        if (matches.some((m) => (m.asset as MediaAsset).id === ba.id)) continue; // Avoid duplicate candidates

        const meta = (ba.metadata || {}) as Record<string, unknown>;
        const boundProductId = (ba.productId || meta.productId) as string | undefined;
        // Do not use another product's media as general brand asset
        if (boundProductId) continue;

        let score = 30; // Base score for first-party asset candidate
        const assetName = ba.name.toLowerCase();
        const tags = (Array.isArray(meta.tags) ? meta.tags : []).map((t: string) => String(t).toLowerCase());

        const keywords = Array.from(
          new Set([
            ...reqText.split(/\s+/),
            requirement.mood.toLowerCase(),
            requirement.visualType.toLowerCase()
          ])
        );

        for (const kw of keywords) {
          if (kw.length < 3) continue;
          if (assetName.includes(kw)) score += 10;
          if (tags.some((t: string) => t.includes(kw))) score += 15;
        }

        // Cap general keyword matches to 70 (so direct product matches scoring 90+ take priority)
        score = Math.min(score, 70);

        if (score >= 50) {
          matches.push({
            asset: {
              id: ba.id,
              provider: 'brand_library',
              type: ba.type.includes('video') ? 'video' : 'image',
              title: ba.name,
              url: ba.url,
              previewUrl: ba.url
            },
            score,
            matchSource: 'BRAND_LIBRARY',
            rationale: `First-party brand asset match for scene requirement "${ba.name}"`,
            isFirstParty: true
          });
        }
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Generates optimized Pexels search query strings from structured scene requirements.
   */
  static generatePexelsQuery(
    requirement: MediaRequirement,
    visualDirection?: VisualDirection
  ): string {
    const terms: string[] = [];

    // Subject + Environment takes highest precedence
    if (requirement.subject) {
      terms.push(requirement.subject);
    }
    if (requirement.environment && !requirement.subject?.includes(requirement.environment)) {
      terms.push(requirement.environment);
    }
    if (requirement.mood) {
      terms.push(requirement.mood);
    }

    // Visual style hint if relevant
    if (visualDirection?.style && terms.length < 4) {
      const styleWords = visualDirection.style.split(/\s+/).slice(0, 2).join(' ');
      terms.push(styleWords);
    }

    // Clean up punctuation and stop words
    const cleanQuery = terms
      .join(' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Fallback if query is too generic or empty
    return cleanQuery || requirement.assetRequirement || 'cinematic vertical lifestyle';
  }

  /**
   * Scores third-party stock media assets (e.g. from Pexels) for scene selection.
   */
  static scorePexelsAsset(
    asset: MediaAsset,
    requirement: MediaRequirement,
    existingSelectedIds: Set<string>
  ): number {
    let score = 50; // Base score for stock result

    // 1. Duplicate penalty
    if (existingSelectedIds.has(asset.id) || existingSelectedIds.has(asset.url)) {
      score -= 40;
    }

    // 2. Vertical aspect ratio bonus
    if (asset.width && asset.height) {
      const isVertical = asset.height > asset.width;
      if (isVertical) {
        score += 25; // Significant bonus for native vertical 9:16 video/photo
      } else {
        score -= 10; // Penalty for landscape requiring heavy crop
      }
    }

    // 3. Duration match for video
    if (asset.type === 'video' && asset.durationSeconds) {
      if (asset.durationSeconds >= requirement.durationSeconds * 0.8) {
        score += 15;
      }
    }

    // 4. Keyword relevance in title
    if (asset.title) {
      const titleLower = asset.title.toLowerCase();
      const keywords = [
        requirement.subject.toLowerCase(),
        requirement.environment.toLowerCase(),
        requirement.mood.toLowerCase()
      ];
      for (const kw of keywords) {
        if (kw && titleLower.includes(kw)) score += 10;
      }
    }

    return Math.max(0, Math.min(100, score));
  }
}
