import type {
  Brand,
  BrandProduct,
  BrandAsset,
  ReelScene,
  VeoReferenceImage
} from '@vidsnapai/types';

export interface ResolveVeoReferencesInput {
  brand: Brand;
  product?: BrandProduct | null;
  products?: BrandProduct[];
  scene: ReelScene;
  brandAssets: BrandAsset[];
  workspaceId?: string;
  isProduction?: boolean;
}

export interface ResolvedVeoReferences {
  productId: string | null;
  productName: string | null;
  selectedAssets: BrandAsset[];
  referenceImages: VeoReferenceImage[];
  referenceAssetIds: string[];
  firstFrameAssetId: string | null;
  preservationPromptDirective: string;
  negativePromptDirective: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isValid: boolean;
  failureReason?: string;
}

export const VEO_PRESERVATION_PROMPT_DIRECTIVE =
  'Preserve the exact appearance, proportions, colors, materials, branding and recognizable details of the supplied product reference.';

export const VEO_NEGATIVE_PRESERVATION_DIRECTIVE =
  'distorted product geometry, altered logo, changed product colors, different packaging, invented accessories, invented text on packaging, distorted product shape, fake brand mark, CGI glitch, cartoon';

const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic'
];

export class VeoReferenceAssetResolver {
  /**
   * Determines if a given Reel scene requires product reference preservation.
   */
  public static isProductScene(scene: ReelScene): boolean {
    const purpose = (scene.purpose || '').toUpperCase();
    const visualType = (scene.visualType || '').toUpperCase();
    return (
      purpose.includes('PRODUCT') ||
      purpose.includes('HERO') ||
      purpose.includes('FEATURE') ||
      visualType === 'PRODUCT_SHOWCASE' ||
      visualType === 'PRODUCT_HERO' ||
      visualType === 'FEATURE_CALLOUT' ||
      visualType === 'DEMONSTRATION'
    );
  }

  /**
   * Validates whether an asset is eligible to be a high-fidelity Veo product reference image.
   */
  public static validateAssetForVeoReference(
    asset: BrandAsset,
    context: {
      brandId: string;
      workspaceId?: string;
      productId: string;
    }
  ): { valid: boolean; reason?: string } {
    // 1. Accessibility & URL validation
    if (!asset.url || asset.url.trim().length === 0) {
      return { valid: false, reason: 'Asset URL is missing or inaccessible' };
    }

    // 2. Reject test and placeholder assets
    if (asset.isPlaceholder || (asset.metadata as any)?.isPlaceholder) {
      return { valid: false, reason: 'Placeholder assets cannot be used as Veo product references' };
    }
    if (asset.isTestAsset || (asset.metadata as any)?.isTestAsset) {
      return { valid: false, reason: 'Test pattern assets cannot be used as Veo product references' };
    }
    if (asset.productionEligible === false || (asset.metadata as any)?.productionEligible === false) {
      return { valid: false, reason: 'Asset is flagged as not production-eligible' };
    }

    // 3. Multi-tenant isolation checks
    if (asset.brandId && asset.brandId !== context.brandId) {
      return { valid: false, reason: `Asset brandId (${asset.brandId}) does not match target brandId (${context.brandId})` };
    }
    if (context.workspaceId && asset.workspaceId && asset.workspaceId !== context.workspaceId) {
      return { valid: false, reason: `Asset workspaceId (${asset.workspaceId}) does not match context workspaceId (${context.workspaceId})` };
    }

    // 4. Product Binding check
    const boundProductId = asset.productId || (asset.metadata as any)?.productId;
    if (boundProductId && boundProductId !== context.productId) {
      return {
        valid: false,
        reason: `Asset is bound to a different product (${boundProductId} != ${context.productId})`
      };
    }

    // 5. MIME type validation (must be a valid image)
    const mime = (asset.mimeType || '').toLowerCase();
    const urlLower = asset.url.toLowerCase();
    const isImageExt = /\.(png|jpe?g|webp|avif|heic)(\?.*)?$/i.test(urlLower);
    const isVideo = mime.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(urlLower);

    if (isVideo) {
      return { valid: false, reason: 'Video assets cannot be supplied as static reference images' };
    }

    if (mime && !ALLOWED_IMAGE_MIMES.includes(mime) && !isImageExt) {
      return { valid: false, reason: `Unsupported image MIME type: ${mime}` };
    }

    // 6. Dimensions validation
    if (asset.width !== undefined && asset.width !== null && asset.width < 128) {
      return { valid: false, reason: `Asset resolution too low (${asset.width}px width, min 128px required)` };
    }
    if (asset.height !== undefined && asset.height !== null && asset.height < 128) {
      return { valid: false, reason: `Asset resolution too low (${asset.height}px height, min 128px required)` };
    }

    return { valid: true };
  }

  /**
   * Resolves, filters, prioritizes, and formats up to 3 Veo reference images for a product scene.
   */
  public static resolveReferences(context: ResolveVeoReferencesInput): ResolvedVeoReferences {
    const { brand, product, products = [], scene, brandAssets = [], workspaceId } = context;

    // 1. Resolve target product
    let targetProduct = product;
    if (!targetProduct && scene.productReference) {
      const ref = scene.productReference.toLowerCase().trim();
      targetProduct =
        products.find((p) => p.id === scene.productReference || p.name.toLowerCase() === ref) ||
        products.find((p) => ref.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(ref)) ||
        null;
    }
    if (!targetProduct && products.length > 0) {
      targetProduct = products[0];
    }

    const isProductCentric = this.isProductScene(scene);

    if (!targetProduct) {
      if (isProductCentric) {
        return {
          productId: null,
          productName: null,
          selectedAssets: [],
          referenceImages: [],
          referenceAssetIds: [],
          firstFrameAssetId: null,
          preservationPromptDirective: VEO_PRESERVATION_PROMPT_DIRECTIVE,
          negativePromptDirective: VEO_NEGATIVE_PRESERVATION_DIRECTIVE,
          confidence: 'LOW',
          isValid: false,
          failureReason: 'PRODUCT_NOT_RESOLVED: Scene requires product reference but no product could be identified.'
        };
      }
      return {
        productId: null,
        productName: null,
        selectedAssets: [],
        referenceImages: [],
        referenceAssetIds: [],
        firstFrameAssetId: null,
        preservationPromptDirective: VEO_PRESERVATION_PROMPT_DIRECTIVE,
        negativePromptDirective: VEO_NEGATIVE_PRESERVATION_DIRECTIVE,
        confidence: 'HIGH',
        isValid: true
      };
    }

    const productId = targetProduct.id;
    const productName = targetProduct.name;

    // 2. Filter candidate assets strictly for this product
    const eligibleAssets: Array<{ asset: BrandAsset; priority: number }> = [];

    for (const asset of brandAssets) {
      const validation = this.validateAssetForVeoReference(asset, {
        brandId: brand.id,
        workspaceId: workspaceId || brand.workspaceId,
        productId
      });

      if (!validation.valid) {
        continue;
      }

      const boundProductId = asset.productId || (asset.metadata as any)?.productId;
      const isDirectlyBound = boundProductId === productId;
      const isNameMatched = !boundProductId && asset.name.toLowerCase().includes(productName.toLowerCase());

      if (!isDirectlyBound && !isNameMatched) {
        // Never use unrelated brand assets
        continue;
      }

      const purpose = (asset.assetPurpose || (asset.metadata as any)?.assetPurpose || '').toUpperCase();
      let priorityScore = 10;

      // Priority 1: HERO / PACKSHOT
      if (purpose === 'HERO' || purpose === 'PACKSHOT') {
        priorityScore = 100;
      }
      // Priority 2: DETAIL / FEATURE
      else if (purpose === 'DETAIL' || purpose === 'FEATURE') {
        priorityScore = 80;
      }
      // Priority 3: LIFESTYLE
      else if (purpose === 'LIFESTYLE') {
        priorityScore = 60;
      }
      // Direct binding boost
      if (isDirectlyBound) {
        priorityScore += 5;
      }

      eligibleAssets.push({ asset, priority: priorityScore });
    }

    // 3. Sort by priority descending
    eligibleAssets.sort((a, b) => b.priority - a.priority);

    // 4. Select up to 3 reference images
    const selectedAssets = eligibleAssets.slice(0, 3).map((item) => item.asset);

    if (isProductCentric && selectedAssets.length === 0) {
      return {
        productId,
        productName,
        selectedAssets: [],
        referenceImages: [],
        referenceAssetIds: [],
        firstFrameAssetId: null,
        preservationPromptDirective: VEO_PRESERVATION_PROMPT_DIRECTIVE,
        negativePromptDirective: VEO_NEGATIVE_PRESERVATION_DIRECTIVE,
        confidence: 'LOW',
        isValid: false,
        failureReason: `PRODUCT_REFERENCE_REQUIRED: No production-eligible reference assets found for "${productName}" (Product ID: ${productId}).`
      };
    }

    // 5. Format reference image payloads
    const referenceImages: VeoReferenceImage[] = selectedAssets.map((asset, idx) => ({
      image: {
        uri: asset.url,
        mimeType: asset.mimeType || 'image/png'
      },
      referenceType: 'REFERENCE_TYPE_SUBJECT',
      referenceId: idx + 1
    }));

    const referenceAssetIds = selectedAssets.map((a) => a.id);
    const firstFrameAssetId = selectedAssets.length > 0 ? selectedAssets[0].id : null;

    return {
      productId,
      productName,
      selectedAssets,
      referenceImages,
      referenceAssetIds,
      firstFrameAssetId,
      preservationPromptDirective: VEO_PRESERVATION_PROMPT_DIRECTIVE,
      negativePromptDirective: VEO_NEGATIVE_PRESERVATION_DIRECTIVE,
      confidence: selectedAssets.length >= 2 ? 'HIGH' : selectedAssets.length === 1 ? 'MEDIUM' : 'LOW',
      isValid: true
    };
  }
}
