import slugify from 'slugify';
import type { Database } from '@vidsnapai/database';
import type {
  AIProvider,
  Brand,
  BrandWithDetails,
  BrandProduct,
  BrandAsset,
  BrandDNA,
  CreateBrandInput,
  UpdateBrandInput,
  CreateProductInput,
  UpdateProductInput,
  CreateBrandAssetInput,
  AssignAssetToProductInput,
  UpdateBrandDNAInput
} from '@vidsnapai/types';
import { BrandRepository } from './repositories/brand.repository.js';
import { ProductRepository } from './repositories/product.repository.js';
import { AssetRepository } from './repositories/asset.repository.js';
import { DnaRepository } from './repositories/dna.repository.js';
import { BrandBrainService } from './brandBrainService.js';

export class BrandService {
  private brandRepo: BrandRepository;
  private productRepo: ProductRepository;
  private assetRepo: AssetRepository;
  private dnaRepo: DnaRepository;
  private brainService: BrandBrainService;

  constructor(db: Database, aiProvider: AIProvider) {
    this.brandRepo = new BrandRepository(db);
    this.productRepo = new ProductRepository(db);
    this.assetRepo = new AssetRepository(db);
    this.dnaRepo = new DnaRepository(db);
    this.brainService = new BrandBrainService(db, aiProvider, {
      dnaRepo: this.dnaRepo,
      brandRepo: this.brandRepo,
      productRepo: this.productRepo,
      assetRepo: this.assetRepo
    });
  }

  // ==========================================
  // Brand CRUD
  // ==========================================

  async createBrand(workspaceId: string, input: CreateBrandInput): Promise<Brand> {
    const rawSlug = slugify(input.name, { lower: true, strict: true }) || 'brand';
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${rawSlug}-${uniqueSuffix}`;

    return this.brandRepo.create(workspaceId, input, slug);
  }

  async listBrands(workspaceId: string): Promise<BrandWithDetails[]> {
    const brandList = await this.brandRepo.listForWorkspace(workspaceId);

    const detailedBrands = await Promise.all(
      brandList.map(async (brand) => {
        const [products, assets, latestDna] = await Promise.all([
          this.productRepo.listForBrand(brand.id),
          this.assetRepo.listForBrand(brand.id),
          this.dnaRepo.findLatestByBrandId(brand.id)
        ]);

        return {
          ...brand,
          products,
          assets,
          latestDna,
          dnaStatus: latestDna ? ('READY' as const) : ('NOT_GENERATED' as const)
        };
      })
    );

    return detailedBrands;
  }

  async getBrandById(brandId: string, workspaceId: string): Promise<BrandWithDetails | null> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) return null;

    const [products, assets, latestDna] = await Promise.all([
      this.productRepo.listForBrand(brand.id),
      this.assetRepo.listForBrand(brand.id),
      this.dnaRepo.findLatestByBrandId(brand.id)
    ]);

    return {
      ...brand,
      products,
      assets,
      latestDna,
      dnaStatus: latestDna ? 'READY' : 'NOT_GENERATED'
    };
  }

  async updateBrand(brandId: string, workspaceId: string, input: UpdateBrandInput): Promise<Brand | null> {
    return this.brandRepo.update(brandId, workspaceId, input);
  }

  async deleteBrand(brandId: string, workspaceId: string): Promise<boolean> {
    return this.brandRepo.delete(brandId, workspaceId);
  }

  // ==========================================
  // Product CRUD
  // ==========================================

  async createProduct(brandId: string, workspaceId: string, input: CreateProductInput): Promise<BrandProduct> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error('Brand not found in this workspace');
    }
    return this.productRepo.create(brandId, input);
  }

  async listProducts(brandId: string, workspaceId: string): Promise<BrandProduct[]> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error('Brand not found in this workspace');
    }
    return this.productRepo.listForBrand(brandId);
  }

  async getProductById(productId: string, brandId: string, workspaceId: string): Promise<BrandProduct | null> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) return null;
    return this.productRepo.findById(productId, brandId);
  }

  async updateProduct(
    productId: string,
    brandId: string,
    workspaceId: string,
    input: UpdateProductInput
  ): Promise<BrandProduct | null> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) return null;
    return this.productRepo.update(productId, brandId, input);
  }

  async deleteProduct(productId: string, brandId: string, workspaceId: string): Promise<boolean> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) return false;
    return this.productRepo.delete(productId, brandId);
  }

  // ==========================================
  // Asset Management
  // ==========================================

  async createAsset(brandId: string, workspaceId: string, input: CreateBrandAssetInput): Promise<BrandAsset> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error('Brand not found in this workspace');
    }
    return this.assetRepo.create(brandId, input);
  }

  async listAssets(brandId: string, workspaceId: string): Promise<BrandAsset[]> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error('Brand not found in this workspace');
    }
    return this.assetRepo.listForBrand(brandId);
  }

  async assignAssetToProduct(
    assetId: string,
    brandId: string,
    workspaceId: string,
    input: AssignAssetToProductInput
  ): Promise<BrandAsset> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error('Brand not found in this workspace');
    }
    if (input.productId) {
      const product = await this.productRepo.findById(input.productId, brandId);
      if (!product) {
        throw new Error(`Product with ID "${input.productId}" not found in brand "${brandId}"`);
      }
    }
    const updated = await this.assetRepo.assignToProduct(assetId, brandId, input);
    if (!updated) {
      throw new Error(`Brand asset with ID "${assetId}" not found`);
    }
    return updated;
  }

  async listAssetsForProduct(productId: string, brandId: string, workspaceId: string): Promise<BrandAsset[]> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error('Brand not found in this workspace');
    }
    return this.assetRepo.listForProduct(brandId, productId);
  }

  async deleteAsset(assetId: string, brandId: string, workspaceId: string): Promise<boolean> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) return false;
    return this.assetRepo.delete(assetId, brandId);
  }

  // ==========================================
  // Brand Brain Intelligence
  // ==========================================

  async generateBrandDNA(brandId: string, workspaceId: string): Promise<BrandDNA> {
    return this.brainService.generateDNA(brandId, workspaceId);
  }

  async getLatestBrandDNA(brandId: string, workspaceId: string): Promise<BrandDNA | null> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error('Brand not found in this workspace');
    }
    return this.brainService.getLatestDNA(brandId);
  }

  async updateBrandDNA(brandId: string, workspaceId: string, updates: UpdateBrandDNAInput): Promise<BrandDNA> {
    return this.brainService.updateDNA(brandId, workspaceId, updates);
  }

  async getBrandDNAHistory(brandId: string, workspaceId: string): Promise<BrandDNA[]> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error('Brand not found in this workspace');
    }
    return this.brainService.getDNAVersionHistory(brandId);
  }
}
