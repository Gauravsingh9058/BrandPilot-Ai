import type { Brand, BrandDNA, Campaign, MarketingStrategy, GenerateCampaignStrategyInput } from '@vidsnapai/types';

export function buildCampaignStrategyPrompt(
  brand: Brand,
  brandDna: BrandDNA | null,
  marketingStrategy: MarketingStrategy | null,
  campaign: Campaign,
  input?: GenerateCampaignStrategyInput
): string {
  const brandName = brand.name;
  const campaignName = campaign.name;
  const campaignDesc = campaign.description;
  const campaignObj = campaign.objective;
  const channels = campaign.channels.length > 0 ? campaign.channels.join(', ') : 'Instagram, TikTok, YouTube Shorts';
  const offer = campaign.offer || 'Standard brand offering';
  const primaryCta = campaign.primaryCta || brand.primaryCta || 'Learn More';
  const coreMessage = campaign.coreMessage || marketingStrategy?.messagingStrategy.brandNarrativeHook || 'Brand Excellence';

  const strategyContext = marketingStrategy
    ? `
ACTIVE MARKETING STRATEGY CONTEXT:
- Business Goal: ${marketingStrategy.businessGoal}
- Marketing Goal: ${marketingStrategy.marketingGoal}
- Target Segments: ${marketingStrategy.targetAudience.primarySegments.join(', ')}
- Positioning: ${marketingStrategy.positioning.valuePropositionStatement}
- Competitive Moat: ${marketingStrategy.positioning.competitiveMoat}
- Key Themes: ${marketingStrategy.messagingStrategy.keyThemes.join(', ')}
- Content Pillars: ${marketingStrategy.contentStrategy.pillars.map((p) => p.name).join(', ')}
`
    : 'No master marketing strategy recorded. Rely on Brand DNA.';

  const dnaContext = brandDna
    ? `
BRAND DNA CONTEXT:
- Core Message: ${brandDna.messaging.coreMessage}
- Primary Audience: ${brandDna.audience.primaryAudience}
- Pain Points: ${brandDna.audience.painPoints.join('; ')}
- Desires: ${brandDna.audience.desires.join('; ')}
- USPs: ${brandDna.messaging.usps.join('; ')}
- Claims to Avoid: ${brandDna.promotionRules.claimsToAvoid.join('; ')}
- Brand Restrictions: ${brandDna.promotionRules.brandRestrictions.join('; ')}
`
    : 'Brand profile details.';

  return `
You are the Campaign Director and Lead Marketing Strategist for VidSnapAI.
Your task is to synthesize a high-impact, tactical, production-ready Campaign Strategy JSON object.

=========================================
CAMPAIGN INITIATIVE DETAILS
=========================================
Brand: ${brandName} (${brand.industry})
Campaign Name: ${campaignName}
Campaign Objective: ${campaignObj}
Campaign Description: ${campaignDesc}
Target Channels: ${channels}
Offer / Incentive: ${offer}
Primary Call to Action: ${primaryCta}
Core Campaign Message: ${coreMessage}
${input?.campaignGoal ? `Specific Campaign Goal: ${input.campaignGoal}` : ''}
${input?.additionalRequirements ? `Special Requirements: ${input.additionalRequirements}` : ''}

=========================================
BRAND & MASTER MARKETING STRATEGY CONTEXT
=========================================
${strategyContext}
${dnaContext}

=========================================
EXACT REQUIRED JSON SCHEMA
=========================================
You must output ONLY a single, valid JSON object containing ALL 14 of the following top-level fields:

1. "objective": (string) The core campaign objective.
2. "audience": (object)
   - "primary": (string) Primary audience description.
   - "secondary": (string, optional) Secondary audience description.
   - "painPoints": (array of strings) Minimum 2 specific audience pain points.
   - "desires": (array of strings) Minimum 2 desired audience outcomes.
   - "motivations": (array of strings) Minimum 2 key buying motivations.
3. "positioning": (string) Tactical campaign positioning statement.
4. "corePromise": (string) The single overarching promise made to the audience.
5. "keyMessages": (array of strings) 3-5 core strategic messages.
6. "messagingAngles": (array of strings) 3-4 creative thematic angles.
7. "contentPillars": (array of strings) 3-5 tactical content pillars.
8. "contentMix": (array of objects) Must sum to 100%.
   Each item: { "type": string, "percentage": number, "purpose": string, "funnelStage": string }
9. "funnel": (object with exactly 3 stages)
   - "awareness": { "message": string, "formatGuidance": string, "cta": string }
   - "consideration": { "message": string, "formatGuidance": string, "cta": string }
   - "conversion": { "message": string, "formatGuidance": string, "cta": string }
10. "offerStrategy": (string) Strategic description of the campaign offer and incentive.
11. "ctaStrategy": (string) Concrete guidance for call-to-action usage.
12. "channelStrategy": (array of objects for each channel)
    Each item: { "channel": string, "role": string, "contentApproach": string, "formatGuidance": string, "ctaStrategy": string }
13. "kpis": (object)
    - "primary": (array of strings) Measurable primary metrics.
    - "targets": (array of strings) Concrete performance targets.
14. "guardrails": (object)
    - "claimsToAvoid": (array of strings) Forbidden claims and overpromises.
    - "restrictions": (array of strings) Compliance, style, and tone restrictions.

=========================================
CRITICAL OUTPUT RULES
=========================================
1. Output ONLY valid, raw JSON.
2. DO NOT wrap JSON in markdown code fences (NO \`\`\`json or \`\`\`).
3. DO NOT output conversational text, explanations, or preambles before or after the JSON.
4. DO NOT omit any required fields.
5. DO NOT use null for required fields or change field names.
`.trim();
}

