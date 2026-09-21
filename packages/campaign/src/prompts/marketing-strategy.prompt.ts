import type { Brand, BrandDNA, BrandProduct, BrandAsset, GenerateMarketingStrategyInput, OptimizationContext } from '@vidsnapai/types';

export function buildMarketingStrategyPrompt(
  brand: Brand,
  brandDna: BrandDNA | null,
  products: BrandProduct[],
  assets: BrandAsset[],
  input: GenerateMarketingStrategyInput,
  optimizationContext?: OptimizationContext
): string {
  const brandName = brand.name;
  const industry = brand.industry;
  const description = brand.description;
  const story = brand.story || brandDna?.identity.story || 'Not specified';
  const voice = brand.brandVoice || brandDna?.messaging.tone.join(', ') || 'Professional, modern';
  const primaryCta = brand.primaryCta || brandDna?.promotionRules.primaryCTA || 'Learn More';

  const productDetails = products.length > 0
    ? products.map((p, idx) => `
Product #${idx + 1}: ${p.name}
- Category: ${p.category || 'General'}
- Price: ${p.price !== null && p.price !== undefined ? `${p.currency || 'USD'} ${p.price}` : 'Unspecified'}
- Description: ${p.description}
- Features: ${p.features ? p.features.join(', ') : 'None'}
- Benefits: ${p.benefits ? p.benefits.join(', ') : 'None'}
- USPs: ${p.usps ? p.usps.join(', ') : 'None'}
- CTA: ${p.cta || primaryCta}
`).join('\n')
    : 'No products registered.';

  const dnaSummary = brandDna
    ? `
BRAND DNA FOUNDATION:
- Positioning: ${brandDna.messaging.positioning}
- Core Message: ${brandDna.messaging.coreMessage}
- Value Proposition: ${brandDna.messaging.valueProposition}
- Target Audience: ${brandDna.audience.primaryAudience}
- Pain Points: ${brandDna.audience.painPoints.join('; ')}
- Desires: ${brandDna.audience.desires.join('; ')}
- Buying Motivations: ${brandDna.audience.buyingMotivations.join('; ')}
- Content Pillars: ${brandDna.contentStrategy.contentPillars.join(', ')}
- Claims to Avoid: ${brandDna.promotionRules.claimsToAvoid.join('; ')}
- Brand Restrictions: ${brandDna.promotionRules.brandRestrictions.join('; ')}
`
    : 'Brand DNA not yet synthesized. Use available brand profile information.';

  const optimizationSection = optimizationContext
    ? `
=========================================
PHASE 11: HISTORICAL PERFORMANCE INTELLIGENCE & OPTIMIZATION CONTEXT
=========================================
- Winning Hooks: ${optimizationContext.winningHooks?.join(', ') || 'None recorded yet'}
- Winning Messaging Angles: ${optimizationContext.winningMessagingAngles?.join(', ') || 'None recorded yet'}
- Winning CTAs: ${optimizationContext.winningCTAs?.join(', ') || 'None recorded yet'}
- Winning Content Pillars: ${optimizationContext.winningContentPillars?.join(', ') || 'None recorded yet'}
- Patterns to Avoid: ${optimizationContext.patternsToAvoid?.join(', ') || 'None recorded yet'}
- Top Optimization Insights:
${optimizationContext.topInsights?.map((ins) => `  * [${ins.type}] ${ins.title}: ${ins.recommendation} (${ins.evidenceText || ins.reasoning})`).join('\n') || '  * No active insights'}

[SECTION 1: VERIFIED HISTORICAL PERFORMANCE DATA]
- Winning Hooks (Verified High Retention/CTR): ${optimizationContext.winningHooks?.length ? optimizationContext.winningHooks.join(' | ') : 'No statistically verified winning hooks yet'}
- Weak/Underperforming Hooks (Avoid): ${optimizationContext.weakHooks?.length ? optimizationContext.weakHooks.join(' | ') : 'None'}
- Winning Messaging Angles (Verified Lift): ${optimizationContext.winningMessagingAngles?.length ? optimizationContext.winningMessagingAngles.join(' | ') : 'No verified angles yet'}
- Weak Messaging Angles (Avoid): ${optimizationContext.weakMessagingAngles?.length ? optimizationContext.weakMessagingAngles.join(' | ') : 'None'}
- Winning CTAs (High Conversion): ${optimizationContext.winningCTAs?.length ? optimizationContext.winningCTAs.join(' | ') : 'No verified CTAs yet'}
- Weak CTAs (Low Conversion): ${optimizationContext.weakCTAs?.length ? optimizationContext.weakCTAs.join(' | ') : 'None'}
- Winning Content Pillars: ${optimizationContext.winningContentPillars?.length ? optimizationContext.winningContentPillars.join(' | ') : 'None'}
- Weak Content Pillars: ${optimizationContext.weakContentPillars?.length ? optimizationContext.weakContentPillars.join(' | ') : 'None'}
- Winning Visual Styles: ${optimizationContext.winningVisualStyles?.length ? optimizationContext.winningVisualStyles.join(' | ') : 'None'}
- Weak Visual Styles: ${optimizationContext.weakVisualStyles?.length ? optimizationContext.weakVisualStyles.join(' | ') : 'None'}
- Experiment Outcomes: ${optimizationContext.experimentOutcomes?.map((e) => `Experiment "${e.name}" (${e.experimentType}): Winner = ${e.winningVariant || 'Inconclusive'} - ${e.resultSummary || ''}`).join('; ') || 'No completed experiments yet'}
- Specific Metrics: ${optimizationContext.verifiedPerformanceData?.map((v) => `${v.metric}: ${v.value} (${v.context})`).join('; ') || 'None recorded'}

[SECTION 2: AI OPTIMIZATION RECOMMENDATIONS]
${optimizationContext.aiRecommendations?.map((r) => `- Recommendation: ${r.recommendation} | Reason: ${r.reason} | Expected Impact: ${r.expectedImpact}`).join('\n') || '- None'}
`
    : '';

  return `
You are the AI Chief Marketing Officer & Growth Strategist for VidSnapAI.
Your task is to synthesize a high-converting, realistic, and comprehensive MARKETING STRATEGY for this brand.

=========================================
BRAND IDENTITY & KNOWLEDGE
=========================================
Brand Name: ${brandName}
Industry: ${industry}
Description: ${description}
Story & Mission: ${story}
Brand Voice & Tone: ${voice}
Website: ${brand.websiteUrl || 'Not specified'}

${dnaSummary}

${optimizationSection}

=========================================
PRODUCT & OFFERINGS CATALOG
=========================================
${productDetails}

=========================================
MARKETING OBJECTIVES & GOALS
=========================================
Primary Marketing Objective: ${input.objective}
Business Goal: ${input.businessGoal}
Marketing Goal: ${input.marketingGoal}
${input.campaignRequirements ? `Additional Campaign Requirements: ${input.campaignRequirements}` : ''}

=========================================
STRICT STRATEGIC RULES & GUARDRAILS
=========================================
1. DO NOT invent unsupported claims, fake guarantees, or fake technical specs.
2. DO NOT contradict the Brand DNA or stored brand restrictions.
3. DO NOT invent fictitious pricing or unauthorized discounts.
4. DO NOT generate finished social posts, scripts, or final video reels. Generate STRATEGIC PLANNING DATA only.
5. Create realistic, multi-stage funnel guidance (Awareness -> Consideration -> Conversion -> Retention).
6. Provide clear, actionable content mix percentages (totaling 100%) and channel guidance.
7. Set clear KPIs categorized by funnel stage.
${optimizationContext ? '8. Intersperse verified winning patterns and avoid weak patterns identified in historical performance intelligence.' : ''}

Synthesize the full Marketing Strategy JSON matching the required schema.
`.trim();
}
