import type { Database } from '@vidsnapai/database';
import type { ReelProductionPlan, ApprovalRecord, ProductionMetadata } from '@vidsnapai/types';
import { ReelProductionPlanRepository } from '../repositories/reel-production-plan.repository.js';
import { LifecycleValidator } from './lifecycleValidator.js';

export class ApprovalService {
  private reelRepo: ReelProductionPlanRepository;

  constructor(
    private db: Database,
    options?: { reelRepo?: ReelProductionPlanRepository }
  ) {
    this.reelRepo = options?.reelRepo || new ReelProductionPlanRepository(db);
  }

  async approveReel(params: {
    reelPlanId: string;
    workspaceId: string;
    approvedBy?: string;
    notes?: string;
  }): Promise<ReelProductionPlan> {
    const { reelPlanId, workspaceId, approvedBy, notes } = params;

    const reel = await this.reelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
    if (!reel) {
      throw new Error(`Reel "${reelPlanId}" not found in workspace "${workspaceId}".`);
    }

    LifecycleValidator.validateTransition(reel.status, 'APPROVED');

    const approvalRecord: ApprovalRecord = {
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedBy: approvedBy || 'Current User',
      reason: notes
    };

    const existingMeta = (reel.productionMetadata || {}) as ProductionMetadata;
    const updatedMeta: ProductionMetadata = {
      ...existingMeta,
      approval: approvalRecord
    };

    const updated = await this.reelRepo.update(reelPlanId, {
      status: 'APPROVED',
      productionMetadata: updatedMeta
    });

    if (!updated) {
      throw new Error(`Failed to update approval status for reel "${reelPlanId}".`);
    }

    return updated;
  }

  async rejectReel(params: {
    reelPlanId: string;
    workspaceId: string;
    reason: string;
    rejectedBy?: string;
  }): Promise<ReelProductionPlan> {
    const { reelPlanId, workspaceId, reason, rejectedBy } = params;

    if (!reason || reason.trim().length === 0) {
      throw new Error('A rejection reason is required.');
    }

    const reel = await this.reelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
    if (!reel) {
      throw new Error(`Reel "${reelPlanId}" not found in workspace "${workspaceId}".`);
    }

    LifecycleValidator.validateTransition(reel.status, 'REJECTED');

    const approvalRecord: ApprovalRecord = {
      status: 'REJECTED',
      rejectedAt: new Date().toISOString(),
      approvedBy: rejectedBy || 'Current User',
      reason: reason.trim()
    };

    const existingMeta = (reel.productionMetadata || {}) as ProductionMetadata;
    const updatedMeta: ProductionMetadata = {
      ...existingMeta,
      approval: approvalRecord
    };

    const updated = await this.reelRepo.update(reelPlanId, {
      status: 'REJECTED',
      productionMetadata: updatedMeta
    });

    if (!updated) {
      throw new Error(`Failed to update rejection status for reel "${reelPlanId}".`);
    }

    return updated;
  }
}
