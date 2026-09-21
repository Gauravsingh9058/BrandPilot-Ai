import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import {
  optimizationActions,
  optimizationExecutionHistory,
  type OptimizationActionRow,
  type OptimizationExecutionHistoryRow
} from '@vidsnapai/database';
import type {
  OptimizationActionRecord,
  OptimizationActionStatus,
  OptimizationActionType,
  OptimizationExecutionHistoryRecord
} from '@vidsnapai/types';

export class OptimizationActionRepository {
  constructor(private db: Database) {}

  private mapActionToDomain(row: OptimizationActionRow): OptimizationActionRecord {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      campaignId: row.campaignId || undefined,
      reelId: row.reelId || undefined,
      actionType: row.actionType as OptimizationActionType,
      targetEntity: row.targetEntity,
      reason: row.reason,
      evidence: row.evidence,
      confidence: row.confidence,
      expectedImpact: row.expectedImpact,
      sourceMetrics: (row.sourceMetrics as Record<string, unknown>) || {},
      status: row.status as OptimizationActionStatus,
      appliedAt: row.appliedAt ? new Date(row.appliedAt) : null,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  private mapHistoryToDomain(row: OptimizationExecutionHistoryRow): OptimizationExecutionHistoryRecord {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      actionId: row.actionId,
      executedBy: row.executedBy,
      executionStatus: row.executionStatus as 'SUCCESS' | 'FAILED',
      executionResult: (row.executionResult as Record<string, unknown>) || {},
      createdAt: new Date(row.createdAt)
    };
  }

  async create(
    workspaceId: string,
    data: {
      brandId: string;
      campaignId?: string | null;
      reelId?: string | null;
      actionType: OptimizationActionType;
      targetEntity: string;
      reason: string;
      evidence: string;
      confidence?: number;
      expectedImpact: string;
      sourceMetrics?: Record<string, unknown>;
      status?: OptimizationActionStatus;
      metadata?: Record<string, unknown>;
    }
  ): Promise<OptimizationActionRecord> {
    const [row] = await this.db
      .insert(optimizationActions)
      .values({
        workspaceId,
        brandId: data.brandId,
        campaignId: data.campaignId || null,
        reelId: data.reelId || null,
        actionType: data.actionType,
        targetEntity: data.targetEntity,
        reason: data.reason,
        evidence: data.evidence,
        confidence: data.confidence ?? 0.85,
        expectedImpact: data.expectedImpact,
        sourceMetrics: data.sourceMetrics || {},
        status: data.status || 'PROPOSED',
        metadata: data.metadata || {}
      })
      .returning();

    return this.mapActionToDomain(row);
  }

  async findById(id: string, workspaceId: string): Promise<OptimizationActionRecord | null> {
    const [row] = await this.db
      .select()
      .from(optimizationActions)
      .where(and(eq(optimizationActions.id, id), eq(optimizationActions.workspaceId, workspaceId)))
      .limit(1);

    return row ? this.mapActionToDomain(row) : null;
  }

  async list(
    workspaceId: string,
    filters?: {
      brandId?: string;
      campaignId?: string;
      reelId?: string;
      status?: OptimizationActionStatus;
      actionType?: OptimizationActionType;
    }
  ): Promise<OptimizationActionRecord[]> {
    const conditions = [eq(optimizationActions.workspaceId, workspaceId)];

    if (filters?.brandId) {
      conditions.push(eq(optimizationActions.brandId, filters.brandId));
    }
    if (filters?.campaignId) {
      conditions.push(eq(optimizationActions.campaignId, filters.campaignId));
    }
    if (filters?.reelId) {
      conditions.push(eq(optimizationActions.reelId, filters.reelId));
    }
    if (filters?.status) {
      conditions.push(eq(optimizationActions.status, filters.status));
    }
    if (filters?.actionType) {
      conditions.push(eq(optimizationActions.actionType, filters.actionType));
    }

    const rows = await this.db
      .select()
      .from(optimizationActions)
      .where(and(...conditions))
      .orderBy(desc(optimizationActions.createdAt));

    return rows.map((r) => this.mapActionToDomain(r));
  }

  async updateStatus(
    id: string,
    workspaceId: string,
    status: OptimizationActionStatus,
    extra?: { appliedAt?: Date; metadata?: Record<string, unknown> }
  ): Promise<OptimizationActionRecord | null> {
    const updates: Partial<OptimizationActionRow> = {
      status,
      updatedAt: new Date()
    };
    if (extra?.appliedAt !== undefined) {
      updates.appliedAt = extra.appliedAt;
    }
    if (extra?.metadata) {
      updates.metadata = extra.metadata;
    }

    const [row] = await this.db
      .update(optimizationActions)
      .set(updates)
      .where(and(eq(optimizationActions.id, id), eq(optimizationActions.workspaceId, workspaceId)))
      .returning();

    return row ? this.mapActionToDomain(row) : null;
  }

  async createExecutionHistory(
    workspaceId: string,
    brandId: string,
    actionId: string,
    executedBy: string,
    executionStatus: 'SUCCESS' | 'FAILED',
    executionResult: Record<string, unknown>
  ): Promise<OptimizationExecutionHistoryRecord> {
    const [row] = await this.db
      .insert(optimizationExecutionHistory)
      .values({
        workspaceId,
        brandId,
        actionId,
        executedBy,
        executionStatus,
        executionResult
      })
      .returning();

    return this.mapHistoryToDomain(row);
  }

  async listExecutionHistory(actionId: string, workspaceId: string): Promise<OptimizationExecutionHistoryRecord[]> {
    const rows = await this.db
      .select()
      .from(optimizationExecutionHistory)
      .where(
        and(
          eq(optimizationExecutionHistory.actionId, actionId),
          eq(optimizationExecutionHistory.workspaceId, workspaceId)
        )
      )
      .orderBy(desc(optimizationExecutionHistory.createdAt));

    return rows.map((r) => this.mapHistoryToDomain(r));
  }
}
