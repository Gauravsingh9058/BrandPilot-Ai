import type { Database } from '@vidsnapai/database';
import type {
  ReelProductionPlan
} from '@vidsnapai/types';
import { ReelProductionPlanRepository } from '../repositories/reel-production-plan.repository.js';
import { AutomatedProductionOrchestrator } from './automatedProductionOrchestrator.js';

export class CampaignAutomationService {
  private reelRepo: ReelProductionPlanRepository;
  private orchestrator: AutomatedProductionOrchestrator;

  constructor(
    private db: Database,
    options?: {
      reelRepo?: ReelProductionPlanRepository;
      orchestrator?: AutomatedProductionOrchestrator;
    }
  ) {
    this.reelRepo = options?.reelRepo || new ReelProductionPlanRepository(db);
    this.orchestrator = options?.orchestrator || new AutomatedProductionOrchestrator(db);
  }

  /**
   * Bulk produce all planned reels for a given campaign.
   */
  async produceCampaignReels(params: {
    campaignId: string;
    workspaceId: string;
    autoApprove?: boolean;
    concurrency?: number;
  }): Promise<{
    campaignId: string;
    total: number;
    succeeded: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const { campaignId, workspaceId, autoApprove, concurrency = 2 } = params;

    const allReels = await this.reelRepo.listByWorkspace(workspaceId);
    const campaignReels = allReels.filter((r) => r.campaignId === campaignId);

    if (campaignReels.length === 0) {
      return {
        campaignId,
        total: 0,
        succeeded: [],
        failed: []
      };
    }

    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    // Controlled concurrency batch execution
    for (let i = 0; i < campaignReels.length; i += concurrency) {
      const batch = campaignReels.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (reel: ReelProductionPlan) => {
          try {
            await this.orchestrator.produceReel({
              reelPlanId: reel.id,
              workspaceId,
              autoApprove
            });
            succeeded.push(reel.id);
          } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown production error';
            failed.push({ id: reel.id, error: errorMsg });
          }
        })
      );
    }

    return {
      campaignId,
      total: campaignReels.length,
      succeeded,
      failed
    };
  }
}
