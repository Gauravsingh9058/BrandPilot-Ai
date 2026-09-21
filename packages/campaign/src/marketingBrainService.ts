import type { Database } from '@vidsnapai/database';
import type {
  AIProvider,
  MarketingStrategy,
  GenerateMarketingStrategyInput,
  UpdateMarketingStrategyInput
} from '@vidsnapai/types';
import { MarketingStrategySchema, type MarketingStrategyOutput } from '@vidsnapai/validation';
import { BrandRepository, ProductRepository, AssetRepository, DnaRepository } from '@vidsnapai/brand';
import { MarketingStrategyRepository } from './repositories/marketing-strategy.repository.js';
import { buildMarketingStrategyPrompt } from './prompts/marketing-strategy.prompt.js';

export class MarketingBrainService {
  private strategyRepo: MarketingStrategyRepository;
  private brandRepo: BrandRepository;
  private productRepo: ProductRepository;
  private assetRepo: AssetRepository;
  private dnaRepo: DnaRepository;

  constructor(
    db: Database,
    private aiProvider: AIProvider,
    repos?: {
      strategyRepo?: MarketingStrategyRepository;
      brandRepo?: BrandRepository;
      productRepo?: ProductRepository;
      assetRepo?: AssetRepository;
      dnaRepo?: DnaRepository;
    }
  ) {
    this.strategyRepo = repos?.strategyRepo ?? new MarketingStrategyRepository(db);
    this.brandRepo = repos?.brandRepo ?? new BrandRepository(db);
    this.productRepo = repos?.productRepo ?? new ProductRepository(db);
    this.assetRepo = repos?.assetRepo ?? new AssetRepository(db);
    this.dnaRepo = repos?.dnaRepo ?? new DnaRepository(db);
  }

  async getLatestStrategy(brandId: string, workspaceId: string): Promise<MarketingStrategy | null> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand with ID "${brandId}" not found in this workspace`);
    }
    return this.strategyRepo.findLatestByBrandId(brandId);
  }

  async getStrategyHistory(brandId: string, workspaceId: string): Promise<MarketingStrategy[]> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand with ID "${brandId}" not found in this workspace`);
    }
    return this.strategyRepo.listVersions(brandId);
  }

  /**
   * Generates or regenerates a new version of Marketing Strategy using AIProvider.
   * Safety Guarantee: If AI generation or validation fails, previous valid strategy is preserved.
   */
  async generateStrategy(
    brandId: string,
    workspaceId: string,
    input: GenerateMarketingStrategyInput,
    options?: { optimizationContext?: import('@vidsnapai/types').OptimizationContext }
  ): Promise<MarketingStrategy> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand with ID "${brandId}" not found in this workspace`);
    }

    const [products, assets, brandDna] = await Promise.all([
      this.productRepo.listForBrand(brandId),
      this.assetRepo.listForBrand(brandId),
      this.dnaRepo.findLatestByBrandId(brandId)
    ]);

    const prompt = buildMarketingStrategyPrompt(brand, brandDna, products, assets, input, options?.optimizationContext);

    let rawOutput: unknown;
    try {
      rawOutput = await this.aiProvider.generateStructured<MarketingStrategyOutput>(
        prompt,
        {
          type: 'object',
          properties: {
            objective: { type: 'string' },
            businessGoal: { type: 'string' },
            marketingGoal: { type: 'string' },
            targetAudience: {
              type: 'object',
              properties: {
                primarySegments: { type: 'array', items: { type: 'string' } },
                psychographics: { type: 'array', items: { type: 'string' } },
                buyingTriggers: { type: 'array', items: { type: 'string' } },
                objectionsToOvercome: { type: 'array', items: { type: 'string' } }
              },
              required: ['primarySegments', 'psychographics', 'buyingTriggers', 'objectionsToOvercome']
            },
            positioning: {
              type: 'object',
              properties: {
                marketCategory: { type: 'string' },
                competitiveMoat: { type: 'string' },
                valuePropositionStatement: { type: 'string' },
                differentiators: { type: 'array', items: { type: 'string' } }
              },
              required: ['marketCategory', 'competitiveMoat', 'valuePropositionStatement', 'differentiators']
            },
            messagingStrategy: {
              type: 'object',
              properties: {
                brandNarrativeHook: { type: 'string' },
                keyThemes: { type: 'array', items: { type: 'string' } },
                primaryAngles: { type: 'array', items: { type: 'string' } },
                voiceGuidance: { type: 'string' }
              },
              required: ['brandNarrativeHook', 'keyThemes', 'primaryAngles', 'voiceGuidance']
            },
            contentStrategy: {
              type: 'object',
              properties: {
                pillars: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      purpose: { type: 'string' },
                      audienceNeed: { type: 'string' },
                      messagingAngle: { type: 'string' },
                      recommendedFormats: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['name', 'purpose', 'audienceNeed', 'messagingAngle', 'recommendedFormats']
                  }
                },
                contentMix: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      percentage: { type: 'number' },
                      purpose: { type: 'string' },
                      funnelStage: { type: 'string' }
                    },
                    required: ['type', 'percentage', 'purpose', 'funnelStage']
                  }
                },
                educationalThemes: { type: 'array', items: { type: 'string' } },
                promotionalThemes: { type: 'array', items: { type: 'string' } },
                storytellingThemes: { type: 'array', items: { type: 'string' } },
                socialProofThemes: { type: 'array', items: { type: 'string' } },
                engagementThemes: { type: 'array', items: { type: 'string' } }
              },
              required: ['pillars', 'contentMix', 'educationalThemes', 'promotionalThemes', 'storytellingThemes', 'socialProofThemes', 'engagementThemes']
            },
            funnelStrategy: {
              type: 'object',
              properties: {
                stages: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      stage: { type: 'string', enum: ['AWARENESS', 'CONSIDERATION', 'CONVERSION', 'RETENTION'] },
                      audienceState: { type: 'string' },
                      objective: { type: 'string' },
                      messageFocus: { type: 'string' },
                      contentRole: { type: 'string' },
                      ctaBehavior: { type: 'string' }
                    },
                    required: ['stage', 'audienceState', 'objective', 'messageFocus', 'contentRole', 'ctaBehavior']
                  }
                }
              },
              required: ['stages']
            },
            channelStrategy: {
              type: 'object',
              properties: {
                recommendedChannels: { type: 'array', items: { type: 'string' } },
                channelGuidance: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      channel: { type: 'string' },
                      role: { type: 'string' },
                      contentApproach: { type: 'string' },
                      formatGuidance: { type: 'string' },
                      ctaStrategy: { type: 'string' }
                    },
                    required: ['channel', 'role', 'contentApproach', 'formatGuidance', 'ctaStrategy']
                  }
                }
              },
              required: ['recommendedChannels', 'channelGuidance']
            },
            offerStrategy: {
              type: 'object',
              properties: {
                recommendedOffers: { type: 'array', items: { type: 'string' } },
                urgencyMechanisms: { type: 'array', items: { type: 'string' } },
                riskReversals: { type: 'array', items: { type: 'string' } }
              },
              required: ['recommendedOffers', 'urgencyMechanisms', 'riskReversals']
            },
            kpiStrategy: {
              type: 'object',
              properties: {
                primaryKPIs: { type: 'array', items: { type: 'string' } },
                secondaryKPIs: { type: 'array', items: { type: 'string' } },
                awarenessKPIs: { type: 'array', items: { type: 'string' } },
                considerationKPIs: { type: 'array', items: { type: 'string' } },
                conversionKPIs: { type: 'array', items: { type: 'string' } }
              },
              required: ['primaryKPIs', 'secondaryKPIs', 'awarenessKPIs', 'considerationKPIs', 'conversionKPIs']
            },
            risksAndGuardrails: {
              type: 'object',
              properties: {
                claimsToAvoid: { type: 'array', items: { type: 'string' } },
                restrictedTopics: { type: 'array', items: { type: 'string' } },
                brandRestrictions: { type: 'array', items: { type: 'string' } },
                toneRestrictions: { type: 'array', items: { type: 'string' } },
                complianceNotes: { type: 'array', items: { type: 'string' } }
              },
              required: ['claimsToAvoid', 'restrictedTopics', 'brandRestrictions', 'toneRestrictions', 'complianceNotes']
            }
          },
          required: [
            'objective',
            'businessGoal',
            'marketingGoal',
            'targetAudience',
            'positioning',
            'messagingStrategy',
            'contentStrategy',
            'funnelStrategy',
            'channelStrategy',
            'offerStrategy',
            'kpiStrategy',
            'risksAndGuardrails'
          ]
        },
        {
          systemInstruction:
            'You are an expert AI Marketing Director and Growth Strategist. Produce rigorous, high-impact Marketing Strategy plans in structured JSON.'
        }
      );
    } catch (aiError: unknown) {
      const message = aiError instanceof Error ? aiError.message : String(aiError);
      throw new Error(`AI Marketing Strategy generation failed: ${message}`);
    }

    // Validate structured output with Zod
    const parsed = MarketingStrategySchema.safeParse(rawOutput);
    if (!parsed.success) {
      const validationErrors = parsed.error.issues
        .map((i: { path: (string | number)[]; message: string }) => `${i.path.join('.')}: ${i.message}`)
        .join(', ');
      throw new Error(`AI generated invalid Marketing Strategy structure: ${validationErrors}`);
    }

    return this.strategyRepo.saveNewVersion(brandId, parsed.data, {
      provider: this.aiProvider.providerName,
      generatedAt: new Date().toISOString()
    });
  }

  async updateStrategy(
    brandId: string,
    workspaceId: string,
    updates: UpdateMarketingStrategyInput
  ): Promise<MarketingStrategy> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand with ID "${brandId}" not found in this workspace`);
    }

    const updated = await this.strategyRepo.updateLatest(brandId, updates);
    if (!updated) {
      throw new Error(`No existing Marketing Strategy found for brand "${brandId}" to update`);
    }

    return updated;
  }
}
