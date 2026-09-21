import type { Database } from '@vidsnapai/database';
import type {
  OptimizationActionRecord,
  OptimizationActionStatus,
  OptimizationActionType,
  OptimizationExecutionHistoryRecord
} from '@vidsnapai/types';
import { OptimizationActionRepository } from './repositories/optimization-action.repository.js';
import { ReelProductionPlanRepository } from '../repositories/reel-production-plan.repository.js';

export interface ProposeActionInput {
  brandId: string;
  campaignId?: string | null;
  reelId?: string | null;
  actionType: OptimizationActionType;
  targetEntity: string;
  reason: string;
  evidence: string | Record<string, unknown>;
  confidence?: number;
  expectedImpact: string;
  sourceMetrics?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export class OptimizationExecutionService {
  private actionRepo: OptimizationActionRepository;
  private reelPlanRepo: ReelProductionPlanRepository;

  constructor(
    db: Database,
    repos?: {
      actionRepo?: OptimizationActionRepository;
      reelPlanRepo?: ReelProductionPlanRepository;
    }
  ) {
    this.actionRepo = repos?.actionRepo ?? new OptimizationActionRepository(db);
    this.reelPlanRepo = repos?.reelPlanRepo ?? new ReelProductionPlanRepository(db);
  }

  async proposeAction(workspaceId: string, input: ProposeActionInput): Promise<OptimizationActionRecord> {
    const evidenceStr = typeof input.evidence === 'string' ? input.evidence : JSON.stringify(input.evidence);
    return this.actionRepo.create(workspaceId, {
      brandId: input.brandId,
      campaignId: input.campaignId,
      reelId: input.reelId,
      actionType: input.actionType,
      targetEntity: input.targetEntity,
      reason: input.reason,
      evidence: evidenceStr,
      confidence: input.confidence ?? 0.85,
      expectedImpact: input.expectedImpact,
      sourceMetrics: input.sourceMetrics || {},
      status: 'PROPOSED',
      metadata: input.metadata || {}
    });
  }

  async listActions(
    workspaceId: string,
    filters?: {
      brandId?: string;
      campaignId?: string;
      reelId?: string;
      status?: OptimizationActionStatus;
      actionType?: OptimizationActionType;
    }
  ): Promise<OptimizationActionRecord[]> {
    return this.actionRepo.list(workspaceId, filters);
  }

  async getAction(id: string, workspaceId: string): Promise<OptimizationActionRecord | null> {
    return this.actionRepo.findById(id, workspaceId);
  }

  async approveAction(id: string, workspaceId: string, notes?: string): Promise<OptimizationActionRecord> {
    const action = await this.actionRepo.findById(id, workspaceId);
    if (!action) {
      throw new Error(`Optimization action "${id}" not found in workspace "${workspaceId}"`);
    }

    if (action.status === 'APPLIED') {
      throw new Error(`Optimization action "${id}" has already been applied`);
    }

    const currentMeta = (action.metadata as Record<string, unknown>) || {};
    const updated = await this.actionRepo.updateStatus(id, workspaceId, 'APPROVED', {
      metadata: { ...currentMeta, approvalNotes: notes || null, approvedAt: new Date().toISOString() }
    });

    if (!updated) {
      throw new Error(`Failed to approve optimization action "${id}"`);
    }

    return updated;
  }

  async rejectAction(id: string, workspaceId: string, reason?: string): Promise<OptimizationActionRecord> {
    const action = await this.actionRepo.findById(id, workspaceId);
    if (!action) {
      throw new Error(`Optimization action "${id}" not found in workspace "${workspaceId}"`);
    }

    if (action.status === 'APPLIED') {
      throw new Error(`Cannot reject optimization action "${id}" because it is already applied`);
    }

    const currentMeta = (action.metadata as Record<string, unknown>) || {};
    const updated = await this.actionRepo.updateStatus(id, workspaceId, 'REJECTED', {
      metadata: { ...currentMeta, rejectionReason: reason || null, rejectedAt: new Date().toISOString() }
    });

    if (!updated) {
      throw new Error(`Failed to reject optimization action "${id}"`);
    }

    return updated;
  }

  /**
   * Applies an approved optimization action to the target entity.
   * Safety Guarantees:
   * 1. Multi-tenant workspace validation.
   * 2. Requires action to be APPROVED first (unless force: true).
   * 3. Idempotent: If already APPLIED, returns the action without reapplying.
   * 4. AI never directly publishes unapproved reels to Meta.
   */
  async applyAction(
    id: string,
    workspaceId: string,
    options?: { force?: boolean; executedBy?: string }
  ): Promise<{ action: OptimizationActionRecord; executionHistory: OptimizationExecutionHistoryRecord }> {
    const action = await this.actionRepo.findById(id, workspaceId);
    if (!action) {
      throw new Error(`Optimization action "${id}" not found in workspace "${workspaceId}"`);
    }

    // Idempotency: already applied
    if (action.status === 'APPLIED') {
      const history = await this.actionRepo.listExecutionHistory(id, workspaceId);
      return {
        action,
        executionHistory: history[0] || {
          id: 'idempotent-applied',
          workspaceId,
          brandId: action.brandId,
          actionId: action.id,
          executedBy: options?.executedBy || 'SYSTEM',
          executionStatus: 'SUCCESS',
          executionResult: { message: 'Action was already applied previously.' },
          createdAt: new Date()
        }
      };
    }

    // Approval requirement
    if (action.status !== 'APPROVED' && !options?.force) {
      throw new Error(
        `Optimization action "${id}" cannot be applied because its status is "${action.status}". Human approval is required before applying optimization actions.`
      );
    }

    const executedBy = options?.executedBy || 'SYSTEM';
    const executionDetails: Record<string, unknown> = {
      actionType: action.actionType,
      targetEntity: action.targetEntity,
      appliedAt: new Date().toISOString()
    };
    const actionMeta = (action.metadata as Record<string, unknown>) || {};

    try {
      // Execute based on actionType
      switch (action.actionType) {
        case 'CHANGE_HOOK': {
          if (action.reelId) {
            const reel = await this.reelPlanRepo.findByIdAndWorkspace(action.reelId, workspaceId);
            if (reel) {
              const updatedHook = {
                ...reel.hook,
                text: (actionMeta.newHookText as string) || action.reason || reel.hook.text
              };
              await this.reelPlanRepo.update(reel.id, { hook: updatedHook });
              executionDetails.modifiedReelId = reel.id;
              executionDetails.updatedHook = updatedHook;
            }
          }
          break;
        }

        case 'CHANGE_CTA': {
          if (action.reelId) {
            const reel = await this.reelPlanRepo.findByIdAndWorkspace(action.reelId, workspaceId);
            if (reel) {
              const updatedCta = {
                ...reel.cta,
                text: (actionMeta.newCtaText as string) || action.reason || reel.cta.text
              };
              await this.reelPlanRepo.update(reel.id, { cta: updatedCta });
              executionDetails.modifiedReelId = reel.id;
              executionDetails.updatedCta = updatedCta;
            }
          }
          break;
        }

        case 'CHANGE_DURATION': {
          if (action.reelId) {
            const reel = await this.reelPlanRepo.findByIdAndWorkspace(action.reelId, workspaceId);
            if (reel) {
              const newDuration = (actionMeta.newDuration as number) || 30;
              await this.reelPlanRepo.update(reel.id, { durationSeconds: newDuration });
              executionDetails.modifiedReelId = reel.id;
              executionDetails.updatedDuration = newDuration;
            }
          }
          break;
        }

        case 'CREATE_VARIANT': {
          if (action.reelId) {
            const reel = await this.reelPlanRepo.findByIdAndWorkspace(action.reelId, workspaceId);
            if (reel) {
              const variantPlan = await this.reelPlanRepo.create({
                contentJobId: reel.contentJobId,
                brandId: action.brandId,
                campaignId: action.campaignId || reel.campaignId || null,
                contentPlanId: reel.contentPlanId,
                workspaceId,
                title: `${reel.title} (Optimized Variant)`,
                concept: reel.concept,
                objective: reel.objective,
                audience: reel.audience,
                funnelStage: reel.funnelStage,
                contentPillar: reel.contentPillar,
                durationSeconds: reel.durationSeconds,
                aspectRatio: reel.aspectRatio,
                platform: reel.platform,
                format: reel.format,
                hook: reel.hook,
                narrative: reel.narrative,
                script: reel.script,
                scenes: reel.scenes,
                visualDirection: reel.visualDirection,
                voiceDirection: reel.voiceDirection,
                captionDirection: reel.captionDirection,
                animationDirection: reel.animationDirection,
                audioDirection: reel.audioDirection,
                cta: reel.cta,
                productionMetadata: reel.productionMetadata,
                status: 'READY'
              });
              executionDetails.createdVariantReelId = variantPlan.id;
            }
          }
          break;
        }

        case 'PAUSE_RECOMMENDATION':
        case 'RECOMMEND_BUDGET_CHANGE':
        case 'RECOMMEND_AUDIENCE_CHANGE':
        case 'RECOMMEND_PLACEMENT_CHANGE':
        case 'REPLACE_CREATIVE':
        case 'CHANGE_CONTENT_PILLAR':
        case 'CHANGE_MESSAGING_ANGLE':
        case 'CHANGE_VISUAL_STYLE':
        default: {
          // Strategic guidance recorded as applied directive
          executionDetails.directiveApplied = true;
          executionDetails.guidanceNotes = action.expectedImpact;
          break;
        }
      }

      const updatedAction = await this.actionRepo.updateStatus(id, workspaceId, 'APPLIED', {
        appliedAt: new Date(),
        metadata: { ...actionMeta, executionDetails }
      });

      const historyRecord = await this.actionRepo.createExecutionHistory(
        workspaceId,
        action.brandId,
        action.id,
        executedBy,
        'SUCCESS',
        executionDetails
      );

      return {
        action: updatedAction || action,
        executionHistory: historyRecord
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.actionRepo.updateStatus(id, workspaceId, 'FAILED', {
        metadata: { ...actionMeta, failureReason: errorMsg }
      });

      await this.actionRepo.createExecutionHistory(
        workspaceId,
        action.brandId,
        action.id,
        executedBy,
        'FAILED',
        { error: errorMsg }
      );

      throw new Error(`Failed to apply optimization action "${id}": ${errorMsg}`);
    }
  }

  async listExecutionHistory(actionId: string, workspaceId: string): Promise<OptimizationExecutionHistoryRecord[]> {
    return this.actionRepo.listExecutionHistory(actionId, workspaceId);
  }
}
