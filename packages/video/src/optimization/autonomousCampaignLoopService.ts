import type { Database } from '@vidsnapai/database';
import type {
  AIProvider,
  AutonomousLoopInput,
  AutonomousLoopResult,
  OptimizationContext,
  StorageProvider
} from '@vidsnapai/types';
import { CampaignDirectorService } from '@vidsnapai/campaign';
import { ContentPlannerService } from '@vidsnapai/content';
import { ReelPlannerService } from '../reelPlannerService.js';
import { ProductionPackageService } from '../productionPackageService.js';
import { AnimationService } from '@vidsnapai/animation';
import { VideoRenderService } from '../videoRenderService.js';
import { OptimizationExecutionService } from './optimizationExecutionService.js';

export class AutonomousCampaignLoopService {
  private directorService: CampaignDirectorService;
  private contentPlannerService: ContentPlannerService;
  private reelPlannerService: ReelPlannerService;
  private packageService: ProductionPackageService;
  private animationService: AnimationService;
  private renderService: VideoRenderService;
  private executionService: OptimizationExecutionService;

  constructor(
    private db: Database,
    private aiProvider: AIProvider,
    options?: {
      directorService?: CampaignDirectorService;
      contentPlannerService?: ContentPlannerService;
      reelPlannerService?: ReelPlannerService;
      packageService?: ProductionPackageService;
      animationService?: AnimationService;
      renderService?: VideoRenderService;
      executionService?: OptimizationExecutionService;
      storageProvider?: StorageProvider;
    }
  ) {
    this.directorService = options?.directorService ?? new CampaignDirectorService(db, aiProvider);
    this.contentPlannerService = options?.contentPlannerService ?? new ContentPlannerService(db, aiProvider);
    this.reelPlannerService = options?.reelPlannerService ?? new ReelPlannerService(db, aiProvider);
    this.packageService = options?.packageService ?? new ProductionPackageService(db);
    this.animationService = options?.animationService ?? new AnimationService();
    this.renderService = options?.renderService ?? new VideoRenderService(db, { storageProvider: options?.storageProvider });
    this.executionService = options?.executionService ?? new OptimizationExecutionService(db);
  }

  /**
   * Executes the full closed-loop autonomous campaign optimization cycle:
   * 1. Performance Analysis & Learning Synthesis via AI Campaign Director.
   * 2. Proposed optimization actions generation.
   * 3. Optimized 30-Day Content Plan generation with historical optimization context.
   * 4. Next prioritized Reel Blueprint generation.
   * 5. Media/Voice/Captions/Audio assembly (Phase 6).
   * 6. Animation Intelligence (Phase 7).
   * 7. FFmpeg Rendering (Phase 8).
   * 8. STRICT APPROVAL GATEWAY: Pipeline stops. Publishing to Meta remains strictly blocked.
   */
  async runAutonomousLoop(workspaceId: string, input: AutonomousLoopInput): Promise<AutonomousLoopResult> {
    // 1. Run AI Campaign Director
    const directorResult = await this.directorService.runDirector(workspaceId, {
      brandId: input.brandId,
      campaignId: input.campaignId
    });

    const winningPatterns = directorResult.run.winningPatterns;
    const weakPatterns = directorResult.run.weakPatterns;
    const strategicDirectives = directorResult.run.strategicDirectives;
    const contentRequirements = directorResult.run.contentRequirements;

    // Normalize patterns to string arrays
    const winningStrings: string[] = winningPatterns.map((p) => (typeof p === 'string' ? p : `${p.type}: ${p.key} (${p.lift})`));
    const weakStrings: string[] = weakPatterns.map((p) => (typeof p === 'string' ? p : `${p.type}: ${p.key} (${p.drag})`));
    const directiveStrings: string[] = strategicDirectives.map((d) => (typeof d === 'string' ? d : `${d.directive} [${d.priority}]`));

    // Build OptimizationContext from Campaign Director output for downstream generators
    const optContext: OptimizationContext = {
      winningHooks: winningStrings.filter((p) => p.toLowerCase().includes('hook')),
      weakHooks: weakStrings.filter((p) => p.toLowerCase().includes('hook')),
      winningMessagingAngles: directiveStrings,
      weakMessagingAngles: weakStrings,
      winningCTAs: contentRequirements.map((r) => r.suggestedCTA || r.cta).filter((c): c is string => Boolean(c)),
      recommendedDurations: contentRequirements.map((r) => r.suggestedDurationSeconds || r.duration).filter((d): d is number => Boolean(d)),
      aiRecommendations: directorResult.proposedActions.map((a) => ({
        recommendation: a.reason,
        reason: typeof a.evidence === 'string' ? a.evidence : JSON.stringify(a.evidence),
        expectedImpact: a.expectedImpact
      }))
    };

    // 2. Generate Optimized Content Plan
    const contentPlan = await this.contentPlannerService.generateContentPlan(
      input.brandId,
      workspaceId,
      {
        campaignId: input.campaignId || null,
        durationDays: input.contentPlanDurationDays || input.daysToPlan || 7,
        customGuidance: directiveStrings.join('\n')
      },
      { optimizationContext: optContext }
    );

    let createdReelId: string | undefined;
    let renderJobResult: any = undefined;

    // 3. Generate Next Priority Reel Blueprint (if requested)
    if (input.generateBlueprints !== false && contentPlan.jobs.length > 0) {
      const topJob = contentPlan.jobs[0];
      const reelPlan = await this.reelPlannerService.generateReelForJob(
        topJob.id,
        workspaceId,
        {
          durationSeconds: contentRequirements[0]?.suggestedDurationSeconds || contentRequirements[0]?.duration || 30,
          customGuidance: directiveStrings.join('\n')
        }
      );
      createdReelId = reelPlan.id;

      // 4. Execute Render Pipeline (Phase 6 -> Phase 7 -> Phase 8) if requested
      if (input.renderVideos || input.autoRenderToApproval) {
        try {
          // Assembles package
          const prodPkg = await this.packageService.compilePackage(reelPlan.id, workspaceId);
          // Generates animation plan
          const animResult = await this.animationService.generateAnimationPlan({
            workspaceId,
            brandId: input.brandId,
            reelPlan,
            productionPackage: prodPkg
          });
          // Renders via FFmpeg
          const renderOut = await this.renderService.renderReelVideo(reelPlan.id, workspaceId);
          renderJobResult = {
            renderOutput: renderOut,
            packageId: prodPkg.id,
            animationPlanId: animResult.animationPlan.id
          };
        } catch (renderError) {
          renderJobResult = {
            error: renderError instanceof Error ? renderError.message : String(renderError),
            rendered: false
          };
        }
      }
    }

    // 5. Enforce STRICT APPROVAL GATEWAY
    // The autonomous loop NEVER automatically publishes reels to Meta or social platforms.
    return {
      success: true,
      runId: `run_${Date.now()}`,
      workspaceId,
      brandId: input.brandId,
      campaignId: input.campaignId,
      campaignDirectorRunId: directorResult.run.id,
      proposedActionIds: directorResult.proposedActions.map((a) => a.id),
      contentPlanId: contentPlan.id,
      createdReelId,
      renderJob: renderJobResult,
      strategicDirectivesCount: strategicDirectives.length,
      proposedActionsCount: directorResult.proposedActions.length,
      reelPlansGeneratedCount: createdReelId ? 1 : 0,
      reelsRenderedCount: renderJobResult?.renderOutput ? 1 : 0,
      status: 'COMPLETED_STOPPED_AT_APPROVAL',
      approvalRequired: true,
      approvalRequiredNotice: 'Human approval is required before publishing any generated reels to Meta Ads or Social Media.',
      publishingStatus: 'BLOCKED_PENDING_APPROVAL',
      summary: `Autonomous cycle completed. Generated strategic directives, ${contentPlan.jobs.length}-day content plan, and optimized reel blueprint. STOPPED at approval gateway.`,
      processedAt: new Date().toISOString()
    };
  }
}
