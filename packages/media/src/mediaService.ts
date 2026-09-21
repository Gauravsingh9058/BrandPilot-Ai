import type { Database } from '@vidsnapai/database';
import type {
  ReelProductionPlan,
  ReelAsset,
  MediaProvider,
  MediaRequirement,
  ReelAssetSourceType,
  MediaAsset
} from '@vidsnapai/types';
import { BrandRepository, ProductRepository, AssetRepository as BrandAssetRepository } from '@vidsnapai/brand';
import { LocalStorageProvider } from '@vidsnapai/storage';
import { ReelAssetRepository } from './repositories/reel-asset.repository.js';
import { AssetResolver } from './assetResolver.js';
import { MediaValidator } from './mediaValidator.js';

export interface ResolveMediaOptions {
  preferFirstPartyOnly?: boolean;
  refreshExisting?: boolean;
}

export interface MediaResolutionResult {
  assets: ReelAsset[];
  summary: {
    totalScenes: number;
    resolvedScenes: number;
    brandAssetMatches: number;
    pexelsMatches: number;
    fallbacks: number;
  };
}

export class MediaService {
  private reelAssetRepo: ReelAssetRepository;
  private brandRepo: BrandRepository;
  private productRepo: ProductRepository;
  private brandAssetRepo: BrandAssetRepository;

  constructor(
    db: Database,
    private mediaProvider?: MediaProvider,
    repos?: {
      reelAssetRepo?: ReelAssetRepository;
      brandRepo?: BrandRepository;
      productRepo?: ProductRepository;
      brandAssetRepo?: BrandAssetRepository;
    }
  ) {
    this.reelAssetRepo = repos?.reelAssetRepo || new ReelAssetRepository(db);
    this.brandRepo = repos?.brandRepo || new BrandRepository(db);
    this.productRepo = repos?.productRepo || new ProductRepository(db);
    this.brandAssetRepo = repos?.brandAssetRepo || new BrandAssetRepository(db);
  }

  /**
   * Resolves media assets for all scenes in a ReelProductionPlan blueprint.
   */
  async resolveReelMedia(
    reelPlan: ReelProductionPlan,
    workspaceId: string,
    options: ResolveMediaOptions = {}
  ): Promise<MediaResolutionResult> {
    const [brand, products, brandAssets] = await Promise.all([
      this.brandRepo.findById(reelPlan.brandId),
      this.productRepo.listForBrand(reelPlan.brandId),
      this.brandAssetRepo.listForBrand(reelPlan.brandId)
    ]);

    if (!brand) {
      throw new Error(`Brand not found with ID ${reelPlan.brandId}`);
    }

    if (options.refreshExisting) {
      await this.reelAssetRepo.deleteForReelPlan(reelPlan.id);
    }

    const resolvedAssets: ReelAsset[] = [];
    const selectedAssetIds = new Set<string>();

    let brandAssetMatchesCount = 0;
    let pexelsMatchesCount = 0;
    let fallbacksCount = 0;

    const scenes = reelPlan.scenes || [];

    for (const scene of scenes) {
      const requirement: MediaRequirement = {
        sceneNumber: scene.sceneNumber,
        purpose: scene.purpose,
        assetRequirement: scene.assetRequirement || scene.subject || 'scene visual',
        productReference: scene.productReference,
        brandElement: scene.brandElement,
        visualType: scene.visualType || 'B-ROLL',
        mood: scene.mood || 'modern',
        subject: scene.subject || '',
        environment: scene.environment || '',
        durationSeconds: scene.durationSeconds || 4
      };

      // 1. First-Party Brand/Product Asset Resolution
      const firstPartyMatches = AssetResolver.matchBrandAssets({
        brand,
        products,
        brandAssets,
        requirement,
        visualDirection: reelPlan.visualDirection
      });

      const topFirstParty = firstPartyMatches[0];

      if (topFirstParty && topFirstParty.score >= 75) {
        // High confidence first-party match!
        const mediaAsset = topFirstParty.asset as MediaAsset;
        const createdAsset = await this.reelAssetRepo.create({
          reelPlanId: reelPlan.id,
          workspaceId,
          brandId: reelPlan.brandId,
          sceneNumber: scene.sceneNumber,
          assetType: mediaAsset.type === 'video' ? 'PRODUCT_VIDEO' : 'PRODUCT_IMAGE',
          sourceType: 'BRAND_LIBRARY',
          provider: 'brand_library',
          providerAssetId: mediaAsset.id,
          sourceUrl: mediaAsset.url,
          previewUrl: mediaAsset.previewUrl || mediaAsset.url,
          filename: mediaAsset.title,
          isPlaceholder: false,
          isTestAsset: false,
          productId: (mediaAsset as any).productId || null,
          assetPurpose: scene.purpose,
          productionEligible: true,
          metadata: {
            matchScore: topFirstParty.score,
            rationale: topFirstParty.rationale,
            scenePurpose: scene.purpose,
            isFirstParty: true,
            isPlaceholder: false,
            isTestAsset: false,
            productId: (mediaAsset as any).productId || null,
            productionEligible: true
          },
          licenseMetadata: {
            license: 'First-Party Brand Asset',
            attribution: brand.name
          },
          status: 'READY'
        });

        resolvedAssets.push(createdAsset);
        selectedAssetIds.add(mediaAsset.id);
        brandAssetMatchesCount++;
        continue;
      }

      if (options.preferFirstPartyOnly && topFirstParty) {
        // Prefer first party even if score is moderate
        const mediaAsset = topFirstParty.asset as MediaAsset;
        const createdAsset = await this.reelAssetRepo.create({
          reelPlanId: reelPlan.id,
          workspaceId,
          brandId: reelPlan.brandId,
          sceneNumber: scene.sceneNumber,
          assetType: mediaAsset.type === 'video' ? 'VIDEO' : 'IMAGE',
          sourceType: 'BRAND_LIBRARY',
          provider: 'brand_library',
          providerAssetId: mediaAsset.id,
          sourceUrl: mediaAsset.url,
          previewUrl: mediaAsset.previewUrl || mediaAsset.url,
          filename: mediaAsset.title,
          isPlaceholder: false,
          isTestAsset: false,
          productId: (mediaAsset as any).productId || null,
          assetPurpose: scene.purpose,
          productionEligible: true,
          metadata: {
            matchScore: topFirstParty.score,
            rationale: topFirstParty.rationale,
            scenePurpose: scene.purpose,
            isFirstParty: true,
            isPlaceholder: false,
            isTestAsset: false,
            productId: (mediaAsset as any).productId || null,
            productionEligible: true
          },
          licenseMetadata: {
            license: 'First-Party Brand Asset',
            attribution: brand.name
          },
          status: 'READY'
        });

        resolvedAssets.push(createdAsset);
        selectedAssetIds.add(mediaAsset.id);
        brandAssetMatchesCount++;
        continue;
      }

      // 2. Stock Media Resolution via Pexels Provider
      // Pexels may ONLY be used for lifestyle B-roll, environmental shots, supporting scenes, and generic contextual footage.
      // Product hero scenes MUST use first-party product media and cannot silently resolve from Pexels.
      const isProductHeroScene =
        scene.purpose === 'PRODUCT_HERO' ||
        scene.purpose === 'HOOK' ||
        scene.visualType === 'PRODUCT_SHOWCASE' ||
        (scene.visualType as string) === 'HERO' ||
        Boolean(scene.productReference);

      let pexelsAssetSelected: MediaAsset | null = null;
      let pexelsScore = 0;

      if (this.mediaProvider && !isProductHeroScene) {
        try {
          const searchQuery = AssetResolver.generatePexelsQuery(
            requirement,
            reelPlan.visualDirection
          );

          // Try searching videos first for rich vertical motion
          const searchRes = await this.mediaProvider.searchVideos({
            query: searchQuery,
            perPage: 10,
            orientation: 'portrait'
          });

          const candidates = searchRes.assets || [];
          let bestCandidate: MediaAsset | null = null;
          let bestScore = -1;

          for (const cand of candidates) {
            const score = AssetResolver.scorePexelsAsset(
              cand,
              requirement,
              selectedAssetIds
            );
            if (score > bestScore) {
              bestScore = score;
              bestCandidate = cand;
            }
          }

          if (bestCandidate && bestScore >= 40) {
            pexelsAssetSelected = bestCandidate;
            pexelsScore = bestScore;
          } else {
            // Fallback to stock images search
            const imgRes = await this.mediaProvider.searchImages({
              query: searchQuery,
              perPage: 10,
              orientation: 'portrait'
            });

            if (imgRes.assets && imgRes.assets.length > 0) {
              pexelsAssetSelected = imgRes.assets[0];
              pexelsScore = 60;
            }
          }
        } catch {
          // Graceful fallback on stock provider error (e.g. rate limit, offline, missing key)
          pexelsAssetSelected = null;
        }
      }

      if (pexelsAssetSelected) {
        const val = MediaValidator.validateMediaAsset({
          type: pexelsAssetSelected.type,
          width: pexelsAssetSelected.width,
          height: pexelsAssetSelected.height,
          durationSeconds: pexelsAssetSelected.durationSeconds,
          targetDurationSeconds: scene.durationSeconds
        });

        const createdAsset = await this.reelAssetRepo.create({
          reelPlanId: reelPlan.id,
          workspaceId,
          brandId: reelPlan.brandId,
          sceneNumber: scene.sceneNumber,
          assetType: pexelsAssetSelected.type === 'video' ? 'VIDEO' : 'IMAGE',
          sourceType: 'PEXELS',
          provider: 'pexels',
          providerAssetId: pexelsAssetSelected.id,
          sourceUrl: pexelsAssetSelected.url,
          previewUrl: pexelsAssetSelected.previewUrl || pexelsAssetSelected.url,
          width: pexelsAssetSelected.width,
          height: pexelsAssetSelected.height,
          durationSeconds: pexelsAssetSelected.durationSeconds,
          isPlaceholder: false,
          isTestAsset: false,
          assetPurpose: scene.purpose,
          productionEligible: true,
          metadata: {
            matchScore: pexelsScore,
            isVerticalCompatible: val.isVerticalCompatible,
            warnings: val.warnings,
            scenePurpose: scene.purpose,
            isPlaceholder: false,
            isTestAsset: false,
            productionEligible: true
          },
          licenseMetadata: {
            provider: 'Pexels',
            photographer: pexelsAssetSelected.photographer,
            photographerUrl: pexelsAssetSelected.photographerUrl,
            license: 'Free to use under Pexels License'
          },
          status: 'READY'
        });

        resolvedAssets.push(createdAsset);
        selectedAssetIds.add(pexelsAssetSelected.id);
        pexelsMatchesCount++;
      } else {
        // 3. Fallback Placeholder Asset Record (Requirements captured, awaiting media download/upload)
        const createdAsset = await this.reelAssetRepo.create({
          reelPlanId: reelPlan.id,
          workspaceId,
          brandId: reelPlan.brandId,
          sceneNumber: scene.sceneNumber,
          assetType: 'VIDEO',
          sourceType: 'EXTERNAL',
          provider: 'fallback_placeholder',
          sourceUrl: null,
          previewUrl: null,
          isPlaceholder: true,
          isTestAsset: false,
          assetPurpose: scene.purpose,
          productionEligible: false,
          metadata: {
            requirement: scene.assetRequirement,
            purpose: scene.purpose,
            subject: scene.subject,
            environment: scene.environment,
            isPlaceholder: true,
            isTestAsset: false,
            productionEligible: false,
            fallbackNotice: 'No immediate stock/brand match found. Ready for custom selection or upload.'
          },
          licenseMetadata: {},
          status: 'DISCOVERED'
        });

        resolvedAssets.push(createdAsset);
        fallbacksCount++;
      }
    }

    return {
      assets: resolvedAssets,
      summary: {
        totalScenes: scenes.length,
        resolvedScenes: resolvedAssets.filter((a) => a.status === 'READY').length,
        brandAssetMatches: brandAssetMatchesCount,
        pexelsMatches: pexelsMatchesCount,
        fallbacks: fallbacksCount
      }
    };
  }

  /**
   * Resolves or regenerates media for a single scene in a Reel plan.
   */
  async resolveSceneMedia(
    reelPlan: ReelProductionPlan,
    sceneNumber: number,
    workspaceId: string,
    options: {
      sourcePreference?: ReelAssetSourceType;
      customSearchQuery?: string;
      selectedAssetId?: string;
    } = {}
  ): Promise<ReelAsset> {
    const scene = (reelPlan.scenes || []).find((s) => s.sceneNumber === sceneNumber);
    if (!scene) {
      throw new Error(`Scene number ${sceneNumber} not found in Reel plan`);
    }

    // Delete existing asset for this scene
    await this.reelAssetRepo.deleteForScene(reelPlan.id, sceneNumber);

    const [brand, products, brandAssets] = await Promise.all([
      this.brandRepo.findById(reelPlan.brandId),
      this.productRepo.listForBrand(reelPlan.brandId),
      this.brandAssetRepo.listForBrand(reelPlan.brandId)
    ]);

    if (!brand) throw new Error(`Brand not found`);

    const requirement: MediaRequirement = {
      sceneNumber,
      purpose: scene.purpose,
      assetRequirement: options.customSearchQuery || scene.assetRequirement || scene.subject || 'scene visual',
      productReference: scene.productReference,
      brandElement: scene.brandElement,
      visualType: scene.visualType || 'B-ROLL',
      mood: scene.mood || 'modern',
      subject: scene.subject || '',
      environment: scene.environment || '',
      durationSeconds: scene.durationSeconds || 4
    };

    const isProductHeroScene =
      scene.purpose === 'PRODUCT_HERO' ||
      scene.purpose === 'HOOK' ||
      scene.visualType === 'PRODUCT_SHOWCASE' ||
      (scene.visualType as string) === 'HERO' ||
      Boolean(scene.productReference);

    // Try brand library first if specified or for product hero scenes
    if (options.sourcePreference === 'BRAND_LIBRARY' || isProductHeroScene) {
      const matches = AssetResolver.matchBrandAssets({
        brand,
        products,
        brandAssets,
        requirement,
        visualDirection: reelPlan.visualDirection
      });

      if (matches.length > 0) {
        const top = matches[0].asset as MediaAsset;
        return this.reelAssetRepo.create({
          reelPlanId: reelPlan.id,
          workspaceId,
          brandId: reelPlan.brandId,
          sceneNumber,
          assetType: top.type === 'video' ? 'PRODUCT_VIDEO' : 'PRODUCT_IMAGE',
          sourceType: 'BRAND_LIBRARY',
          provider: 'brand_library',
          providerAssetId: top.id,
          sourceUrl: top.url,
          previewUrl: top.previewUrl || top.url,
          filename: top.title,
          productId: (top as any).productId || null,
          assetPurpose: scene.purpose,
          productionEligible: true,
          metadata: {
            scenePurpose: scene.purpose,
            isFirstParty: true,
            productId: (top as any).productId || null,
            productionEligible: true
          },
          licenseMetadata: { license: 'First-Party Brand Asset' },
          status: 'READY'
        });
      }
    }

    // Search Stock (only allowed for non-product-hero scenes)
    if (this.mediaProvider && !isProductHeroScene) {
      try {
        const query = options.customSearchQuery || AssetResolver.generatePexelsQuery(requirement, reelPlan.visualDirection);
        const searchRes = await this.mediaProvider.searchVideos({
          query,
          perPage: 5,
          orientation: 'portrait'
        });

        if (searchRes.assets && searchRes.assets.length > 0) {
          const top = searchRes.assets[0];
          return this.reelAssetRepo.create({
            reelPlanId: reelPlan.id,
            workspaceId,
            brandId: reelPlan.brandId,
            sceneNumber,
            assetType: 'VIDEO',
            sourceType: 'PEXELS',
            provider: 'pexels',
            providerAssetId: top.id,
            sourceUrl: top.url,
            previewUrl: top.previewUrl || top.url,
            width: top.width,
            height: top.height,
            durationSeconds: top.durationSeconds,
            metadata: { scenePurpose: scene.purpose },
            licenseMetadata: {
              provider: 'Pexels',
              photographer: top.photographer,
              photographerUrl: top.photographerUrl,
              license: 'Free to use under Pexels License'
            },
            status: 'READY'
          });
        }
      } catch {
        // Fallback below
      }
    }

    // Fallback
    return this.reelAssetRepo.create({
      reelPlanId: reelPlan.id,
      workspaceId,
      brandId: reelPlan.brandId,
      sceneNumber,
      assetType: 'VIDEO',
      sourceType: 'EXTERNAL',
      provider: 'fallback_placeholder',
      metadata: { requirement: requirement.assetRequirement, purpose: scene.purpose },
      licenseMetadata: {},
      status: 'DISCOVERED'
    });
  }

  async manuallySelectSceneAsset(
    reelPlan: ReelProductionPlan,
    sceneNumber: number,
    workspaceId: string,
    mediaAsset: MediaAsset
  ): Promise<ReelAsset> {
    await this.reelAssetRepo.deleteForScene(reelPlan.id, sceneNumber);

    const scene = (reelPlan.scenes || []).find((s) => s.sceneNumber === sceneNumber);

    return this.reelAssetRepo.create({
      reelPlanId: reelPlan.id,
      workspaceId,
      brandId: reelPlan.brandId,
      sceneNumber,
      assetType: mediaAsset.type === 'image' ? 'IMAGE' : 'VIDEO',
      sourceType: mediaAsset.provider === 'brand_library' ? 'BRAND_LIBRARY' : 'PEXELS',
      provider: mediaAsset.provider,
      providerAssetId: mediaAsset.id,
      sourceUrl: mediaAsset.url,
      previewUrl: mediaAsset.previewUrl || mediaAsset.url,
      width: mediaAsset.width || null,
      height: mediaAsset.height || null,
      durationSeconds: mediaAsset.durationSeconds || null,
      filename: mediaAsset.title || null,
      metadata: {
        manualSelection: true,
        scenePurpose: scene?.purpose || 'Scene visual'
      },
      licenseMetadata: {
        photographer: mediaAsset.photographer,
        photographerUrl: mediaAsset.photographerUrl,
        license: mediaAsset.provider === 'brand_library' ? 'First-Party Brand Asset' : 'Stock Media License'
      },
      status: 'READY'
    });
  }

  async uploadLocalSceneMedia(
    reelPlan: ReelProductionPlan,
    sceneNumber: number,
    workspaceId: string,
    file: {
      buffer: Buffer;
      filename: string;
      mimeType: string;
      durationSeconds?: number;
      width?: number;
      height?: number;
    }
  ): Promise<ReelAsset> {
    await this.reelAssetRepo.deleteForScene(reelPlan.id, sceneNumber);

    const isImage = file.mimeType.startsWith('image/');
    const storageKey = `workspaces/${workspaceId}/reels/${reelPlan.id}/scenes/${sceneNumber}_${Date.now()}_${file.filename}`;
    const storageProvider = new LocalStorageProvider();
    const upload = await storageProvider.uploadBuffer(file.buffer, storageKey, file.mimeType, file.filename);

    const scene = (reelPlan.scenes || []).find((s) => s.sceneNumber === sceneNumber);

    return this.reelAssetRepo.create({
      reelPlanId: reelPlan.id,
      workspaceId,
      brandId: reelPlan.brandId,
      sceneNumber,
      assetType: isImage ? 'IMAGE' : 'VIDEO',
      sourceType: 'LOCAL_GALLERY',
      provider: 'local_gallery',
      providerAssetId: null,
      sourceUrl: upload.url,
      previewUrl: upload.url,
      storageKey,
      filename: file.filename,
      mimeType: file.mimeType,
      width: file.width || null,
      height: file.height || null,
      durationSeconds: file.durationSeconds || null,
      metadata: {
        isLocalUpload: true,
        scenePurpose: scene?.purpose || 'Scene visual'
      },
      licenseMetadata: {
        license: 'User Uploaded Local Media'
      },
      status: 'READY'
    });
  }

  async listReelAssets(reelPlanId: string): Promise<ReelAsset[]> {
    return this.reelAssetRepo.listByReelPlanId(reelPlanId);
  }

  async listBrandAssets(brandId: string): Promise<ReelAsset[]> {
    return this.reelAssetRepo.listByBrandId(brandId);
  }

  async updateReelAsset(
    assetId: string,
    workspaceId: string,
    updates: Partial<ReelAsset>
  ): Promise<ReelAsset | null> {
    return this.reelAssetRepo.update(assetId, workspaceId, updates);
  }

  async deleteReelAsset(assetId: string, workspaceId: string): Promise<boolean> {
    return this.reelAssetRepo.delete(assetId, workspaceId);
  }
}
