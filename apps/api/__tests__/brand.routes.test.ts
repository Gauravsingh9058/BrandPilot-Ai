import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrandService } from '@vidsnapai/brand';
import type { Database } from '@vidsnapai/database';
import type {
  AIProvider,
  Brand,
  BrandProduct,
  BrandAsset,
  BrandDNA,
  CreateBrandInput,
  UpdateBrandInput,
  CreateProductInput,
  CreateBrandAssetInput
} from '@vidsnapai/types';

describe('Brand API & Multi-Tenant Isolation Tests', () => {
  let brandService: BrandService;
  let mockDb: any;
  let mockAiProvider: AIProvider;

  let brandsTable: Brand[] = [];
  let productsTable: BrandProduct[] = [];
  let assetsTable: BrandAsset[] = [];
  let dnaTable: BrandDNA[] = [];

  beforeEach(() => {
    brandsTable = [];
    productsTable = [];
    assetsTable = [];
    dnaTable = [];

    mockDb = {} as Database;
    mockAiProvider = {
      providerName: 'gemini',
      generateText: vi.fn(),
      generateStructured: vi.fn()
    };

    brandService = new BrandService(mockDb, mockAiProvider);

    // Mock BrandRepo
    vi.spyOn(brandService['brandRepo'], 'create').mockImplementation(async (workspaceId: string, input: CreateBrandInput, slug: string): Promise<Brand> => {
      const brand: Brand = {
        id: `brand-${Math.random().toString(36).substring(2, 8)}`,
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
        pricingInfo: null,
        offers: input.offers || [],
        primaryCta: input.primaryCta || null,
        socialLinks: input.socialLinks || {},
        brandColors: input.brandColors || {},
        typography: input.typography || {},
        contentPillars: input.contentPillars || [],
        marketingRules: input.marketingRules || { claimsToAvoid: [], brandRestrictions: [], complianceRules: [] },
        competitorReferences: input.competitorReferences || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      brandsTable.push(brand);
      return brand;
    });

    vi.spyOn(brandService['brandRepo'], 'listForWorkspace').mockImplementation(async (workspaceId: string): Promise<Brand[]> => {
      return brandsTable.filter((b) => b.workspaceId === workspaceId);
    });

    vi.spyOn(brandService['brandRepo'], 'findByIdAndWorkspace').mockImplementation(async (brandId: string, workspaceId: string): Promise<Brand | null> => {
      return brandsTable.find((b) => b.id === brandId && b.workspaceId === workspaceId) || null;
    });

    vi.spyOn(brandService['brandRepo'], 'findById').mockImplementation(async (brandId: string): Promise<Brand | null> => {
      return brandsTable.find((b) => b.id === brandId) || null;
    });

    vi.spyOn(brandService['brandRepo'], 'update').mockImplementation(async (brandId: string, workspaceId: string, input: UpdateBrandInput): Promise<Brand | null> => {
      const brand = brandsTable.find((b) => b.id === brandId && b.workspaceId === workspaceId);
      if (!brand) return null;
      if (input.name) brand.name = input.name;
      if (input.description) brand.description = input.description;
      brand.updatedAt = new Date();
      return brand;
    });

    vi.spyOn(brandService['brandRepo'], 'delete').mockImplementation(async (brandId: string, workspaceId: string): Promise<boolean> => {
      const initial = brandsTable.length;
      brandsTable = brandsTable.filter((b) => !(b.id === brandId && b.workspaceId === workspaceId));
      return brandsTable.length < initial;
    });

    // Mock ProductRepo
    vi.spyOn(brandService['productRepo'], 'create').mockImplementation(async (brandId: string, input: CreateProductInput): Promise<BrandProduct> => {
      const prod: BrandProduct = {
        id: `prod-${Math.random().toString(36).substring(2, 8)}`,
        brandId,
        name: input.name,
        description: input.description,
        category: input.category || null,
        price: input.price ?? null,
        currency: input.currency || 'USD',
        features: input.features || [],
        benefits: input.benefits || [],
        usps: input.usps || [],
        targetAudience: input.targetAudience || null,
        offerInfo: null,
        cta: input.cta || null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      productsTable.push(prod);
      return prod;
    });

    vi.spyOn(brandService['productRepo'], 'listForBrand').mockImplementation(async (brandId: string): Promise<BrandProduct[]> => {
      return productsTable.filter((p) => p.brandId === brandId);
    });

    vi.spyOn(brandService['productRepo'], 'findById').mockImplementation(async (productId: string, brandId: string): Promise<BrandProduct | null> => {
      return productsTable.find((p) => p.id === productId && p.brandId === brandId) || null;
    });

    vi.spyOn(brandService['productRepo'], 'delete').mockImplementation(async (productId: string, brandId: string): Promise<boolean> => {
      const initial = productsTable.length;
      productsTable = productsTable.filter((p) => !(p.id === productId && p.brandId === brandId));
      return productsTable.length < initial;
    });

    // Mock AssetRepo
    vi.spyOn(brandService['assetRepo'], 'create').mockImplementation(async (brandId: string, input: CreateBrandAssetInput): Promise<BrandAsset> => {
      const asset: BrandAsset = {
        id: `asset-${Math.random().toString(36).substring(2, 8)}`,
        brandId,
        type: input.type,
        name: input.name,
        storageKey: input.storageKey,
        url: input.url,
        metadata: {},
        createdAt: new Date()
      };
      assetsTable.push(asset);
      return asset;
    });

    vi.spyOn(brandService['assetRepo'], 'listForBrand').mockImplementation(async (brandId: string): Promise<BrandAsset[]> => {
      return assetsTable.filter((a) => a.brandId === brandId);
    });

    vi.spyOn(brandService['assetRepo'], 'findById').mockImplementation(async (assetId: string, brandId: string): Promise<BrandAsset | null> => {
      return assetsTable.find((a) => a.id === assetId && a.brandId === brandId) || null;
    });

    vi.spyOn(brandService['assetRepo'], 'checkActiveReferences').mockImplementation(async (_assetId: string): Promise<number> => {
      return 0;
    });

    vi.spyOn(brandService['assetRepo'], 'delete').mockImplementation(async (assetId: string, brandId: string): Promise<boolean> => {
      const initial = assetsTable.length;
      assetsTable = assetsTable.filter((a) => !(a.id === assetId && a.brandId === brandId));
      return assetsTable.length < initial;
    });

    // Mock DnaRepo
    vi.spyOn(brandService['dnaRepo'], 'findLatestByBrandId').mockImplementation(async (brandId: string): Promise<BrandDNA | null> => {
      const list = dnaTable.filter((d) => d.brandId === brandId).sort((a, b) => b.version - a.version);
      return list[0] || null;
    });
  });

  describe('1. Brand CRUD & Multi-Tenant Isolation', () => {
    it('creates brand scoped to workspace', async () => {
      const brand = await brandService.createBrand('ws-alpha', {
        name: 'Alpha Brand',
        description: 'First class B2B marketing automation software',
        industry: 'SaaS'
      });

      expect(brand.name).toBe('Alpha Brand');
      expect(brand.workspaceId).toBe('ws-alpha');
      expect(brand.slug).toContain('alpha-brand');
    });

    it('enforces multi-tenant workspace isolation (Workspace Beta cannot access Workspace Alpha brand)', async () => {
      const brandAlpha = await brandService.createBrand('ws-alpha', {
        name: 'Secret Project Alpha',
        description: 'Proprietary aerospace technology',
        industry: 'Aerospace'
      });

      // User from Workspace Beta tries to get brand
      const unauthorizedAccess = await brandService.getBrandById(brandAlpha.id, 'ws-beta');
      expect(unauthorizedAccess).toBeNull();
    });

    it('lists only brands belonging to the caller workspace', async () => {
      await brandService.createBrand('ws-alpha', { name: 'Alpha 1', description: 'desc 1', industry: 'Tech' });
      await brandService.createBrand('ws-alpha', { name: 'Alpha 2', description: 'desc 2', industry: 'Tech' });
      await brandService.createBrand('ws-beta', { name: 'Beta 1', description: 'desc 3', industry: 'Health' });

      const alphaList = await brandService.listBrands('ws-alpha');
      const betaList = await brandService.listBrands('ws-beta');

      expect(alphaList.length).toBe(2);
      expect(betaList.length).toBe(1);
      expect(alphaList.every((b) => b.workspaceId === 'ws-alpha')).toBe(true);
      expect(betaList[0].name).toBe('Beta 1');
    });
  });

  describe('2. Product & Asset CRUD', () => {
    it('adds product scoped to brand', async () => {
      const brand = await brandService.createBrand('ws-alpha', {
        name: 'Tech Corp',
        description: 'Cloud storage provider',
        industry: 'Cloud'
      });

      const product = await brandService.createProduct(brand.id, 'ws-alpha', {
        name: 'Enterprise Cloud 1TB',
        description: 'Secure encrypted cloud storage for teams',
        price: 99,
        cta: 'Start 14-Day Trial'
      });

      expect(product.brandId).toBe(brand.id);
      expect(product.name).toBe('Enterprise Cloud 1TB');

      const products = await brandService.listProducts(brand.id, 'ws-alpha');
      expect(products.length).toBe(1);
    });

    it('registers brand asset and lists it in asset library', async () => {
      const brand = await brandService.createBrand('ws-alpha', {
        name: 'Design Studio',
        description: 'Graphic design software',
        industry: 'Design'
      });

      const asset = await brandService.createAsset(brand.id, 'ws-alpha', {
        name: 'Main Brand Logo',
        type: 'logo',
        storageKey: 'logos/logo.png',
        url: 'https://cdn.example.com/logo.png'
      });

      expect(asset.brandId).toBe(brand.id);
      expect(asset.type).toBe('logo');

      const assets = await brandService.listAssets(brand.id, 'ws-alpha');
      expect(assets.length).toBe(1);
    });

    it('deletes an unused brand asset successfully and removes it from list', async () => {
      const brand = await brandService.createBrand('ws-alpha', {
        name: 'Alpha Brand',
        description: 'Design suite',
        industry: 'Design'
      });

      const asset = await brandService.createAsset(brand.id, 'ws-alpha', {
        name: 'Old Banner Image',
        type: 'brand_image',
        storageKey: 'banners/old.png',
        url: 'https://cdn.example.com/banners/old.png'
      });

      expect((await brandService.listAssets(brand.id, 'ws-alpha')).length).toBe(1);

      const deleteRes = await brandService.deleteAsset(asset.id, brand.id, 'ws-alpha');
      expect(deleteRes.success).toBe(true);

      const remaining = await brandService.listAssets(brand.id, 'ws-alpha');
      expect(remaining.length).toBe(0);
    });

    it('blocks deletion of an asset referenced in active production unless force=true', async () => {
      const brand = await brandService.createBrand('ws-alpha', {
        name: 'Alpha Brand',
        description: 'Design suite',
        industry: 'Design'
      });

      const asset = await brandService.createAsset(brand.id, 'ws-alpha', {
        name: 'Hero Bottle Photo',
        type: 'product_image',
        storageKey: 'products/hero.png',
        url: 'https://cdn.example.com/products/hero.png'
      });

      // Simulate 2 active references
      vi.spyOn(brandService['assetRepo'], 'checkActiveReferences').mockResolvedValueOnce(2);

      const deleteRes = await brandService.deleteAsset(asset.id, brand.id, 'ws-alpha');
      expect(deleteRes.success).toBe(false);
      expect(deleteRes.code).toBe('ASSET_IN_USE');

      // Now force deletion
      const forceDeleteRes = await brandService.deleteAsset(asset.id, brand.id, 'ws-alpha', { force: true });
      expect(forceDeleteRes.success).toBe(true);
    });

    it('returns error when attempting to delete an asset from an unauthorized workspace', async () => {
      const brand = await brandService.createBrand('ws-alpha', {
        name: 'Alpha Brand',
        description: 'Design suite',
        industry: 'Design'
      });

      const asset = await brandService.createAsset(brand.id, 'ws-alpha', {
        name: 'Alpha Logo',
        type: 'logo',
        storageKey: 'logos/alpha.png',
        url: 'https://cdn.example.com/alpha.png'
      });

      // Attempt to delete from ws-beta
      const deleteRes = await brandService.deleteAsset(asset.id, brand.id, 'ws-beta');
      expect(deleteRes.success).toBe(false);
      expect(deleteRes.code).toBe('BRAND_NOT_FOUND');
    });
  });
});
