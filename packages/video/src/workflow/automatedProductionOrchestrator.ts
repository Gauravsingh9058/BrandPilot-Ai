import type { Database } from '@vidsnapai/database';
import type {
  ReelProductionPlan,
  VideoRenderOutput
} from '@vidsnapai/types';
import { ReelProductionPlanRepository } from '../repositories/reel-production-plan.repository.js';
import { VideoRenderService, type VideoRenderOptions } from '../videoRenderService.js';
import { LifecycleValidator } from './lifecycleValidator.js';

export class AutomatedProductionOrchestrator {
  private reelRepo: ReelProductionPlanRepository;
  private renderService: VideoRenderService;

  constructor(
    private db: Database,
    options?: {
      reelRepo?: ReelProductionPlanRepository;
      renderService?: VideoRenderService;
    }
  ) {
    this.reelRepo = options?.reelRepo || new ReelProductionPlanRepository(db);
    this.renderService = options?.renderService || new VideoRenderService(db);
  }

  /**
   * Execute automated end-to-end production for a reel blueprint:
   * 1. Validates lifecycle
   * 2. Orchestrates Media, Voice, Captions, Audio, Animation, and Render
   * 3. Transitions status to COMPLETED (or APPROVAL_REQUIRED)
   */
  async produceReel(params: {
    reelPlanId: string;
    workspaceId: string;
    autoApprove?: boolean;
    renderOptions?: VideoRenderOptions;
  }): Promise<{ reelPlan: ReelProductionPlan; renderOutput: VideoRenderOutput }> {
    const { reelPlanId, workspaceId, autoApprove, renderOptions } = params;

    const reelPlan = await this.reelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
    if (!reelPlan) {
      throw new Error(`Reel production plan with ID "${reelPlanId}" not found in workspace "${workspaceId}".`);
    }

    LifecycleValidator.validateTransition(reelPlan.status, 'IN_PRODUCTION');

    // Execute Phase 8 Video Render Service
    const renderOutput = await this.renderService.renderReelVideo(reelPlanId, workspaceId, renderOptions);

    let finalStatus: 'COMPLETED' | 'APPROVAL_REQUIRED' | 'APPROVED' = 'COMPLETED';
    if (autoApprove) {
      finalStatus = 'APPROVED';
    }

    const updated = await this.reelRepo.updateStatus(reelPlanId, finalStatus);

    return {
      reelPlan: updated!,
      renderOutput
    };
  }
}
