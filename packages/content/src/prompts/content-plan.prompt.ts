import type { Brand, BrandProduct, BrandDNA, MarketingStrategy, Campaign, OptimizationContext } from '@vidsnapai/types';

export function buildContentPlanPrompt(params: {
  brand: Brand;
  brandDna?: BrandDNA | null;
  products?: BrandProduct[];
  marketingStrategy?: MarketingStrategy | null;
  campaign?: Campaign | null;
  durationDays: number;
  platforms: string[];
  customGuidance?: string | null;
  optimizationContext?: OptimizationContext | null;
}): string {
  const { brand, brandDna, products = [], marketingStrategy, campaign, durationDays, platforms, customGuidance, optimizationContext } = params;

  const optimizationSection = optimizationContext
    ? `
=======================================================
PHASE 11/12: OPTIMIZATION INTELLIGENCE & EXPERIMENT CONTEXT
=======================================================
[VERIFIED HISTORICAL PATTERNS]
- Recommended Winning Hooks: ${optimizationContext.winningHooks?.length ? optimizationContext.winningHooks.join(' | ') : 'None recorded'}
- Underperforming Hooks to Avoid: ${optimizationContext.weakHooks?.length ? optimizationContext.weakHooks.join(' | ') : 'None'}
- High-Converting Messaging Angles: ${optimizationContext.winningMessagingAngles?.length ? optimizationContext.winningMessagingAngles.join(' | ') : 'None recorded'}
- Angles to Avoid: ${optimizationContext.weakMessagingAngles?.length ? optimizationContext.weakMessagingAngles.join(' | ') : 'None'}
- Top Performing CTAs: ${optimizationContext.winningCTAs?.length ? optimizationContext.winningCTAs.join(' | ') : 'None recorded'}
- Weak CTAs to Avoid: ${optimizationContext.weakCTAs?.length ? optimizationContext.weakCTAs.join(' | ') : 'None'}
- Winning Content Pillars: ${optimizationContext.winningContentPillars?.length ? optimizationContext.winningContentPillars.join(' | ') : 'None'}
- Underperforming Pillars: ${optimizationContext.weakContentPillars?.length ? optimizationContext.weakContentPillars.join(' | ') : 'None'}
- Experiment Outcomes & Hypotheses: ${optimizationContext.experimentOutcomes?.map((e) => `[${e.experimentType}] ${e.name}: Winner = ${e.winningVariant || 'Inconclusive'} (${e.resultSummary || ''})`).join('; ') || 'None'}
- Strategic Directives: ${optimizationContext.aiRecommendations?.map((r) => r.recommendation).join(' | ') || 'None'}
`
    : '';

  return `
You are VidSnapAI's master autonomous Content Planning AI.
Your objective is to engineer a high-performing, strategically balanced, and fully diversified ${durationDays}-Day Content Plan for the brand "${brand.name}".

${optimizationSection}

=======================================================
BRAND CONTEXT & BRAND DNA
=======================================================
- Brand Name: ${brand.name}
- Industry: ${brand.industry}
- Description: ${brand.description}
- Target Audience: ${brand.targetAudience || 'Target market for ' + brand.industry}
- Brand Voice: ${brand.brandVoice || 'Engaging, authoritative, relatable'}
- Primary CTA: ${brand.primaryCta || 'Learn More / Visit Link in Bio'}
- Core Offers: ${brand.offers?.join(', ') || 'Special offers and primary product catalog'}
- Content Pillars: ${brand.contentPillars?.join(', ') || 'Industry Tips, Product Spotlights, Behind The Scenes, Customer Stories'}

${
  brandDna
    ? `
- Brand Story: ${brandDna.identity?.story || brand.story || 'N/A'}
- Audience Pain Points: ${brandDna.audience?.painPoints?.join(', ') || 'N/A'}
- Desires & Motivations: ${brandDna.audience?.desires?.join(', ') || 'N/A'}
- Core Positioning: ${brandDna.messaging?.positioning || 'N/A'}
- Value Proposition: ${brandDna.messaging?.valueProposition || 'N/A'}
- Tone Guidelines: ${brandDna.messaging?.tone?.join(', ') || 'N/A'}
- Guardrails / Claims to Avoid: ${brandDna.promotionRules?.claimsToAvoid?.join(', ') || 'N/A'}
`
    : ''
}

${
  products.length > 0
    ? `
=======================================================
FEATURED PRODUCTS / SERVICES
=======================================================
${products
  .map(
    (p, i) => `Product ${i + 1}: ${p.name} (${p.category || 'General'})
- Description: ${p.description}
- Benefits: ${p.benefits?.join(', ') || 'N/A'}
- Features: ${p.features?.join(', ') || 'N/A'}
- USPs: ${p.usps?.join(', ') || 'N/A'}`
  )
  .join('\n\n')}
`
    : ''
}

${
  campaign
    ? `
=======================================================
CAMPAIGN CONTEXT
=======================================================
- Campaign Name: ${campaign.name}
- Campaign Objective: ${campaign.objective}
- Campaign Description: ${campaign.description}
- Core Message: ${campaign.coreMessage || 'N/A'}
- Campaign Offer: ${campaign.offer || 'N/A'}
- Campaign Primary CTA: ${campaign.primaryCta || brand.primaryCta || 'N/A'}
`
    : ''
}

${
  marketingStrategy
    ? `
=======================================================
MARKETING STRATEGY DIRECTIVES
=======================================================
- Strategic Objective: ${marketingStrategy.objective}
- Business Goal: ${marketingStrategy.businessGoal}
- Marketing Goal: ${marketingStrategy.marketingGoal}
- Brand Narrative Hook: ${marketingStrategy.messagingStrategy?.brandNarrativeHook}
- Key Themes: ${marketingStrategy.messagingStrategy?.keyThemes?.join(', ')}
- Funnel Strategy: Awareness -> Consideration -> Conversion -> Retention
- Guardrails: ${marketingStrategy.risksAndGuardrails?.claimsToAvoid?.join(', ') || 'No unsubstantiated claims'}
`
    : ''
}

${
  customGuidance
    ? `
=======================================================
ADDITIONAL USER GUIDANCE
=======================================================
${customGuidance}
`
    : ''
}

=======================================================
PLANNING REQUIREMENTS & CONSTRAINTS
=======================================================
1. Generate EXACTLY ${durationDays} individual content jobs, numbered sequentially from dayNumber: 1 to ${durationDays}.
2. Weekly Narrative Structure:
   - Week 1 (Days 1-7): Foundations, Hooking the Audience, Problem Awareness & Category Framing.
   - Week 2 (Days 8-14): Deep Dive, Problem Agitation, Educational Value, and Authority Building.
   - Week 3 (Days 15-21): Social Proof, Product Deep Dive, Objection Handling, and Consideration.
   - Week 4 (Days 22-28): High-Urgency Offer, Transformation Stories, Direct Conversion & Clear Action.
   - Days 29-30 (if applicable): Retention, Community Building, Recap & Next Steps.
3. Content Type Mix:
   - Educational: ~30%
   - Problem Agitation / Authority: ~20%
   - Storytelling / Behind the scenes: ~20%
   - Social Proof: ~15%
   - Promotional / Direct CTA: ~15%
   - DO NOT place more than 2 promotional posts consecutively.
4. Hook Diversification:
   - Every single hook MUST be distinct, punchy, and original.
   - Avoid repeating starter clichés (e.g., do not start multiple reels with "Stop scrolling" or "Here is why").
5. Strategic Content Formats:
   - SHORT_REEL, TALKING_HEAD_REEL, PRODUCT_SHOWCASE_REEL, TUTORIAL_REEL, TESTIMONIAL_REEL, TREND_REEL, CAROUSEL_CONCEPT, IMAGE_POST, STORY_SEQUENCE.
6. Target Platforms: ${platforms.join(', ')}
7. Strict Output Scope:
   - This prompt plans the high-level concept, visual hooks, audio themes, and copy directions for the 30-day schedule.
   - DO NOT generate complete video scripts, speech timecodes, audio stems, or rendering metadata.

=======================================================
STRICT OUTPUT FORMAT & SCHEMA REQUIREMENTS
=======================================================
You must return a single raw JSON object matching the ContentPlan domain schema.
CRITICAL CONSTRAINTS:
- DO NOT wrap the output in markdown code fences (e.g. do NOT use \`\`\`json or \`\`\`).
- DO NOT add introductory or explanatory text before or after the JSON.
- DO NOT wrap the JSON inside an outer container like {"contentPlan": ...}, {"plan": ...}, or {"data": ...}. The top-level object must contain the fields directly.
- DO NOT omit any of the 8 required top-level fields.
- DO NOT use null for required fields.
- DO NOT invent alternative field names.

REQUIRED TOP-LEVEL FIELDS:
1. planName (string, required)
2. objective (string, required)
3. durationDays (number, required) - Must be ${durationDays}
4. campaignTheme (string, required)
5. executiveSummary (string, required)
6. weeklyNarratives (array of objects, required):
   Each item must contain:
   - weekNumber (number, 1..15)
   - theme (string)
   - focusObjective (string)
   - funnelFocus (string: "AWARENESS" | "CONSIDERATION" | "CONVERSION" | "RETENTION")
   - strategicPurpose (string)
7. diversificationSummary (object, required):
   Must contain:
   - funnelDistribution (record of stage name to number of jobs)
   - contentTypeDistribution (record of content type to number of jobs)
   - formatDistribution (record of format name to number of jobs)
   - pillarDistribution (record of pillar name to number of jobs)
8. jobs (array of objects, minimum 7 jobs, exactly ${durationDays} jobs):
   Each job must contain:
   - dayNumber (number, 1..${durationDays})
   - weekNumber (number, 1..15)
   - title (string)
   - contentType (string, MUST BE ONE OF: "EDUCATIONAL", "PROMOTIONAL", "STORYTELLING", "SOCIAL_PROOF", "ENGAGEMENT", "AUTHORITY", "BEHIND_THE_SCENES", "PROBLEM_AGITATION")
   - funnelStage (string, MUST BE ONE OF: "AWARENESS", "CONSIDERATION", "CONVERSION", "RETENTION")
   - contentPillar (string)
   - objective (string)
   - audience (string)
   - topic (string)
   - hook (string)
   - keyMessage (string)
   - messagingAngle (string)
   - offer (string or null)
   - cta (string)
   - platform (string, MUST BE ONE OF: "INSTAGRAM", "TIKTOK", "YOUTUBE_SHORTS", "FACEBOOK", "LINKEDIN", "TWITTER")
   - format (string, MUST BE ONE OF: "SHORT_REEL", "TALKING_HEAD_REEL", "PRODUCT_SHOWCASE_REEL", "TUTORIAL_REEL", "TESTIMONIAL_REEL", "TREND_REEL", "CAROUSEL_CONCEPT", "IMAGE_POST", "STORY_SEQUENCE")
   - priority (string, MUST BE ONE OF: "LOW", "MEDIUM", "HIGH")
   - suggestedVisualHook (string, optional)
   - suggestedAudioConcept (string, optional)
   - keyTakeaway (string, optional)
   - strategicRationale (string, optional)

EXAMPLE JSON SHAPE:
{
  "planName": "${brand.name} 30-Day Strategic Content Plan",
  "objective": "${marketingStrategy?.marketingGoal || 'Drive audience engagement and conversions'}",
  "durationDays": ${durationDays},
  "campaignTheme": "Theme description...",
  "executiveSummary": "Executive summary...",
  "weeklyNarratives": [
    {
      "weekNumber": 1,
      "theme": "Theme title",
      "focusObjective": "Focus objective",
      "funnelFocus": "AWARENESS",
      "strategicPurpose": "Strategic purpose"
    }
  ],
  "diversificationSummary": {
    "funnelDistribution": { "AWARENESS": 10, "CONSIDERATION": 12, "CONVERSION": 6, "RETENTION": 2 },
    "contentTypeDistribution": { "EDUCATIONAL": 9, "PROBLEM_AGITATION": 6, "STORYTELLING": 6, "SOCIAL_PROOF": 5, "PROMOTIONAL": 4 },
    "formatDistribution": { "SHORT_REEL": 12, "TALKING_HEAD_REEL": 8, "PRODUCT_SHOWCASE_REEL": 6, "TUTORIAL_REEL": 4 },
    "pillarDistribution": { "Tips": 10, "Showcase": 8, "Stories": 6, "Authority": 6 }
  },
  "jobs": [
    {
      "dayNumber": 1,
      "weekNumber": 1,
      "title": "Clear catchy title",
      "contentType": "EDUCATIONAL",
      "funnelStage": "AWARENESS",
      "contentPillar": "One of the brand pillars",
      "objective": "Clear single-sentence objective",
      "audience": "Target segment",
      "topic": "Core topic being addressed",
      "hook": "The opening 3-second hook",
      "keyMessage": "Key core takeaway message",
      "messagingAngle": "Strategic angle",
      "offer": null,
      "cta": "Save this reel for later",
      "platform": "INSTAGRAM",
      "format": "SHORT_REEL",
      "priority": "MEDIUM",
      "suggestedVisualHook": "Visual direction for opening frame",
      "suggestedAudioConcept": "Trending upbeat audio with voiceover",
      "keyTakeaway": "What the viewer learns",
      "strategicRationale": "Why this post belongs on Day 1"
    }
  ]
}
`;
}
