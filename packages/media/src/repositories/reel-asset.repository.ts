import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { reelAssets, type ReelAssetRow } from '@vidsnapai/database';
import type { ReelAsset, ReelAssetType } from '@vidsnapai/types';

export class ReelAssetRepository {
  constructor(private db: Database) {}

  private mapRowToEntity(row: ReelAssetRow): ReelAsset {
    return {
      id: row.id,
      reelPlanId: row.reelPlanId,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      sceneNumber: row.sceneNumber,
      assetType: row.assetType as ReelAsset['assetType'],
      sourceType: row.sourceType as ReelAsset['sourceType'],
      provider: row.provider,
      providerAssetId: row.providerAssetId,
      sourceUrl: row.sourceUrl,
      previewUrl: row.previewUrl,
      storageKey: row.storageKey,
      filename: row.filename,
      mimeType: row.mimeType,
      width: row.width,
      height: row.height,
      durationSeconds: row.durationSeconds,
      metadata: (row.metadata as Record<string, unknown>) || {},
      licenseMetadata: (row.licenseMetadata as Record<string, unknown>) || {},
      status: row.status as ReelAsset['status'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async create(data: Omit<ReelAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReelAsset> {
    if (!this.db || typeof this.db.insert !== 'function') {
      return {
        id: `mock-asset-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    const [row] = await this.db
      .insert(reelAssets)
      .values({
        reelPlanId: data.reelPlanId,
        workspaceId: data.workspaceId,
        brandId: data.brandId,
        sceneNumber: data.sceneNumber ?? null,
        assetType: data.assetType,
        sourceType: data.sourceType,
        provider: data.provider,
        providerAssetId: data.providerAssetId ?? null,
        sourceUrl: data.sourceUrl ?? null,
        previewUrl: data.previewUrl ?? null,
        storageKey: data.storageKey ?? null,
        filename: data.filename ?? null,
        mimeType: data.mimeType ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        durationSeconds: data.durationSeconds ?? null,
        metadata: data.metadata,
        licenseMetadata: data.licenseMetadata,
        status: data.status
      })
      .returning();

    return this.mapRowToEntity(row);
  }

  async createMany(
    items: Array<Omit<ReelAsset, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ReelAsset[]> {
    if (items.length === 0) return [];

    const rows = await this.db
      .insert(reelAssets)
      .values(
        items.map((data) => ({
          reelPlanId: data.reelPlanId,
          workspaceId: data.workspaceId,
          brandId: data.brandId,
          sceneNumber: data.sceneNumber ?? null,
          assetType: data.assetType,
          sourceType: data.sourceType,
          provider: data.provider,
          providerAssetId: data.providerAssetId ?? null,
          sourceUrl: data.sourceUrl ?? null,
          previewUrl: data.previewUrl ?? null,
          storageKey: data.storageKey ?? null,
          filename: data.filename ?? null,
          mimeType: data.mimeType ?? null,
          width: data.width ?? null,
          height: data.height ?? null,
          durationSeconds: data.durationSeconds ?? null,
          metadata: data.metadata,
          licenseMetadata: data.licenseMetadata,
          status: data.status
        }))
      )
      .returning();

    return rows.map((r) => this.mapRowToEntity(r));
  }

  async findById(id: string): Promise<ReelAsset | null> {
    const [row] = await this.db
      .select()
      .from(reelAssets)
      .where(eq(reelAssets.id, id))
      .limit(1);

    return row ? this.mapRowToEntity(row) : null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<ReelAsset | null> {
    const [row] = await this.db
      .select()
      .from(reelAssets)
      .where(and(eq(reelAssets.id, id), eq(reelAssets.workspaceId, workspaceId)))
      .limit(1);

    return row ? this.mapRowToEntity(row) : null;
  }

  async listByReelPlanId(reelPlanId: string): Promise<ReelAsset[]> {
    const rows = await this.db
      .select()
      .from(reelAssets)
      .where(eq(reelAssets.reelPlanId, reelPlanId))
      .orderBy(reelAssets.sceneNumber, desc(reelAssets.createdAt));

    return rows.map((r) => this.mapRowToEntity(r));
  }

  async listByBrandId(brandId: string, assetType?: ReelAssetType): Promise<ReelAsset[]> {
    const conditions = [eq(reelAssets.brandId, brandId)];
    if (assetType) {
      conditions.push(eq(reelAssets.assetType, assetType));
    }

    const rows = await this.db
      .select()
      .from(reelAssets)
      .where(and(...conditions))
      .orderBy(desc(reelAssets.createdAt));

    return rows.map((r) => this.mapRowToEntity(r));
  }

  async findBySceneNumber(reelPlanId: string, sceneNumber: number): Promise<ReelAsset[]> {
    const rows = await this.db
      .select()
      .from(reelAssets)
      .where(
        and(
          eq(reelAssets.reelPlanId, reelPlanId),
          eq(reelAssets.sceneNumber, sceneNumber)
        )
      )
      .orderBy(desc(reelAssets.createdAt));

    return rows.map((r) => this.mapRowToEntity(r));
  }

  async update(
    id: string,
    workspaceId: string,
    data: Partial<ReelAsset>
  ): Promise<ReelAsset | null> {
    const updateValues: Partial<ReelAssetRow> = {
      updatedAt: new Date()
    };

    if (data.status) updateValues.status = data.status;
    if (data.sceneNumber !== undefined) updateValues.sceneNumber = data.sceneNumber;
    if (data.sourceUrl !== undefined) updateValues.sourceUrl = data.sourceUrl;
    if (data.previewUrl !== undefined) updateValues.previewUrl = data.previewUrl;
    if (data.storageKey !== undefined) updateValues.storageKey = data.storageKey;
    if (data.filename !== undefined) updateValues.filename = data.filename;
    if (data.metadata !== undefined) updateValues.metadata = data.metadata;
    if (data.licenseMetadata !== undefined) updateValues.licenseMetadata = data.licenseMetadata;
    if (data.width !== undefined) updateValues.width = data.width;
    if (data.height !== undefined) updateValues.height = data.height;
    if (data.durationSeconds !== undefined) updateValues.durationSeconds = data.durationSeconds;

    const [row] = await this.db
      .update(reelAssets)
      .set(updateValues)
      .where(and(eq(reelAssets.id, id), eq(reelAssets.workspaceId, workspaceId)))
      .returning();

    return row ? this.mapRowToEntity(row) : null;
  }

  async delete(id: string, workspaceId: string): Promise<boolean> {
    const [row] = await this.db
      .delete(reelAssets)
      .where(and(eq(reelAssets.id, id), eq(reelAssets.workspaceId, workspaceId)))
      .returning({ id: reelAssets.id });

    return !!row;
  }

  async deleteForScene(reelPlanId: string, sceneNumber: number): Promise<number> {
    const rows = await this.db
      .delete(reelAssets)
      .where(
        and(
          eq(reelAssets.reelPlanId, reelPlanId),
          eq(reelAssets.sceneNumber, sceneNumber)
        )
      )
      .returning({ id: reelAssets.id });

    return rows.length;
  }

  async deleteForReelPlan(reelPlanId: string): Promise<number> {
    const rows = await this.db
      .delete(reelAssets)
      .where(eq(reelAssets.reelPlanId, reelPlanId))
      .returning({ id: reelAssets.id });

    return rows.length;
  }
}
