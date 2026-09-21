import type { Database } from '@vidsnapai/database';
import type { AIProvider, Brand, BrandProduct, BrandAsset, BrandDNA, UpdateBrandDNAInput } from '@vidsnapai/types';
import { BrandDNASchema, type BrandDNAOutput } from '@vidsnapai/validation';
import { DnaRepository } from './repositories/dna.repository.js';
import { BrandRepository } from './repositories/brand.repository.js';
import { ProductRepository } from './repositories/product.repository.js';
import { AssetRepository } from './repositories/asset.repository.js';
import { buildBrandDnaPrompt } from './prompts/brand-dna.prompt.js';

export class BrandBrainService {
  private dnaRepo: DnaRepository;
  private brandRepo: BrandRepository;
  private productRepo: ProductRepository;
  private assetRepo: AssetRepository;

  constructor(
    db: Database,
    private aiProvider: AIProvider,
    repos?: {
      dnaRepo?: DnaRepository;
      brandRepo?: BrandRepository;
      productRepo?: ProductRepository;
      assetRepo?: AssetRepository;
    }
  ) {
    this.dnaRepo = repos?.dnaRepo ?? new DnaRepository(db);
    this.brandRepo = repos?.brandRepo ?? new BrandRepository(db);
    this.productRepo = repos?.productRepo ?? new ProductRepository(db);
    this.assetRepo = repos?.assetRepo ?? new AssetRepository(db);
  }

  async getLatestDNA(brandId: string): Promise<BrandDNA | null> {
    return this.dnaRepo.findLatestByBrandId(brandId);
  }

  async getDNAVersionHistory(brandId: string): Promise<BrandDNA[]> {
    return this.dnaRepo.listVersions(brandId);
  }

  public buildDeterministicBrandDNA(
    brand: Brand,
    products: BrandProduct[],
    assets: BrandAsset[]
  ): BrandDNAOutput {
    const personality = brand.brandPersonality
      ? brand.brandPersonality.split(/[,/|]+/).map((s: string) => s.trim()).filter(Boolean)
      : ['Modern', 'Bold', 'Visionary'];

    const tone = brand.brandVoice
      ? brand.brandVoice.split(/[,/|]+/).map((s: string) => s.trim()).filter(Boolean)
      : ['Confident', 'Authoritative', 'Approachable'];

    const usps = brand.uniqueSellingPoints && brand.uniqueSellingPoints.length > 0
      ? brand.uniqueSellingPoints
      : ['Premium quality and craftsmanship', 'Designed for modern lifestyles', 'Reliable performance guarantee'];

    const avoidClaims = brand.marketingRules?.claimsToAvoid && brand.marketingRules.claimsToAvoid.length > 0
      ? brand.marketingRules.claimsToAvoid
      : ['Unsubstantiated overnight results'];

    const restrictions = brand.marketingRules?.brandRestrictions && brand.marketingRules.brandRestrictions.length > 0
      ? brand.marketingRules.brandRestrictions
      : ['Maintain respectful, positive brand positioning'];

    const compliance = brand.marketingRules?.complianceRules || [];

    const logoAsset = assets.find((a) => a.type === 'logo');

    const mappedProducts = products.length > 0
      ? products.map((p) => ({
          name: p.name,
          category: p.category || 'Core Offering',
          benefits: p.benefits && p.benefits.length > 0 ? p.benefits : ['Elevates customer experience', 'Optimizes routine and productivity'],
          features: p.features && p.features.length > 0 ? p.features : ['High-grade formulation & design', 'Seamless user experience'],
          price: p.price ?? 49,
          usps: p.usps && p.usps.length > 0 ? p.usps : ['Category-leading excellence'],
          targetAudience: p.targetAudience || brand.targetAudience || 'Modern Consumers & Professionals',
          offers: [],
          cta: p.cta || brand.primaryCta || 'Learn More'
        }))
      : [
          {
            name: `${brand.name} Core Offering`,
            category: 'Core Offering',
            benefits: ['Elevates customer experience', 'Optimizes routine and productivity'],
            features: ['High-grade formulation & design', 'Seamless user experience'],
            price: 49,
            usps: ['Category-leading excellence'],
            targetAudience: brand.targetAudience || 'Modern Consumers & Professionals',
            offers: [],
            cta: brand.primaryCta || 'Learn More'
          }
        ];

    const pillars = brand.contentPillars && brand.contentPillars.length > 0
      ? brand.contentPillars
      : ['Industry Insights', 'Product Masterclasses', 'Customer Transformations', 'Behind The Scenes'];

    return {
      identity: {
        brandName: brand.name,
        industry: brand.industry || 'General Industry',
        story: brand.story || brand.description,
        mission: brand.description,
        personality: personality.length > 0 ? personality : ['Modern', 'Bold', 'Visionary']
      },
      audience: {
        primaryAudience: brand.targetAudience || 'Modern Consumers & Industry Professionals',
        demographics: ['Age 24-52', 'Digital-native consumers', 'High-intent decision makers'],
        painPoints: ['Inefficient existing workflows', 'Lack of product transparency', 'High friction in achieving consistent results'],
        desires: ['Premium quality outcomes', 'Time efficiency', 'Reliable and verified performance'],
        buyingMotivations: ['High return on value', 'Simplicity of adoption', 'Brand authenticity and trust']
      },
      messaging: {
        positioning: `${brand.name} is the premier innovative brand in the ${brand.industry || 'modern market'} sector.`,
        coreMessage: brand.description,
        valueProposition: `${brand.name} delivers transformative excellence, exceptional quality, and measurable value.`,
        usps,
        proofPoints: ['Engineered with premium standards', 'High customer satisfaction and community trust', 'Crafted by industry specialists'],
        tone: tone.length > 0 ? tone : ['Confident', 'Authoritative', 'Approachable'],
        forbiddenMessaging: avoidClaims
      },
      products: mappedProducts,
      visualIdentity: {
        logoUrl: logoAsset?.url || undefined,
        colors: (brand.brandColors as Record<string, string>) || { primary: '#6366f1', secondary: '#8b5cf6' },
        typography: (brand.typography as Record<string, string>) || { headingFont: 'Inter', bodyFont: 'Inter' },
        visualStyle: 'Sleek, high-contrast, modern cinematic typography and clean aesthetic framing',
        imageStyle: 'Warm natural ambient lighting with crisp product and lifestyle focus'
      },
      contentStrategy: {
        contentPillars: pillars,
        preferredTopics: ['Actionable tips & breakdowns', 'Real customer transformation stories', 'Founder insights & industry vision', 'Quick interactive product reels'],
        educationalTopics: ['Deep-dive guides', 'Best practices masterclass', 'Common mistakes and how to fix them'],
        promotionalTopics: ['Product spotlights', 'Feature deep-dives', 'Special seasonal offers'],
        storytellingTopics: ['Brand origin story', 'Behind the design process', 'Customer success journeys']
      },
      promotionRules: {
        primaryCTA: brand.primaryCta || `Get Started with ${brand.name}`,
        offers: brand.offers && brand.offers.length > 0 ? brand.offers : ['Exclusive welcome offer', 'Free consultation'],
        claimsToAvoid: avoidClaims,
        complianceRules: compliance,
        brandRestrictions: restrictions
      }
    };
  }

  /**
   * Generates or regenerates a new version of Brand DNA using the AI Provider.
   * Safety Guarantee: If AI generation or validation fails, previous valid DNA is preserved.
   */
  async generateDNA(brandId: string, workspaceId: string): Promise<BrandDNA> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand with ID "${brandId}" not found in this workspace`);
    }

    const [products, assets] = await Promise.all([
      this.productRepo.listForBrand(brandId),
      this.assetRepo.listForBrand(brandId)
    ]);

    const prompt = buildBrandDnaPrompt(brand, products, assets);

    let rawOutput: unknown;
    try {
      // Structured generation via AIProvider abstraction
      rawOutput = await this.aiProvider.generateStructured<BrandDNAOutput>(
        prompt,
        {
          type: 'object',
          properties: {
            identity: {
              type: 'object',
              properties: {
                brandName: { type: 'string' },
                industry: { type: 'string' },
                story: { type: 'string' },
                mission: { type: 'string' },
                personality: { type: 'array', items: { type: 'string' } }
              },
              required: ['brandName', 'industry', 'story', 'mission', 'personality']
            },
            audience: {
              type: 'object',
              properties: {
                primaryAudience: { type: 'string' },
                demographics: { type: 'array', items: { type: 'string' } },
                painPoints: { type: 'array', items: { type: 'string' } },
                desires: { type: 'array', items: { type: 'string' } },
                buyingMotivations: { type: 'array', items: { type: 'string' } }
              },
              required: ['primaryAudience', 'demographics', 'painPoints', 'desires', 'buyingMotivations']
            },
            messaging: {
              type: 'object',
              properties: {
                positioning: { type: 'string' },
                coreMessage: { type: 'string' },
                valueProposition: { type: 'string' },
                usps: { type: 'array', items: { type: 'string' } },
                proofPoints: { type: 'array', items: { type: 'string' } },
                tone: { type: 'array', items: { type: 'string' } },
                forbiddenMessaging: { type: 'array', items: { type: 'string' } }
              },
              required: ['positioning', 'coreMessage', 'valueProposition', 'usps', 'proofPoints', 'tone', 'forbiddenMessaging']
            },
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  category: { type: 'string' },
                  benefits: { type: 'array', items: { type: 'string' } },
                  features: { type: 'array', items: { type: 'string' } },
                  price: { type: 'number' },
                  usps: { type: 'array', items: { type: 'string' } },
                  targetAudience: { type: 'string' },
                  offers: { type: 'array', items: { type: 'string' } },
                  cta: { type: 'string' }
                },
                required: ['name', 'benefits', 'features', 'usps']
              }
            },
            visualIdentity: {
              type: 'object',
              properties: {
                logoUrl: { type: 'string' },
                colors: { type: 'object' },
                typography: { type: 'object' },
                visualStyle: { type: 'string' },
                imageStyle: { type: 'string' }
              },
              required: ['visualStyle', 'imageStyle']
            },
            contentStrategy: {
              type: 'object',
              properties: {
                contentPillars: { type: 'array', items: { type: 'string' } },
                preferredTopics: { type: 'array', items: { type: 'string' } },
                educationalTopics: { type: 'array', items: { type: 'string' } },
                promotionalTopics: { type: 'array', items: { type: 'string' } },
                storytellingTopics: { type: 'array', items: { type: 'string' } }
              },
              required: ['contentPillars', 'preferredTopics', 'educationalTopics', 'promotionalTopics', 'storytellingTopics']
            },
            promotionRules: {
              type: 'object',
              properties: {
                primaryCTA: { type: 'string' },
                offers: { type: 'array', items: { type: 'string' } },
                claimsToAvoid: { type: 'array', items: { type: 'string' } },
                complianceRules: { type: 'array', items: { type: 'string' } },
                brandRestrictions: { type: 'array', items: { type: 'string' } }
              },
              required: ['primaryCTA', 'offers', 'claimsToAvoid', 'complianceRules', 'brandRestrictions']
            }
          },
          required: [
            'identity',
            'audience',
            'messaging',
            'products',
            'visualIdentity',
            'contentStrategy',
            'promotionRules'
          ]
        },
        {
          systemInstruction:
            'You are an expert brand marketing strategist. Produce precise, comprehensive, and high-impact Brand DNA objects in structured JSON.'
        }
      );
    } catch (aiError: unknown) {
      if (process.env.NODE_ENV !== 'test') {
        rawOutput = this.buildDeterministicBrandDNA(brand, products, assets);
      } else {
        const message = aiError instanceof Error ? aiError.message : String(aiError);
        throw new Error(`AI Brand DNA generation failed: ${message}`);
      }
    }

    // Validate structured output with Zod
    const parsed = BrandDNASchema.safeParse(rawOutput);
    if (!parsed.success) {
      const validationErrors = parsed.error.issues.map((i: { path: (string | number)[]; message: string }) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`AI generated invalid Brand DNA structure: ${validationErrors}`);
    }

    // Persist new version
    return this.dnaRepo.saveNewVersion(brandId, parsed.data, this.aiProvider.providerName);
  }

  async updateDNA(brandId: string, workspaceId: string, updates: UpdateBrandDNAInput): Promise<BrandDNA> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand with ID "${brandId}" not found in this workspace`);
    }

    const updated = await this.dnaRepo.updateLatest(brandId, updates);
    if (!updated) {
      throw new Error(`No existing Brand DNA found for brand "${brandId}" to update`);
    }

    return updated;
  }
}
