import type { LogoAnimation, AnimationEasing } from '@vidsnapai/types';

export interface LogoPreset {
  name: string;
  description: string;
  createAnimation: (options: {
    assetId?: string;
    startTime: number;
    duration: number;
    position?: 'top-left' | 'top-right' | 'center' | 'bottom-center' | 'bottom-right';
    scale?: number;
    easing?: AnimationEasing;
  }) => LogoAnimation;
}

export const MinimalMarkPreset: LogoPreset = {
  name: 'MinimalMark',
  description: 'Clean corner watermark reveal with subtle fade-in and no brand distortion.',
  createAnimation: ({ assetId, startTime, duration, position = 'top-right', scale = 0.85, easing = 'EASE_OUT' }) => ({
    assetId,
    startTime,
    duration,
    style: 'MINIMAL_MARK',
    scale,
    position,
    opacity: 0.9,
    easing
  })
};

export const PremiumLightSweepPreset: LogoPreset = {
  name: 'PremiumLightSweep',
  description: 'Luminous metallic/specular sweep across the brand logo mark on reveal.',
  createAnimation: ({ assetId, startTime, duration, position = 'center', scale = 1.0, easing = 'CUBIC_OUT' }) => ({
    assetId,
    startTime,
    duration,
    style: 'LIGHT_SWEEP',
    scale,
    position,
    opacity: 1.0,
    easing
  })
};

export const HeroScaleRevealPreset: LogoPreset = {
  name: 'HeroScaleReveal',
  description: 'Center-stage brand mark entrance for intro/outro brand signatures.',
  createAnimation: ({ assetId, startTime, duration, position = 'center', scale = 1.1, easing = 'SPRING' }) => ({
    assetId,
    startTime,
    duration,
    style: 'SCALE',
    scale,
    position,
    opacity: 1.0,
    easing
  })
};

export const LogoPresets = {
  MinimalMark: MinimalMarkPreset,
  PremiumLightSweep: PremiumLightSweepPreset,
  HeroScaleReveal: HeroScaleRevealPreset
};
