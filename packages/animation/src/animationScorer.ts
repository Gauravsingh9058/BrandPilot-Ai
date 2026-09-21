import type {
  AnimationPlan,
  AnimationReadinessReport,
  AnimationBlockerCode,
  VisualRhythmPlan,
  ReelProductionPackage
} from '@vidsnapai/types';
import { AnimationValidator } from './animationValidator.js';

export class AnimationScorer {
  static evaluateRhythm(plan: Partial<AnimationPlan>): VisualRhythmPlan {
    const sceneIntensity: Record<number, 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'> = {};
    const motionDensity: Record<number, 'LOW' | 'MEDIUM' | 'HIGH'> = {};
    const emphasisMoments: Array<{
      sceneNumber: number;
      timestamp: number;
      description: string;
      target: 'BACKGROUND' | 'MEDIA' | 'PRODUCT' | 'LOGO' | 'TEXT' | 'CAPTION' | 'CTA' | 'OVERLAY' | 'ICON' | 'SHAPE' | 'SCENE';
    }> = [];

    const scenes = plan.sceneAnimations || [];

    scenes.forEach((scene) => {
      const sceneNum = scene.sceneNumber;
      sceneIntensity[sceneNum] = scene.animationIntensity || 'MEDIUM';

      const totalEvents =
        (scene.entranceAnimations?.length || 0) +
        (scene.continuousAnimations?.length || 0) +
        (scene.emphasisAnimations?.length || 0) +
        (scene.exitAnimations?.length || 0) +
        (scene.textMotion?.length || 0) +
        (scene.cameraMotion?.length || 0);

      if (totalEvents <= 2) {
        motionDensity[sceneNum] = 'LOW';
      } else if (totalEvents <= 5) {
        motionDensity[sceneNum] = 'MEDIUM';
      } else {
        motionDensity[sceneNum] = 'HIGH';
      }

      // Check product hero moments
      scene.productMotion?.forEach((prod) => {
        if (prod.isHeroMoment) {
          emphasisMoments.push({
            sceneNumber: sceneNum,
            timestamp: prod.startTime,
            description: `Hero Product Reveal (${prod.revealType})`,
            target: 'PRODUCT'
          });
        }
      });

      // Check text kinetic emphasis
      scene.textMotion?.forEach((txt) => {
        if (txt.emphasisWords && txt.emphasisWords.length > 0) {
          emphasisMoments.push({
            sceneNumber: sceneNum,
            timestamp: txt.startTime,
            description: `Kinetic Keyword Burst: "${txt.emphasisWords.join(', ')}"`,
            target: 'TEXT'
          });
        }
      });
    });

    return {
      sceneIntensity,
      motionDensity,
      transitionDensity: (plan.transitionPlan?.length || 0) >= scenes.length - 1 ? 'smooth' : 'minimal',
      emphasisMoments
    };
  }

  static evaluateReadiness(
    plan: Partial<AnimationPlan>,
    pkg?: ReelProductionPackage | null
  ): AnimationReadinessReport {
    const blockers: AnimationBlockerCode[] = [];
    const warnings: string[] = [];

    const validation = AnimationValidator.validate(plan);
    const validationErrors = validation.errors;
    warnings.push(...validation.warnings);

    if (validationErrors.length > 0) {
      blockers.push('ANIMATION_CONFLICT');
    }

    const scenes = plan.sceneAnimations || [];
    const expectedScenes = pkg?.packagePayload.reelPlan.scenes.length || scenes.length || 1;

    // 1. Scene Coverage
    const sceneCoverage = expectedScenes > 0 ? Math.min(100, Math.round((scenes.length / expectedScenes) * 100)) : 0;
    if (scenes.length === 0) {
      blockers.push('MISSING_SCENE_ANIMATION');
    } else if (sceneCoverage < 100) {
      warnings.push(`Animation covers ${scenes.length} of ${expectedScenes} planned scenes.`);
    }

    // 2. Sync Coverage
    const totalSyncCues = plan.syncPlan?.length || 0;
    const syncCoverage = Math.min(100, Math.round((totalSyncCues / Math.max(1, scenes.length * 2)) * 100));
    if (totalSyncCues === 0 && pkg?.packagePayload.captionTrack) {
      warnings.push('No audio or voice synchronization cues generated.');
    }

    // 3. Asset Coverage
    const resolvedAssets = pkg?.packagePayload.assets || [];
    const assetCoverage = resolvedAssets.length > 0 ? 100 : 80;

    // 4. Calculate Score
    let score = 100;

    if (blockers.length > 0) {
      score -= blockers.length * 25;
    }
    score -= validationErrors.length * 15;
    score -= warnings.length * 3;

    if (sceneCoverage < 100) {
      score -= (100 - sceneCoverage) * 0.4;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    let status: 'READY' | 'NEEDS_REVIEW' | 'NOT_READY' = 'READY';
    if (blockers.length > 0 || score < 60) {
      status = 'NOT_READY';
    } else if (score < 80 || warnings.length > 2) {
      status = 'NEEDS_REVIEW';
    }

    return {
      score,
      status,
      blockers,
      warnings,
      sceneCoverage,
      syncCoverage,
      assetCoverage,
      validationErrors,
      evaluatedAt: new Date().toISOString()
    };
  }
}
