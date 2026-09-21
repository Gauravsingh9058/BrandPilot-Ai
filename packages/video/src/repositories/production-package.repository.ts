import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { reelProductionPackages, type ReelProductionPackageRow } from '@vidsnapai/database';
import type { ReelProductionPackage, ProductionReadiness } from '@vidsnapai/types';

export class ProductionPackageRepository {
  constructor(private db: Database) {}

  private mapRowToEntity(row: ReelProductionPackageRow): ReelProductionPackage {
    return {
      id: row.id,
      reelPlanId: row.reelPlanId,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      readiness: row.readiness as ProductionReadiness,
      packagePayload: row.packagePayload as ReelProductionPackage['packagePayload'],
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async createOrUpdate(
    data: Omit<ReelProductionPackage, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ReelProductionPackage> {
    const existing = await this.findByReelPlanId(data.reelPlanId);

    if (existing) {
      const [row] = await this.db
        .update(reelProductionPackages)
        .set({
          readiness: data.readiness,
          packagePayload: data.packagePayload,
          status: data.status,
          updatedAt: new Date()
        })
        .where(eq(reelProductionPackages.id, existing.id))
        .returning();

      return this.mapRowToEntity(row);
    }

    const [row] = await this.db
      .insert(reelProductionPackages)
      .values({
        reelPlanId: data.reelPlanId,
        workspaceId: data.workspaceId,
        brandId: data.brandId,
        readiness: data.readiness,
        packagePayload: data.packagePayload,
        status: data.status || 'DRAFT'
      })
      .returning();

    return this.mapRowToEntity(row);
  }

  async findByReelPlanId(reelPlanId: string): Promise<ReelProductionPackage | null> {
    const [row] = await this.db
      .select()
      .from(reelProductionPackages)
      .where(eq(reelProductionPackages.reelPlanId, reelPlanId))
      .orderBy(desc(reelProductionPackages.createdAt))
      .limit(1);

    return row ? this.mapRowToEntity(row) : null;
  }

  async findByIdAndWorkspace(
    id: string,
    workspaceId: string
  ): Promise<ReelProductionPackage | null> {
    const [row] = await this.db
      .select()
      .from(reelProductionPackages)
      .where(
        and(
          eq(reelProductionPackages.id, id),
          eq(reelProductionPackages.workspaceId, workspaceId)
        )
      )
      .limit(1);

    return row ? this.mapRowToEntity(row) : null;
  }
}
