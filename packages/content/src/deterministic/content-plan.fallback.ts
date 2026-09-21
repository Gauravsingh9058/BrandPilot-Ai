import type {
  Brand,
  BrandDNA,
  BrandProduct,
  MarketingStrategy,
  Campaign,
  ContentPlanOutput,
  ContentJobOutput,
  WeeklyNarrative,
  ContentType,
  ContentFormat,
  ContentPlatform,
  ContentJobPriority
} from '@vidsnapai/types';

export function buildDeterministicContentPlan(params: {
  brand: Brand;
  brandDna?: BrandDNA | null;
  products?: BrandProduct[];
  marketingStrategy?: MarketingStrategy | null;
  campaign?: Campaign | null;
  durationDays?: number;
  platforms?: string[];
  customGuidance?: string | null;
}): ContentPlanOutput {
  const { brand, brandDna, products = [], marketingStrategy, campaign, durationDays = 30, platforms = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS'], customGuidance: _customGuidance } = params;

  const brandName = brand.name || 'Brand';
  const industry = brand.industry || 'Lifestyle';
  const planName = `${brandName} ${durationDays}-Day Strategic Content Plan`;
  const objective = campaign?.objective || marketingStrategy?.marketingGoal || 'Drive brand awareness, high engagement, and steady conversions';
  const campaignTheme = campaign?.description || marketingStrategy?.messagingStrategy?.brandNarrativeHook || `${brandName} ${industry} Essentials & Empowerment`;
  const executiveSummary = `A high-performing ${durationDays}-day strategic video content calendar engineered for ${brandName}. Designed to guide target audiences through Awareness, Consideration, and Conversion with high visual fidelity and brand authority.`;

  const totalWeeks = Math.ceil(durationDays / 7);
  const weeklyNarratives: WeeklyNarrative[] = [];

  const defaultThemes = [
    {
      theme: 'Foundations & Brand Story Awakening',
      focusObjective: 'Capture immediate attention, spark curiosity, and frame category challenges',
      funnelFocus: 'AWARENESS',
      strategicPurpose: 'Establish brand credibility, aesthetic signature, and primary audience connection.'
    },
    {
      theme: 'Deep Value & Everyday Mastery',
      focusObjective: 'Deliver actionable insights, lifestyle breakdowns, and solve customer pain points',
      funnelFocus: 'CONSIDERATION',
      strategicPurpose: 'Demonstrate product superiority, utility, and authentic value proposition.'
    },
    {
      theme: 'Social Proof & Product Spotlight',
      focusObjective: 'Overcome objections, highlight community validation, and showcase core offerings',
      funnelFocus: 'CONSIDERATION',
      strategicPurpose: 'Build undeniable trust and desire through testimonials, styling, and demonstrations.'
    },
    {
      theme: 'High-Urgency Conversion & Direct Action',
      focusObjective: 'Drive immediate purchases, clear calls to action, and exclusive campaign incentives',
      funnelFocus: 'CONVERSION',
      strategicPurpose: 'Maximize revenue and acquisition using time-sensitive offers and bold CTAs.'
    },
    {
      theme: 'Community Momentum & Retention',
      focusObjective: 'Reinforce customer loyalty, celebrate user stories, and encourage ongoing engagement',
      funnelFocus: 'RETENTION',
      strategicPurpose: 'Cement long-term brand advocacy and repeatable engagement.'
    }
  ];

  for (let w = 1; w <= totalWeeks; w++) {
    const defaultInfo = defaultThemes[(w - 1) % defaultThemes.length];
    weeklyNarratives.push({
      weekNumber: w,
      theme: `Week ${w}: ${defaultInfo.theme}`,
      focusObjective: defaultInfo.focusObjective,
      funnelFocus: defaultInfo.funnelFocus,
      strategicPurpose: defaultInfo.strategicPurpose
    });
  }

  const pillars = brand.contentPillars && brand.contentPillars.length > 0
    ? brand.contentPillars
    : ['Style & Identity', 'Behind The Craft', 'Everyday Confidence', 'Performance & Gear'];

  const contentTypes: ContentType[] = [
    'EDUCATIONAL',
    'STORYTELLING',
    'PROBLEM_AGITATION',
    'BEHIND_THE_SCENES',
    'SOCIAL_PROOF',
    'AUTHORITY',
    'PROMOTIONAL',
    'ENGAGEMENT'
  ];

  const formats: ContentFormat[] = [
    'SHORT_REEL',
    'TALKING_HEAD_REEL',
    'PRODUCT_SHOWCASE_REEL',
    'TUTORIAL_REEL',
    'TESTIMONIAL_REEL',
    'TREND_REEL'
  ];

  const validPlatforms: ContentPlatform[] = (platforms as ContentPlatform[]).filter((p) =>
    ['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS', 'FACEBOOK', 'LINKEDIN', 'TWITTER'].includes(p)
  );
  const selectedPlatforms = validPlatforms.length > 0 ? validPlatforms : (['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS'] as ContentPlatform[]);

  const jobs: ContentJobOutput[] = [];

  for (let day = 1; day <= durationDays; day++) {
    const weekNumber = Math.ceil(day / 7);
    let funnelStage: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION';

    if (weekNumber === 1) {
      funnelStage = day % 4 === 0 ? 'CONSIDERATION' : 'AWARENESS';
    } else if (weekNumber === 2) {
      funnelStage = day % 3 === 0 ? 'AWARENESS' : 'CONSIDERATION';
    } else if (weekNumber === 3) {
      funnelStage = day % 3 === 0 ? 'CONVERSION' : 'CONSIDERATION';
    } else if (weekNumber === 4) {
      funnelStage = day % 2 === 0 ? 'CONVERSION' : 'CONSIDERATION';
    } else {
      funnelStage = 'RETENTION';
    }

    const contentType = contentTypes[(day - 1) % contentTypes.length];
    const contentPillar = pillars[(day - 1) % pillars.length];
    const format = formats[(day - 1) % formats.length];
    const platform = selectedPlatforms[(day - 1) % selectedPlatforms.length];
    const priority: ContentJobPriority = funnelStage === 'CONVERSION' ? 'HIGH' : day % 2 === 0 ? 'MEDIUM' : 'LOW';

    const product = products.length > 0 ? products[(day - 1) % products.length] : null;
    const productName = product ? product.name : `${brandName} Signature Essential`;

    const title = `Day ${day}: ${contentPillar} — ${contentType.replace(/_/g, ' ')}`;
    const topic = `${contentPillar} breakdown focusing on ${productName}`;
    const hook = day % 2 === 0
      ? `The one mistake you're making with your daily ${industry.toLowerCase()} routine...`
      : `Why ${brandName} is changing the standard in modern ${industry.toLowerCase()}...`;
    const keyMessage = `Experience modern craftsmanship, effortless utility, and authentic confidence with ${brandName}.`;
    const messagingAngle = `${contentType.replace(/_/g, ' ')} angle highlighting distinct value proposition.`;
    const cta = funnelStage === 'CONVERSION'
      ? (campaign?.primaryCta || brand.primaryCta || 'Shop the Collection Now — Link in Bio')
      : 'Save this reel & follow for daily insights';

    jobs.push({
      dayNumber: day,
      weekNumber,
      title,
      contentType,
      funnelStage,
      contentPillar,
      objective: `Drive ${funnelStage.toLowerCase()} and educate audience on ${contentPillar}.`,
      audience: brandDna?.audience?.primaryAudience || brand.targetAudience || 'Modern discerning consumers',
      topic,
      hook,
      keyMessage,
      messagingAngle,
      offer: funnelStage === 'CONVERSION' ? (campaign?.offer || brand.offers?.[0] || 'Exclusive limited-time discount') : null,
      cta,
      platform,
      format,
      priority,
      suggestedVisualHook: `High-energy dynamic 9:16 vertical opening with quick cinematic cut showcasing ${productName}.`,
      suggestedAudioConcept: `Punchy rhythmic beat with clear, authoritative voiceover.`,
      keyTakeaway: `Viewers recognize the high quality and modern relevance of ${brandName}.`,
      strategicRationale: `Positions ${brandName} effectively within the ${funnelStage} phase of Day ${day}.`
    });
  }

  // Compute exact distributions
  const funnelDistribution: Record<string, number> = {};
  const contentTypeDistribution: Record<string, number> = {};
  const formatDistribution: Record<string, number> = {};
  const pillarDistribution: Record<string, number> = {};

  for (const job of jobs) {
    funnelDistribution[job.funnelStage] = (funnelDistribution[job.funnelStage] || 0) + 1;
    contentTypeDistribution[job.contentType] = (contentTypeDistribution[job.contentType] || 0) + 1;
    formatDistribution[job.format] = (formatDistribution[job.format] || 0) + 1;
    pillarDistribution[job.contentPillar] = (pillarDistribution[job.contentPillar] || 0) + 1;
  }

  return {
    planName,
    objective,
    durationDays,
    campaignTheme,
    executiveSummary,
    weeklyNarratives,
    diversificationSummary: {
      funnelDistribution,
      contentTypeDistribution,
      formatDistribution,
      pillarDistribution
    },
    jobs
  };
}
