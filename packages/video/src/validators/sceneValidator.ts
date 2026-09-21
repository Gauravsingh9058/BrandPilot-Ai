import type { ReelScene, SceneVisualType } from '@vidsnapai/types';

export const VALID_SCENE_VISUAL_TYPES: SceneVisualType[] = [
  'PRODUCT_SHOWCASE',
  'PRODUCT_HERO',
  'PROBLEM',
  'SOLUTION',
  'DEMONSTRATION',
  'FEATURE_CALLOUT',
  'BENEFIT',
  'TRANSFORMATION',
  'BRAND_IDENTITY',
  'LIFESTYLE',
  'STORY',
  'EDUCATION',
  'COMPARISON',
  'TESTIMONIAL',
  'SOCIAL_PROOF',
  'CTA',
  'BRAND',
  'ABSTRACT',
  'TEXT_FOCUS'
];

export interface SceneValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SceneValidationOptions {
  targetDurationSeconds?: number;
}

export function validateScenes(scenes: ReelScene[], options?: SceneValidationOptions): SceneValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(scenes) || scenes.length === 0) {
    errors.push('Reel must contain at least one scene');
    return { valid: false, errors, warnings };
  }

  const targetDuration = options?.targetDurationSeconds;
  if (targetDuration) {
    if (targetDuration >= 25 && scenes.length < 5) {
      errors.push(
        `Commercial reel with target duration of ${targetDuration}s requires at least 5 scenes for commercial storytelling (found ${scenes.length})`
      );
    } else if (targetDuration >= 15 && scenes.length < 4) {
      errors.push(
        `Commercial reel with target duration of ${targetDuration}s requires at least 4 scenes (found ${scenes.length})`
      );
    }
  }

  if (scenes.length < 2 && (!targetDuration || targetDuration < 15)) {
    warnings.push('Reel has only 1 scene; multi-scene format is recommended for vertical video engagement');
  }

  scenes.forEach((scene, index) => {
    const num = scene.sceneNumber ?? index + 1;

    if (!scene.purpose || scene.purpose.trim() === '') {
      errors.push(`Scene #${num} has an empty purpose`);
    }

    if (!scene.assetRequirement || scene.assetRequirement.trim() === '') {
      errors.push(`Scene #${num} is missing an assetRequirement description`);
    }

    if (scene.durationSeconds <= 0) {
      errors.push(`Scene #${num} has an invalid duration (${scene.durationSeconds}s)`);
    } else if (scene.durationSeconds < 0.5) {
      warnings.push(`Scene #${num} duration is very short (${scene.durationSeconds}s)`);
    } else if (scene.durationSeconds > 30) {
      warnings.push(`Scene #${num} duration exceeds 30s (${scene.durationSeconds}s)`);
    }

    if (!VALID_SCENE_VISUAL_TYPES.includes(scene.visualType)) {
      errors.push(`Scene #${num} has unsupported visualType: "${scene.visualType}"`);
    }

    // Product hero scenes must specify productReference
    const upperPurpose = (scene.purpose || '').toUpperCase();
    if (
      (upperPurpose.includes('PRODUCT') || upperPurpose.includes('HERO') || scene.visualType === 'PRODUCT_SHOWCASE') &&
      (!scene.productReference || scene.productReference.trim() === '')
    ) {
      warnings.push(`Scene #${num} (${scene.purpose}) is a product hero scene but does not have an explicit productReference`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export const validateSceneSequence = validateScenes;
