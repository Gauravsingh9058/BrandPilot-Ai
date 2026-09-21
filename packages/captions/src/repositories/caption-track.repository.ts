import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { captionTracks, type CaptionTrackRow } from '@vidsnapai/database';
import type { CaptionTrack, CaptionCue, CaptionStyleConfig } from '@vidsnapai/types';

export class CaptionTrackRepository {
  constructor(private db: Database) {}

  private mapRowToEntity(row: CaptionTrackRow): CaptionTrack {
    return {
      id: row.id,
      reelPlanId: row.reelPlanId,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      version: row.version,
      cues: (row.cues as CaptionCue[]) || [],
      style: (row.style as CaptionStyleConfig) || {},
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async create(data: Omit<CaptionTrack, 'id' | 'createdAt' | 'updatedAt'>): Promise<CaptionTrack> {
    const [row] = await this.db
      .insert(captionTracks)
      .values({
        reelPlanId: data.reelPlanId,
        workspaceId: data.workspaceId,
        brandId: data.brandId,
        version: data.version || 1,
        cues: data.cues,
        style: data.style,
        status: data.status || 'READY'
      })
      .returning();

    return this.mapRowToEntity(row);
  }

  async findLatestByReelPlanId(reelPlanId: string): Promise<CaptionTrack | null> {
    const [row] = await this.db
      .select()
      .from(captionTracks)
      .where(eq(captionTracks.reelPlanId, reelPlanId))
      .orderBy(desc(captionTracks.version), desc(captionTracks.createdAt))
      .limit(1);

    return row ? this.mapRowToEntity(row) : null;
  }

  async findById(id: string): Promise<CaptionTrack | null> {
    const [row] = await this.db
      .select()
      .from(captionTracks)
      .where(eq(captionTracks.id, id))
      .limit(1);

    return row ? this.mapRowToEntity(row) : null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<CaptionTrack | null> {
    const [row] = await this.db
      .select()
      .from(captionTracks)
      .where(and(eq(captionTracks.id, id), eq(captionTracks.workspaceId, workspaceId)))
      .limit(1);

    return row ? this.mapRowToEntity(row) : null;
  }

  async getNextVersionNumber(reelPlanId: string): Promise<number> {
    const latest = await this.findLatestByReelPlanId(reelPlanId);
    return latest ? latest.version + 1 : 1;
  }

  async update(
    id: string,
    workspaceId: string,
    data: Partial<CaptionTrack>
  ): Promise<CaptionTrack | null> {
    const updateValues: Partial<CaptionTrackRow> = {
      updatedAt: new Date()
    };

    if (data.cues !== undefined) updateValues.cues = data.cues;
    if (data.style !== undefined) updateValues.style = data.style;
    if (data.status !== undefined) updateValues.status = data.status;

    const [row] = await this.db
      .update(captionTracks)
      .set(updateValues)
      .where(and(eq(captionTracks.id, id), eq(captionTracks.workspaceId, workspaceId)))
      .returning();

    return row ? this.mapRowToEntity(row) : null;
  }

  async delete(id: string, workspaceId: string): Promise<boolean> {
    const [row] = await this.db
      .delete(captionTracks)
      .where(and(eq(captionTracks.id, id), eq(captionTracks.workspaceId, workspaceId)))
      .returning({ id: captionTracks.id });

    return !!row;
  }
}
