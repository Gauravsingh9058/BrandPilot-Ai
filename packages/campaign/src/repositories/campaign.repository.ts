import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { campaigns, type CampaignRow, type NewCampaignRow } from '@vidsnapai/database';
import type {
  Campaign,
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignStrategy,
  CampaignStatus
} from '@vidsnapai/types';

export function mapCampaignRow(row: CampaignRow): Campaign {
  return {
    id: row.id,
    brandId: row.brandId,
    name: row.name,
    description: row.description,
    objective: row.objective,
    status: row.status as CampaignStatus,
    startDate: row.startDate,
    endDate: row.endDate,
    targetAudience: (row.targetAudience as Record<string, unknown>) || {},
    coreMessage: row.coreMessage,
    offer: row.offer,
    primaryCta: row.primaryCta,
    contentPillars: (row.contentPillars as string[]) || [],
    channels: (row.channels as string[]) || [],
    campaignStrategy: (row.campaignStrategy as CampaignStrategy) || null,
    strategyVersion: row.strategyVersion || 0,
    kpis: (row.kpis as Record<string, unknown>) || {},
    guardrails: (row.guardrails as Record<string, unknown>) || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class CampaignRepository {
  constructor(private db: Database) {}

  async create(brandId: string, input: CreateCampaignInput): Promise<Campaign> {
    const values: NewCampaignRow = {
      brandId,
      name: input.name,
      description: input.description,
      objective: input.objective,
      status: input.status || 'DRAFT',
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      targetAudience: input.targetAudience || {},
      coreMessage: input.coreMessage || null,
      offer: input.offer || null,
      primaryCta: input.primaryCta || null,
      contentPillars: input.contentPillars || [],
      channels: input.channels || [],
      campaignStrategy: null,
      strategyVersion: 0,
      kpis: input.kpis || {},
      guardrails: input.guardrails || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [inserted] = await this.db.insert(campaigns).values(values).returning();
    return mapCampaignRow(inserted);
  }

  async findByIdAndBrand(campaignId: string, brandId: string): Promise<Campaign | null> {
    const [found] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.brandId, brandId)))
      .limit(1);

    return found ? mapCampaignRow(found) : null;
  }

  async listForBrand(brandId: string): Promise<Campaign[]> {
    const rows = await this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.brandId, brandId))
      .orderBy(desc(campaigns.createdAt));

    return rows.map(mapCampaignRow);
  }

  async update(campaignId: string, brandId: string, input: UpdateCampaignInput): Promise<Campaign | null> {
    const updateValues: Partial<NewCampaignRow> = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.objective !== undefined && { objective: input.objective }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate ? new Date(input.startDate) : null }),
      ...(input.endDate !== undefined && { endDate: input.endDate ? new Date(input.endDate) : null }),
      ...(input.targetAudience !== undefined && { targetAudience: input.targetAudience }),
      ...(input.coreMessage !== undefined && { coreMessage: input.coreMessage }),
      ...(input.offer !== undefined && { offer: input.offer }),
      ...(input.primaryCta !== undefined && { primaryCta: input.primaryCta }),
      ...(input.contentPillars !== undefined && { contentPillars: input.contentPillars }),
      ...(input.channels !== undefined && { channels: input.channels }),
      ...(input.kpis !== undefined && { kpis: input.kpis }),
      ...(input.guardrails !== undefined && { guardrails: input.guardrails }),
      updatedAt: new Date()
    };

    const [updated] = await this.db
      .update(campaigns)
      .set(updateValues)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.brandId, brandId)))
      .returning();

    return updated ? mapCampaignRow(updated) : null;
  }

  async delete(campaignId: string, brandId: string): Promise<boolean> {
    const result = await this.db
      .delete(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.brandId, brandId)));

    return (result.rowCount ?? 0) > 0;
  }

  async updateStrategy(
    campaignId: string,
    brandId: string,
    strategy: CampaignStrategy,
    strategyVersion: number
  ): Promise<Campaign | null> {
    const [updated] = await this.db
      .update(campaigns)
      .set({
        campaignStrategy: strategy as any,
        strategyVersion,
        status: 'READY',
        updatedAt: new Date()
      })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.brandId, brandId)))
      .returning();

    return updated ? mapCampaignRow(updated) : null;
  }
}
