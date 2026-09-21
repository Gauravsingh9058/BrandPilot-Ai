import type {
  VideoRenderer,
  RenderTimelineSpec,
  RenderJobStatus
} from '@vidsnapai/types';

export * from '@vidsnapai/types';
export * from './repositories/reel-production-plan.repository.js';
export * from './repositories/production-package.repository.js';
export * from './prompts/reel-orchestration.prompt.js';
export * from './validators/sceneValidator.js';
export * from './validators/reelValidator.js';
export * from './reelOrchestrator.js';
export * from './reelPlannerService.js';
export * from './readinessChecker.js';
export * from './productionPackageService.js';
export * from './renderContractAdapter.js';
export * from './mediaAssetDownloader.js';
export * from './visualFrameValidator.js';
export * from './safeAreas.js';
export * from './directors/reelProductionDirector.js';
export * from './sceneComposer.js';
export * from './reelQAChecker.js';
export * from './videoRenderService.js';

// Phase 9: Workflow & Publishing exports
export * from './publishing/socialPublicationRepository.js';
export * from './publishing/socialPublisherFactory.js';
export * from './publishing/mockPublisher.js';
export * from './publishing/instagramPublisher.js';
export * from './publishing/facebookPublisher.js';
export * from './publishing/socialPublishingService.js';
export * from './workflow/lifecycleValidator.js';
export * from './workflow/approvalService.js';
export * from './workflow/automatedProductionOrchestrator.js';
export * from './workflow/campaignAutomationService.js';

// Phase 10: Meta Ads Integration exports
export * from './repositories/meta-ads.repository.js';
export * from './publishing/metaApiClient.js';
export * from './publishing/metaAdsService.js';

// Phase 11: Analytics & AI Optimization exports
export * from './analytics/metricNormalizer.js';
export * from './analytics/analytics.repository.js';
export * from './analytics/contentPerformanceAnalyzer.js';
export * from './analytics/optimizationIntelligenceService.js';
export * from './analytics/experimentationEngine.js';

// Phase 12: Autonomous Campaign Optimization & Execution Engine exports
export * from './optimization/repositories/optimization-action.repository.js';
export * from './optimization/optimizationExecutionService.js';
export * from './optimization/autonomousCampaignLoopService.js';

// Phase 13: Autonomous Operations & Self-Optimizing Campaign Engine exports
export * from './autonomous/autonomousPolicyService.js';
export * from './autonomous/autonomousGuardrailsService.js';
export * from './autonomous/autonomousOperationsService.js';



/**
 * NullVideoRenderer
 * Contract-compliant architectural placeholder for Phase 1.
 * Real rendering engine (FFmpeg, timeline, scenes, composition) is implemented in VideoRenderService (Phase 8).
 */
export class NullVideoRenderer implements VideoRenderer {
  public readonly rendererName = 'null-renderer';

  async submitRenderJob(_spec: RenderTimelineSpec): Promise<{ jobId: string }> {
    throw new Error(
      '[VideoRenderer] Rendering engine is not implemented in Phase 1 (scheduled for Phase 8: Video Composition + Rendering).'
    );
  }

  async getRenderJobStatus(_jobId: string): Promise<RenderJobStatus> {
    throw new Error(
      '[VideoRenderer] Rendering engine is not implemented in Phase 1 (scheduled for Phase 8: Video Composition + Rendering).'
    );
  }

  async cancelRenderJob(_jobId: string): Promise<boolean> {
    throw new Error(
      '[VideoRenderer] Rendering engine is not implemented in Phase 1 (scheduled for Phase 8: Video Composition + Rendering).'
    );
  }
}
