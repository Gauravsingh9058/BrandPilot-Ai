import type {
  Brand,
  BrandProduct,
  BrandAsset,
  ContentJob,
  ReelScene,
  MediaAssetMatch,
  VisualDirection
} from '@vidsnapai/types';
import { AssetResolver } from './assetResolver.js';

export type AssetOrientation = 'PORTRAIT_9_16' | 'LANDSCAPE_16_9' | 'SQUARE_1_1' | 'STANDARD_4_3' | 'CUSTOM';
export type AssetClassificationType =
  | 'PRODUCT_HERO'
  | 'PRODUCT_CLOSEUP'
  | 'PRODUCT_IN_USE'
  | 'PRODUCT_IMAGE'
  | 'PRODUCT_VIDEO'
  | 'BRAND_LOGO'
  | 'BRAND_BADGE'
  | 'LIFESTYLE'
  | 'B_ROLL'
  | 'BACKGROUND';

export interface AssetAnalysisResult {
  assetId?: string;
  productId?: string;
  name: string;
  classification: AssetClassificationType;
  orientation: AssetOrientation;
  aspectRatio: string;
  isVerticalCompatible: boolean;
  recommendedCrop: {
    targetAspect: '9:16';
    scaleMode: 'cover' | 'contain';
    cropRegion: 'center' | 'top' | 'bottom';
  };
  detectedProductIds: string[];
  semanticTags: string[];
  qualityScore: number;
}

export interface ProductSelectionResult {
  selectedProduct: BrandProduct;
  rationale: string;
  matchingAssets: BrandAsset[];
}

export class AssetIntelligenceService {
  /**
   * Automatically classifies and analyzes an uploaded or catalog asset.
   */
  static analyzeAsset(params: {
    name: string;
    url: string;
    mimeType?: string;
    width?: number;
    height?: number;
    productId?: string;
    products?: BrandProduct[];
    tags?: string[];
  }): AssetAnalysisResult {
    const { name, url, mimeType = '', width, height, productId, products = [], tags = [] } = params;

    const lowerName = name.toLowerCase();
    const isVideo = mimeType.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/i.test(url) || /\.(mp4|mov|webm|avi|mkv)$/i.test(name);

    // 1. Detect Orientation
    let orientation: AssetOrientation = 'PORTRAIT_9_16';
    let isVerticalCompatible = true;
    let aspectRatio = '9:16';

    if (width && height) {
      const ratio = width / height;
      if (ratio <= 0.6) {
        orientation = 'PORTRAIT_9_16';
        aspectRatio = '9:16';
        isVerticalCompatible = true;
      } else if (ratio >= 1.7) {
        orientation = 'LANDSCAPE_16_9';
        aspectRatio = '16:9';
        isVerticalCompatible = false;
      } else if (Math.abs(ratio - 1.0) <= 0.1) {
        orientation = 'SQUARE_1_1';
        aspectRatio = '1:1';
        isVerticalCompatible = true;
      } else {
        orientation = ratio > 1 ? 'LANDSCAPE_16_9' : 'PORTRAIT_9_16';
        aspectRatio = `${width}:${height}`;
        isVerticalCompatible = height >= width;
      }
    }

    // 2. Classify Asset Type
    let classification: AssetClassificationType = 'PRODUCT_IMAGE';

    if (lowerName.includes('logo') || tags.includes('logo')) {
      classification = 'BRAND_LOGO';
    } else if (lowerName.includes('badge') || lowerName.includes('seal') || tags.includes('badge')) {
      classification = 'BRAND_BADGE';
    } else if (isVideo) {
      classification = lowerName.includes('product') || lowerName.includes('demo') ? 'PRODUCT_VIDEO' : 'B_ROLL';
    } else if (lowerName.includes('hero') || lowerName.includes('main') || lowerName.includes('front')) {
      classification = 'PRODUCT_HERO';
    } else if (lowerName.includes('closeup') || lowerName.includes('detail') || lowerName.includes('macro')) {
      classification = 'PRODUCT_CLOSEUP';
    } else if (lowerName.includes('lifestyle') || lowerName.includes('model') || lowerName.includes('wearing') || lowerName.includes('action')) {
      classification = 'PRODUCT_IN_USE';
    } else if (lowerName.includes('bg') || lowerName.includes('background') || lowerName.includes('texture')) {
      classification = 'BACKGROUND';
    }

    // 3. Associate with Products
    const detectedProductIds: string[] = [];
    if (productId) {
      detectedProductIds.push(productId);
    }

    for (const prod of products) {
      const prodName = prod.name.toLowerCase();
      if (lowerName.includes(prodName) || (prod.category && lowerName.includes(prod.category.toLowerCase()))) {
        if (!detectedProductIds.includes(prod.id)) {
          detectedProductIds.push(prod.id);
        }
      }
    }

    // 4. Extract Semantic Tags
    const extractedTags = new Set<string>(tags);
    const keywords = lowerName.split(/[^a-zA-Z0-9]+/);
    for (const kw of keywords) {
      if (kw.length >= 3) extractedTags.add(kw);
    }

    return {
      name,
      classification,
      orientation,
      aspectRatio,
      isVerticalCompatible,
      recommendedCrop: {
        targetAspect: '9:16',
        scaleMode: orientation === 'PORTRAIT_9_16' ? 'cover' : 'contain',
        cropRegion: 'center'
      },
      detectedProductIds,
      productId: detectedProductIds[0] || undefined,
      semanticTags: Array.from(extractedTags),
      qualityScore: isVerticalCompatible ? 95 : 85
    };
  }

  /**
   * Automatically selects the most strategic product from a brand's catalog for a given ContentJob.
   */
  static matchProductForContentJob(
    products: BrandProduct[],
    contentJob: ContentJob,
    brandAssets: BrandAsset[] = []
  ): ProductSelectionResult | null {
    if (!products || products.length === 0) {
      return null;
    }

    const jobText = `${contentJob.title} ${contentJob.topic} ${contentJob.keyMessage} ${contentJob.hook} ${contentJob.contentPillar} ${contentJob.funnelStage}`.toLowerCase();

    // 1. Direct match by job title / topic / text
    let bestProduct: BrandProduct | null = null;
    let highestScore = -1;
    let matchRationale = '';

    for (const prod of products) {
      let score = 0;
      const prodName = prod.name.toLowerCase();
      const category = (prod.category || '').toLowerCase();

      if (jobText.includes(prodName)) score += 50;
      if (category && jobText.includes(category)) score += 20;

      // Funnel Stage matching
      if (contentJob.funnelStage === 'CONVERSION' && prod.price) score += 15;
      if (contentJob.funnelStage === 'AWARENESS') score += 10;

      // Has real brand assets bonus
      const prodAssets = brandAssets.filter((ba) => {
        const meta = (ba.metadata || {}) as Record<string, unknown>;
        return meta.productId === prod.id || ba.name.toLowerCase().includes(prodName);
      });
      if (prodAssets.length > 0) score += 25;

      if (score > highestScore) {
        highestScore = score;
        bestProduct = prod;
        matchRationale = `Matched product "${prod.name}" based on relevance to content topic "${contentJob.title}" and ${contentJob.funnelStage} funnel stage.`;
      }
    }

    // 2. Default to first product if no explicit keyword match (round-robin / flagship)
    if (!bestProduct) {
      const idx = (contentJob.dayNumber - 1) % products.length;
      bestProduct = products[idx] || products[0];
      matchRationale = `Rotated catalog product "${bestProduct.name}" for Day ${contentJob.dayNumber}.`;
    }

    const matchingAssets = brandAssets.filter((ba) => {
      const meta = (ba.metadata || {}) as Record<string, unknown>;
      return meta.productId === bestProduct!.id || ba.name.toLowerCase().includes(bestProduct!.name.toLowerCase());
    });

    return {
      selectedProduct: bestProduct,
      rationale: matchRationale,
      matchingAssets
    };
  }

  /**
   * Maps brand product assets to the planned scenes of a reel blueprint.
   */
  static assignProductAssetsToScenes(params: {
    brand: Brand;
    product: BrandProduct;
    brandAssets: BrandAsset[];
    scenes: ReelScene[];
    visualDirection?: VisualDirection;
  }): Array<{ sceneNumber: number; assignedAsset: BrandAsset | null; matchScore: number }> {
    const { brand, product, brandAssets, scenes, visualDirection } = params;

    return scenes.map((scene) => {
      const requirement = {
        sceneNumber: scene.sceneNumber,
        purpose: scene.purpose,
        assetRequirement: scene.assetRequirement || scene.subject || 'product visual',
        productReference: product.name,
        brandElement: scene.brandElement,
        visualType: scene.visualType,
        mood: scene.mood || 'modern',
        subject: scene.subject || product.name,
        environment: scene.environment || '',
        durationSeconds: scene.durationSeconds || 4
      };

      const matches: MediaAssetMatch[] = AssetResolver.matchBrandAssets({
        brand,
        products: [product],
        brandAssets,
        requirement,
        visualDirection
      });

      const topMatch = matches[0];
      const matchedBrandAsset = topMatch
        ? brandAssets.find((ba) => ba.id === topMatch.asset.id) || null
        : null;

      return {
        sceneNumber: scene.sceneNumber,
        assignedAsset: matchedBrandAsset,
        matchScore: topMatch?.score || 0
      };
    });
  }
}
