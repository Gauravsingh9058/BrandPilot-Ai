import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { socialPublications, type SocialPublicationRow, type NewSocialPublicationRow } from '@vidsnapai/database';
import type {
  SocialPublicationRecord,
  PublishingPlatform,
  PublishingStatus
} from '@vidsnapai/types';

export class SocialPublicationRepository {
  constructor(private db: Database) {}

  async create(data: {
    reelPlanId: string;
    workspaceId: string;
    brandId: string;
    platform: PublishingPlatform;
    status?: PublishingStatus;
    scheduledAt?: Date;
    payload?: Record<string, unknown>;
  }): Promise<SocialPublicationRecord> {
    const insertData: NewSocialPublicationRow = {
      reelPlanId: data.reelPlanId,
      workspaceId: data.workspaceId,
      brandId: data.brandId,
      platform: data.platform,
      status: data.status || 'PENDING',
      scheduledAt: data.scheduledAt,
      payload: data.payload || {},
      attemptCount: 0
    };

    const [row] = await this.db.insert(socialPublications).values(insertData).returning();
    return this.mapRow(row);
  }

  async findById(id: string, workspaceId: string): Promise<SocialPublicationRecord | null> {
    const rows = await this.db
      .select()
      .from(socialPublications)
      .where(and(eq(socialPublications.id, id), eq(socialPublications.workspaceId, workspaceId)));
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  async listByReelPlanId(reelPlanId: string, workspaceId: string): Promise<SocialPublicationRecord[]> {
    const rows = await this.db
      .select()
      .from(socialPublications)
      .where(and(eq(socialPublications.reelPlanId, reelPlanId), eq(socialPublications.workspaceId, workspaceId)))
      .orderBy(desc(socialPublications.createdAt));
    return rows.map((r) => this.mapRow(r));
  }

  async updateStatus(
    id: string,
    workspaceId: string,
    data: {
      status: PublishingStatus;
      publishedAt?: Date;
      externalPostId?: string;
      externalUrl?: string;
      errorCode?: string;
      errorMessage?: string;
      incrementAttempt?: boolean;
    }
  ): Promise<SocialPublicationRecord | null> {
    const existing = await this.findById(id, workspaceId);
    if (!existing) return null;

    const updates: Partial<NewSocialPublicationRow> = {
      status: data.status,
      updatedAt: new Date()
    };

    if (data.publishedAt !== undefined) updates.publishedAt = data.publishedAt;
    if (data.externalPostId !== undefined) updates.externalPostId = data.externalPostId;
    if (data.externalUrl !== undefined) updates.externalUrl = data.externalUrl;
    if (data.errorCode !== undefined) updates.errorCode = data.errorCode;
    if (data.errorMessage !== undefined) updates.errorMessage = data.errorMessage;
    if (data.incrementAttempt) updates.attemptCount = (existing.attemptCount || 0) + 1;

    const [row] = await this.db
      .update(socialPublications)
      .set(updates)
      .where(and(eq(socialPublications.id, id), eq(socialPublications.workspaceId, workspaceId)))
      .returning();

    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: SocialPublicationRow): SocialPublicationRecord {
    return {
      id: row.id,
      reelPlanId: row.reelPlanId,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      platform: row.platform as PublishingPlatform,
      status: row.status as PublishingStatus,
      scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : undefined,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : undefined,
      externalPostId: row.externalPostId || undefined,
      externalUrl: row.externalUrl || undefined,
      errorCode: row.errorCode || undefined,
      errorMessage: row.errorMessage || undefined,
      attemptCount: row.attemptCount,
      payload: (row.payload as any) || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}
