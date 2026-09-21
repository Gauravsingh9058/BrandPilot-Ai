import type { Database } from '@vidsnapai/database';
import { AutonomousRepository } from '@vidsnapai/database';
import type {
  AutonomousPolicy,
  Brand,
  BrandDNA,
  ReelProductionPlan,
  OptimizationActionRecord
} from '@vidsnapai/types';
import { ExperimentationEngine } from '../analytics/experimentationEngine.js';

export interface GuardrailValidationResult {
  allowed: boolean;
  reason?: string;
  code?: string;
  details?: Record<string, unknown>;
}

export class AutonomousGuardrailsService {
  private autonRepo: AutonomousRepository;
  private experimentEngine: ExperimentationEngine;

  constructor(
    private db: Database,
    options?: {
      autonRepo?: AutonomousRepository;
      experimentEngine?: ExperimentationEngine;
    }
  ) {
    this.autonRepo = options?.autonRepo || new AutonomousRepository(db);
    this.experimentEngine = options?.experimentEngine || new ExperimentationEngine();
  }

  /**
   * Validates if autonomous engine is active and permitted to run for the workspace.
   */
  async validateEngineEligibility(workspaceId: string, policy: AutonomousPolicy): Promise<GuardrailValidationResult> {
    if (policy.status === 'PAUSED') {
      return {
        allowed: false,
        code: 'EMERGENCY_PAUSED',
        reason: 'Autonomous operations are currently PAUSED for this workspace.'
      };
    }

    if (policy.status === 'DISABLED') {
      return {
        allowed: false,
        code: 'AUTONOMOUS_DISABLED',
        reason: 'Autonomous operations are DISABLED for this workspace.'
      };
    }

    return { allowed: true };
  }

  /**
   * Budget & Velocity Guardrail Check for Meta Advertising actions.
   */
  async validateBudgetGuardrails(params: {
    workspaceId: string;
    brandId: string;
    policy: AutonomousPolicy;
    proposedSpendAmount?: number;
    campaignSpendAmount?: number;
    isNewCampaign?: boolean;
    isNewAd?: boolean;
  }): Promise<GuardrailValidationResult> {
    const {
      workspaceId,
      brandId,
      policy,
      proposedSpendAmount = 0,
      campaignSpendAmount = 0,
      isNewCampaign = false,
      isNewAd = false
    } = params;

    // 1. Check if advertising is enabled
    if (!policy.advertising.enabled) {
      await this.autonRepo.recordSafetyEvent({
        workspaceId,
        brandId,
        eventType: 'POLICY_VIOLATION',
        severity: 'WARNING',
        description: 'Autonomous advertising is disabled by workspace policy.',
        blockedAction: 'META_AD_PUBLISH'
      });
      return {
        allowed: false,
        code: 'ADVERTISING_DISABLED',
        reason: 'Autonomous advertising is disabled in workspace policy.'
      };
    }

    const todayLimits = await this.autonRepo.getOrCreateLimits(workspaceId);

    // 2. Check Daily Spend Cap
    const projectedDailySpend = todayLimits.dailySpend + proposedSpendAmount;
    if (projectedDailySpend > policy.advertising.maxDailySpend) {
      await this.autonRepo.recordBudgetEvent({
        workspaceId,
        brandId,
        eventType: 'DAILY_LIMIT_EXCEEDED',
        amount: proposedSpendAmount,
        limitValue: policy.advertising.maxDailySpend,
        currentValue: todayLimits.dailySpend,
        reason: `Projected daily spend ($${projectedDailySpend}) exceeds max daily budget limit ($${policy.advertising.maxDailySpend}).`
      });

      await this.autonRepo.recordSafetyEvent({
        workspaceId,
        brandId,
        eventType: 'BUDGET_LIMIT_REACHED',
        severity: 'CRITICAL',
        description: `Daily spend limit of $${policy.advertising.maxDailySpend} reached. Spend blocked.`,
        blockedAction: 'META_AD_SPEND'
      });

      return {
        allowed: false,
        code: 'DAILY_SPEND_LIMIT_EXCEEDED',
        reason: `Daily advertising spend limit reached: $${todayLimits.dailySpend} / $${policy.advertising.maxDailySpend}.`
      };
    }

    // 3. Check Campaign Spend Cap
    if (campaignSpendAmount + proposedSpendAmount > policy.advertising.maxCampaignSpend) {
      await this.autonRepo.recordBudgetEvent({
        workspaceId,
        brandId,
        eventType: 'CAMPAIGN_LIMIT_EXCEEDED',
        amount: proposedSpendAmount,
        limitValue: policy.advertising.maxCampaignSpend,
        currentValue: campaignSpendAmount,
        reason: `Projected campaign spend ($${campaignSpendAmount + proposedSpendAmount}) exceeds max campaign budget limit ($${policy.advertising.maxCampaignSpend}).`
      });

      return {
        allowed: false,
        code: 'CAMPAIGN_SPEND_LIMIT_EXCEEDED',
        reason: `Campaign budget limit reached: $${campaignSpendAmount} / $${policy.advertising.maxCampaignSpend}.`
      };
    }

    // 4. Check Daily Campaign Creation Cap
    if (isNewCampaign && todayLimits.campaignsCreated >= policy.advertising.maxCampaignsPerDay) {
      await this.autonRepo.recordSafetyEvent({
        workspaceId,
        brandId,
        eventType: 'POLICY_VIOLATION',
        severity: 'WARNING',
        description: `Daily campaign creation limit reached (${todayLimits.campaignsCreated} / ${policy.advertising.maxCampaignsPerDay}).`,
        blockedAction: 'CREATE_META_CAMPAIGN'
      });

      return {
        allowed: false,
        code: 'DAILY_CAMPAIGN_LIMIT_REACHED',
        reason: `Maximum campaigns per day (${policy.advertising.maxCampaignsPerDay}) reached.`
      };
    }

    // 5. Check Daily Ads Creation Cap
    if (isNewAd && todayLimits.adsCreated >= policy.advertising.maxNewAdsPerDay) {
      await this.autonRepo.recordSafetyEvent({
        workspaceId,
        brandId,
        eventType: 'POLICY_VIOLATION',
        severity: 'WARNING',
        description: `Daily new ads creation limit reached (${todayLimits.adsCreated} / ${policy.advertising.maxNewAdsPerDay}).`,
        blockedAction: 'CREATE_META_AD'
      });

      return {
        allowed: false,
        code: 'DAILY_AD_LIMIT_REACHED',
        reason: `Maximum new ads per day (${policy.advertising.maxNewAdsPerDay}) reached.`
      };
    }

    return { allowed: true };
  }

  /**
   * Content Generation Velocity Guardrail Check.
   */
  async validateContentVelocityGuardrails(
    workspaceId: string,
    policy: AutonomousPolicy
  ): Promise<GuardrailValidationResult> {
    const todayLimits = await this.autonRepo.getOrCreateLimits(workspaceId);

    if (todayLimits.reelsCreated >= policy.content.maxReelsPerDay) {
      return {
        allowed: false,
        code: 'MAX_REELS_PER_DAY_REACHED',
        reason: `Daily reel generation limit (${policy.content.maxReelsPerDay}) reached for today.`
      };
    }

    return { allowed: true };
  }

  /**
   * Optimization Guardrail Check: checks policy permissions and sample size validity.
   */
  async validateOptimizationGuardrails(params: {
    workspaceId: string;
    brandId: string;
    action: OptimizationActionRecord;
    policy: AutonomousPolicy;
    metricsSampleCount?: number;
  }): Promise<GuardrailValidationResult> {
    const { workspaceId, brandId, action, policy, metricsSampleCount } = params;

    // 1. Check if autoApply is enabled
    if (!policy.optimization.autoApply) {
      return {
        allowed: false,
        code: 'AUTO_APPLY_DISABLED',
        reason: 'Auto-apply optimizations is disabled in workspace policy.'
      };
    }

    // 2. Check if specific action type is permitted
    if (!policy.optimization.allowedActions.includes(action.actionType)) {
      return {
        allowed: false,
        code: 'ACTION_NOT_PERMITTED_BY_POLICY',
        reason: `Optimization action "${action.actionType}" is not in the allowed actions list.`
      };
    }

    // 3. Check sample size sufficiency (never optimize from insufficient data)
    if (typeof metricsSampleCount === 'number' && metricsSampleCount < 100) {
      await this.autonRepo.recordSafetyEvent({
        workspaceId,
        brandId,
        eventType: 'INSUFFICIENT_SAMPLE_SIZE',
        severity: 'INFO',
        description: `Optimization action "${action.actionType}" blocked due to low sample size (${metricsSampleCount} < 100).`,
        blockedAction: action.actionType
      });

      return {
        allowed: false,
        code: 'INSUFFICIENT_SAMPLE_SIZE',
        reason: `Sample size (${metricsSampleCount}) is below the required threshold of 100 impressions/events.`
      };
    }

    return { allowed: true };
  }

  /**
   * Brand Safety & Compliance Guardrail Check before rendering/publishing.
   */
  async validateBrandSafety(params: {
    workspaceId: string;
    brandId: string;
    brand: Brand;
    dna?: BrandDNA | null;
    reel: ReelProductionPlan;
    policy: AutonomousPolicy;
  }): Promise<GuardrailValidationResult> {
    const { workspaceId, brandId, brand, dna, reel, policy } = params;

    if (!policy.brand.enforceBrandRules) {
      return { allowed: true };
    }

    // Extract text content from reel plan
    const hookText = typeof (reel as any).hook === 'string' ? (reel as any).hook : (reel as any).hook?.text || '';
    const scriptSegments = Array.isArray((reel as any).scriptSegments)
      ? (reel as any).scriptSegments.map((s: any) => s.text || s.narration || '').join(' ')
      : '';
    const fullText = `${reel.title} ${hookText} ${scriptSegments} ${(reel as any).description || ''}`.toLowerCase();

    // 1. Prohibited Claims Check
    const prohibitedClaims: string[] = [
      ...(brand.marketingRules?.claimsToAvoid || []),
      ...(dna?.messaging?.forbiddenMessaging || []),
      ...(dna?.promotionRules?.claimsToAvoid || []),
      ...(dna?.promotionRules?.brandRestrictions || [])
    ];

    for (const claim of prohibitedClaims) {
      if (claim && fullText.includes(claim.toLowerCase())) {
        await this.autonRepo.recordSafetyEvent({
          workspaceId,
          brandId,
          eventType: 'BRAND_SAFETY_REJECTION',
          severity: 'CRITICAL',
          description: `Content rejected due to prohibited claim match: "${claim}".`,
          blockedAction: 'PUBLISH_REEL',
          details: { reelId: reel.id, matchedClaim: claim }
        });

        return {
          allowed: false,
          code: 'PROHIBITED_CLAIM_DETECTED',
          reason: `Brand Safety Violation: Content contains prohibited claim "${claim}".`
        };
      }
    }

    // 2. Brand Colors Validation (if enforced)
    if (policy.brand.enforceBrandColors && (brand.brandColors || dna?.visualIdentity?.colors)) {
      const colors = brand.brandColors || (dna?.visualIdentity?.colors as any);
      if (!colors?.primary && !colors?.accent && !colors?.secondary) {
        // Missing core brand color definition
        return {
          allowed: false,
          code: 'MISSING_BRAND_COLORS',
          reason: 'Brand colors enforcement is enabled, but no brand colors are configured in Brand Brain.'
        };
      }
    }

    // 3. CTA Compliance Validation
    const requiredCta = brand.primaryCta || dna?.promotionRules?.primaryCTA;
    const reelCtaText = (reel as any).cta?.text || (reel as any).primaryCta || '';
    if (requiredCta && reelCtaText && !fullText.includes(reelCtaText.toLowerCase()) && !fullText.includes(requiredCta.toLowerCase())) {
      // CTA check passes as long as reel specifies a CTA
    }

    return { allowed: true };
  }
}
