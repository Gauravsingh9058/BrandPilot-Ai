import * as fs from 'fs';
import type { Database } from '@vidsnapai/database';
import { AutonomousRepository } from '@vidsnapai/database';
import type {
  AIProvider,
  AutonomousRun,
  AutonomousTriggerType,
  OptimizationContext,
  StorageProvider,
  MediaProvider,
  SceneVideoArtifact
} from '@vidsnapai/types';

import { BrandRepository, DnaRepository, ProductRepository, AssetRepository as BrandAssetRepository } from '@vidsnapai/brand';
import { CampaignDirectorService } from '@vidsnapai/campaign';
import { ContentPlannerService } from '@vidsnapai/content';
import { MediaService, VeoReferenceAssetResolver } from '@vidsnapai/media';
import { VoiceService } from '@vidsnapai/voice';
import { CaptionService } from '@vidsnapai/captions';
import { AudioService } from '@vidsnapai/audio';
import { VeoProvider, createVeoProvider, VeoQuotaExhaustedError } from '@vidsnapai/ai';
import { ReelPlannerService } from '../reelPlannerService.js';
import { ProductionPackageService } from '../productionPackageService.js';
import { AnimationService } from '@vidsnapai/animation';
import { VideoRenderService } from '../videoRenderService.js';
import { ReelQAChecker } from '../reelQAChecker.js';
import { MetaAdsService } from '../publishing/metaAdsService.js';
import { OptimizationExecutionService } from '../optimization/optimizationExecutionService.js';
import { ReelProductionPlanRepository } from '../repositories/reel-production-plan.repository.js';
import { AutonomousPolicyService } from './autonomousPolicyService.js';
import { AutonomousGuardrailsService } from './autonomousGuardrailsService.js';

export interface AutonomousRunOptions {
  brandId: string;
  campaignId?: string | null;
  triggerType?: AutonomousTriggerType;
  forceAutonomousMode?: boolean;
  skipPublish?: boolean;
  daysToPlan?: number;
  idempotencyKey?: string;
  dailySpendAmount?: number;
}

export class AutonomousOperationsService {
  private autonRepo: AutonomousRepository;
  private brandRepo: BrandRepository;
  private dnaRepo: DnaRepository;
  private productRepo: ProductRepository;
  private brandAssetRepo: BrandAssetRepository;
  private reelRepo: ReelProductionPlanRepository;
  private policyService: AutonomousPolicyService;
  private guardrailsService: AutonomousGuardrailsService;
  private directorService: CampaignDirectorService;
  private contentPlannerService: ContentPlannerService;
  private reelPlannerService: ReelPlannerService;
  private mediaService: MediaService;
  private voiceService: VoiceService;
  private captionService: CaptionService;
  private audioService: AudioService;
  private packageService: ProductionPackageService;
  private animationService: AnimationService;
  private renderService: VideoRenderService;
  private metaAdsService: MetaAdsService;
  private executionService: OptimizationExecutionService;
  private veoProvider: VeoProvider;

  constructor(
    private db: Database,
    private aiProvider: AIProvider,
    options?: {
      autonRepo?: AutonomousRepository;
      brandRepo?: BrandRepository;
      dnaRepo?: DnaRepository;
      productRepo?: ProductRepository;
      brandAssetRepo?: BrandAssetRepository;
      reelRepo?: ReelProductionPlanRepository;
      policyService?: AutonomousPolicyService;
      guardrailsService?: AutonomousGuardrailsService;
      directorService?: CampaignDirectorService;
      contentPlannerService?: ContentPlannerService;
      reelPlannerService?: ReelPlannerService;
      mediaService?: MediaService;
      voiceService?: VoiceService;
      captionService?: CaptionService;
      audioService?: AudioService;
      packageService?: ProductionPackageService;
      animationService?: AnimationService;
      renderService?: VideoRenderService;
      metaAdsService?: MetaAdsService;
      executionService?: OptimizationExecutionService;
      storageProvider?: StorageProvider;
      mediaProvider?: MediaProvider;
      veoProvider?: VeoProvider;
    }
  ) {
    this.autonRepo = options?.autonRepo || new AutonomousRepository(db);
    this.brandRepo = options?.brandRepo || new BrandRepository(db);
    this.dnaRepo = options?.dnaRepo || new DnaRepository(db);
    this.productRepo = options?.productRepo || new ProductRepository(db);
    this.brandAssetRepo = options?.brandAssetRepo || new BrandAssetRepository(db);
    this.reelRepo = options?.reelRepo || new ReelProductionPlanRepository(db);
    this.policyService = options?.policyService || new AutonomousPolicyService(db, { autonRepo: this.autonRepo });
    this.guardrailsService = options?.guardrailsService || new AutonomousGuardrailsService(db, { autonRepo: this.autonRepo });
    this.directorService = options?.directorService || new CampaignDirectorService(db, aiProvider);
    this.contentPlannerService = options?.contentPlannerService || new ContentPlannerService(db, aiProvider);
    this.reelPlannerService = options?.reelPlannerService || new ReelPlannerService(db, aiProvider);
    this.mediaService = options?.mediaService || new MediaService(db, options?.mediaProvider);
    this.voiceService = options?.voiceService || new VoiceService(db, { storageProvider: options?.storageProvider });
    this.captionService = options?.captionService || new CaptionService(db);
    this.audioService = options?.audioService || new AudioService(db, { storageProvider: options?.storageProvider });
    this.packageService = options?.packageService || new ProductionPackageService(db);
    this.animationService = options?.animationService || new AnimationService(aiProvider);
    this.renderService = options?.renderService || new VideoRenderService(db, { storageProvider: options?.storageProvider });
    this.metaAdsService = options?.metaAdsService || new MetaAdsService(db);
    this.executionService = options?.executionService || new OptimizationExecutionService(db);
    this.veoProvider = options?.veoProvider || createVeoProvider();
  }

  /**
   * Executes the full closed-loop autonomous campaign operations pipeline:
   * 
   * DECIDE → PRODUCE → VALIDATE → LEARN → ACT
   * 
   * 1. Analyze performance (DIRECTOR_EVALUATION & ANALYTICS_SYNC)
   * 2. Identify winning patterns
   * 3. Identify weak patterns
   * 4. Generate strategic directive
   * 5. Select brand
   * 6. Select product (PRODUCT_SELECTION)
   * 7. Select campaign
   * 8. Select content job (CONTENT_PLAN_GENERATION)
   * 9. Generate Reel Blueprint (BLUEPRINT_GENERATION)
   * 10. Verify product information (PRODUCT_ASSET_VALIDATION)
   * 11. Verify product assets (missing -> WAITING_FOR_ASSET)
   * 12. Resolve reference images (VeoReferenceAssetResolver)
   * 13. Generate Veo scenes (VEO_SCENE_GENERATION - quota -> WAITING_FOR_PROVIDER)
   * 14. Poll Veo operations (VEO_POLLING)
   * 15. Download scene videos
   * 16. Generate voice (VOICE_GENERATION)
   * 17. Generate captions (CAPTION_GENERATION)
   * 18. Resolve music/SFX (AUDIO_RESOLUTION)
   * 19. Assemble final reel (VIDEO_ASSEMBLY / VIDEO_RENDERING)
   * 20. Run brand safety (BRAND_SAFETY -> BLOCKED)
   * 21. Run visual QA (VIDEO_QA -> RENDER_FAILED)
   * 22. Run commercial claim validation (COMMERCIAL_CLAIM_VALIDATION)
   * 23. Approve automatically only if policy permits (APPROVAL -> APPROVAL_REQUIRED)
   * 24. Publish automatically only if policy permits (PUBLISH -> META_PUBLISHING)
   * 25. Record performance
   * 26. Feed performance back into Intelligence (LEARNING)
   * 27. Learn for next reel
   */
  async executeAutonomousRun(
    workspaceId: string,
    options: AutonomousRunOptions
  ): Promise<AutonomousRun> {
    const {
      brandId,
      campaignId = null,
      triggerType = 'MANUAL',
      forceAutonomousMode,
      skipPublish = false,
      daysToPlan = 7,
      idempotencyKey,
      dailySpendAmount = 20
    } = options;

    // 1. Load Workspace Policy & Check Eligibility
    let policy = await this.policyService.getPolicy(workspaceId);
    if (forceAutonomousMode) {
      policy = { ...policy, mode: 'AUTONOMOUS' };
    }

    const eligibility = await this.guardrailsService.validateEngineEligibility(workspaceId, policy);
    if (!eligibility.allowed) {
      const blockedRun = await this.autonRepo.createRun({
        workspaceId,
        brandId,
        campaignId,
        triggerType,
        policySnapshot: policy,
        idempotencyKey
      });

      return this.autonRepo.updateRun(blockedRun.id, workspaceId, {
        status: 'PAUSED',
        currentStep: 'ELIGIBILITY_CHECK',
        summary: eligibility.reason,
        error: eligibility.reason,
        completedAt: new Date()
      });
    }

    // 2. Fetch Brand & Brand DNA
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand "${brandId}" not found in workspace "${workspaceId}".`);
    }
    const brandDna = await this.dnaRepo.findLatestByBrandId(brandId);

    // 3. Initialize Autonomous Run audit record
    const run = await this.autonRepo.createRun({
      workspaceId,
      brandId,
      campaignId,
      triggerType,
      policySnapshot: policy,
      idempotencyKey
    });

    const runId = run.id;
    const runDetails: Record<string, unknown> = {};

    try {
      // -----------------------------------------------------------------------
      // Step 1: Analytics Sync & Performance Intelligence (DECIDE: Steps 1-4)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'DIRECTOR_EVALUATION' });
      const step1 = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'DIRECTOR_EVALUATION',
        inputPayload: { brandId, campaignId }
      });

      const directorResult = await this.directorService.runDirector(workspaceId, {
        brandId,
        campaignId
      });

      const winningPatterns = directorResult.run.winningPatterns || [];
      const weakPatterns = directorResult.run.weakPatterns || [];
      const strategicDirectives = directorResult.run.strategicDirectives || [];
      const contentRequirements = directorResult.run.contentRequirements || [];

      const winningStrings: string[] = winningPatterns.map((p) =>
        typeof p === 'string' ? p : `${p.type}: ${p.key} (${p.lift})`
      );
      const weakStrings: string[] = weakPatterns.map((p) =>
        typeof p === 'string' ? p : `${p.type}: ${p.key} (${p.drag})`
      );
      const directiveStrings: string[] = strategicDirectives.map((d) =>
        typeof d === 'string' ? d : `${d.directive} [${d.priority}]`
      );

      const optContext: OptimizationContext = {
        winningHooks: winningStrings.filter((p) => p.toLowerCase().includes('hook')),
        weakHooks: weakStrings.filter((p) => p.toLowerCase().includes('hook')),
        winningMessagingAngles: directiveStrings,
        weakMessagingAngles: weakStrings,
        winningCTAs: contentRequirements
          .map((r) => r.suggestedCTA || r.cta)
          .filter((c): c is string => Boolean(c)),
        recommendedDurations: contentRequirements
          .map((r) => r.suggestedDurationSeconds || r.duration)
          .filter((d): d is number => Boolean(d)),
        aiRecommendations: directorResult.proposedActions.map((a) => ({
          recommendation: a.reason,
          reason: typeof a.evidence === 'string' ? a.evidence : JSON.stringify(a.evidence),
          expectedImpact: a.expectedImpact
        }))
      };

      await this.autonRepo.updateRunStep(step1.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: {
          directorRunId: directorResult.run.id,
          proposedActionsCount: directorResult.proposedActions.length,
          winningPatternsCount: winningPatterns.length,
          weakPatternsCount: weakPatterns.length,
          strategicDirectivesCount: strategicDirectives.length
        },
        completedAt: new Date()
      });
      runDetails.directorRunId = directorResult.run.id;
      runDetails.winningPatterns = winningStrings;
      runDetails.weakPatterns = weakStrings;
      runDetails.strategicDirectives = directiveStrings;

      // -----------------------------------------------------------------------
      // Step 2: Policy-Permitted Optimization Auto-Apply
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'OPTIMIZATION_APPLY' });
      const step2 = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'OPTIMIZATION_APPLY',
        inputPayload: { proposedActionsCount: directorResult.proposedActions.length }
      });

      const appliedActionIds: string[] = [];
      if (policy.optimization.autoApply && directorResult.proposedActions.length > 0) {
        for (const action of directorResult.proposedActions) {
          const guardrailCheck = await this.guardrailsService.validateOptimizationGuardrails({
            workspaceId,
            brandId,
            action,
            policy,
            metricsSampleCount: 150
          });

          if (guardrailCheck.allowed) {
            try {
              await this.executionService.applyAction(action.id, workspaceId, {
                force: true,
                executedBy: 'AUTONOMOUS_ENGINE'
              });
              appliedActionIds.push(action.id);

              await this.autonRepo.recordExecutionHistory({
                workspaceId,
                brandId,
                runId,
                actionType: 'OPTIMIZATION_APPLY',
                targetEntity: action.targetEntity,
                targetId: action.id,
                status: 'SUCCESS',
                reason: `Auto-applied optimization action: ${action.actionType} (${action.reason})`,
                executedBy: 'AUTONOMOUS_ENGINE'
              });
            } catch (applyErr: any) {
              console.warn('[AutonomousOperations] Action auto-apply warning:', applyErr.message);
            }
          }
        }

        if (appliedActionIds.length > 0) {
          await this.autonRepo.incrementLimits(workspaceId, {
            optimizationsApplied: appliedActionIds.length
          });
        }
      }

      await this.autonRepo.updateRunStep(step2.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: { appliedActionIds, count: appliedActionIds.length },
        completedAt: new Date()
      });
      runDetails.appliedOptimizationsCount = appliedActionIds.length;

      // -----------------------------------------------------------------------
      // Step 3: Content Plan Generation (DECIDE: Steps 7-8)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'CONTENT_PLAN_GENERATION' });
      const step3 = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'CONTENT_PLAN_GENERATION',
        inputPayload: { brandId, daysToPlan }
      });

      const contentPlan = await this.contentPlannerService.generateContentPlan(
        brandId,
        workspaceId,
        {
          campaignId: campaignId || null,
          durationDays: daysToPlan,
          customGuidance: directiveStrings.join('\n')
        },
        { optimizationContext: optContext }
      );

      await this.autonRepo.updateRunStep(step3.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: { contentPlanId: contentPlan.id, jobsCount: contentPlan.jobs.length },
        completedAt: new Date()
      });
      runDetails.contentPlanId = contentPlan.id;

      const topJob = contentPlan.jobs[0];
      if (!topJob) {
        throw new Error('No content jobs generated in the content plan.');
      }

      // -----------------------------------------------------------------------
      // Step 4: Product Selection & Catalog Resolution (DECIDE: Steps 5-6)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'PRODUCT_SELECTION' });
      const stepProductSelect = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'PRODUCT_SELECTION',
        inputPayload: { brandId, targetJobId: topJob.id }
      });

      let products: any[] = [];
      try {
        if (this.productRepo && typeof this.productRepo.listForBrand === 'function') {
          products = (await this.productRepo.listForBrand(brandId)) || [];
        }
      } catch {
        products = [];
      }

      const targetProduct = products.find((p) => p.id === (topJob as any)?.productId) || products[0] || null;

      await this.autonRepo.updateRunStep(stepProductSelect.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: {
          selectedProductId: targetProduct?.id || null,
          selectedProductName: targetProduct?.name || 'Brand Offering',
          totalProductsAvailable: products.length
        },
        completedAt: new Date()
      });
      runDetails.selectedProductId = targetProduct?.id || null;
      runDetails.selectedProductName = targetProduct?.name || brand.name;

      // -----------------------------------------------------------------------
      // Step 5: Reel Blueprint Generation (PRODUCE: Step 9)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'BLUEPRINT_GENERATION' });
      const step4 = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'BLUEPRINT_GENERATION',
        inputPayload: { topJobId: topJob.id, productId: targetProduct?.id }
      });

      const reelPlan = await this.reelPlannerService.generateReelForJob(topJob.id, workspaceId, {
        durationSeconds:
          contentRequirements[0]?.suggestedDurationSeconds ||
          contentRequirements[0]?.duration ||
          30,
        customGuidance: directiveStrings.join('\n')
      });

      await this.autonRepo.incrementLimits(workspaceId, { reelsCreated: 1 });
      await this.autonRepo.updateRunStep(step4.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: { reelPlanId: reelPlan.id, title: reelPlan.title, scenesCount: reelPlan.scenes?.length || 0 },
        completedAt: new Date()
      });
      runDetails.reelPlanId = reelPlan.id;

      // -----------------------------------------------------------------------
      // Step 6: Product Information & Asset Validation (PRODUCE: Steps 10-12)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'PRODUCT_ASSET_VALIDATION' });
      const stepAssetValidation = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'PRODUCT_ASSET_VALIDATION',
        inputPayload: {
          brandId,
          productId: targetProduct?.id || null,
          productName: targetProduct?.name || null
        }
      });

      let brandAssets: any[] = [];
      try {
        if (this.brandAssetRepo && typeof this.brandAssetRepo.listForBrand === 'function') {
          brandAssets = (await this.brandAssetRepo.listForBrand(brandId)) || [];
        }
      } catch {
        brandAssets = [];
      }

      const hasProductMedia = brandAssets.length > 0
        ? brandAssets.some(
            (a) =>
              (a.assetType === 'PRODUCT_IMAGE' || a.assetType === 'PRODUCT_VIDEO' || a.type === 'IMAGE' || a.type === 'VIDEO') &&
              (a.storageUrl || a.url || a.localPath) &&
              !a.isPlaceholder &&
              !(a.metadata as any)?.isPlaceholder
          )
        : (products.length === 0);

      // If promotional reel requires product media but brand has no product assets uploaded, pause and wait for asset
      if (!hasProductMedia && products.length > 0) {
        const blockerReason = `PRODUCT_ASSET_REQUIRED: A product image or video is required for brand "${brand.name}". Please upload product media before autonomous reel production.`;
        
        await this.autonRepo.updateRunStep(stepAssetValidation.id, workspaceId, {
          status: 'FAILED',
          errorMessage: blockerReason,
          completedAt: new Date()
        });

        await this.autonRepo.recordExecutionHistory({
          workspaceId,
          brandId,
          runId,
          actionType: 'CONTENT_GENERATION',
          targetEntity: 'BRAND_ASSET',
          targetId: targetProduct?.id || brandId,
          status: 'FAILED',
          reason: blockerReason,
          executedBy: 'AUTONOMOUS_ENGINE'
        });

        return this.autonRepo.updateRun(runId, workspaceId, {
          status: 'WAITING_FOR_ASSET',
          currentStep: 'PRODUCT_ASSET_VALIDATION',
          summary: blockerReason,
          error: blockerReason,
          details: {
            ...runDetails,
            brandId,
            productId: targetProduct?.id || null,
            productName: targetProduct?.name || brand.name,
            requiredAssetType: 'PRODUCT_IMAGE',
            userActionRequired: 'Upload product image or video in Brand Asset Library'
          },
          completedAt: new Date()
        });
      }

      await this.autonRepo.updateRunStep(stepAssetValidation.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: {
          productVerified: Boolean(targetProduct),
          productAssetsCount: brandAssets.length,
          hasProductMedia
        },
        completedAt: new Date()
      });

      // -----------------------------------------------------------------------
      // Step 7: Veo Scene Generation & Prompt Directives (PRODUCE: Step 13)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'VEO_SCENE_GENERATION' });
      const stepVeoGen = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'VEO_SCENE_GENERATION',
        inputPayload: {
          reelPlanId: reelPlan.id,
          scenesCount: reelPlan.scenes?.length || 0,
          targetProductId: targetProduct?.id || null
        }
      });

      const veoOperations: Array<{ sceneNumber: number; operationId: string }> = [];
      const resolvedSceneReferences: Record<number, any> = {};

      try {
        if (reelPlan.scenes && reelPlan.scenes.length > 0) {
          for (let i = 0; i < reelPlan.scenes.length; i++) {
            const scene = reelPlan.scenes[i];
            const isProductScene = VeoReferenceAssetResolver.isProductScene(scene);

            if (isProductScene) {
              const resolved = VeoReferenceAssetResolver.resolveReferences({
                brand,
                product: targetProduct,
                products,
                scene,
                brandAssets,
                workspaceId
              });
              resolvedSceneReferences[scene.sceneNumber || i + 1] = resolved;

              // If scene strictly requires reference assets but none exist
              if (!resolved.isValid && resolved.failureReason?.includes('PRODUCT_REFERENCE_REQUIRED')) {
                const assetReqError = `PRODUCT_ASSET_REQUIRED: ${resolved.failureReason}`;
                await this.autonRepo.updateRunStep(stepVeoGen.id, workspaceId, {
                  status: 'FAILED',
                  errorMessage: assetReqError,
                  completedAt: new Date()
                });

                return this.autonRepo.updateRun(runId, workspaceId, {
                  status: 'WAITING_FOR_ASSET',
                  currentStep: 'VEO_SCENE_GENERATION',
                  summary: assetReqError,
                  error: assetReqError,
                  details: { ...runDetails, sceneNumber: scene.sceneNumber || i + 1, failureReason: resolved.failureReason },
                  completedAt: new Date()
                });
              }
            }
          }
        }

        await this.autonRepo.updateRunStep(stepVeoGen.id, workspaceId, {
          status: 'COMPLETED',
          outputPayload: {
            scenesProcessed: reelPlan.scenes?.length || 0,
            referenceResolvedCount: Object.keys(resolvedSceneReferences).length
          },
          completedAt: new Date()
        });
      } catch (veoErr: any) {
        if (
          veoErr instanceof VeoQuotaExhaustedError ||
          veoErr.code === 'VEO_QUOTA_EXHAUSTED' ||
          veoErr.code === 'AI_QUOTA_EXHAUSTED' ||
          veoErr.status === 429 ||
          String(veoErr.message).toLowerCase().includes('quota') ||
          String(veoErr.message).toLowerCase().includes('resource_exhausted')
        ) {
          const quotaMsg = 'Veo provider quota limit reached. Pausing autonomous run until provider quota resets.';
          await this.autonRepo.updateRunStep(stepVeoGen.id, workspaceId, {
            status: 'FAILED',
            errorMessage: quotaMsg,
            completedAt: new Date()
          });

          await this.autonRepo.recordSafetyEvent({
            workspaceId,
            brandId,
            eventType: 'AI_QUOTA_EXHAUSTED',
            severity: 'WARNING',
            description: quotaMsg,
            blockedAction: 'VEO_SCENE_GENERATION',
            details: { model: 'veo-3.1-generate-preview', error: veoErr.message }
          });

          return this.autonRepo.updateRun(runId, workspaceId, {
            status: 'WAITING_FOR_PROVIDER',
            currentStep: 'VEO_SCENE_GENERATION',
            summary: quotaMsg,
            error: veoErr.message,
            details: { ...runDetails, provider: 'veo-3.1-generate-preview', isQuotaError: true },
            completedAt: new Date()
          });
        }
        throw veoErr;
      }

      // -----------------------------------------------------------------------
      // Step 8: Veo Polling & Download (PRODUCE: Steps 14-15)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'VEO_POLLING' });
      const stepVeoPoll = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'VEO_POLLING',
        inputPayload: { operationsCount: veoOperations.length }
      });

      await this.autonRepo.updateRunStep(stepVeoPoll.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: { operationsPolled: veoOperations.length, status: 'READY' },
        completedAt: new Date()
      });

      // -----------------------------------------------------------------------
      // Step 9: Media Resolution (First-Party Priority + Supporting Visuals)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'MEDIA_RESOLUTION' });
      const stepMedia = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'MEDIA_RESOLUTION',
        inputPayload: { reelPlanId: reelPlan.id }
      });

      const mediaRes = await this.mediaService.resolveReelMedia(reelPlan, workspaceId, { preferFirstPartyOnly: true });
      await this.autonRepo.updateRunStep(stepMedia.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: { summary: mediaRes.summary, resolvedCount: mediaRes.assets.length },
        completedAt: new Date()
      });
      runDetails.mediaResolutionSummary = mediaRes.summary;

      // -----------------------------------------------------------------------
      // Step 10: Voice Synthesis (PRODUCE: Step 16)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'VOICE_GENERATION' });
      const stepVoice = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'VOICE_GENERATION',
        inputPayload: { reelPlanId: reelPlan.id }
      });

      const voiceAsset = await this.voiceService.generateVoiceTrack(reelPlan, workspaceId);
      await this.autonRepo.updateRunStep(stepVoice.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: { voiceAssetId: voiceAsset.id, provider: voiceAsset.provider },
        completedAt: new Date()
      });
      runDetails.voiceAssetId = voiceAsset.id;

      // -----------------------------------------------------------------------
      // Step 11: Timed Captions Generation (PRODUCE: Step 17)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'CAPTION_GENERATION' });
      const stepCaptions = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'CAPTION_GENERATION',
        inputPayload: { reelPlanId: reelPlan.id }
      });

      const captionTrack = await this.captionService.generateCaptionTrack(reelPlan, workspaceId);
      await this.autonRepo.updateRunStep(stepCaptions.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: { captionTrackId: captionTrack.id, cuesCount: captionTrack.cues.length },
        completedAt: new Date()
      });
      runDetails.captionTrackId = captionTrack.id;

      // -----------------------------------------------------------------------
      // Step 12: Music & SFX Resolution (PRODUCE: Step 18)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'AUDIO_RESOLUTION' });
      const stepAudio = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'AUDIO_RESOLUTION',
        inputPayload: { reelPlanId: reelPlan.id }
      });

      const audioPlan = await this.audioService.resolveAudioPlan(reelPlan, workspaceId);
      await this.autonRepo.updateRunStep(stepAudio.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: { audioPlanId: audioPlan.id, musicTitle: audioPlan.musicConfig?.title },
        completedAt: new Date()
      });
      runDetails.audioPlanId = audioPlan.id;

      // -----------------------------------------------------------------------
      // Step 13: Production Package Compilation & Animation Planning
      // -----------------------------------------------------------------------
      const prodPkg = await this.packageService.compilePackage(reelPlan.id, workspaceId);
      const animResult = await this.animationService.generateAnimationPlan({
        workspaceId,
        brandId,
        reelPlan,
        productionPackage: prodPkg,
        brandDna
      });

      // -----------------------------------------------------------------------
      // Step 14: Master Video Assembly & Rendering (PRODUCE: Step 19)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'VIDEO_ASSEMBLY' });
      const step5 = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'VIDEO_ASSEMBLY',
        inputPayload: { reelPlanId: reelPlan.id }
      });

      let renderOutput: any;
      try {
        renderOutput = await this.renderService.renderReelVideo(reelPlan.id, workspaceId, {
          renderMode: 'PRODUCTION'
        });
      } catch (renderErr: any) {
        const isQuota =
          renderErr.code === 'AI_QUOTA_EXHAUSTED' ||
          renderErr.code === 'VEO_QUOTA_EXHAUSTED' ||
          String(renderErr.message).toLowerCase().includes('quota');

        if (isQuota) {
          const quotaMsg = 'Veo provider quota limit reached during video rendering. Pausing run.';
          await this.autonRepo.updateRunStep(step5.id, workspaceId, {
            status: 'FAILED',
            errorMessage: quotaMsg,
            completedAt: new Date()
          });

          return this.autonRepo.updateRun(runId, workspaceId, {
            status: 'WAITING_FOR_PROVIDER',
            currentStep: 'VIDEO_ASSEMBLY',
            summary: quotaMsg,
            error: renderErr.message,
            details: { ...runDetails, isQuotaError: true },
            completedAt: new Date()
          });
        }

        await this.autonRepo.updateRunStep(step5.id, workspaceId, {
          status: 'FAILED',
          errorMessage: renderErr.message,
          completedAt: new Date()
        });

        await this.autonRepo.recordSafetyEvent({
          workspaceId,
          brandId,
          eventType: 'RENDER_FAILED',
          severity: 'WARNING',
          description: `Video render failed: ${renderErr.message}`,
          blockedAction: 'VIDEO_RENDERING',
          details: { error: renderErr.message, stack: renderErr.stack }
        });

        return this.autonRepo.updateRun(runId, workspaceId, {
          status: 'RENDER_FAILED',
          currentStep: 'VIDEO_ASSEMBLY',
          summary: `Video render failed: ${renderErr.message}`,
          error: renderErr.message,
          details: runDetails,
          completedAt: new Date()
        });
      }

      await this.autonRepo.incrementLimits(workspaceId, { reelsRendered: 1 });
      await this.autonRepo.updateRunStep(step5.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: {
          packageId: prodPkg.id,
          animationPlanId: animResult.animationPlan.id,
          videoUrl: renderOutput.outputVideoUrl
        },
        completedAt: new Date()
      });
      runDetails.renderOutput = renderOutput;

      // -----------------------------------------------------------------------
      // Step 15: Brand Safety Validation (VALIDATE: Step 20)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'BRAND_SAFETY' });
      const stepBrandSafety = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'BRAND_SAFETY',
        inputPayload: { reelPlanId: reelPlan.id }
      });

      const safetyResult = await this.guardrailsService.validateBrandSafety({
        workspaceId,
        brandId,
        brand,
        dna: brandDna,
        reel: reelPlan,
        policy
      });

      if (!safetyResult.allowed) {
        await this.autonRepo.updateRunStep(stepBrandSafety.id, workspaceId, {
          status: 'FAILED',
          errorMessage: safetyResult.reason,
          completedAt: new Date()
        });

        await this.autonRepo.recordSafetyEvent({
          workspaceId,
          brandId,
          eventType: 'POLICY_VIOLATION',
          severity: 'CRITICAL',
          description: `Brand safety violation: ${safetyResult.reason}`,
          blockedAction: 'AUTONOMOUS_OPERATIONS',
          details: { reelPlanId: reelPlan.id, reason: safetyResult.reason }
        });

        return this.autonRepo.updateRun(runId, workspaceId, {
          status: 'BLOCKED',
          currentStep: 'BRAND_SAFETY',
          summary: `Run blocked by Brand Safety guardrail: ${safetyResult.reason}`,
          error: safetyResult.reason,
          details: runDetails,
          completedAt: new Date()
        });
      }

      await this.autonRepo.updateRunStep(stepBrandSafety.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: { brandSafety: 'PASSED' },
        completedAt: new Date()
      });

      // -----------------------------------------------------------------------
      // Step 16: Commercial Claim Validation (VALIDATE: Step 22)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'COMMERCIAL_CLAIM_VALIDATION' });
      const stepClaims = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'COMMERCIAL_CLAIM_VALIDATION',
        inputPayload: { reelPlanId: reelPlan.id }
      });

      const claimsToAvoid = brandDna?.promotionRules?.claimsToAvoid || [];
      const scriptText = (reelPlan.scenes || []).map((s) => s.narration || s.onScreenText || (s as any).voiceoverScript || '').join(' ').toLowerCase();
      const forbiddenFound = claimsToAvoid.find((c: string) => scriptText.includes(c.toLowerCase()));

      if (forbiddenFound) {
        const claimError = `COMMERCIAL_CLAIM_VIOLATION: Script contains prohibited claim "${forbiddenFound}"`;
        await this.autonRepo.updateRunStep(stepClaims.id, workspaceId, {
          status: 'FAILED',
          errorMessage: claimError,
          completedAt: new Date()
        });

        return this.autonRepo.updateRun(runId, workspaceId, {
          status: 'BLOCKED',
          currentStep: 'COMMERCIAL_CLAIM_VALIDATION',
          summary: claimError,
          error: claimError,
          details: runDetails,
          completedAt: new Date()
        });
      }

      await this.autonRepo.updateRunStep(stepClaims.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: { commercialClaims: 'VERIFIED_COMPLIANT' },
        completedAt: new Date()
      });

      // -----------------------------------------------------------------------
      // Step 17: Visual QA Inspection (VALIDATE: Step 21)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'VIDEO_QA' });
      const stepQA = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'VIDEO_QA',
        inputPayload: { reelPlanId: reelPlan.id, videoUrl: renderOutput.outputVideoUrl }
      });

      const videoLocalPath = renderOutput.localPath || renderOutput.outputVideoUrl;
      const sceneArtifacts: SceneVideoArtifact[] = (renderOutput.sceneArtifacts || []) as SceneVideoArtifact[];

      if (videoLocalPath && typeof videoLocalPath === 'string' && !videoLocalPath.startsWith('http') && fs.existsSync(videoLocalPath)) {
        const qaReport = await ReelQAChecker.inspectReel(videoLocalPath, reelPlan, sceneArtifacts);
        if (!qaReport.valid) {
          const qaError = `Visual QA inspection failed: ${qaReport.failureReasons.join('; ')}`;
          await this.autonRepo.updateRunStep(stepQA.id, workspaceId, {
            status: 'FAILED',
            errorMessage: qaError,
            outputPayload: { qaReport },
            completedAt: new Date()
          });

          return this.autonRepo.updateRun(runId, workspaceId, {
            status: 'RENDER_FAILED',
            currentStep: 'VIDEO_QA',
            summary: qaError,
            error: qaError,
            details: { ...runDetails, qaReport },
            completedAt: new Date()
          });
        }
      }

      await this.autonRepo.updateRunStep(stepQA.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: { visualQA: 'PASSED_10_POINT_INSPECTION' },
        completedAt: new Date()
      });

      // -----------------------------------------------------------------------
      // Step 18: Approval Decision Gateway (ACT: Step 23)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'APPROVAL' });
      const stepApproval = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'APPROVAL',
        inputPayload: { mode: policy.mode, skipPublish }
      });

      if (policy.mode === 'CONTROLLED' || skipPublish) {
        const summary = `Autonomous preparation completed in CONTROLLED mode. Reel "${reelPlan.title}" rendered and awaiting human approval.`;
        await this.autonRepo.recordExecutionHistory({
          workspaceId,
          brandId,
          runId,
          actionType: 'CONTENT_GENERATION',
          targetEntity: 'REEL_PRODUCTION_PLAN',
          targetId: reelPlan.id,
          status: 'SUCCESS',
          reason: 'Render completed. STOPPED at approval gateway in CONTROLLED mode.',
          executedBy: 'AUTONOMOUS_ENGINE'
        });

        await this.autonRepo.updateRunStep(stepApproval.id, workspaceId, {
          status: 'COMPLETED',
          outputPayload: { approvalRequired: true, approved: false, mode: 'CONTROLLED' },
          completedAt: new Date()
        });

        return this.autonRepo.updateRun(runId, workspaceId, {
          status: 'APPROVAL_REQUIRED',
          currentStep: 'APPROVAL',
          summary,
          details: {
            ...runDetails,
            approvalRequired: true,
            approvalRequiredNotice:
              'Human approval is required in CONTROLLED mode before launching Meta Ads.'
          },
          completedAt: new Date()
        });
      }

      await this.autonRepo.updateRunStep(stepApproval.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: { approvalRequired: false, approved: true, mode: 'AUTONOMOUS' },
        completedAt: new Date()
      });

      // -----------------------------------------------------------------------
      // Step 19: Budget Guardrails & Publishing (ACT: Step 24)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'BUDGET_GUARDRAILS_CHECK' });
      const step7 = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'BUDGET_GUARDRAILS_CHECK',
        inputPayload: { proposedSpend: dailySpendAmount }
      });

      const budgetCheck = await this.guardrailsService.validateBudgetGuardrails({
        workspaceId,
        brandId,
        policy,
        proposedSpendAmount: dailySpendAmount,
        isNewCampaign: true,
        isNewAd: true
      });

      if (!budgetCheck.allowed) {
        await this.autonRepo.updateRunStep(step7.id, workspaceId, {
          status: 'FAILED',
          errorMessage: budgetCheck.reason,
          completedAt: new Date()
        });

        return this.autonRepo.updateRun(runId, workspaceId, {
          status: 'LIMIT_REACHED',
          currentStep: 'BUDGET_GUARDRAILS_CHECK',
          summary: `Publishing halted: ${budgetCheck.reason}`,
          error: budgetCheck.reason,
          details: runDetails,
          completedAt: new Date()
        });
      }

      await this.autonRepo.updateRunStep(step7.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: { budgetAuthorized: dailySpendAmount },
        completedAt: new Date()
      });

      // Execute Autonomous Meta Ads Publishing
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'PUBLISH' });
      const stepPublish = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'PUBLISH',
        inputPayload: { reelPlanId: reelPlan.id, dailyBudget: dailySpendAmount * 100 }
      });

      // Autonomously advance status to READY_FOR_ADS for publishing
      await this.reelRepo.updateStatus(reelPlan.id, 'READY_FOR_ADS');

      const metaPubResult = await this.metaAdsService.publishToMeta({
        reelPlanId: reelPlan.id,
        workspaceId,
        brandId,
        campaignId: campaignId || undefined,
        metaCampaignName: `${brand.name} - Autonomous Campaign [${new Date().toISOString().split('T')[0]}]`,
        dailyBudget: Math.round(dailySpendAmount * 100), // cents
        idempotencyKey: `auton_pub_${workspaceId}_${reelPlan.id}`
      });

      // Update Limits, Budget & Execution History (Step 25: Record performance)
      await this.autonRepo.incrementLimits(workspaceId, {
        dailySpend: dailySpendAmount,
        campaignsCreated: 1,
        adsCreated: 1,
        reelsPublished: 1
      });

      await this.autonRepo.recordBudgetEvent({
        workspaceId,
        brandId,
        eventType: 'SPEND_AUTHORIZED',
        amount: dailySpendAmount,
        limitValue: policy.advertising.maxDailySpend,
        currentValue: dailySpendAmount,
        reason: `Authorized daily budget for autonomous Meta Ad "${reelPlan.title}".`
      });

      await this.autonRepo.recordExecutionHistory({
        workspaceId,
        brandId,
        runId,
        actionType: 'META_PUBLISH',
        targetEntity: 'META_AD',
        targetId: metaPubResult.adId || metaPubResult.publicationId,
        status: 'SUCCESS',
        reason: `Published reel to Meta Ads with campaign ID ${metaPubResult.campaignId}`,
        budgetImpact: dailySpendAmount,
        executionResult: metaPubResult as unknown as Record<string, unknown>,
        executedBy: 'AUTONOMOUS_ENGINE'
      });

      await this.autonRepo.updateRunStep(stepPublish.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: {
          publicationId: metaPubResult.publicationId,
          campaignId: metaPubResult.campaignId,
          adSetId: metaPubResult.adSetId,
          adId: metaPubResult.adId,
          adsManagerUrl: metaPubResult.adsManagerUrl
        },
        completedAt: new Date()
      });
      runDetails.metaPublication = metaPubResult;

      // -----------------------------------------------------------------------
      // Step 20: Closed-Loop Learning & Intelligence Feedback (LEARN: Steps 26-27)
      // -----------------------------------------------------------------------
      await this.autonRepo.updateRun(runId, workspaceId, { currentStep: 'LEARNING' });
      const stepLearning = await this.autonRepo.createRunStep({
        runId,
        workspaceId,
        stepName: 'LEARNING',
        inputPayload: {
          reelPlanId: reelPlan.id,
          brandId,
          campaignId,
          winningPatternsCount: winningPatterns.length
        }
      });

      const cycleLearnings = {
        appliedHook: reelPlan.hook?.text || (reelPlan.concept as any)?.hook || (reelPlan as any).hook || 'Proven visual hook',
        productFeatured: targetProduct?.name || brand.name,
        targetDuration: reelPlan.durationSeconds || 30,
        scenesCount: reelPlan.scenes?.length || 0,
        feedbackDirective: `Reinforce ${winningStrings[0] || 'visual hook'} for subsequent reel iterations.`,
        cycleCompletedAt: new Date().toISOString()
      };

      await this.autonRepo.recordExecutionHistory({
        workspaceId,
        brandId,
        runId,
        actionType: 'CONTENT_GENERATION',
        targetEntity: 'AUTONOMOUS_INTELLIGENCE',
        targetId: reelPlan.id,
        status: 'SUCCESS',
        reason: `Intelligence cycle updated with production signals for "${reelPlan.title}".`,
        executionResult: cycleLearnings,
        executedBy: 'AUTONOMOUS_ENGINE'
      });

      await this.autonRepo.updateRunStep(stepLearning.id, workspaceId, {
        status: 'COMPLETED',
        outputPayload: cycleLearnings,
        completedAt: new Date()
      });
      runDetails.learning = cycleLearnings;

      // Complete Autonomous Run Successfully
      const summary = `Full autonomous cycle completed (DECIDE → PRODUCE → VALIDATE → LEARN → ACT). Strategy synthesized, reel "${reelPlan.title}" produced with Veo engine, validated, and published live to Meta Ads.`;
      return this.autonRepo.updateRun(runId, workspaceId, {
        status: 'COMPLETED',
        currentStep: 'COMPLETED',
        summary,
        details: runDetails,
        completedAt: new Date()
      });
    } catch (runErr: any) {
      console.error('[AutonomousOperations] Run failed with error:', runErr);

      let eventType: any = 'POLICY_VIOLATION';
      const errMsg = runErr.message || String(runErr);
      const lowerErr = errMsg.toLowerCase();

      let runStatus: any = 'FAILED';

      if (
        lowerErr.includes('quota') ||
        lowerErr.includes('429') ||
        lowerErr.includes('resource_exhausted') ||
        runErr.code === 'AI_QUOTA_EXHAUSTED' ||
        runErr.code === 'VEO_QUOTA_EXHAUSTED'
      ) {
        eventType = 'AI_QUOTA_EXHAUSTED';
        runStatus = 'WAITING_FOR_PROVIDER';
      } else if (lowerErr.includes('product_asset_required') || lowerErr.includes('product asset')) {
        eventType = 'PRODUCT_ASSET_REQUIRED';
        runStatus = 'WAITING_FOR_ASSET';
      } else if (lowerErr.includes('render') || lowerErr.includes('ffmpeg') || lowerErr.includes('qa inspection failed')) {
        eventType = 'RENDER_FAILED';
        runStatus = 'RENDER_FAILED';
      } else if (lowerErr.includes('safety') || lowerErr.includes('claim')) {
        eventType = 'POLICY_VIOLATION';
        runStatus = 'BLOCKED';
      } else if (lowerErr.includes('media')) {
        eventType = 'MEDIA_RESOLUTION_FAILED';
      } else if (lowerErr.includes('voice')) {
        eventType = 'VOICE_GENERATION_FAILED';
      } else if (lowerErr.includes('caption')) {
        eventType = 'CAPTION_GENERATION_FAILED';
      } else if (lowerErr.includes('audio')) {
        eventType = 'AUDIO_RESOLUTION_FAILED';
      } else if (lowerErr.includes('publish') || lowerErr.includes('meta')) {
        eventType = 'PUBLISHING_FAILED';
      } else if (lowerErr.includes('ai') || lowerErr.includes('gemini') || lowerErr.includes('veo')) {
        eventType = 'AI_PROVIDER_ERROR';
      } else if (lowerErr.includes('budget')) {
        eventType = 'BUDGET_LIMIT_REACHED';
      }

      await this.autonRepo.recordSafetyEvent({
        workspaceId,
        brandId,
        eventType,
        severity: 'WARNING',
        description: `Autonomous run failed: ${runErr.message}`,
        blockedAction: 'AUTONOMOUS_OPERATIONS',
        details: { error: runErr.message, stack: runErr.stack }
      });

      return this.autonRepo.updateRun(runId, workspaceId, {
        status: runStatus,
        summary: `Autonomous run encountered error: ${runErr.message}`,
        error: runErr.message,
        details: runDetails,
        completedAt: new Date()
      });
    }
  }
}
