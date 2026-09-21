import type {
  Brand,
  BrandDNA,
  Campaign,
  MarketingStrategy,
  GenerateCampaignStrategyInput,
  CampaignStrategyOutput
} from '@vidsnapai/types';

/**
 * Builds a deterministic, fully schema-compliant Campaign Strategy fallback
 * utilizing all available Brand DNA, Master Strategy, and Campaign context.
 */
export function buildDeterministicCampaignStrategy(
  brand: Brand,
  brandDna: BrandDNA | null,
  marketingStrategy: MarketingStrategy | null,
  campaign: Campaign,
  _input?: GenerateCampaignStrategyInput
): CampaignStrategyOutput {
  const brandName = brand.name;
  const industry = brand.industry || 'General Industry';
  const campaignName = campaign.name;
  const _campaignDesc = campaign.description || `${brandName} strategic campaign`;
  const objective = String(campaign.objective || 'BRAND_AWARENESS');
  const offer = campaign.offer || 'Exclusive limited-time promotional offer';
  const primaryCta = campaign.primaryCta || brand.primaryCta || 'Learn More';
  const coreMessage =
    campaign.coreMessage ||
    marketingStrategy?.messagingStrategy?.brandNarrativeHook ||
    brandDna?.messaging?.coreMessage ||
    `${brandName} delivers exceptional quality and performance.`;

  const audiencePrimary =
    brandDna?.audience?.primaryAudience ||
    (marketingStrategy?.targetAudience?.primarySegments?.[0]) ||
    brand.targetAudience ||
    'Modern Consumers & Active Professionals';

  const painPoints =
    brandDna?.audience?.painPoints && brandDna.audience.painPoints.length > 0
      ? brandDna.audience.painPoints
      : ['Slow and inconsistent results', 'Lack of authentic lifestyle and product fit', 'High friction in decision making'];

  const desires =
    brandDna?.audience?.desires && brandDna.audience.desires.length > 0
      ? brandDna.audience.desires
      : ['Effortless individual style and confidence', 'Premium quality and verified durability', 'Streamlined user experience'];

  const motivations =
    brandDna?.audience?.buyingMotivations && brandDna.audience.buyingMotivations.length > 0
      ? brandDna.audience.buyingMotivations
      : ['Value for premium craftsmanship', 'Self-expression and empowerment', 'Trust and community reputation'];

  const contentPillars =
    campaign.contentPillars && campaign.contentPillars.length > 0
      ? campaign.contentPillars
      : brand.contentPillars && brand.contentPillars.length > 0
      ? brand.contentPillars
      : ['Product Spotlight', 'Behind the Craft', 'Community Stories', 'Practical Tips & Masterclasses'];

  const claimsToAvoid =
    brandDna?.promotionRules?.claimsToAvoid && brandDna.promotionRules.claimsToAvoid.length > 0
      ? brandDna.promotionRules.claimsToAvoid
      : ['Unrealistic overnight results', 'Misleading guarantees'];

  const restrictions =
    brandDna?.promotionRules?.brandRestrictions && brandDna.promotionRules.brandRestrictions.length > 0
      ? brandDna.promotionRules.brandRestrictions
      : ['Adhere strictly to official brand voice, typography, and palette'];

  const channels = campaign.channels && campaign.channels.length > 0
    ? campaign.channels
    : ['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS'];

  const channelStrategy = channels.map((channel) => ({
    channel: String(channel).toUpperCase(),
    role: `Drive targeted ${objective.toLowerCase()} and audience engagement`,
    contentApproach: 'Dynamic short-form video reels with bold visual typography and clear narrative pacing',
    formatGuidance: '9:16 vertical video (15-30s) optimized for mobile feeds',
    ctaStrategy: `Direct action towards ${primaryCta}`
  }));

  return {
    objective,
    audience: {
      primary: audiencePrimary,
      secondary: 'Trend-conscious consumers and high-intent decision makers',
      painPoints,
      desires,
      motivations
    },
    positioning: `${brandName} is the premier brand in ${industry}, empowering customers with distinction and modern excellence.`,
    corePromise: `${campaignName}: ${coreMessage}`,
    keyMessages: [
      `${brandName} empowers you with purpose and distinct performance.`,
      `Engineered with verified excellence and uncompromising attention to detail.`,
      `${offer} — take action today with ${primaryCta}.`
    ],
    messagingAngles: [
      'Authentic Self-Expression & Confidence',
      'Engineered Excellence & Daily Practicality',
      'Transformative Quality & High Value'
    ],
    contentPillars,
    contentMix: [
      {
        type: 'EDUCATIONAL',
        percentage: 35,
        purpose: 'Deep-dive product walkthroughs, style guides, and practical tips',
        funnelStage: 'AWARENESS'
      },
      {
        type: 'STORYTELLING',
        percentage: 35,
        purpose: 'Brand journey, customer transformations, and authentic lifestyle reels',
        funnelStage: 'CONSIDERATION'
      },
      {
        type: 'PROMOTIONAL',
        percentage: 30,
        purpose: 'Direct offer features, countdown incentives, and exclusive drops',
        funnelStage: 'CONVERSION'
      }
    ],
    funnel: {
      awareness: {
        message: `Discover the next level of ${industry} with ${brandName}.`,
        formatGuidance: 'High-energy 9:16 vertical short reels featuring visual hooks in the first 3 seconds.',
        cta: 'Explore More'
      },
      consideration: {
        message: `See why modern consumers choose ${brandName} for verifiable performance and everyday excellence.`,
        formatGuidance: 'In-depth feature breakdown and authentic user proof comparisons.',
        cta: 'Learn the Details'
      },
      conversion: {
        message: `Take advantage of our ${offer} before this campaign concludes.`,
        formatGuidance: 'Direct product showcase with clear benefit callouts and primary CTA badge.',
        cta: primaryCta
      }
    },
    offerStrategy: offer,
    ctaStrategy: `Drive measurable action with clear, prominent prompts across all channels: ${primaryCta}.`,
    channelStrategy,
    kpis: {
      primary: ['Total Video Views', 'Click-Through Rate (CTR)', 'Engagement Rate', 'Conversions'],
      targets: ['500,000+ targeted impressions', '3.0%+ CTR', '2.0%+ conversion rate']
    },
    guardrails: {
      claimsToAvoid,
      restrictions
    }
  };
}
