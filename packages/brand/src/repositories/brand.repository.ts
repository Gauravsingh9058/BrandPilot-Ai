import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { brands, type BrandRow, type NewBrandRow } from '@vidsnapai/database';
import type { Brand, CreateBrandInput, UpdateBrandInput } from '@vidsnapai/types';

export function mapBrandRow(row: BrandRow): Brand {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    websiteUrl: row.websiteUrl,
    story: row.story,
    industry: row.industry,
    targetAudience: row.targetAudience,
    brandVoice: row.brandVoice,
    brandPersonality: row.brandPersonality,
    uniqueSellingPoints: (row.uniqueSellingPoints as string[]) || [],
    pricingInfo: (row.pricingInfo as Record<string, unknown>) || null,
    offers: (row.offers as string[]) || [],
    primaryCta: row.primaryCta,
    socialLinks: (row.socialLinks as Record<string, string>) || {},
    brandColors: (row.brandColors as Record<string, string>) || {},
    typography: (row.typography as Record<string, string>) || {},
    contentPillars: (row.contentPillars as string[]) || [],
    marketingRules: (row.marketingRules as any) || { claimsToAvoid: [], brandRestrictions: [], complianceRules: [] },
    competitorReferences: (row.competitorReferences as string[]) || [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class BrandRepository {
  constructor(private db: Database) {}

  async create(workspaceId: string, input: CreateBrandInput, slug: string): Promise<Brand> {
    const values: NewBrandRow = {
      workspaceId,
      name: input.name,
      slug,
      description: input.description,
      websiteUrl: input.websiteUrl || null,
      story: input.story || null,
      industry: input.industry,
      targetAudience: input.targetAudience || null,
      brandVoice: input.brandVoice || null,
      brandPersonality: input.brandPersonality || null,
      uniqueSellingPoints: input.uniqueSellingPoints || [],
      pricingInfo: input.pricingInfo || null,
      offers: input.offers || [],
      primaryCta: input.primaryCta || null,
      socialLinks: input.socialLinks || {},
      brandColors: (input.brandColors as Record<string, string>) || {},
      typography: (input.typography as Record<string, string>) || {},
      contentPillars: input.contentPillars || [],
      marketingRules: input.marketingRules || { claimsToAvoid: [], brandRestrictions: [], complianceRules: [] },
      competitorReferences: input.competitorReferences || []
    };

    const [inserted] = await this.db.insert(brands).values(values).returning();
    return mapBrandRow(inserted);
  }

  async findById(brandId: string): Promise<Brand | null> {
    const [found] = await this.db
      .select()
      .from(brands)
      .where(eq(brands.id, brandId))
      .limit(1);
    return found ? mapBrandRow(found) : null;
  }

  async findByIdAndWorkspace(brandId: string, workspaceId: string): Promise<Brand | null> {
    const [found] = await this.db
      .select()
      .from(brands)
      .where(and(eq(brands.id, brandId), eq(brands.workspaceId, workspaceId)))
      .limit(1);
    return found ? mapBrandRow(found) : null;
  }

  async listForWorkspace(workspaceId: string): Promise<Brand[]> {
    const rows = await this.db
      .select()
      .from(brands)
      .where(eq(brands.workspaceId, workspaceId))
      .orderBy(desc(brands.createdAt));
    return rows.map(mapBrandRow);
  }

  async update(brandId: string, workspaceId: string, input: UpdateBrandInput): Promise<Brand | null> {
    const updateValues: Partial<NewBrandRow> = {
      ...input,
      brandColors: input.brandColors as Record<string, string> | undefined,
      typography: input.typography as Record<string, string> | undefined,
      marketingRules: input.marketingRules as any,
      updatedAt: new Date()
    };

    const [updated] = await this.db
      .update(brands)
      .set(updateValues)
      .where(and(eq(brands.id, brandId), eq(brands.workspaceId, workspaceId)))
      .returning();

    return updated ? mapBrandRow(updated) : null;
  }

  async delete(brandId: string, workspaceId: string): Promise<boolean> {
    const result = await this.db
      .delete(brands)
      .where(and(eq(brands.id, brandId), eq(brands.workspaceId, workspaceId)));
    return (result.rowCount ?? 0) > 0;
  }
}
