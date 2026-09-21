import { eq, and, asc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { contentJobs, type ContentJobRow, type NewContentJobRow } from '@vidsnapai/database';
import type {
  ContentJob,
  ContentJobStatus,
  ContentJobPriority,
  ContentType,
  ContentFormat,
  ContentPlatform,
  UpdateContentJobInput
} from '@vidsnapai/types';

export function mapContentJobRow(row: ContentJobRow): ContentJob {
  return {
    id: row.id,
    contentPlanId: row.contentPlanId,
    brandId: row.brandId,
    campaignId: row.campaignId,
    workspaceId: row.workspaceId,
    dayNumber: row.dayNumber,
    scheduledDate: row.scheduledDate,
    title: row.title,
    contentType: row.contentType as ContentType,
    funnelStage: row.funnelStage as 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION',
    contentPillar: row.contentPillar,
    objective: row.objective,
    audience: row.audience,
    topic: row.topic,
    hook: row.hook,
    keyMessage: row.keyMessage,
    messagingAngle: row.messagingAngle,
    offer: row.offer,
    cta: row.cta,
    platform: row.platform as ContentPlatform,
    format: row.format as ContentFormat,
    priority: row.priority as ContentJobPriority,
    status: row.status as ContentJobStatus,
    strategy: (row.strategy as Record<string, unknown>) || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class ContentJobRepository {
  constructor(private db: Database) {}

  async create(
    contentPlanId: string,
    brandId: string,
    workspaceId: string,
    input: Omit<NewContentJobRow, 'contentPlanId' | 'brandId' | 'workspaceId' | 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ContentJob> {
    const values: NewContentJobRow = {
      ...input,
      contentPlanId,
      brandId,
      workspaceId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [inserted] = await this.db.insert(contentJobs).values(values).returning();
    return mapContentJobRow(inserted);
  }

  async createMany(
    contentPlanId: string,
    brandId: string,
    workspaceId: string,
    inputs: Array<Omit<NewContentJobRow, 'contentPlanId' | 'brandId' | 'workspaceId' | 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ContentJob[]> {
    if (inputs.length === 0) return [];

    const values: NewContentJobRow[] = inputs.map((input) => ({
      ...input,
      contentPlanId,
      brandId,
      workspaceId,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const rows = await this.db.insert(contentJobs).values(values).returning();
    return rows.map(mapContentJobRow).sort((a, b) => a.dayNumber - b.dayNumber);
  }

  async findById(jobId: string): Promise<ContentJob | null> {
    const [found] = await this.db
      .select()
      .from(contentJobs)
      .where(eq(contentJobs.id, jobId))
      .limit(1);

    return found ? mapContentJobRow(found) : null;
  }

  async findByIdAndPlan(jobId: string, contentPlanId: string): Promise<ContentJob | null> {
    const [found] = await this.db
      .select()
      .from(contentJobs)
      .where(and(eq(contentJobs.id, jobId), eq(contentJobs.contentPlanId, contentPlanId)))
      .limit(1);

    return found ? mapContentJobRow(found) : null;
  }

  async listForPlan(
    contentPlanId: string,
    filter?: {
      status?: ContentJobStatus;
      contentType?: ContentType;
      format?: ContentFormat;
      funnelStage?: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION';
    }
  ): Promise<ContentJob[]> {
    const conditions = [eq(contentJobs.contentPlanId, contentPlanId)];

    if (filter?.status) {
      conditions.push(eq(contentJobs.status, filter.status));
    }
    if (filter?.contentType) {
      conditions.push(eq(contentJobs.contentType, filter.contentType));
    }
    if (filter?.format) {
      conditions.push(eq(contentJobs.format, filter.format));
    }
    if (filter?.funnelStage) {
      conditions.push(eq(contentJobs.funnelStage, filter.funnelStage));
    }

    const rows = await this.db
      .select()
      .from(contentJobs)
      .where(and(...conditions))
      .orderBy(asc(contentJobs.dayNumber));

    return rows.map(mapContentJobRow);
  }

  async update(jobId: string, contentPlanId: string, input: UpdateContentJobInput): Promise<ContentJob | null> {
    const updateValues: Partial<NewContentJobRow> = {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.dayNumber !== undefined && { dayNumber: input.dayNumber }),
      ...(input.contentType !== undefined && { contentType: input.contentType }),
      ...(input.funnelStage !== undefined && { funnelStage: input.funnelStage }),
      ...(input.contentPillar !== undefined && { contentPillar: input.contentPillar }),
      ...(input.objective !== undefined && { objective: input.objective }),
      ...(input.audience !== undefined && { audience: input.audience }),
      ...(input.topic !== undefined && { topic: input.topic }),
      ...(input.hook !== undefined && { hook: input.hook }),
      ...(input.keyMessage !== undefined && { keyMessage: input.keyMessage }),
      ...(input.messagingAngle !== undefined && { messagingAngle: input.messagingAngle }),
      ...(input.offer !== undefined && { offer: input.offer }),
      ...(input.cta !== undefined && { cta: input.cta }),
      ...(input.platform !== undefined && { platform: input.platform }),
      ...(input.format !== undefined && { format: input.format }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scheduledDate !== undefined && { scheduledDate: new Date(input.scheduledDate) }),
      ...(input.strategy !== undefined && { strategy: input.strategy }),
      updatedAt: new Date()
    };

    const [updated] = await this.db
      .update(contentJobs)
      .set(updateValues)
      .where(and(eq(contentJobs.id, jobId), eq(contentJobs.contentPlanId, contentPlanId)))
      .returning();

    return updated ? mapContentJobRow(updated) : null;
  }

  async updateStatus(
    jobId: string,
    contentPlanId: string,
    status: ContentJobStatus
  ): Promise<ContentJob | null> {
    const [updated] = await this.db
      .update(contentJobs)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(and(eq(contentJobs.id, jobId), eq(contentJobs.contentPlanId, contentPlanId)))
      .returning();

    return updated ? mapContentJobRow(updated) : null;
  }

  async delete(jobId: string, contentPlanId: string): Promise<boolean> {
    const result = await this.db
      .delete(contentJobs)
      .where(and(eq(contentJobs.id, jobId), eq(contentJobs.contentPlanId, contentPlanId)));

    return (result.rowCount ?? 0) > 0;
  }

  async deleteForPlan(contentPlanId: string): Promise<number> {
    const result = await this.db
      .delete(contentJobs)
      .where(eq(contentJobs.contentPlanId, contentPlanId));

    return result.rowCount ?? 0;
  }

  async findApprovedForPlan(contentPlanId: string): Promise<ContentJob[]> {
    const rows = await this.db
      .select()
      .from(contentJobs)
      .where(and(eq(contentJobs.contentPlanId, contentPlanId), eq(contentJobs.status, 'READY')))
      .orderBy(asc(contentJobs.dayNumber));

    return rows.map(mapContentJobRow);
  }
}
