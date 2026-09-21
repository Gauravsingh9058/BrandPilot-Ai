import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { brandProducts, type BrandProductRow, type NewBrandProductRow } from '@vidsnapai/database';
import type { BrandProduct, CreateProductInput, UpdateProductInput } from '@vidsnapai/types';

export function mapProductRow(row: BrandProductRow): BrandProduct {
  return {
    id: row.id,
    brandId: row.brandId,
    name: row.name,
    description: row.description,
    category: row.category,
    price: row.price,
    currency: row.currency || 'USD',
    features: (row.features as string[]) || [],
    benefits: (row.benefits as string[]) || [],
    usps: (row.usps as string[]) || [],
    targetAudience: row.targetAudience,
    offerInfo: (row.offerInfo as Record<string, unknown>) || null,
    cta: row.cta,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class ProductRepository {
  constructor(private db: Database) {}

  async create(brandId: string, input: CreateProductInput): Promise<BrandProduct> {
    const values: NewBrandProductRow = {
      brandId,
      name: input.name,
      description: input.description,
      category: input.category || null,
      price: input.price !== undefined && input.price !== null ? Math.round(input.price) : null,
      currency: input.currency || 'USD',
      features: input.features || [],
      benefits: input.benefits || [],
      usps: input.usps || [],
      targetAudience: input.targetAudience || null,
      offerInfo: input.offerInfo || null,
      cta: input.cta || null,
      metadata: input.metadata || {}
    };

    const [inserted] = await this.db.insert(brandProducts).values(values).returning();
    return mapProductRow(inserted);
  }

  async listForBrand(brandId: string): Promise<BrandProduct[]> {
    const rows = await this.db
      .select()
      .from(brandProducts)
      .where(eq(brandProducts.brandId, brandId))
      .orderBy(desc(brandProducts.createdAt));
    return rows.map(mapProductRow);
  }

  async findById(productId: string, brandId: string): Promise<BrandProduct | null> {
    const [found] = await this.db
      .select()
      .from(brandProducts)
      .where(and(eq(brandProducts.id, productId), eq(brandProducts.brandId, brandId)))
      .limit(1);
    return found ? mapProductRow(found) : null;
  }

  async update(productId: string, brandId: string, input: UpdateProductInput): Promise<BrandProduct | null> {
    const updateValues: Partial<NewBrandProductRow> = {
      ...input,
      price: input.price !== undefined && input.price !== null ? Math.round(input.price) : undefined,
      updatedAt: new Date()
    };

    const [updated] = await this.db
      .update(brandProducts)
      .set(updateValues)
      .where(and(eq(brandProducts.id, productId), eq(brandProducts.brandId, brandId)))
      .returning();

    return updated ? mapProductRow(updated) : null;
  }

  async delete(productId: string, brandId: string): Promise<boolean> {
    const result = await this.db
      .delete(brandProducts)
      .where(and(eq(brandProducts.id, productId), eq(brandProducts.brandId, brandId)));
    return (result.rowCount ?? 0) > 0;
  }
}
