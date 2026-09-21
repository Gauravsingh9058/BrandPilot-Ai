import type { CameraMotion, AnimationEasing, AnimationIntensity } from '@vidsnapai/types';

export interface CameraPreset {
  name: string;
  description: string;
  createMotion: (options: {
    startTime: number;
    duration: number;
    intensity?: AnimationIntensity;
    easing?: AnimationEasing;
    focalPoint?: { x: number; y: number };
  }) => CameraMotion;
}

export const CinematicSlowPushPreset: CameraPreset = {
  name: 'CinematicSlowPush',
  description: 'Subtle 1.0 -> 1.08 push forward creating intimacy and gravity without dizziness.',
  createMotion: ({ startTime, duration, intensity = 'LOW', easing = 'CUBIC_OUT', focalPoint = { x: 0.5, y: 0.5 } }) => ({
    type: 'SLOW_PUSH',
    startTime,
    duration,
    intensity,
    direction: 'IN',
    scale: 1.08,
    focalPoint,
    easing
  })
};

export const DynamicPullPreset: CameraPreset = {
  name: 'DynamicPull',
  description: '1.15 -> 1.0 pull out revealing broader environment or context.',
  createMotion: ({ startTime, duration, intensity = 'MEDIUM', easing = 'QUAD_OUT', focalPoint = { x: 0.5, y: 0.4 } }) => ({
    type: 'DYNAMIC_PULL',
    startTime,
    duration,
    intensity,
    direction: 'OUT',
    scale: 1.0,
    focalPoint,
    easing
  })
};

export const ParallaxDriftPreset: CameraPreset = {
  name: 'ParallaxDrift',
  description: 'Gentle horizontal camera pan combined with foreground/background depth illusion.',
  createMotion: ({ startTime, duration, intensity = 'LOW', easing = 'LINEAR', focalPoint = { x: 0.5, y: 0.5 } }) => ({
    type: 'PAN_LEFT',
    startTime,
    duration,
    intensity,
    direction: 'LEFT',
    scale: 1.04,
    focalPoint,
    easing
  })
};

export const StaticHeroFocusPreset: CameraPreset = {
  name: 'StaticHeroFocus',
  description: 'Locked camera giving maximum stability for intricate product details or heavy text.',
  createMotion: ({ startTime, duration }) => ({
    type: 'STATIC',
    startTime,
    duration,
    intensity: 'LOW',
    scale: 1.0,
    focalPoint: { x: 0.5, y: 0.5 },
    easing: 'LINEAR'
  })
};

export const CameraPresets = {
  CinematicSlowPush: CinematicSlowPushPreset,
  DynamicPull: DynamicPullPreset,
  ParallaxDrift: ParallaxDriftPreset,
  StaticHeroFocus: StaticHeroFocusPreset
};
