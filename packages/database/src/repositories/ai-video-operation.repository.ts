import { eq, desc } from 'drizzle-orm';
import type { Database } from '../client.js';
import { aiVideoOperations, type AIVideoOperationRow } from '../schema/index.js';
import type { AIVideoOperationRecord, VeoOperationStatus } from '@vidsnapai/types';

export function mapAIVideoOperationRow(row: AIVideoOperationRow): AIVideoOperationRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    provider: row.provider,
    model: row.model,
    operationId: row.operationId,
    reelPlanId: row.reelPlanId,
    sceneNumber: row.sceneNumber,
    status: row.status as VeoOperationStatus,
    prompt: row.prompt,
    referenceAssetIds: row.referenceAssetIds ?? [],
    outputStorageKey: row.outputStorageKey,
    outputUrl: row.outputUrl,
    metadata: row.metadata ?? {},
    error: row.error ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt
  };
}

export class AIVideoOperationRepository {
  constructor(private db: Database) {}

  async create(data: {
    workspaceId?: string | null;
    provider?: string;
    model: string;
    operationId: string;
    reelPlanId?: string | null;
    sceneNumber?: number | null;
    status?: VeoOperationStatus;
    prompt: string;
    referenceAssetIds?: string[];
    outputStorageKey?: string | null;
    outputUrl?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<AIVideoOperationRecord> {
    const [inserted] = await this.db
      .insert(aiVideoOperations)
      .values({
        workspaceId: data.workspaceId ?? null,
        provider: data.provider ?? 'google-veo',
        model: data.model,
        operationId: data.operationId,
        reelPlanId: data.reelPlanId ?? null,
        sceneNumber: data.sceneNumber ?? null,
        status: data.status ?? 'SUBMITTED',
        prompt: data.prompt,
        referenceAssetIds: data.referenceAssetIds ?? [],
        outputStorageKey: data.outputStorageKey ?? null,
        outputUrl: data.outputUrl ?? null,
        metadata: data.metadata ?? {}
      })
      .returning();
    return mapAIVideoOperationRow(inserted);
  }

  async findByOperationId(operationId: string): Promise<AIVideoOperationRecord | null> {
    const [found] = await this.db
      .select()
      .from(aiVideoOperations)
      .where(eq(aiVideoOperations.operationId, operationId))
      .limit(1);
    return found ? mapAIVideoOperationRow(found) : null;
  }

  async findById(id: string): Promise<AIVideoOperationRecord | null> {
    const [found] = await this.db
      .select()
      .from(aiVideoOperations)
      .where(eq(aiVideoOperations.id, id))
      .limit(1);
    return found ? mapAIVideoOperationRow(found) : null;
  }

  async updateStatus(
    operationId: string,
    updates: {
      status: VeoOperationStatus;
      outputStorageKey?: string | null;
      outputUrl?: string | null;
      error?: Record<string, unknown> | null;
      metadata?: Record<string, unknown>;
      completedAt?: Date | null;
    }
  ): Promise<AIVideoOperationRecord | null> {
    const setValues: Record<string, unknown> = {
      status: updates.status,
      updatedAt: new Date()
    };
    if (updates.outputStorageKey !== undefined) setValues.outputStorageKey = updates.outputStorageKey;
    if (updates.outputUrl !== undefined) setValues.outputUrl = updates.outputUrl;
    if (updates.error !== undefined) setValues.error = updates.error;
    if (updates.metadata !== undefined) setValues.metadata = updates.metadata;
    if (updates.completedAt !== undefined) {
      setValues.completedAt = updates.completedAt;
    } else if (updates.status === 'COMPLETED' || updates.status === 'FAILED') {
      setValues.completedAt = new Date();
    }

    const [updated] = await this.db
      .update(aiVideoOperations)
      .set(setValues)
      .where(eq(aiVideoOperations.operationId, operationId))
      .returning();

    return updated ? mapAIVideoOperationRow(updated) : null;
  }

  async listByReelPlanId(reelPlanId: string): Promise<AIVideoOperationRecord[]> {
    const rows = await this.db
      .select()
      .from(aiVideoOperations)
      .where(eq(aiVideoOperations.reelPlanId, reelPlanId))
      .orderBy(desc(aiVideoOperations.createdAt));
    return rows.map(mapAIVideoOperationRow);
  }

  async listByWorkspace(workspaceId: string, limit: number = 50): Promise<AIVideoOperationRecord[]> {
    const rows = await this.db
      .select()
      .from(aiVideoOperations)
      .where(eq(aiVideoOperations.workspaceId, workspaceId))
      .orderBy(desc(aiVideoOperations.createdAt))
      .limit(limit);
    return rows.map(mapAIVideoOperationRow);
  }
}
