import { eq, and, desc } from 'drizzle-orm';
import {
  getDatabase,
  animationPlans,
  type Database,
  type AnimationPlanRow,
  type NewAnimationPlanRow
} from '@vidsnapai/database';
import type { AnimationPlan, AnimationStatus, SceneAnimation } from '@vidsnapai/types';

export class AnimationPlanRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  private mapRowToEntity(row: AnimationPlanRow): AnimationPlan {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      reelPlanId: row.reelPlanId,
      productionPackageId: row.productionPackageId,
      version: row.version,
      status: row.status as AnimationStatus,
      animationLanguage: row.animationLanguage as any,
      globalSettings: (row.globalSettings as any) || {},
      sceneAnimations: (row.sceneAnimations as any) || [],
      transitionPlan: (row.transitionPlan as any) || [],
      textAnimationPlan: (row.textAnimationPlan as any) || [],
      cameraPlan: (row.cameraPlan as any) || [],
      productAnimationPlan: (row.productAnimationPlan as any) || [],
      logoAnimationPlan: (row.logoAnimationPlan as any) || [],
      syncPlan: (row.syncPlan as any) || [],
      metadata: (row.metadata as any) || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async create(data: NewAnimationPlanRow): Promise<AnimationPlan> {
    const [row] = await this.db.insert(animationPlans).values(data).returning();
    return this.mapRowToEntity(row);
  }

  async getById(id: string, workspaceId: string): Promise<AnimationPlan | null> {
    const [row] = await this.db
      .select()
      .from(animationPlans)
      .where(and(eq(animationPlans.id, id), eq(animationPlans.workspaceId, workspaceId)))
      .limit(1);

    return row ? this.mapRowToEntity(row) : null;
  }

  async getLatestByReelPlanId(reelPlanId: string, workspaceId: string): Promise<AnimationPlan | null> {
    const [row] = await this.db
      .select()
      .from(animationPlans)
      .where(and(eq(animationPlans.reelPlanId, reelPlanId), eq(animationPlans.workspaceId, workspaceId)))
      .orderBy(desc(animationPlans.version))
      .limit(1);

    return row ? this.mapRowToEntity(row) : null;
  }

  async getHistoryByReelPlanId(reelPlanId: string, workspaceId: string): Promise<AnimationPlan[]> {
    const rows = await this.db
      .select()
      .from(animationPlans)
      .where(and(eq(animationPlans.reelPlanId, reelPlanId), eq(animationPlans.workspaceId, workspaceId)))
      .orderBy(desc(animationPlans.version));

    return rows.map((r) => this.mapRowToEntity(r));
  }

  async update(id: string, workspaceId: string, updates: Partial<NewAnimationPlanRow>): Promise<AnimationPlan | null> {
    const [row] = await this.db
      .update(animationPlans)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(eq(animationPlans.id, id), eq(animationPlans.workspaceId, workspaceId)))
      .returning();

    return row ? this.mapRowToEntity(row) : null;
  }

  async updateStatus(id: string, workspaceId: string, status: AnimationStatus): Promise<AnimationPlan | null> {
    const [row] = await this.db
      .update(animationPlans)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(and(eq(animationPlans.id, id), eq(animationPlans.workspaceId, workspaceId)))
      .returning();

    return row ? this.mapRowToEntity(row) : null;
  }

  async replaceScene(
    id: string,
    workspaceId: string,
    sceneNumber: number,
    updatedScene: SceneAnimation
  ): Promise<AnimationPlan | null> {
    const existing = await this.getById(id, workspaceId);
    if (!existing) return null;

    const scenes = existing.sceneAnimations.map((s: SceneAnimation) => (s.sceneNumber === sceneNumber ? updatedScene : s));

    return this.update(id, workspaceId, {
      sceneAnimations: scenes as any
    });
  }

  async createVersion(
    reelPlanId: string,
    workspaceId: string,
    brandId: string,
    productionPackageId: string,
    planData: Omit<NewAnimationPlanRow, 'id' | 'workspaceId' | 'brandId' | 'reelPlanId' | 'productionPackageId' | 'version' | 'createdAt' | 'updatedAt'>
  ): Promise<AnimationPlan> {
    const latest = await this.getLatestByReelPlanId(reelPlanId, workspaceId);
    const nextVersion = latest ? latest.version + 1 : 1;

    // Mark prior version as SUPERSEDED if exists
    if (latest && latest.status !== 'FAILED') {
      await this.db
        .update(animationPlans)
        .set({ status: 'SUPERSEDED', updatedAt: new Date() })
        .where(eq(animationPlans.id, latest.id));
    }

    const [row] = await this.db
      .insert(animationPlans)
      .values({
        workspaceId,
        brandId,
        reelPlanId,
        productionPackageId,
        version: nextVersion,
        ...planData
      })
      .returning();

    return this.mapRowToEntity(row);
  }
}
