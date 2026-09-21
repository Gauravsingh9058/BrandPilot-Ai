import { eq, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { brandDna, type BrandDnaRow } from '@vidsnapai/database';
import type { BrandDNA, BrandDNAOutput, UpdateBrandDNAInput } from '@vidsnapai/types';

export function mapDnaRow(row: BrandDnaRow): BrandDNA {
  return {
    id: row.id,
    brandId: row.brandId,
    version: row.version,
    identity: row.identity as any,
    audience: row.audience as any,
    messaging: row.messaging as any,
    products: row.products as any,
    visualIdentity: row.visualIdentity as any,
    contentStrategy: row.contentStrategy as any,
    promotionRules: row.promotionRules as any,
    generatedBy: row.generatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class DnaRepository {
  constructor(private db: Database) {}

  async findLatestByBrandId(brandId: string): Promise<BrandDNA | null> {
    const [found] = await this.db
      .select()
      .from(brandDna)
      .where(eq(brandDna.brandId, brandId))
      .orderBy(desc(brandDna.version))
      .limit(1);

    return found ? mapDnaRow(found) : null;
  }

  async findByBrandIdAndVersion(brandId: string, version: number): Promise<BrandDNA | null> {
    const rows = await this.db
      .select()
      .from(brandDna)
      .where(eq(brandDna.brandId, brandId));

    const found = rows.find((r) => r.version === version);
    return found ? mapDnaRow(found) : null;
  }

  async listVersions(brandId: string): Promise<BrandDNA[]> {
    const rows = await this.db
      .select()
      .from(brandDna)
      .where(eq(brandDna.brandId, brandId))
      .orderBy(desc(brandDna.version));

    return rows.map(mapDnaRow);
  }

  async saveNewVersion(
    brandId: string,
    dnaOutput: BrandDNAOutput,
    generatedBy: string = 'ai-gemini'
  ): Promise<BrandDNA> {
    const latest = await this.findLatestByBrandId(brandId);
    const nextVersion = (latest?.version ?? 0) + 1;

    const [inserted] = await this.db
      .insert(brandDna)
      .values({
        brandId,
        version: nextVersion,
        identity: dnaOutput.identity,
        audience: dnaOutput.audience,
        messaging: dnaOutput.messaging,
        products: dnaOutput.products,
        visualIdentity: dnaOutput.visualIdentity,
        contentStrategy: dnaOutput.contentStrategy,
        promotionRules: dnaOutput.promotionRules,
        generatedBy
      })
      .returning();

    return mapDnaRow(inserted);
  }

  async updateLatest(brandId: string, updates: UpdateBrandDNAInput): Promise<BrandDNA | null> {
    const latest = await this.findLatestByBrandId(brandId);
    if (!latest) return null;

    const updatedIdentity = updates.identity ? { ...latest.identity, ...updates.identity } : latest.identity;
    const updatedAudience = updates.audience ? { ...latest.audience, ...updates.audience } : latest.audience;
    const updatedMessaging = updates.messaging ? { ...latest.messaging, ...updates.messaging } : latest.messaging;
    const updatedProducts = updates.products || latest.products;
    const updatedVisual = updates.visualIdentity ? { ...latest.visualIdentity, ...updates.visualIdentity } : latest.visualIdentity;
    const updatedStrategy = updates.contentStrategy ? { ...latest.contentStrategy, ...updates.contentStrategy } : latest.contentStrategy;
    const updatedRules = updates.promotionRules ? { ...latest.promotionRules, ...updates.promotionRules } : latest.promotionRules;

    const [updated] = await this.db
      .update(brandDna)
      .set({
        identity: updatedIdentity,
        audience: updatedAudience,
        messaging: updatedMessaging,
        products: updatedProducts,
        visualIdentity: updatedVisual,
        contentStrategy: updatedStrategy,
        promotionRules: updatedRules,
        updatedAt: new Date()
      })
      .where(eq(brandDna.id, latest.id))
      .returning();

    return updated ? mapDnaRow(updated) : null;
  }
}
