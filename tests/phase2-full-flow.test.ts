import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../apps/api/src/services/auth.service.js';
import { BrandService } from '../packages/brand/src/brandService.js';
import type { Database } from '@vidsnapai/database';
import type { AIProvider, Brand, BrandProduct, BrandAsset, BrandDNA, User, WorkspaceWithMembers } from '@vidsnapai/types';

describe('VidSnapAI Phase 2 Full Brand Brain Lifecycle', () => {
  let authService: AuthService;
  let brandService: BrandService;
  let mockAiProvider: AIProvider;

  // In-memory data
  let users: User[] = [];
  const userPasswords = new Map<string, string>();
  let workspaces: WorkspaceWithMembers[] = [];
  let brands: Brand[] = [];
  let products: BrandProduct[] = [];
  let assets: BrandAsset[] = [];
  let dnas: BrandDNA[] = [];

  const sampleAiOutput = {
    identity: {
      brandName: 'Quantum Audio',
      industry: 'Audio Engineering',
      story: 'Crafting lossless sound devices for creators.',
      mission: 'Elevate acoustic fidelity everywhere.',
      personality: ['Innovative', 'Precision-Focused', 'Modern']
    },
    audience: {
      primaryAudience: 'Music producers and voice actors',
      demographics: ['Ages 22-45', 'Audio Engineers'],
      painPoints: ['High latency in monitor feeds', 'Uncomfortable headband'],
      desires: ['Sub-millisecond wireless sync', 'Pristine sound stage'],
      buyingMotivations: ['Speed', 'Acoustic accuracy']
    },
    messaging: {
      positioning: 'Zero-latency wireless monitoring for pros.',
      coreMessage: 'Never drop a beat.',
      valueProposition: 'Pure sound with zero lag.',
      usps: ['Sub-1ms wireless latency', 'Graphite diaphragms'],
      proofPoints: ['Grammy-winning studio testing'],
      tone: ['Energetic', 'Sharp', 'Professional'],
      forbiddenMessaging: ['Magic audio', 'Instant pro']
    },
    products: [
      {
        name: 'Quantum Sync 1',
        category: 'Hardware',
        benefits: ['Real-time sync', 'Ultra light'],
        features: ['2.4GHz UltraLink', '40hr battery'],
        price: 299,
        usps: ['Zero lag'],
        targetAudience: 'Creators',
        offers: ['Free case'],
        cta: 'Buy Quantum Sync 1'
      }
    ],
    visualIdentity: {
      logoUrl: 'https://cdn.example.com/quantum.png',
      colors: { primary: '#0f172a', secondary: '#6366f1' },
      typography: { headingFont: 'Outfit', bodyFont: 'Inter' },
      visualStyle: 'Dark mode futuristic metallic',
      imageStyle: 'Sleek dark studio photography'
    },
    contentStrategy: {
      contentPillars: ['Latency Science', 'Audio Mixing Hacks', 'Creator Interviews'],
      preferredTopics: ['How latency destroys performance timing'],
      educationalTopics: ['Explaining latency in digital audio'],
      promotionalTopics: ['Quantum Sync 1 Flash Sale'],
      storytellingTopics: ['Developing the UltraLink wireless protocol']
    },
    promotionRules: {
      primaryCTA: 'Claim Your Quantum Sync',
      offers: ['Free priority shipping'],
      claimsToAvoid: ['Magic sound', 'Instant pro'],
      complianceRules: ['Standard warranty notice'],
      brandRestrictions: ['Do not mock cable users']
    }
  };

  beforeEach(() => {
    users = [];
    userPasswords.clear();
    workspaces = [];
    brands = [];
    products = [];
    assets = [];
    dnas = [];

    const mockDb = {} as Database;
    mockAiProvider = {
      providerName: 'gemini',
      generateText: vi.fn(),
      generateStructured: vi.fn().mockResolvedValue(sampleAiOutput)
    };

    authService = new AuthService(mockDb);
    brandService = new BrandService(mockDb, mockAiProvider);

    // Auth & Workspace Mocks
    vi.spyOn(authService['userRepo'], 'existsByEmail').mockImplementation(async (email) => {
      return users.some((u) => u.email === email.toLowerCase());
    });

    vi.spyOn(authService['userRepo'], 'create').mockImplementation(async (data) => {
      const user: User = {
        id: `user-${Math.random().toString(36).substring(2, 8)}`,
        email: data.email,
        name: data.name,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      users.push(user);
      userPasswords.set(user.id, data.passwordHash);
      return user;
    });

    vi.spyOn(authService['workspaceRepo'], 'create').mockImplementation(async (data) => {
      const ws: WorkspaceWithMembers = {
        id: `ws-${Math.random().toString(36).substring(2, 8)}`,
        name: data.name,
        ownerId: data.ownerId,
        userRole: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: []
      };
      workspaces.push(ws);
      return ws;
    });

    vi.spyOn(authService['sessionRepo'], 'create').mockImplementation(async (data) => {
      return {
        id: `sess-${Math.random().toString(36).substring(2, 8)}`,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        createdAt: new Date()
      };
    });

    // BrandService Repository Mocks
    vi.spyOn(brandService['brandRepo'], 'create').mockImplementation(async (workspaceId, input, slug) => {
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
        socialLinks: {},
        brandColors: input.brandColors || {},
        typography: input.typography || {},
        contentPillars: input.contentPillars || [],
        marketingRules: input.marketingRules || { claimsToAvoid: [], brandRestrictions: [], complianceRules: [] },
        competitorReferences: input.competitorReferences || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      brands.push(brand);
      return brand;
    });

    vi.spyOn(brandService['brandRepo'], 'findByIdAndWorkspace').mockImplementation(async (brandId, workspaceId) => {
      return brands.find((b) => b.id === brandId && b.workspaceId === workspaceId) || null;
    });

    vi.spyOn(brandService['brandRepo'], 'listForWorkspace').mockImplementation(async (workspaceId) => {
      return brands.filter((b) => b.workspaceId === workspaceId);
    });

    vi.spyOn(brandService['productRepo'], 'create').mockImplementation(async (brandId, input) => {
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
        targetAudience: null,
        offerInfo: null,
        cta: input.cta || null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      products.push(prod);
      return prod;
    });

    vi.spyOn(brandService['productRepo'], 'listForBrand').mockImplementation(async (brandId) => {
      return products.filter((p) => p.brandId === brandId);
    });

    vi.spyOn(brandService['assetRepo'], 'create').mockImplementation(async (brandId, input) => {
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
      assets.push(asset);
      return asset;
    });

    vi.spyOn(brandService['assetRepo'], 'listForBrand').mockImplementation(async (brandId) => {
      return assets.filter((a) => a.brandId === brandId);
    });

    vi.spyOn(brandService['dnaRepo'], 'saveNewVersion').mockImplementation(async (brandId, output, generatedBy) => {
      const latest = dnas.filter((d) => d.brandId === brandId).sort((a, b) => b.version - a.version)[0];
      const version = (latest?.version || 0) + 1;

      const record: BrandDNA = {
        id: `dna-${Math.random().toString(36).substring(2, 8)}`,
        brandId,
        version,
        identity: output.identity,
        audience: output.audience,
        messaging: output.messaging,
        products: output.products as any,
        visualIdentity: output.visualIdentity as any,
        contentStrategy: output.contentStrategy,
        promotionRules: output.promotionRules,
        generatedBy: generatedBy || 'gemini',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dnas.push(record);
      return record;
    });

    vi.spyOn(brandService['dnaRepo'], 'findLatestByBrandId').mockImplementation(async (brandId) => {
      return dnas.filter((d) => d.brandId === brandId).sort((a, b) => b.version - a.version)[0] || null;
    });

    vi.spyOn(brandService['dnaRepo'], 'listVersions').mockImplementation(async (brandId) => {
      return dnas.filter((d) => d.brandId === brandId).sort((a, b) => b.version - a.version);
    });

    vi.spyOn(brandService['dnaRepo'], 'updateLatest').mockImplementation(async (brandId, updates) => {
      const latest = dnas.filter((d) => d.brandId === brandId).sort((a, b) => b.version - a.version)[0];
      if (!latest) return null;
      if (updates.identity) latest.identity = { ...latest.identity, ...updates.identity };
      if (updates.messaging) latest.messaging = { ...latest.messaging, ...updates.messaging };
      latest.updatedAt = new Date();
      return latest;
    });
  });

  it('completes the entire Brand Brain lifecycle from onboarding to AI DNA generation and versioning', async () => {
    // 1. User Signs up & gets default workspace
    const signup = await authService.signup({
      name: 'Marcus Vance',
      email: 'marcus@quantum.io',
      password: 'StrongPassword123'
    });
    const workspaceId = signup.workspace.id;

    // 2. User creates a Brand in the workspace
    const brand = await brandService.createBrand(workspaceId, {
      name: 'Quantum Audio',
      industry: 'Audio Engineering',
      description: 'Zero-latency studio wireless audio monitoring hardware',
      websiteUrl: 'https://quantumaudio.io',
      story: 'Engineered to free creators from audio cables without lag.',
      brandVoice: 'Dynamic, crisp, visionary',
      brandPersonality: 'Innovative, pro-grade',
      primaryCta: 'Explore Quantum Sync'
    });

    expect(brand.id).toBeDefined();
    expect(brand.workspaceId).toBe(workspaceId);
    expect(brand.name).toBe('Quantum Audio');

    // 3. User adds a Product to the Brand
    const product = await brandService.createProduct(brand.id, workspaceId, {
      name: 'Quantum Sync 1',
      description: 'Ultra-low latency wireless audio monitor',
      price: 299,
      cta: 'Buy Quantum Sync 1'
    });
    expect(product.brandId).toBe(brand.id);

    // 4. User registers a Brand Logo Asset
    const asset = await brandService.createAsset(brand.id, workspaceId, {
      name: 'Quantum Logo',
      type: 'logo',
      storageKey: 'logos/quantum.png',
      url: 'https://cdn.example.com/quantum.png'
    });
    expect(asset.brandId).toBe(brand.id);

    // 5. User triggers AI Brand Brain synthesis -> generates Brand DNA (Version 1)
    const dnaV1 = await brandService.generateBrandDNA(brand.id, workspaceId);
    expect(dnaV1.version).toBe(1);
    expect(dnaV1.identity.brandName).toBe('Quantum Audio');
    expect(dnaV1.messaging.positioning).toBe('Zero-latency wireless monitoring for pros.');
    expect(dnaV1.contentStrategy.contentPillars).toContain('Latency Science');

    // 6. User edits Brand DNA messaging
    const updatedDna = await brandService.updateBrandDNA(brand.id, workspaceId, {
      messaging: {
        positioning: 'The Ultimate Wireless Audio Standard',
        coreMessage: 'Uncompromising studio precision.',
        valueProposition: 'Lossless audio for pros.',
        usps: ['Sub-1ms latency'],
        proofPoints: ['Industry standard'],
        tone: ['Elite'],
        forbiddenMessaging: ['Cheap audio']
      }
    });
    expect(updatedDna.messaging.positioning).toBe('The Ultimate Wireless Audio Standard');

    // 7. User regenerates Brand Brain -> generates Brand DNA (Version 2)
    const dnaV2 = await brandService.generateBrandDNA(brand.id, workspaceId);
    expect(dnaV2.version).toBe(2);

    // 8. Verify history contains both versions and v2 is latest
    const history = await brandService.getBrandDNAHistory(brand.id, workspaceId);
    expect(history.length).toBe(2);
    expect(history[0].version).toBe(2);
    expect(history[1].version).toBe(1);

    const latest = await brandService.getLatestBrandDNA(brand.id, workspaceId);
    expect(latest?.version).toBe(2);

    // 9. Verify Workspace Isolation: User from Workspace B cannot access Quantum Audio
    const foreignAccess = await brandService.getBrandById(brand.id, 'workspace-stranger');
    expect(foreignAccess).toBeNull();
  });
});
