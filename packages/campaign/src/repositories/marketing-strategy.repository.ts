import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { marketingStrategies, type MarketingStrategyRow, type NewMarketingStrategyRow } from '@vidsnapai/database';
import type {
  MarketingStrategy,
  MarketingStrategyOutput,
  UpdateMarketingStrategyInput,
  MarketingTargetAudience,
  MarketingPositioning,
  MarketingMessagingStrategy,
  MarketingContentStrategy,
  MarketingFunnelStrategy,
  MarketingChannelStrategy,
  MarketingOfferStrategy,
  MarketingKPIStrategy,
  MarketingGuardrails
} from '@vidsnapai/types';

export function mapMarketingStrategyRow(row: MarketingStrategyRow): MarketingStrategy {
  return {
    id: row.id,
    brandId: row.brandId,
    version: row.version,
    objective: row.objective,
    businessGoal: row.businessGoal,
    marketingGoal: row.marketingGoal,
    targetAudience: (row.targetAudience as MarketingTargetAudience) || {
      primarySegments: [],
      psychographics: [],
      buyingTriggers: [],
      objectionsToOvercome: []
    },
    positioning: (row.positioning as MarketingPositioning) || {
      marketCategory: '',
      competitiveMoat: '',
      valuePropositionStatement: '',
      differentiators: []
    },
    messagingStrategy: (row.messagingStrategy as MarketingMessagingStrategy) || {
      brandNarrativeHook: '',
      keyThemes: [],
      primaryAngles: [],
      voiceGuidance: ''
    },
    contentStrategy: (row.contentStrategy as MarketingContentStrategy) || {
      pillars: [],
      contentMix: [],
      educationalThemes: [],
      promotionalThemes: [],
      storytellingThemes: [],
      socialProofThemes: [],
      engagementThemes: []
    },
    funnelStrategy: (row.funnelStrategy as MarketingFunnelStrategy) || { stages: [] },
    channelStrategy: (row.channelStrategy as MarketingChannelStrategy) || {
      recommendedChannels: [],
      channelGuidance: []
    },
    offerStrategy: (row.offerStrategy as MarketingOfferStrategy) || {
      recommendedOffers: [],
      urgencyMechanisms: [],
      riskReversals: []
    },
    kpiStrategy: (row.kpiStrategy as MarketingKPIStrategy) || {
      primaryKPIs: [],
      secondaryKPIs: [],
      awarenessKPIs: [],
      considerationKPIs: [],
      conversionKPIs: []
    },
    risksAndGuardrails: (row.risksAndGuardrails as MarketingGuardrails) || {
      claimsToAvoid: [],
      restrictedTopics: [],
      brandRestrictions: [],
      toneRestrictions: [],
      complianceNotes: []
    },
    aiMetadata: (row.aiMetadata as Record<string, unknown>) || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class MarketingStrategyRepository {
  constructor(private db: Database) {}

  async saveNewVersion(
    brandId: string,
    output: MarketingStrategyOutput,
    aiMetadata: Record<string, unknown> = {}
  ): Promise<MarketingStrategy> {
    const latest = await this.findLatestByBrandId(brandId);
    const nextVersion = latest ? latest.version + 1 : 1;

    const values: NewMarketingStrategyRow = {
      brandId,
      version: nextVersion,
      objective: output.objective,
      businessGoal: output.businessGoal,
      marketingGoal: output.marketingGoal,
      targetAudience: output.targetAudience as any,
      positioning: output.positioning as any,
      messagingStrategy: output.messagingStrategy as any,
      contentStrategy: output.contentStrategy as any,
      funnelStrategy: output.funnelStrategy as any,
      channelStrategy: output.channelStrategy as any,
      offerStrategy: output.offerStrategy as any,
      kpiStrategy: output.kpiStrategy as any,
      risksAndGuardrails: output.risksAndGuardrails as any,
      aiMetadata: aiMetadata as any,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [inserted] = await this.db.insert(marketingStrategies).values(values).returning();
    return mapMarketingStrategyRow(inserted);
  }

  async findLatestByBrandId(brandId: string): Promise<MarketingStrategy | null> {
    const [found] = await this.db
      .select()
      .from(marketingStrategies)
      .where(eq(marketingStrategies.brandId, brandId))
      .orderBy(desc(marketingStrategies.version))
      .limit(1);

    return found ? mapMarketingStrategyRow(found) : null;
  }

  async listVersions(brandId: string): Promise<MarketingStrategy[]> {
    const rows = await this.db
      .select()
      .from(marketingStrategies)
      .where(eq(marketingStrategies.brandId, brandId))
      .orderBy(desc(marketingStrategies.version));

    return rows.map(mapMarketingStrategyRow);
  }

  async updateLatest(brandId: string, updates: UpdateMarketingStrategyInput): Promise<MarketingStrategy | null> {
    const latest = await this.findLatestByBrandId(brandId);
    if (!latest) return null;

    const updateValues: Partial<NewMarketingStrategyRow> = {
      objective: updates.objective ?? latest.objective,
      businessGoal: updates.businessGoal ?? latest.businessGoal,
      marketingGoal: updates.marketingGoal ?? latest.marketingGoal,
      targetAudience: updates.targetAudience ? { ...latest.targetAudience, ...updates.targetAudience } : (latest.targetAudience as any),
      positioning: updates.positioning ? { ...latest.positioning, ...updates.positioning } : (latest.positioning as any),
      messagingStrategy: updates.messagingStrategy ? { ...latest.messagingStrategy, ...updates.messagingStrategy } : (latest.messagingStrategy as any),
      contentStrategy: updates.contentStrategy ? { ...latest.contentStrategy, ...updates.contentStrategy } : (latest.contentStrategy as any),
      funnelStrategy: updates.funnelStrategy ? { ...latest.funnelStrategy, ...updates.funnelStrategy } : (latest.funnelStrategy as any),
      channelStrategy: updates.channelStrategy ? { ...latest.channelStrategy, ...updates.channelStrategy } : (latest.channelStrategy as any),
      offerStrategy: updates.offerStrategy ? { ...latest.offerStrategy, ...updates.offerStrategy } : (latest.offerStrategy as any),
      kpiStrategy: updates.kpiStrategy ? { ...latest.kpiStrategy, ...updates.kpiStrategy } : (latest.kpiStrategy as any),
      risksAndGuardrails: updates.risksAndGuardrails ? { ...latest.risksAndGuardrails, ...updates.risksAndGuardrails } : (latest.risksAndGuardrails as any),
      updatedAt: new Date()
    };

    const [updated] = await this.db
      .update(marketingStrategies)
      .set(updateValues)
      .where(and(eq(marketingStrategies.id, latest.id), eq(marketingStrategies.brandId, brandId)))
      .returning();

    return updated ? mapMarketingStrategyRow(updated) : null;
  }
}
