import type { ContentPlanOutput, ContentJobOutput, WeeklyNarrative, ContentType, ContentFormat, ContentPlatform, ContentJobPriority } from '@vidsnapai/types';

const VALID_CONTENT_TYPES: ContentType[] = [
  'EDUCATIONAL',
  'PROMOTIONAL',
  'STORYTELLING',
  'SOCIAL_PROOF',
  'ENGAGEMENT',
  'AUTHORITY',
  'BEHIND_THE_SCENES',
  'PROBLEM_AGITATION'
];

const VALID_FUNNEL_STAGES = ['AWARENESS', 'CONSIDERATION', 'CONVERSION', 'RETENTION'] as const;

const VALID_PLATFORMS: ContentPlatform[] = [
  'INSTAGRAM',
  'TIKTOK',
  'YOUTUBE_SHORTS',
  'FACEBOOK',
  'LINKEDIN',
  'TWITTER'
];

const VALID_FORMATS: ContentFormat[] = [
  'SHORT_REEL',
  'TALKING_HEAD_REEL',
  'PRODUCT_SHOWCASE_REEL',
  'TUTORIAL_REEL',
  'TESTIMONIAL_REEL',
  'TREND_REEL',
  'CAROUSEL_CONCEPT',
  'IMAGE_POST',
  'STORY_SEQUENCE'
];

const VALID_PRIORITIES: ContentJobPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

function safeParseJson(input: unknown): unknown {
  if (typeof input !== 'string') {
    return input;
  }

  let cleaned = input.trim();
  // Strip markdown code fences
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  }

  try {
    return JSON.parse(cleaned.trim());
  } catch {
    return input;
  }
}

function unwrapRootObject(obj: Record<string, unknown>): Record<string, unknown> {
  // If the object has a wrapper property (e.g. contentPlan, plan, data, result)
  if (
    obj.contentPlan &&
    typeof obj.contentPlan === 'object' &&
    !Array.isArray(obj.contentPlan) &&
    ('planName' in obj.contentPlan || 'jobs' in obj.contentPlan)
  ) {
    return obj.contentPlan as Record<string, unknown>;
  }

  if (
    obj.plan &&
    typeof obj.plan === 'object' &&
    !Array.isArray(obj.plan) &&
    ('planName' in obj.plan || 'jobs' in obj.plan)
  ) {
    return obj.plan as Record<string, unknown>;
  }

  if (
    obj.data &&
    typeof obj.data === 'object' &&
    !Array.isArray(obj.data) &&
    ('planName' in obj.data || 'jobs' in obj.data)
  ) {
    return obj.data as Record<string, unknown>;
  }

  if (
    obj.result &&
    typeof obj.result === 'object' &&
    !Array.isArray(obj.result) &&
    ('planName' in obj.result || 'jobs' in obj.result)
  ) {
    return obj.result as Record<string, unknown>;
  }

  return obj;
}

function normalizeNumber(val: unknown, fallback: number): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

function normalizeRecordNumbers(rec: unknown): Record<string, number> {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
    return {};
  }
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(rec as Record<string, unknown>)) {
    result[key] = normalizeNumber(val, 0);
  }
  return result;
}

function normalizeJob(job: unknown, index: number): ContentJobOutput {
  const j = (job && typeof job === 'object' ? job : {}) as Record<string, unknown>;

  const dayNumber = normalizeNumber(j.dayNumber, index + 1);
  const calculatedWeek = Math.ceil(dayNumber / 7);
  const weekNumber = normalizeNumber(j.weekNumber, calculatedWeek);

  const rawContentType = String(j.contentType || '').toUpperCase().trim();
  const contentType: ContentType = VALID_CONTENT_TYPES.includes(rawContentType as ContentType)
    ? (rawContentType as ContentType)
    : 'EDUCATIONAL';

  const rawFunnelStage = String(j.funnelStage || '').toUpperCase().trim();
  const funnelStage: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION' =
    (VALID_FUNNEL_STAGES as readonly string[]).includes(rawFunnelStage)
      ? (rawFunnelStage as 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION')
      : 'AWARENESS';

  const rawPlatform = String(j.platform || '').toUpperCase().trim();
  const platform: ContentPlatform = VALID_PLATFORMS.includes(rawPlatform as ContentPlatform)
    ? (rawPlatform as ContentPlatform)
    : 'INSTAGRAM';

  const rawFormat = String(j.format || '').toUpperCase().trim();
  const format: ContentFormat = VALID_FORMATS.includes(rawFormat as ContentFormat)
    ? (rawFormat as ContentFormat)
    : 'SHORT_REEL';

  const rawPriority = String(j.priority || '').toUpperCase().trim();
  const priority: ContentJobPriority = VALID_PRIORITIES.includes(rawPriority as ContentJobPriority)
    ? (rawPriority as ContentJobPriority)
    : 'MEDIUM';

  return {
    dayNumber,
    weekNumber,
    title: String(j.title || `Day ${dayNumber}: Content Spotlight`).trim(),
    contentType,
    funnelStage,
    contentPillar: String(j.contentPillar || j.pillar || 'Core Brand Pillar').trim(),
    objective: String(j.objective || 'Drive brand awareness and audience engagement').trim(),
    audience: String(j.audience || 'Target brand audience').trim(),
    topic: String(j.topic || j.title || 'Brand lifestyle insight').trim(),
    hook: String(j.hook || 'Here is something you need to see today').trim(),
    keyMessage: String(j.keyMessage || 'Experience premium quality and distinction').trim(),
    messagingAngle: String(j.messagingAngle || 'Empowering and direct').trim(),
    offer: j.offer !== undefined && j.offer !== null ? String(j.offer).trim() : null,
    cta: String(j.cta || 'Learn More / Link in Bio').trim(),
    platform,
    format,
    priority,
    suggestedVisualHook: j.suggestedVisualHook ? String(j.suggestedVisualHook).trim() : undefined,
    suggestedAudioConcept: j.suggestedAudioConcept ? String(j.suggestedAudioConcept).trim() : undefined,
    keyTakeaway: j.keyTakeaway ? String(j.keyTakeaway).trim() : undefined,
    strategicRationale: j.strategicRationale ? String(j.strategicRationale).trim() : undefined
  };
}

function normalizeWeeklyNarrative(item: unknown, index: number): WeeklyNarrative {
  const n = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  const weekNumber = normalizeNumber(n.weekNumber, index + 1);

  return {
    weekNumber,
    theme: String(n.theme || `Week ${weekNumber} Theme`).trim(),
    focusObjective: String(n.focusObjective || 'Build awareness and brand engagement').trim(),
    funnelFocus: String(n.funnelFocus || (weekNumber === 1 ? 'AWARENESS' : weekNumber === 2 ? 'CONSIDERATION' : 'CONVERSION')).toUpperCase().trim(),
    strategicPurpose: String(n.strategicPurpose || 'Establish authority and connection with the audience').trim()
  };
}

export function normalizeContentPlanOutput(rawOutput: unknown): ContentPlanOutput {
  const parsed = safeParseJson(rawOutput);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return parsed as ContentPlanOutput;
  }

  const unwrapped = unwrapRootObject(parsed as Record<string, unknown>);

  const planName = String(unwrapped.planName || unwrapped.name || '').trim();
  const objective = String(unwrapped.objective || unwrapped.marketingGoal || unwrapped.campaignGoal || '').trim();
  const durationDays = normalizeNumber(unwrapped.durationDays || unwrapped.duration, 30);
  const campaignTheme = String(unwrapped.campaignTheme || unwrapped.theme || unwrapped.coreMessage || '').trim();
  const executiveSummary = String(unwrapped.executiveSummary || unwrapped.summary || unwrapped.description || '').trim();

  // Weekly Narratives
  const rawNarratives = Array.isArray(unwrapped.weeklyNarratives) ? unwrapped.weeklyNarratives : [];
  const weeklyNarratives: WeeklyNarrative[] = rawNarratives.map((item, idx) => normalizeWeeklyNarrative(item, idx));

  // If weekly narratives array is empty, generate based on duration
  if (weeklyNarratives.length === 0) {
    const totalWeeks = Math.ceil(durationDays / 7);
    for (let w = 1; w <= totalWeeks; w++) {
      weeklyNarratives.push({
        weekNumber: w,
        theme: w === 1 ? 'Foundations & Brand Story' : w === 2 ? 'Deep Value & Problem Solving' : w === 3 ? 'Social Proof & Product Spotlight' : 'Conversion & Community Activation',
        focusObjective: w === 1 ? 'Ignite awareness and curiosity' : w === 2 ? 'Educate and demonstrate value' : w === 3 ? 'Deepen trust and handle objections' : 'Drive direct customer action',
        funnelFocus: w === 1 ? 'AWARENESS' : w === 2 ? 'CONSIDERATION' : 'CONVERSION',
        strategicPurpose: `Guide prospects through week ${w} of the campaign funnel.`
      });
    }
  }

  // Jobs
  const rawJobs = Array.isArray(unwrapped.jobs) ? unwrapped.jobs : [];
  const jobs: ContentJobOutput[] = rawJobs.map((job, idx) => normalizeJob(job, idx));

  // Diversification Summary
  const rawDiv = (unwrapped.diversificationSummary && typeof unwrapped.diversificationSummary === 'object'
    ? unwrapped.diversificationSummary
    : {}) as Record<string, unknown>;

  let funnelDistribution = normalizeRecordNumbers(rawDiv.funnelDistribution);
  let contentTypeDistribution = normalizeRecordNumbers(rawDiv.contentTypeDistribution);
  let formatDistribution = normalizeRecordNumbers(rawDiv.formatDistribution);
  let pillarDistribution = normalizeRecordNumbers(rawDiv.pillarDistribution);

  // If distribution summaries are empty, compute them dynamically from normalized jobs
  if (Object.keys(funnelDistribution).length === 0 && jobs.length > 0) {
    funnelDistribution = {};
    for (const job of jobs) {
      funnelDistribution[job.funnelStage] = (funnelDistribution[job.funnelStage] || 0) + 1;
    }
  }

  if (Object.keys(contentTypeDistribution).length === 0 && jobs.length > 0) {
    contentTypeDistribution = {};
    for (const job of jobs) {
      contentTypeDistribution[job.contentType] = (contentTypeDistribution[job.contentType] || 0) + 1;
    }
  }

  if (Object.keys(formatDistribution).length === 0 && jobs.length > 0) {
    formatDistribution = {};
    for (const job of jobs) {
      formatDistribution[job.format] = (formatDistribution[job.format] || 0) + 1;
    }
  }

  if (Object.keys(pillarDistribution).length === 0 && jobs.length > 0) {
    pillarDistribution = {};
    for (const job of jobs) {
      pillarDistribution[job.contentPillar] = (pillarDistribution[job.contentPillar] || 0) + 1;
    }
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
