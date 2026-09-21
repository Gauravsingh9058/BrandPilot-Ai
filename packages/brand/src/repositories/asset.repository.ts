import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { brandAssets, type BrandAssetRow, type NewBrandAssetRow } from '@vidsnapai/database';
import type {
  BrandAsset,
  CreateBrandAssetInput,
  BrandAssetType,
  AssignAssetToProductInput,
  AssetPurpose
} from '@vidsnapai/types';

export function mapAssetRow(row: BrandAssetRow): BrandAsset {
  const metadata = (row.metadata as Record<string, unknown>) || {};
  return {
    id: row.id,
    brandId: row.brandId,
    type: row.type as BrandAssetType,
    name: row.name,
    storageKey: row.storageKey,
    url: row.url,
    productId: (metadata.productId as string) || undefined,
    assetPurpose: (metadata.assetPurpose as AssetPurpose) || undefined,
    productionEligible: metadata.productionEligible !== undefined ? Boolean(metadata.productionEligible) : true,
    isPlaceholder: Boolean(metadata.isPlaceholder),
    isTestAsset: Boolean(metadata.isTestAsset),
    width: typeof metadata.width === 'number' ? metadata.width : undefined,
    height: typeof metadata.height === 'number' ? metadata.height : undefined,
    mimeType: typeof metadata.mimeType === 'string' ? metadata.mimeType : undefined,
    metadata,
    createdAt: row.createdAt
  };
}

export class AssetRepository {
  constructor(private db: Database) {}

  async create(brandId: string, input: CreateBrandAssetInput): Promise<BrandAsset> {
    const metadata: Record<string, unknown> = {
      ...(input.metadata || {}),
      ...(input.productId !== undefined ? { productId: input.productId } : {}),
      ...(input.assetPurpose !== undefined ? { assetPurpose: input.assetPurpose } : {}),
      ...(input.productionEligible !== undefined ? { productionEligible: input.productionEligible } : { productionEligible: true }),
      ...(input.isPlaceholder !== undefined ? { isPlaceholder: input.isPlaceholder } : {}),
      ...(input.isTestAsset !== undefined ? { isTestAsset: input.isTestAsset } : {}),
      ...(input.width !== undefined ? { width: input.width } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      ...(input.mimeType !== undefined ? { mimeType: input.mimeType } : {})
    };

    const values: NewBrandAssetRow = {
      brandId,
      type: input.type,
      name: input.name,
      storageKey: input.storageKey,
      url: input.url,
      metadata
    };

    const [inserted] = await this.db.insert(brandAssets).values(values).returning();
    return mapAssetRow(inserted);
  }

  async listForBrand(brandId: string): Promise<BrandAsset[]> {
    if (!this.db || typeof this.db.select !== 'function') {
      return [];
    }
    const rows = await this.db
      .select()
      .from(brandAssets)
      .where(eq(brandAssets.brandId, brandId))
      .orderBy(desc(brandAssets.createdAt));
    return rows.map(mapAssetRow);
  }

  async listForProduct(brandId: string, productId: string): Promise<BrandAsset[]> {
    const all = await this.listForBrand(brandId);
    return all.filter((a) => {
      const meta = (a.metadata || {}) as Record<string, unknown>;
      return meta.productId === productId || a.productId === productId;
    });
  }

  async assignToProduct(
    assetId: string,
    brandId: string,
    input: AssignAssetToProductInput
  ): Promise<BrandAsset | null> {
    const existing = await this.findById(assetId, brandId);
    if (!existing) return null;

    const metadata: Record<string, unknown> = {
      ...(existing.metadata || {}),
      productId: input.productId ?? null,
      ...(input.assetPurpose ? { assetPurpose: input.assetPurpose } : {}),
      ...(input.productionEligible !== undefined ? { productionEligible: input.productionEligible } : {})
    };

    const [updated] = await this.db
      .update(brandAssets)
      .set({ metadata })
      .where(and(eq(brandAssets.id, assetId), eq(brandAssets.brandId, brandId)))
      .returning();

    return updated ? mapAssetRow(updated) : null;
  }

  async findById(assetId: string, brandId: string): Promise<BrandAsset | null> {
    const [found] = await this.db
      .select()
      .from(brandAssets)
      .where(and(eq(brandAssets.id, assetId), eq(brandAssets.brandId, brandId)))
      .limit(1);
    return found ? mapAssetRow(found) : null;
  }

  async delete(assetId: string, brandId: string): Promise<boolean> {
    const result = await this.db
      .delete(brandAssets)
      .where(and(eq(brandAssets.id, assetId), eq(brandAssets.brandId, brandId)));
    return (result.rowCount ?? 0) > 0;
  }
}
