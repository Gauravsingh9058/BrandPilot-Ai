import type { Database } from '@vidsnapai/database';
import type { AIProvider } from '@vidsnapai/ai';
import type {
  ReelProductionPlan,
  GenerateReelPlanInput,
  RegenerateReelPlanInput,
  UpdateReelPlanInput,
  RegenerateSceneInput,
  BatchGenerateReelsInput,
  BatchGenerateReelsResult,
  ReelStatus,
  ReelScene,
  ContentJob
} from '@vidsnapai/types';
import { BrandRepository, ProductRepository, DnaRepository, AssetRepository as BrandAssetRepository } from '@vidsnapai/brand';
import { CampaignRepository, MarketingStrategyRepository } from '@vidsnapai/campaign';
import { ContentPlanRepository, ContentJobRepository } from '@vidsnapai/content';
import { ReelProductionPlanRepository } from './repositories/reel-production-plan.repository.js';
import { ReelOrchestrator } from './reelOrchestrator.js';

export class ReelPlannerService {
  private reelRepo: ReelProductionPlanRepository;
  private jobRepo: ContentJobRepository;
  private planRepo: ContentPlanRepository;
  private brandRepo: BrandRepository;
  private productRepo: ProductRepository;
  private brandAssetRepo: BrandAssetRepository;
  private dnaRepo: DnaRepository;
  private strategyRepo: MarketingStrategyRepository;
  private campaignRepo: CampaignRepository;
  private orchestrator: ReelOrchestrator;

  constructor(
    db: Database,
    aiProvider: AIProvider,
    repos?: {
      reelRepo?: ReelProductionPlanRepository;
      jobRepo?: ContentJobRepository;
      planRepo?: ContentPlanRepository;
      brandRepo?: BrandRepository;
      productRepo?: ProductRepository;
      brandAssetRepo?: BrandAssetRepository;
      dnaRepo?: DnaRepository;
      strategyRepo?: MarketingStrategyRepository;
      campaignRepo?: CampaignRepository;
      orchestrator?: ReelOrchestrator;
    }
  ) {
    this.reelRepo = repos?.reelRepo ?? new ReelProductionPlanRepository(db);
    this.jobRepo = repos?.jobRepo ?? new ContentJobRepository(db);
    this.planRepo = repos?.planRepo ?? new ContentPlanRepository(db);
    this.brandRepo = repos?.brandRepo ?? new BrandRepository(db);
    this.productRepo = repos?.productRepo ?? new ProductRepository(db);
    this.brandAssetRepo = repos?.brandAssetRepo ?? new BrandAssetRepository(db);
    this.dnaRepo = repos?.dnaRepo ?? new DnaRepository(db);
    this.strategyRepo = repos?.strategyRepo ?? new MarketingStrategyRepository(db);
    this.campaignRepo = repos?.campaignRepo ?? new CampaignRepository(db);
    this.orchestrator = repos?.orchestrator ?? new ReelOrchestrator(aiProvider);
  }

  /**
   * Generates a new Reel Production Plan for a specific ContentJob.
   * Enforces idempotency: if a plan already exists and regenerate is false, returns existing.
   */
  async generateReelForJob(
    contentJobId: string,
    workspaceId: string,
    input: GenerateReelPlanInput = {}
  ): Promise<ReelProductionPlan> {
    const job = await this.jobRepo.findById(contentJobId);
    if (!job || job.workspaceId !== workspaceId) {
      throw new Error(`ContentJob with ID "${contentJobId}" not found in this workspace`);
    }

    // Check existing plan for idempotency
    const existingLatest = await this.reelRepo.findLatestByContentJobId(contentJobId);
    if (existingLatest && existingLatest.status !== 'FAILED') {
      return existingLatest;
    }

    const [brand, brandDna, products, marketingStrategy, campaign, contentPlan] =
      await Promise.all([
        this.brandRepo.findByIdAndWorkspace(job.brandId, workspaceId),
        this.dnaRepo.findLatestByBrandId(job.brandId),
        this.productRepo.listForBrand(job.brandId),
        this.strategyRepo.findLatestByBrandId(job.brandId),
        job.campaignId ? this.campaignRepo.findByIdAndBrand(job.campaignId, job.brandId) : Promise.resolve(null),
        this.planRepo.findByIdAndWorkspace(job.contentPlanId, workspaceId)
      ]);

    if (!brand) {
      throw new Error(`Brand with ID "${job.brandId}" not found`);
    }

    // Resolve target product explicitly
    const targetProductId =
      input.targetProductId ||
      input.productId ||
      (job as any).productId ||
      (job as any).targetProductId ||
      (campaign as any)?.targetProductId ||
      (campaign as any)?.productId ||
      products[0]?.id;

    const targetProduct = products.find((p) => p.id === targetProductId) || products[0];

    // Pre-generation check: if generating a production reel and product has no production-eligible media, STOP
    const isProduction = (input as any).isProduction !== false && !(input as any).previewOnly;
    if (isProduction && targetProduct) {
      const brandAssets = await this.brandAssetRepo.listForBrand(job.brandId);
      const eligibleProductAssets = brandAssets.filter((ba) => {
        const meta = (ba.metadata || {}) as Record<string, unknown>;
        const boundId = (ba.productId || meta.productId) as string | undefined;
        const isEligible =
          ba.productionEligible !== false &&
          meta.productionEligible !== false &&
          !ba.isPlaceholder &&
          !ba.isTestAsset &&
          !meta.isPlaceholder &&
          !meta.isTestAsset;
        return boundId === targetProduct.id && isEligible;
      });

      if (eligibleProductAssets.length === 0) {
        throw new Error(
          `PRODUCT_MEDIA_REQUIRED: Upload at least one production-ready product image or video for ${targetProduct.name} before generating this reel.`
        );
      }
    }

    const planData = await this.orchestrator.generateReelPlan(
      {
        brand,
        brandDna,
        products,
        marketingStrategy,
        campaign,
        contentPlan,
        contentJob: job,
        input: {
          ...input,
          targetProductId: targetProduct?.id
        }
      },
      { version: 1 }
    );

    return this.reelRepo.create({
      ...planData,
      targetProductId: targetProduct?.id,
      productId: targetProduct?.id,
      productionMetadata: {
        ...planData.productionMetadata,
        targetProductId: targetProduct?.id
      } as any,
      version: 1
    } as any);
  }

  /**
   * Safely regenerates a Reel Production Plan, creating a new version (v2, v3...)
   * while preserving historical versions untouched.
   */
  async regenerateReelForJob(
    contentJobId: string,
    workspaceId: string,
    input: RegenerateReelPlanInput = {}
  ): Promise<ReelProductionPlan> {
    const job = await this.jobRepo.findById(contentJobId);
    if (!job || job.workspaceId !== workspaceId) {
      throw new Error(`ContentJob with ID "${contentJobId}" not found in this workspace`);
    }

    const nextVersion = await this.reelRepo.getNextVersionNumber(contentJobId);

    const [brand, brandDna, products, marketingStrategy, campaign, contentPlan] =
      await Promise.all([
        this.brandRepo.findByIdAndWorkspace(job.brandId, workspaceId),
        this.dnaRepo.findLatestByBrandId(job.brandId),
        this.productRepo.listForBrand(job.brandId),
        this.strategyRepo.findLatestByBrandId(job.brandId),
        job.campaignId ? this.campaignRepo.findByIdAndBrand(job.campaignId, job.brandId) : Promise.resolve(null),
        this.planRepo.findByIdAndWorkspace(job.contentPlanId, workspaceId)
      ]);

    if (!brand) {
      throw new Error(`Brand with ID "${job.brandId}" not found`);
    }

    // Resolve target product explicitly
    const targetProductId =
      input.targetProductId ||
      input.productId ||
      (job as any).productId ||
      (job as any).targetProductId ||
      (campaign as any)?.targetProductId ||
      (campaign as any)?.productId ||
      products[0]?.id;

    const targetProduct = products.find((p) => p.id === targetProductId) || products[0];

    // Pre-generation check: if regenerating a production reel and product has no production-eligible media, STOP
    const isProduction = (input as any).isProduction !== false && !(input as any).previewOnly;
    if (isProduction && targetProduct) {
      const brandAssets = await this.brandAssetRepo.listForBrand(job.brandId);
      const eligibleProductAssets = brandAssets.filter((ba) => {
        const meta = (ba.metadata || {}) as Record<string, unknown>;
        const boundId = (ba.productId || meta.productId) as string | undefined;
        const isEligible =
          ba.productionEligible !== false &&
          meta.productionEligible !== false &&
          !ba.isPlaceholder &&
          !ba.isTestAsset &&
          !meta.isPlaceholder &&
          !meta.isTestAsset;
        return boundId === targetProduct.id && isEligible;
      });

      if (eligibleProductAssets.length === 0) {
        throw new Error(
          `PRODUCT_MEDIA_REQUIRED: Upload at least one production-ready product image or video for ${targetProduct.name} before generating this reel.`
        );
      }
    }

    const combinedGuidance = [
      input.customGuidance,
      input.regenerateReason ? `Regeneration focus: ${input.regenerateReason}` : null
    ]
      .filter(Boolean)
      .join('. ');

    const planData = await this.orchestrator.generateReelPlan(
      {
        brand,
        brandDna,
        products,
        marketingStrategy,
        campaign,
        contentPlan,
        contentJob: job,
        input: {
          ...input,
          targetProductId: targetProduct?.id,
          customGuidance: combinedGuidance || undefined
        }
      },
      { version: nextVersion }
    );

    return this.reelRepo.create({
      ...planData,
      targetProductId: targetProduct?.id,
      productId: targetProduct?.id,
      productionMetadata: {
        ...planData.productionMetadata,
        targetProductId: targetProduct?.id
      } as any,
      version: nextVersion
    } as any);
  }

  /**
   * Regenerates a specific scene within an existing Reel Production Plan.
   */
  async regenerateScene(
    contentJobId: string,
    workspaceId: string,
    input: RegenerateSceneInput
  ): Promise<ReelProductionPlan> {
    const latest = await this.reelRepo.findLatestByContentJobId(contentJobId);
    if (!latest || latest.workspaceId !== workspaceId) {
      throw new Error(`Reel production plan for ContentJob "${contentJobId}" not found`);
    }

    const sceneIdx = latest.scenes.findIndex((s) => s.sceneNumber === input.sceneNumber);
    if (sceneIdx === -1) {
      throw new Error(`Scene #${input.sceneNumber} not found in Reel plan`);
    }

    const currentScene = latest.scenes[sceneIdx];
    const updatedScene: ReelScene = {
      ...currentScene,
      animationIntent: input.customGuidance
        ? `Refined with directive: ${input.customGuidance}`
        : currentScene.animationIntent,
      visualType: currentScene.visualType
    };

    const newScenes = [...latest.scenes];
    newScenes[sceneIdx] = updatedScene;

    const updated = await this.reelRepo.update(latest.id, {
      scenes: newScenes
    });

    if (!updated) {
      throw new Error('Failed to update scene');
    }

    return updated;
  }

  /**
   * Updates an existing Reel Production Plan blueprint.
   */
  async updateReelPlan(
    reelId: string,
    workspaceId: string,
    input: UpdateReelPlanInput
  ): Promise<ReelProductionPlan> {
    const existing = await this.reelRepo.findByIdAndWorkspace(reelId, workspaceId);
    if (!existing) {
      throw new Error(`Reel production plan with ID "${reelId}" not found in this workspace`);
    }

    const updated = await this.reelRepo.update(reelId, input);
    if (!updated) {
      throw new Error(`Failed to update Reel production plan "${reelId}"`);
    }

    return updated;
  }

  /**
   * Updates the status of a Reel Production Plan.
   */
  async updateStatus(
    reelId: string,
    workspaceId: string,
    status: ReelStatus
  ): Promise<ReelProductionPlan> {
    const existing = await this.reelRepo.findByIdAndWorkspace(reelId, workspaceId);
    if (!existing) {
      throw new Error(`Reel production plan with ID "${reelId}" not found in this workspace`);
    }

    const updated = await this.reelRepo.updateStatus(reelId, status);
    if (!updated) {
      throw new Error(`Failed to update status for Reel plan "${reelId}"`);
    }

    return updated;
  }

  /**
   * Autonomous batch generation of Reel plans for all eligible ContentJobs in a 30-day plan.
   */
  async batchGenerateReelsForPlan(
    contentPlanId: string,
    workspaceId: string,
    input: BatchGenerateReelsInput = {}
  ): Promise<BatchGenerateReelsResult> {
    const plan = await this.planRepo.findByIdAndWorkspace(contentPlanId, workspaceId);
    if (!plan) {
      throw new Error(`ContentPlan with ID "${contentPlanId}" not found in this workspace`);
    }

    const allJobs = await this.jobRepo.listForPlan(contentPlanId);

    // Filter jobs if specific jobIds are requested, otherwise take all active jobs
    const targetJobs = input.jobIds && input.jobIds.length > 0
      ? allJobs.filter((j: ContentJob) => input.jobIds!.includes(j.id))
      : allJobs;

    const eligibleJobIds: string[] = [];
    const skippedJobIds: string[] = [];

    for (const job of targetJobs) {
      const existing = await this.reelRepo.findLatestByContentJobId(job.id);
      if (existing && existing.status !== 'FAILED') {
        skippedJobIds.push(job.id);
      } else {
        eligibleJobIds.push(job.id);
      }
    }

    // Generate plans for eligible jobs safely
    let enqueuedCount = 0;
    const errors: Array<{ jobId: string; error: string }> = [];
    for (const jobId of eligibleJobIds) {
      try {
        await this.generateReelForJob(jobId, workspaceId, {
          customGuidance: input.customGuidance
        });
        enqueuedCount++;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[ReelPlannerService] Failed to batch generate reel for job ${jobId}:`, err);
        errors.push({ jobId, error: errMsg });
      }
    }

    if (eligibleJobIds.length > 0 && enqueuedCount === 0) {
      throw new Error(`Failed to batch generate reel blueprints: ${errors.map((e) => e.error).join('; ')}`);
    }

    return {
      planId: contentPlanId,
      enqueuedJobs: enqueuedCount,
      eligibleJobIds,
      skippedJobIds
    };
  }

  async getLatestForJob(contentJobId: string, workspaceId: string): Promise<ReelProductionPlan | null> {
    const job = await this.jobRepo.findById(contentJobId);
    if (!job || job.workspaceId !== workspaceId) {
      return null;
    }
    return this.reelRepo.findLatestByContentJobId(contentJobId);
  }

  async getHistoryForJob(contentJobId: string, workspaceId: string): Promise<ReelProductionPlan[]> {
    const job = await this.jobRepo.findById(contentJobId);
    if (!job || job.workspaceId !== workspaceId) {
      return [];
    }
    return this.reelRepo.listByContentJobId(contentJobId);
  }

  async listForPlan(contentPlanId: string, workspaceId: string): Promise<ReelProductionPlan[]> {
    const plan = await this.planRepo.findByIdAndWorkspace(contentPlanId, workspaceId);
    if (!plan) {
      return [];
    }
    return this.reelRepo.listByContentPlanId(contentPlanId);
  }

  async listForBrand(brandId: string, workspaceId: string): Promise<ReelProductionPlan[]> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      return [];
    }
    return this.reelRepo.listByBrandId(brandId);
  }

  async getById(reelId: string, workspaceId: string): Promise<ReelProductionPlan | null> {
    return this.reelRepo.findByIdAndWorkspace(reelId, workspaceId);
  }
}
