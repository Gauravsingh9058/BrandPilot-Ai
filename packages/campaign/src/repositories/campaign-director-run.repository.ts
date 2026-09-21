import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { campaignDirectorRuns, type CampaignDirectorRunRow } from '@vidsnapai/database';
import type { CampaignDirectorRunRecord } from '@vidsnapai/types';

export class CampaignDirectorRunRepository {
  constructor(private db: Database) {}

  private mapToDomain(row: CampaignDirectorRunRow): CampaignDirectorRunRecord {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      campaignId: row.campaignId || undefined,
      summary: row.summary,
      winningPatterns: (row.winningPatterns as any[]) || [],
      weakPatterns: (row.weakPatterns as any[]) || [],
      strategicDirectives: (row.strategicDirectives as any[]) || [],
      contentRequirements: (row.contentRequirements as any[]) || [],
      proposedActionIds: (row.proposedActionIds as string[]) || [],
      createdAt: new Date(row.createdAt)
    };
  }

  async create(
    workspaceId: string,
    data: {
      brandId: string;
      campaignId?: string | null;
      summary: string;
      winningPatterns: any[];
      weakPatterns: any[];
      strategicDirectives: any[];
      contentRequirements: any[];
      proposedActionIds?: string[];
    }
  ): Promise<CampaignDirectorRunRecord> {
    const [row] = await this.db
      .insert(campaignDirectorRuns)
      .values({
        workspaceId,
        brandId: data.brandId,
        campaignId: data.campaignId || null,
        summary: data.summary,
        winningPatterns: data.winningPatterns,
        weakPatterns: data.weakPatterns,
        strategicDirectives: data.strategicDirectives,
        contentRequirements: data.contentRequirements,
        proposedActionIds: data.proposedActionIds || []
      })
      .returning();

    return this.mapToDomain(row);
  }

  async findLatestByBrand(brandId: string, workspaceId: string): Promise<CampaignDirectorRunRecord | null> {
    const [row] = await this.db
      .select()
      .from(campaignDirectorRuns)
      .where(and(eq(campaignDirectorRuns.brandId, brandId), eq(campaignDirectorRuns.workspaceId, workspaceId)))
      .orderBy(desc(campaignDirectorRuns.createdAt))
      .limit(1);

    return row ? this.mapToDomain(row) : null;
  }

  async list(brandId: string, workspaceId: string): Promise<CampaignDirectorRunRecord[]> {
    const rows = await this.db
      .select()
      .from(campaignDirectorRuns)
      .where(and(eq(campaignDirectorRuns.brandId, brandId), eq(campaignDirectorRuns.workspaceId, workspaceId)))
      .orderBy(desc(campaignDirectorRuns.createdAt));

    return rows.map((r) => this.mapToDomain(r));
  }
}
