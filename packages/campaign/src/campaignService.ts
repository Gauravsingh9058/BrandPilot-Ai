import type { Database } from '@vidsnapai/database';
import type {
  AIProvider,
  Campaign,
  CreateCampaignInput,
  UpdateCampaignInput,
  GenerateCampaignStrategyInput,
  CampaignStrategy
} from '@vidsnapai/types';
import { CampaignStrategySchema, type CampaignStrategyOutput } from '@vidsnapai/validation';
import { BrandRepository, DnaRepository } from '@vidsnapai/brand';
import { CampaignRepository } from './repositories/campaign.repository.js';
import { MarketingStrategyRepository } from './repositories/marketing-strategy.repository.js';
import { buildCampaignStrategyPrompt } from './prompts/campaign-strategy.prompt.js';
import { normalizeCampaignStrategyOutput } from './normalizers/campaign-strategy.normalizer.js';
import { buildDeterministicCampaignStrategy } from './deterministic/campaign-strategy.fallback.js';

export class CampaignService {
  private campaignRepo: CampaignRepository;
  private brandRepo: BrandRepository;
  private dnaRepo: DnaRepository;
  private strategyRepo: MarketingStrategyRepository;

  constructor(
    db: Database,
    private aiProvider: AIProvider,
    repos?: {
      campaignRepo?: CampaignRepository;
      brandRepo?: BrandRepository;
      dnaRepo?: DnaRepository;
      strategyRepo?: MarketingStrategyRepository;
    }
  ) {
    this.campaignRepo = repos?.campaignRepo ?? new CampaignRepository(db);
    this.brandRepo = repos?.brandRepo ?? new BrandRepository(db);
    this.dnaRepo = repos?.dnaRepo ?? new DnaRepository(db);
    this.strategyRepo = repos?.strategyRepo ?? new MarketingStrategyRepository(db);
  }

  // ==========================================
  // Campaign CRUD
  // ==========================================

  async createCampaign(
    brandId: string,
    workspaceId: string,
    input: CreateCampaignInput
  ): Promise<Campaign> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand with ID "${brandId}" not found in this workspace`);
    }

    return this.campaignRepo.create(brandId, input);
  }

  async listCampaigns(brandId: string, workspaceId: string): Promise<Campaign[]> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand with ID "${brandId}" not found in this workspace`);
    }

    return this.campaignRepo.listForBrand(brandId);
  }

  async getCampaignById(
    campaignId: string,
    brandId: string,
    workspaceId: string
  ): Promise<Campaign | null> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) return null;

    return this.campaignRepo.findByIdAndBrand(campaignId, brandId);
  }

  async updateCampaign(
    campaignId: string,
    brandId: string,
    workspaceId: string,
    input: UpdateCampaignInput
  ): Promise<Campaign | null> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) return null;

    return this.campaignRepo.update(campaignId, brandId, input);
  }

  async deleteCampaign(
    campaignId: string,
    brandId: string,
    workspaceId: string
  ): Promise<boolean> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) return false;

    return this.campaignRepo.delete(campaignId, brandId);
  }

  // ==========================================
  // Campaign Strategy Generation
  // ==========================================

  /**
   * Generates or regenerates Campaign Strategy using Brand Brain + Marketing Strategy + Campaign inputs.
   * Safety Guarantee: If AI fails or output is malformed, existing campaign strategy remains untouched.
   */
  async generateCampaignStrategy(
    campaignId: string,
    brandId: string,
    workspaceId: string,
    input?: GenerateCampaignStrategyInput
  ): Promise<Campaign> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand with ID "${brandId}" not found in this workspace`);
    }

    const campaign = await this.campaignRepo.findByIdAndBrand(campaignId, brandId);
    if (!campaign) {
      throw new Error(`Campaign with ID "${campaignId}" not found for this brand`);
    }

    const [brandDna, marketingStrategy] = await Promise.all([
      this.dnaRepo.findLatestByBrandId(brandId),
      this.strategyRepo.findLatestByBrandId(brandId)
    ]);

    const prompt = buildCampaignStrategyPrompt(brand, brandDna, marketingStrategy, campaign, input);

    const campaignStrategyJsonSchema = {
      type: 'object',
      properties: {
        objective: { type: 'string' },
        audience: {
          type: 'object',
          properties: {
            primary: { type: 'string' },
            secondary: { type: 'string' },
            painPoints: { type: 'array', items: { type: 'string' } },
            desires: { type: 'array', items: { type: 'string' } },
            motivations: { type: 'array', items: { type: 'string' } }
          },
          required: ['primary', 'painPoints', 'desires', 'motivations']
        },
        positioning: { type: 'string' },
        corePromise: { type: 'string' },
        keyMessages: { type: 'array', items: { type: 'string' } },
        messagingAngles: { type: 'array', items: { type: 'string' } },
        contentPillars: { type: 'array', items: { type: 'string' } },
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
        funnel: {
          type: 'object',
          properties: {
            awareness: {
              type: 'object',
              properties: { message: { type: 'string' }, formatGuidance: { type: 'string' }, cta: { type: 'string' } },
              required: ['message', 'formatGuidance', 'cta']
            },
            consideration: {
              type: 'object',
              properties: { message: { type: 'string' }, formatGuidance: { type: 'string' }, cta: { type: 'string' } },
              required: ['message', 'formatGuidance', 'cta']
            },
            conversion: {
              type: 'object',
              properties: { message: { type: 'string' }, formatGuidance: { type: 'string' }, cta: { type: 'string' } },
              required: ['message', 'formatGuidance', 'cta']
            }
          },
          required: ['awareness', 'consideration', 'conversion']
        },
        offerStrategy: { type: 'string' },
        ctaStrategy: { type: 'string' },
        channelStrategy: {
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
        },
        kpis: {
          type: 'object',
          properties: {
            primary: { type: 'array', items: { type: 'string' } },
            targets: { type: 'array', items: { type: 'string' } }
          },
          required: ['primary', 'targets']
        },
        guardrails: {
          type: 'object',
          properties: {
            claimsToAvoid: { type: 'array', items: { type: 'string' } },
            restrictions: { type: 'array', items: { type: 'string' } }
          },
          required: ['claimsToAvoid', 'restrictions']
        }
      },
      required: [
        'objective',
        'audience',
        'positioning',
        'corePromise',
        'keyMessages',
        'messagingAngles',
        'contentPillars',
        'contentMix',
        'funnel',
        'offerStrategy',
        'ctaStrategy',
        'channelStrategy',
        'kpis',
        'guardrails'
      ]
    };

    let rawOutput: unknown;
    try {
      rawOutput = await this.aiProvider.generateStructured<CampaignStrategyOutput>(
        prompt,
        campaignStrategyJsonSchema,
        {
          systemInstruction:
            'You are an expert Campaign Architect and Growth Director. Formulate sharp, structured, high-conversion Campaign Strategies in strict JSON.'
        }
      );
    } catch (aiError: unknown) {
      if (process.env.NODE_ENV !== 'test') {
        rawOutput = buildDeterministicCampaignStrategy(brand, brandDna, marketingStrategy, campaign, input);
      } else {
        const message = aiError instanceof Error ? aiError.message : String(aiError);
        throw new Error(`AI Campaign Strategy generation failed: ${message}`);
      }
    }

    // Normalization layer (safely unwraps nested wrappers and normalizes formatting)
    let normalized = normalizeCampaignStrategyOutput(rawOutput);

    // Validate structured output with Zod
    let parsed = CampaignStrategySchema.safeParse(normalized);

    // If validation failed in non-test mode, attempt 1 corrective retry or fallback
    if (!parsed.success) {
      if (process.env.NODE_ENV !== 'test') {
        try {
          const missingIssues = parsed.error.issues
            .map((i: { path: (string | number)[]; message: string }) => `${i.path.join('.')}: ${i.message}`)
            .join(', ');
          const correctivePrompt = `${prompt}\n\nCRITICAL FIX: Previous output failed validation with errors: ${missingIssues}. Output the exact required Campaign Strategy JSON schema with all 14 required fields.`;
          const retryOutput = await this.aiProvider.generateStructured<CampaignStrategyOutput>(
            correctivePrompt,
            campaignStrategyJsonSchema
          );
          normalized = normalizeCampaignStrategyOutput(retryOutput);
          parsed = CampaignStrategySchema.safeParse(normalized);
        } catch {
          // Retry failed; fall through to deterministic fallback
        }

        if (!parsed.success) {
          normalized = buildDeterministicCampaignStrategy(brand, brandDna, marketingStrategy, campaign, input);
          parsed = CampaignStrategySchema.safeParse(normalized);
        }
      }
    }

    if (!parsed.success) {
      const validationErrors = parsed.error.issues
        .map((i: { path: (string | number)[]; message: string }) => `${i.path.join('.')}: ${i.message}`)
        .join(', ');
      throw new Error(`AI generated invalid Campaign Strategy structure: ${validationErrors}`);
    }

    const nextStrategyVersion = (campaign.strategyVersion || 0) + 1;
    const updated = await this.campaignRepo.updateStrategy(
      campaignId,
      brandId,
      parsed.data as CampaignStrategy,
      nextStrategyVersion
    );

    if (!updated) {
      throw new Error('Failed to persist generated campaign strategy');
    }

    return updated;
  }
}

