import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrandBrainService } from '../src/brandBrainService.js';
import type { Database } from '@vidsnapai/database';
import type { AIProvider, Brand, BrandProduct, BrandAsset, BrandDNA } from '@vidsnapai/types';

describe('BrandBrainService — Structured AI Intelligence & Versioning', () => {
  let brainService: BrandBrainService;
  let mockAiProvider: AIProvider;
  let mockDb: any;

  // In-memory test store
  let brands: Brand[] = [];
  let products: BrandProduct[] = [];
  let assets: BrandAsset[] = [];
  let dnaRecords: BrandDNA[] = [];

  const validBrand: Brand = {
    id: 'brand-123',
    workspaceId: 'ws-1',
    name: 'Acoustic Labs',
    slug: 'acoustic-labs',
    description: 'High fidelity audio equipment engineered for audiophiles',
    websiteUrl: 'https://acousticlabs.io',
    story: 'Founded by sound engineers to eliminate distortion.',
    industry: 'Consumer Electronics',
    targetAudience: 'Audio professionals and discerning music listeners',
    brandVoice: 'Authoritative, precise, refined',
    brandPersonality: 'Sophisticated, innovative',
    uniqueSellingPoints: ['Zero harmonic distortion', 'Hand-tuned drivers'],
    pricingInfo: null,
    offers: ['Free studio case with every order'],
    primaryCta: 'Shop Acoustic Collection',
    socialLinks: {},
    brandColors: { primary: '#111827', secondary: '#6366f1' },
    typography: { headingFont: 'Outfit', bodyFont: 'Inter' },
    contentPillars: ['Acoustic Science', 'Studio Workflows', 'Audiophile Stories'],
    marketingRules: {
      claimsToAvoid: ['Miracle sound', 'Instant perfection'],
      brandRestrictions: ['Do not mock competing audio brands'],
      complianceRules: []
    },
    competitorReferences: ['Sennheiser', 'Sony'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleAiOutput = {
    identity: {
      brandName: 'Acoustic Labs',
      industry: 'Consumer Electronics',
      story: 'Founded by sound engineers to eliminate distortion.',
      mission: 'Bring uncompromised studio acoustics to every listener.',
      personality: ['Sophisticated', 'Innovative', 'Masterful']
    },
    audience: {
      primaryAudience: 'Audiophiles and studio creators',
      demographics: ['Age 25-50', 'Creators & Music Enthusiasts'],
      painPoints: ['Muffled low ends', 'Fatiguing trebles', 'Fragile cables'],
      desires: ['Immersive spatial depth', 'All-day wearing comfort'],
      buyingMotivations: ['Pristine sound quality', 'Long-lasting build']
    },
    messaging: {
      positioning: 'The reference standard in zero-distortion acoustic engineering.',
      coreMessage: 'Hear every nuance as the artist intended.',
      valueProposition: 'Master-grade fidelity with aerospace-grade durability.',
      usps: ['Zero harmonic distortion', 'Hand-tuned planar drivers'],
      proofPoints: ['Over 100 studio mastering endorsements', 'Patented dampening chamber'],
      tone: ['Authoritative', 'Refined', 'Electrifying'],
      forbiddenMessaging: ['Miracle sound', 'Instant perfection']
    },
    products: [
      {
        name: 'Acoustic Pro One',
        category: 'Headphones',
        benefits: ['Flawless acoustic clarity', 'No fatigue'],
        features: ['Planar magnetic drivers', 'Memory foam earcups'],
        price: 399,
        usps: ['Hand-tuned in USA'],
        targetAudience: 'Sound designers',
        offers: ['Free studio cable'],
        cta: 'Order Pro One'
      }
    ],
    visualIdentity: {
      logoUrl: 'https://acousticlabs.io/logo.png',
      colors: { primary: '#111827', secondary: '#6366f1' },
      typography: { headingFont: 'Outfit', bodyFont: 'Inter' },
      visualStyle: 'Sleek, minimalist matte obsidian with subtle indigo highlights',
      imageStyle: 'Moody macro product photography and professional studio setups'
    },
    contentStrategy: {
      contentPillars: ['Acoustic Science', 'Studio Workflows', 'Audiophile Stories'],
      preferredTopics: ['Frequency response curves', 'Mixing masterclasses'],
      educationalTopics: ['How planar magnetic drivers work', 'Proper DAC pairing'],
      promotionalTopics: ['Pro One Studio Edition launch', 'Exclusive trade-in discounts'],
      storytellingTopics: ['The 3-year journey to zero harmonic distortion']
    },
    promotionRules: {
      primaryCTA: 'Shop Acoustic Collection',
      offers: ['Free studio case with every order'],
      claimsToAvoid: ['Miracle sound', 'Instant perfection'],
      complianceRules: ['Must include standard 2-year warranty disclaimer'],
      brandRestrictions: ['Do not mock competing audio brands']
    }
  };

  beforeEach(() => {
    brands = [validBrand];
    products = [
      {
        id: 'prod-1',
        brandId: 'brand-123',
        name: 'Acoustic Pro One',
        description: 'Flagship planar magnetic headphones',
        category: 'Headphones',
        price: 399,
        currency: 'USD',
        features: ['Planar magnetic drivers'],
        benefits: ['Crystal clear audio'],
        usps: ['Zero distortion'],
        targetAudience: 'Audiophiles',
        offerInfo: null,
        cta: 'Buy Now',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    assets = [
      {
        id: 'asset-1',
        brandId: 'brand-123',
        type: 'logo',
        name: 'Acoustic Labs Vector Logo',
        storageKey: 'logos/brand-123/main.png',
        url: 'https://acousticlabs.io/logo.png',
        metadata: {},
        createdAt: new Date()
      }
    ];
    dnaRecords = [];

    mockDb = {} as Database;

    mockAiProvider = {
      providerName: 'gemini',
      generateText: vi.fn(),
      generateStructured: vi.fn().mockResolvedValue(sampleAiOutput)
    };

    brainService = new BrandBrainService(mockDb, mockAiProvider);

    // Mock BrandRepo methods
    vi.spyOn(brainService['brandRepo'], 'findByIdAndWorkspace').mockImplementation(async (brandId, workspaceId) => {
      return brands.find((b) => b.id === brandId && b.workspaceId === workspaceId) || null;
    });

    // Mock ProductRepo & AssetRepo
    vi.spyOn(brainService['productRepo'], 'listForBrand').mockImplementation(async (brandId) => {
      return products.filter((p) => p.brandId === brandId);
    });

    vi.spyOn(brainService['assetRepo'], 'listForBrand').mockImplementation(async (brandId) => {
      return assets.filter((a) => a.brandId === brandId);
    });

    // Mock DnaRepo
    vi.spyOn(brainService['dnaRepo'], 'findLatestByBrandId').mockImplementation(async (brandId) => {
      const list = dnaRecords.filter((d) => d.brandId === brandId).sort((a, b) => b.version - a.version);
      return list[0] || null;
    });

    vi.spyOn(brainService['dnaRepo'], 'listVersions').mockImplementation(async (brandId) => {
      return dnaRecords.filter((d) => d.brandId === brandId).sort((a, b) => b.version - a.version);
    });

    vi.spyOn(brainService['dnaRepo'], 'saveNewVersion').mockImplementation(async (brandId, output, generatedBy) => {
      const latest = dnaRecords.filter((d) => d.brandId === brandId).sort((a, b) => b.version - a.version)[0];
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

      dnaRecords.push(record);
      return record;
    });

    vi.spyOn(brainService['dnaRepo'], 'updateLatest').mockImplementation(async (brandId, updates) => {
      const latest = dnaRecords.filter((d) => d.brandId === brandId).sort((a, b) => b.version - a.version)[0];
      if (!latest) return null;

      if (updates.identity) latest.identity = { ...latest.identity, ...updates.identity };
      if (updates.messaging) latest.messaging = { ...latest.messaging, ...updates.messaging };
      latest.updatedAt = new Date();
      return latest;
    });
  });

  it('generates structured Brand DNA (Version 1) using AIProvider', async () => {
    const dna = await brainService.generateDNA('brand-123', 'ws-1');

    expect(dna.version).toBe(1);
    expect(dna.identity.brandName).toBe('Acoustic Labs');
    expect(dna.messaging.positioning).toBe('The reference standard in zero-distortion acoustic engineering.');
    expect(dna.audience.painPoints).toContain('Muffled low ends');
    expect(mockAiProvider.generateStructured).toHaveBeenCalled();
  });

  it('increments version from v1 to v2 upon regeneration', async () => {
    const v1 = await brainService.generateDNA('brand-123', 'ws-1');
    expect(v1.version).toBe(1);

    const v2 = await brainService.generateDNA('brand-123', 'ws-1');
    expect(v2.version).toBe(2);

    const history = await brainService.getDNAVersionHistory('brand-123');
    expect(history.length).toBe(2);
    expect(history[0].version).toBe(2);
    expect(history[1].version).toBe(1);
  });

  it('safely preserves previous valid DNA if AI generation fails', async () => {
    // Generate initial valid v1
    const v1 = await brainService.generateDNA('brand-123', 'ws-1');
    expect(v1.version).toBe(1);

    // Simulate AI failure on second run
    vi.spyOn(mockAiProvider, 'generateStructured').mockRejectedValueOnce(new Error('Rate limit exceeded from upstream provider'));

    await expect(brainService.generateDNA('brand-123', 'ws-1')).rejects.toThrow('Rate limit exceeded');

    // Verify v1 is still intact and not corrupted or lost
    const latest = await brainService.getLatestDNA('brand-123');
    expect(latest).not.toBeNull();
    expect(latest?.version).toBe(1);
    expect(latest?.identity.brandName).toBe('Acoustic Labs');
  });

  it('rejects invalid AI generated structure that violates Zod schema without saving', async () => {
    // Return invalid object missing required fields (e.g. missing identity.story)
    vi.spyOn(mockAiProvider, 'generateStructured').mockResolvedValueOnce({
      identity: { brandName: 'Broken' },
      audience: {}
    });

    await expect(brainService.generateDNA('brand-123', 'ws-1')).rejects.toThrow('invalid Brand DNA structure');

    const latest = await brainService.getLatestDNA('brand-123');
    expect(latest).toBeNull();
  });

  it('allows manual editing of existing Brand DNA', async () => {
    await brainService.generateDNA('brand-123', 'ws-1');

    const updated = await brainService.updateDNA('brand-123', 'ws-1', {
      messaging: {
        positioning: 'Updated Custom Positioning Statement',
        coreMessage: 'Refined Message',
        valueProposition: 'Top Value',
        usps: ['Custom USP'],
        proofPoints: ['Tested'],
        tone: ['Elite'],
        forbiddenMessaging: ['None']
      }
    });

    expect(updated.messaging.positioning).toBe('Updated Custom Positioning Statement');
  });
});
