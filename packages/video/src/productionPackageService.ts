import type { Database } from '@vidsnapai/database';
import type {
  ReelProductionPackage,
  ProductionReadiness
} from '@vidsnapai/types';
import { ReelAssetRepository } from '@vidsnapai/media';
import { CaptionTrackRepository } from '@vidsnapai/captions';
import { AudioMixPlanRepository } from '@vidsnapai/audio';
import { ReelProductionPlanRepository } from './repositories/reel-production-plan.repository.js';
import { ProductionPackageRepository } from './repositories/production-package.repository.js';
import { ProductionReadinessChecker } from './readinessChecker.js';

export class ProductionPackageService {
  private packageRepo: ProductionPackageRepository;
  private reelPlanRepo: ReelProductionPlanRepository;
  private reelAssetRepo: ReelAssetRepository;
  private captionRepo: CaptionTrackRepository;
  private audioMixRepo: AudioMixPlanRepository;

  constructor(
    db: Database,
    repos?: {
      packageRepo?: ProductionPackageRepository;
      reelPlanRepo?: ReelProductionPlanRepository;
      reelAssetRepo?: ReelAssetRepository;
      captionRepo?: CaptionTrackRepository;
      audioMixRepo?: AudioMixPlanRepository;
    }
  ) {
    this.packageRepo = repos?.packageRepo || new ProductionPackageRepository(db);
    this.reelPlanRepo = repos?.reelPlanRepo || new ReelProductionPlanRepository(db);
    this.reelAssetRepo = repos?.reelAssetRepo || new ReelAssetRepository(db);
    this.captionRepo = repos?.captionRepo || new CaptionTrackRepository(db);
    this.audioMixRepo = repos?.audioMixRepo || new AudioMixPlanRepository(db);
  }

  /**
   * Compiles or updates the complete ReelProductionPackage and evaluates production readiness.
   */
  async compilePackage(
    reelPlanId: string,
    workspaceId: string
  ): Promise<ReelProductionPackage> {
    const reelPlan = await this.reelPlanRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
    if (!reelPlan) {
      throw new Error(`ReelProductionPlan not found with ID ${reelPlanId}`);
    }

    const [assets, captionTrack, audioMixPlan] = await Promise.all([
      this.reelAssetRepo.listByReelPlanId(reelPlanId),
      this.captionRepo.findLatestByReelPlanId(reelPlanId),
      this.audioMixRepo.findByReelPlanId(reelPlanId)
    ]);

    const voiceAsset = assets.find((a) => a.assetType === 'VOICE' && a.status === 'READY') || null;

    const readiness: ProductionReadiness = ProductionReadinessChecker.evaluate({
      reelPlan,
      assets,
      captionTrack,
      audioMixPlan
    });

    const status = readiness.status === 'READY_FOR_ANIMATION' ? 'READY' : 'BLOCKED';

    return this.packageRepo.createOrUpdate({
      reelPlanId: reelPlan.id,
      workspaceId,
      brandId: reelPlan.brandId,
      readiness,
      packagePayload: {
        reelPlan,
        assets,
        voiceAsset,
        captionTrack,
        audioMixPlan
      },
      status
    });
  }

  /**
   * Retrieves the compiled production package for a Reel plan.
   */
  async getPackage(
    reelPlanId: string,
    _workspaceId: string
  ): Promise<ReelProductionPackage | null> {
    return this.packageRepo.findByReelPlanId(reelPlanId);
  }

  async getPackageByReelPlanId(
    reelPlanId: string,
    workspaceId: string
  ): Promise<ReelProductionPackage | null> {
    return this.getPackage(reelPlanId, workspaceId);
  }
}
