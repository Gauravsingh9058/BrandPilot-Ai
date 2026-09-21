import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { contentPlans, type ContentPlanRow, type NewContentPlanRow } from '@vidsnapai/database';
import type {
  ContentPlan,
  ContentPlanStatus,
  CreateContentPlanInput,
  UpdateContentPlanInput
} from '@vidsnapai/types';

export function mapContentPlanRow(row: ContentPlanRow): ContentPlan {
  return {
    id: row.id,
    brandId: row.brandId,
    campaignId: row.campaignId,
    workspaceId: row.workspaceId,
    name: row.name,
    objective: row.objective,
    startDate: row.startDate,
    endDate: row.endDate,
    durationDays: row.durationDays,
    status: row.status as ContentPlanStatus,
    version: row.version,
    planGroupId: row.planGroupId,
    strategySnapshot: (row.strategySnapshot as Record<string, unknown>) || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class ContentPlanRepository {
  constructor(private db: Database) {}

  async create(
    brandId: string,
    workspaceId: string,
    input: CreateContentPlanInput & {
      version?: number;
      planGroupId?: string;
      status?: ContentPlanStatus;
    }
  ): Promise<ContentPlan> {
    const version = input.version ?? 1;
    const planGroupId = input.planGroupId;
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const durationDays = input.durationDays ?? 30;
    const endDate = input.endDate
      ? new Date(input.endDate)
      : new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const values: NewContentPlanRow = {
      brandId,
      workspaceId,
      campaignId: input.campaignId || null,
      name: input.name,
      objective: input.objective,
      startDate,
      endDate,
      durationDays,
      version,
      ...(planGroupId ? { planGroupId } : {}),
      status: input.status || 'DRAFT',
      strategySnapshot: input.strategySnapshot || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [inserted] = await this.db.insert(contentPlans).values(values).returning();
    return mapContentPlanRow(inserted);
  }

  async findById(planId: string): Promise<ContentPlan | null> {
    const [found] = await this.db
      .select()
      .from(contentPlans)
      .where(eq(contentPlans.id, planId))
      .limit(1);

    return found ? mapContentPlanRow(found) : null;
  }

  async findByIdAndWorkspace(planId: string, workspaceId: string): Promise<ContentPlan | null> {
    const [found] = await this.db
      .select()
      .from(contentPlans)
      .where(and(eq(contentPlans.id, planId), eq(contentPlans.workspaceId, workspaceId)))
      .limit(1);

    return found ? mapContentPlanRow(found) : null;
  }

  async findByIdAndBrand(planId: string, brandId: string): Promise<ContentPlan | null> {
    const [found] = await this.db
      .select()
      .from(contentPlans)
      .where(and(eq(contentPlans.id, planId), eq(contentPlans.brandId, brandId)))
      .limit(1);

    return found ? mapContentPlanRow(found) : null;
  }

  async listForBrand(brandId: string, campaignId?: string): Promise<ContentPlan[]> {
    const conditions = [eq(contentPlans.brandId, brandId)];
    if (campaignId) {
      conditions.push(eq(contentPlans.campaignId, campaignId));
    }

    const rows = await this.db
      .select()
      .from(contentPlans)
      .where(and(...conditions))
      .orderBy(desc(contentPlans.createdAt));

    return rows.map(mapContentPlanRow);
  }

  async findVersions(planGroupId: string, brandId: string): Promise<ContentPlan[]> {
    const rows = await this.db
      .select()
      .from(contentPlans)
      .where(and(eq(contentPlans.planGroupId, planGroupId), eq(contentPlans.brandId, brandId)))
      .orderBy(desc(contentPlans.version));

    return rows.map(mapContentPlanRow);
  }

  async getLatestVersion(planGroupId: string, brandId: string): Promise<number> {
    const rows = await this.db
      .select({ version: contentPlans.version })
      .from(contentPlans)
      .where(and(eq(contentPlans.planGroupId, planGroupId), eq(contentPlans.brandId, brandId)))
      .orderBy(desc(contentPlans.version))
      .limit(1);

    return rows[0]?.version ?? 0;
  }

  async update(planId: string, brandId: string, input: UpdateContentPlanInput): Promise<ContentPlan | null> {
    const updateValues: Partial<NewContentPlanRow> = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.objective !== undefined && { objective: input.objective }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
      ...(input.endDate !== undefined && { endDate: new Date(input.endDate) }),
      ...(input.strategySnapshot !== undefined && {
        strategySnapshot: input.strategySnapshot
      }),
      updatedAt: new Date()
    };

    const [updated] = await this.db
      .update(contentPlans)
      .set(updateValues)
      .where(and(eq(contentPlans.id, planId), eq(contentPlans.brandId, brandId)))
      .returning();

    return updated ? mapContentPlanRow(updated) : null;
  }

  async delete(planId: string, brandId: string): Promise<boolean> {
    const result = await this.db
      .delete(contentPlans)
      .where(and(eq(contentPlans.id, planId), eq(contentPlans.brandId, brandId)));

    return (result.rowCount ?? 0) > 0;
  }
}
