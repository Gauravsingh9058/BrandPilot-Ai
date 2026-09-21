import type { ContentJobOutput } from '@vidsnapai/types';

export interface DiversificationAnalysis {
  score: number; // 0 - 100
  passed: boolean;
  warnings: string[];
  metrics: {
    totalJobs: number;
    uniquePillarsCount: number;
    funnelDistribution: Record<string, number>;
    contentTypeDistribution: Record<string, number>;
    formatDistribution: Record<string, number>;
    repetitionIssuesCount: number;
    consecutiveDuplicatesCount: number;
  };
  repetitionIssues: Array<{
    dayNumberA: number;
    dayNumberB: number;
    type: 'DUPLICATE_HOOK' | 'SIMILAR_TOPIC' | 'CONSECUTIVE_PROMO' | 'CONSECUTIVE_FORMAT';
    description: string;
  }>;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function calculateJaccardSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(normalizeText(textA).split(' ').filter(w => w.length > 2));
  const wordsB = new Set(normalizeText(textB).split(' ').filter(w => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

export function analyzeDiversification(jobs: ContentJobOutput[]): DiversificationAnalysis {
  const warnings: string[] = [];
  const repetitionIssues: DiversificationAnalysis['repetitionIssues'] = [];
  const funnelDistribution: Record<string, number> = {};
  const contentTypeDistribution: Record<string, number> = {};
  const formatDistribution: Record<string, number> = {};
  const pillars = new Set<string>();

  let consecutivePromoCount = 0;
  let consecutiveFormatCount = 0;
  let penaltyPoints = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    pillars.add(job.contentPillar);

    // Track funnel
    funnelDistribution[job.funnelStage] = (funnelDistribution[job.funnelStage] || 0) + 1;
    // Track type
    contentTypeDistribution[job.contentType] = (contentTypeDistribution[job.contentType] || 0) + 1;
    // Track format
    formatDistribution[job.format] = (formatDistribution[job.format] || 0) + 1;

    // Check consecutive promotional
    if (job.contentType === 'PROMOTIONAL') {
      consecutivePromoCount++;
      if (consecutivePromoCount >= 3) {
        penaltyPoints += 10;
        repetitionIssues.push({
          dayNumberA: job.dayNumber - 1,
          dayNumberB: job.dayNumber,
          type: 'CONSECUTIVE_PROMO',
          description: `Day ${job.dayNumber} has 3 or more consecutive promotional posts without educational or engagement buffer.`
        });
      }
    } else {
      consecutivePromoCount = 0;
    }

    // Check consecutive identical formats
    if (i > 0 && jobs[i - 1].format === job.format && ['PRODUCT_SHOWCASE_REEL', 'CAROUSEL_CONCEPT'].includes(job.format)) {
      consecutiveFormatCount++;
      if (consecutiveFormatCount >= 3) {
        penaltyPoints += 5;
        repetitionIssues.push({
          dayNumberA: jobs[i - 1].dayNumber,
          dayNumberB: job.dayNumber,
          type: 'CONSECUTIVE_FORMAT',
          description: `Day ${jobs[i - 1].dayNumber} and Day ${job.dayNumber} use the same format (${job.format}) consecutively.`
        });
      }
    } else {
      consecutiveFormatCount = 0;
    }

    // Check hook & topic similarity with all other jobs
    for (let j = i + 1; j < jobs.length; j++) {
      const other = jobs[j];

      // Hook similarity
      const hookSimilarity = calculateJaccardSimilarity(job.hook, other.hook);
      if (hookSimilarity > 0.65) {
        penaltyPoints += 15;
        repetitionIssues.push({
          dayNumberA: job.dayNumber,
          dayNumberB: other.dayNumber,
          type: 'DUPLICATE_HOOK',
          description: `Day ${job.dayNumber} and Day ${other.dayNumber} have nearly identical hooks: "${job.hook}" vs "${other.hook}".`
        });
      }

      // Topic similarity
      const topicSimilarity = calculateJaccardSimilarity(job.topic, other.topic);
      if (topicSimilarity > 0.75) {
        penaltyPoints += 10;
        repetitionIssues.push({
          dayNumberA: job.dayNumber,
          dayNumberB: other.dayNumber,
          type: 'SIMILAR_TOPIC',
          description: `Day ${job.dayNumber} and Day ${other.dayNumber} address virtually the same topic: "${job.topic}" vs "${other.topic}".`
        });
      }
    }
  }

  // Funnel balance checks
  const total = jobs.length;
  const awarenessRatio = (funnelDistribution['AWARENESS'] || 0) / (total || 1);
  const conversionRatio = (funnelDistribution['CONVERSION'] || 0) / (total || 1);

  if (awarenessRatio < 0.2) {
    penaltyPoints += 10;
    warnings.push('Top-of-funnel awareness content is less than 20% of the plan. Brand discovery may be hindered.');
  }
  if (conversionRatio > 0.5) {
    penaltyPoints += 10;
    warnings.push('Bottom-of-funnel conversion content exceeds 50% of the plan. Audience fatigue may occur.');
  }
  if (pillars.size < 2 && total >= 7) {
    penaltyPoints += 15;
    warnings.push('Plan utilizes fewer than 2 content pillars. Content variety is restricted.');
  }

  const score = Math.max(0, Math.min(100, 100 - penaltyPoints));
  const passed = score >= 60 && repetitionIssues.filter(r => r.type === 'DUPLICATE_HOOK').length === 0;

  if (repetitionIssues.length > 0) {
    warnings.push(`Detected ${repetitionIssues.length} repetition or cadence issue(s) in the content schedule.`);
  }

  return {
    score,
    passed,
    warnings,
    metrics: {
      totalJobs: total,
      uniquePillarsCount: pillars.size,
      funnelDistribution,
      contentTypeDistribution,
      formatDistribution,
      repetitionIssuesCount: repetitionIssues.length,
      consecutiveDuplicatesCount: repetitionIssues.filter(r => r.type.startsWith('CONSECUTIVE')).length
    },
    repetitionIssues
  };
}
