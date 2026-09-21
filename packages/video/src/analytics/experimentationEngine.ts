import type { ExperimentRecord, ExperimentStatus } from '@vidsnapai/types';

export type ExperimentOutcomeResult = 'WINNER_A' | 'WINNER_B' | 'NO_SIGNIFICANT_DIFFERENCE' | 'INCONCLUSIVE';

export interface EvaluationResult {
  status: ExperimentStatus;
  sampleSizeA: number;
  sampleSizeB: number;
  confidenceScore: number | null;
  winningVariant: 'A' | 'B' | 'INCONCLUSIVE' | null;
  outcome?: ExperimentOutcomeResult;
  resultSummary: string;
}

export interface CreateExperimentParams {
  brandId: string;
  name: string;
  experimentType: 'HOOK' | 'CTA' | 'CAPTION' | 'CREATIVE' | 'OFFER';
  hypothesis: string;
  controlVariant: {
    label: string;
    reelId?: string;
    content?: Record<string, unknown>;
  };
  challengerVariant: {
    label: string;
    reelId?: string;
    content?: Record<string, unknown>;
  };
  targetMetric?: string;
  minSampleSize?: number;
}

export class ExperimentationEngine {
  private readonly MIN_SAMPLE_SIZE = 30; // Minimum impressions/events required per variant

  /**
   * Evaluates A/B experiment data with statistical rigor.
   * Safety Guarantee: Never declares a winner with insufficient sample size.
   */
  evaluate(experiment: ExperimentRecord): EvaluationResult {
    const varA = experiment.variantA;
    const varB = experiment.variantB;

    const sampleSizeA = varA.impressions || varA.videoViews || 0;
    const sampleSizeB = varB.impressions || varB.videoViews || 0;

    const conversionsA = varA.conversions || varA.clicks || 0;
    const conversionsB = varB.conversions || varB.clicks || 0;

    // 1. Insufficient data check
    if (sampleSizeA < this.MIN_SAMPLE_SIZE || sampleSizeB < this.MIN_SAMPLE_SIZE) {
      return {
        status: 'INCONCLUSIVE',
        sampleSizeA,
        sampleSizeB,
        confidenceScore: null,
        winningVariant: 'INCONCLUSIVE',
        outcome: 'INCONCLUSIVE',
        resultSummary: `Insufficient sample size to evaluate experiment. Variant A: ${sampleSizeA}, Variant B: ${sampleSizeB} (Minimum ${this.MIN_SAMPLE_SIZE} required per variant).`
      };
    }

    // 2. Metric conversion rate calculation
    const rateA = conversionsA / sampleSizeA;
    const rateB = conversionsB / sampleSizeB;

    // 3. Pooled standard error & Z-score calculation
    const pooledRate = (conversionsA + conversionsB) / (sampleSizeA + sampleSizeB);
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / sampleSizeA + 1 / sampleSizeB));

    if (standardError === 0) {
      return {
        status: 'COMPLETED',
        sampleSizeA,
        sampleSizeB,
        confidenceScore: 0.5,
        winningVariant: 'INCONCLUSIVE',
        outcome: 'NO_SIGNIFICANT_DIFFERENCE',
        resultSummary: 'Both variants performed identically with zero variance.'
      };
    }

    const zScore = Math.abs(rateA - rateB) / standardError;
    // Approximation of normal CDF for 2-tailed test
    const confidenceScore = Number((1 - Math.exp(-0.717 * zScore - 0.416 * zScore * zScore)).toFixed(3));

    // 4. Determine Winner with >= 90% confidence
    if (confidenceScore >= 0.90) {
      const winner = rateA > rateB ? 'A' : 'B';
      const outcome: ExperimentOutcomeResult = winner === 'A' ? 'WINNER_A' : 'WINNER_B';
      const winningRate = (Math.max(rateA, rateB) * 100).toFixed(2);
      const losingRate = (Math.min(rateA, rateB) * 100).toFixed(2);
      const lift = (((Math.max(rateA, rateB) - Math.min(rateA, rateB)) / Math.max(0.001, Math.min(rateA, rateB))) * 100).toFixed(1);

      return {
        status: 'COMPLETED',
        sampleSizeA,
        sampleSizeB,
        confidenceScore,
        winningVariant: winner,
        outcome,
        resultSummary: `Variant ${winner} won with ${(confidenceScore * 100).toFixed(1)}% statistical confidence (${winningRate}% vs ${losingRate}% conversion rate, +${lift}% lift).`
      };
    }

    return {
      status: 'COMPLETED',
      sampleSizeA,
      sampleSizeB,
      confidenceScore,
      winningVariant: 'INCONCLUSIVE',
      outcome: 'NO_SIGNIFICANT_DIFFERENCE',
      resultSummary: `Data evaluation complete. Difference between Variant A (${(rateA * 100).toFixed(2)}%) and Variant B (${(rateB * 100).toFixed(2)}%) is not statistically significant (Confidence: ${(confidenceScore * 100).toFixed(1)}%, 90% threshold required).`
    };
  }
}

