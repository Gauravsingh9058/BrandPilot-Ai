import { describe, it, expect } from 'vitest';
import { AnimationValidator } from '../src/animationValidator.js';
import type { AnimationPlan, SceneAnimation } from '@vidsnapai/types';

describe('AnimationValidator', () => {
  const validScene: SceneAnimation = {
    sceneNumber: 1,
    startTime: 0,
    endTime: 5,
    animationIntensity: 'MEDIUM',
    entranceAnimations: [
      {
        id: 'evt-1',
        type: 'FADE_IN',
        target: 'MEDIA',
        startTime: 0,
        duration: 0.5,
        easing: 'EASE_OUT',
        intensity: 'MEDIUM',
        parameters: {},
        layer: 1,
        priority: 5
      }
    ],
    continuousAnimations: [],
    emphasisAnimations: [],
    exitAnimations: [],
    cameraMotion: [
      {
        type: 'SLOW_PUSH',
        startTime: 0,
        duration: 5,
        intensity: 'LOW',
        scale: 1.05,
        easing: 'CUBIC_OUT'
      }
    ],
    textMotion: [
      {
        targetText: 'Transform Your Skin',
        startTime: 0.2,
        duration: 4.5,
        entrance: 'WORD_POP',
        easing: 'SPRING',
        emphasisWords: ['Transform']
      }
    ],
    mediaMotion: [],
    productMotion: [],
    logoMotion: [],
    synchronizationCues: [],
    transitionOut: {
      fromScene: 1,
      toScene: 2,
      type: 'CROSSFADE',
      duration: 0.4,
      easing: 'CUBIC_IN_OUT',
      intensity: 'MEDIUM'
    },
    rationale: 'Clean opening hook'
  };

  const validPlan: Partial<AnimationPlan> = {
    animationLanguage: 'CINEMATIC',
    globalSettings: {
      animationLanguage: 'CINEMATIC',
      intensity: 'MEDIUM',
      pacing: 'dynamic',
      smoothness: 0.85,
      defaultEasing: 'CUBIC_OUT',
      defaultTransition: 'CROSSFADE',
      motionBlurIntent: true,
      maxSimultaneousAnimations: 4,
      reducedMotionSupport: false
    },
    sceneAnimations: [validScene]
  };

  it('validates a well-formed animation plan successfully', () => {
    const result = AnimationValidator.validate(validPlan);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('catches negative start time or inverted start/end times', () => {
    const invalidPlan: Partial<AnimationPlan> = {
      ...validPlan,
      sceneAnimations: [
        {
          ...validScene,
          startTime: 5,
          endTime: 2 // inverted!
        }
      ]
    };

    const result = AnimationValidator.validate(invalidPlan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('invalid duration'))).toBe(true);
  });

  it('catches events with non-positive duration', () => {
    const invalidPlan: Partial<AnimationPlan> = {
      ...validPlan,
      sceneAnimations: [
        {
          ...validScene,
          entranceAnimations: [
            {
              ...validScene.entranceAnimations[0],
              duration: 0 // invalid
            }
          ]
        }
      ]
    };

    const result = AnimationValidator.validate(invalidPlan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('non-positive duration'))).toBe(true);
  });

  it('warns when high-intensity shake/glitch is used with reduced motion enabled', () => {
    const reducedMotionPlan: Partial<AnimationPlan> = {
      ...validPlan,
      globalSettings: {
        ...validPlan.globalSettings!,
        reducedMotionSupport: true
      },
      sceneAnimations: [
        {
          ...validScene,
          entranceAnimations: [
            {
              id: 'evt-glitch-1',
              type: 'GLITCH',
              target: 'MEDIA',
              startTime: 0,
              duration: 0.5,
              easing: 'LINEAR',
              intensity: 'EXTREME',
              parameters: {},
              layer: 2,
              priority: 8
            }
          ]
        }
      ]
    };

    const result = AnimationValidator.validate(reducedMotionPlan);
    expect(result.warnings.some((w) => w.includes('reducedMotion'))).toBe(true);
  });
});
