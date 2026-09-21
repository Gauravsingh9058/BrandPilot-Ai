import type { AnimationPlan, SceneAnimation } from '@vidsnapai/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class AnimationValidator {
  static validate(plan: Partial<AnimationPlan>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!plan.animationLanguage) {
      errors.push('Missing animationLanguage.');
    }

    if (!plan.globalSettings) {
      errors.push('Missing globalSettings.');
    }

    if (!plan.sceneAnimations || plan.sceneAnimations.length === 0) {
      errors.push('AnimationPlan must contain at least one scene animation.');
      return { valid: false, errors, warnings };
    }

    const scenes = plan.sceneAnimations;
    const maxSimultaneous = plan.globalSettings?.maxSimultaneousAnimations || 4;
    const reducedMotion = plan.globalSettings?.reducedMotionSupport || false;

    let previousEndTime = 0;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneNum = scene.sceneNumber || i + 1;

      // 1. Boundary & Chronology Checks
      if (scene.startTime < 0) {
        errors.push(`Scene #${sceneNum} has negative startTime (${scene.startTime}).`);
      }
      if (scene.endTime <= scene.startTime) {
        errors.push(`Scene #${sceneNum} has invalid duration: endTime (${scene.endTime}) must be greater than startTime (${scene.startTime}).`);
      }
      if (i > 0 && Math.abs(scene.startTime - previousEndTime) > 0.1) {
        warnings.push(`Timing gap or overlap between Scene #${scenes[i - 1].sceneNumber} (end: ${previousEndTime}s) and Scene #${sceneNum} (start: ${scene.startTime}s).`);
      }
      previousEndTime = scene.endTime;

      // 2. Event boundaries
      const allEvents = [
        ...(scene.entranceAnimations || []),
        ...(scene.continuousAnimations || []),
        ...(scene.emphasisAnimations || []),
        ...(scene.exitAnimations || []),
        ...(scene.mediaMotion || [])
      ];

      for (const evt of allEvents) {
        if (evt.duration <= 0) {
          errors.push(`Event "${evt.id}" in Scene #${sceneNum} has non-positive duration (${evt.duration}s).`);
        }
        if (evt.startTime < scene.startTime - 0.05 || evt.startTime + evt.duration > scene.endTime + 0.05) {
          warnings.push(`Event "${evt.id}" (${evt.type}) in Scene #${sceneNum} exceeds scene boundary [${scene.startTime}s, ${scene.endTime}s].`);
        }

        // Accessibility / Flash safety
        if (reducedMotion && (evt.type === 'SHAKE' || evt.type === 'GLITCH' || evt.intensity === 'EXTREME')) {
          warnings.push(`High-intensity event "${evt.type}" detected in Scene #${sceneNum} while reducedMotion is enabled.`);
        }
      }

      // 3. Camera motions
      if (scene.cameraMotion && scene.cameraMotion.length > 2) {
        warnings.push(`Scene #${sceneNum} defines ${scene.cameraMotion.length} camera motions; excessive camera shifts may disorient viewers.`);
      }

      // 4. Density checks
      if (allEvents.length > maxSimultaneous * 3) {
        warnings.push(`Scene #${sceneNum} has high animation density (${allEvents.length} events). Consider simplifying for visual clarity.`);
      }

      // 5. Text animations
      for (const txt of scene.textMotion || []) {
        if (txt.startTime < scene.startTime - 0.05 || txt.startTime + txt.duration > scene.endTime + 0.1) {
          warnings.push(`Text animation for "${txt.targetText.substring(0, 20)}..." in Scene #${sceneNum} exceeds scene boundaries.`);
        }
      }

      // 6. Transition checks
      if (scene.transitionOut) {
        if (scene.transitionOut.duration > 1.5) {
          errors.push(`Transition out of Scene #${sceneNum} duration (${scene.transitionOut.duration}s) exceeds maximum allowed (1.5s).`);
        }
        if (scene.transitionOut.fromScene !== sceneNum) {
          warnings.push(`Transition out fromScene (${scene.transitionOut.fromScene}) does not match current scene #${sceneNum}.`);
        }
      }
    }

    // 7. Global transitions check
    if (plan.transitionPlan) {
      for (const trans of plan.transitionPlan) {
        if (trans.duration <= 0) {
          errors.push(`Transition from Scene #${trans.fromScene} to #${trans.toScene} has invalid duration (${trans.duration}s).`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateScene(scene: SceneAnimation, reelDuration?: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (scene.startTime < 0) errors.push(`Scene #${scene.sceneNumber} has negative start time.`);
    if (scene.endTime <= scene.startTime) errors.push(`Scene #${scene.sceneNumber} has non-positive duration.`);
    if (reelDuration && scene.endTime > reelDuration + 0.1) {
      warnings.push(`Scene #${scene.sceneNumber} end time (${scene.endTime}s) exceeds total reel duration (${reelDuration}s).`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
