import type { AnimationEvent, AnimationEasing, AnimationIntensity } from '@vidsnapai/types';

export interface MotionPreset {
  name: string;
  description: string;
  createEvents: (options: {
    startTime: number;
    duration: number;
    target?: 'BACKGROUND' | 'MEDIA' | 'OVERLAY' | 'SHAPE' | 'ICON';
    intensity?: AnimationIntensity;
    easing?: AnimationEasing;
  }) => AnimationEvent[];
}

export const PremiumRevealPreset: MotionPreset = {
  name: 'PremiumReveal',
  description: 'Subtle slow fade-in with micro-scale expansion for high-end brands.',
  createEvents: ({ startTime, duration, target = 'MEDIA', intensity = 'MEDIUM', easing = 'CUBIC_OUT' }) => [
    {
      id: `evt_prem_reveal_${Math.random().toString(36).substring(2, 8)}`,
      type: 'SCALE_IN',
      target,
      startTime,
      duration: Math.min(duration, 1.2),
      easing,
      intensity,
      parameters: { startScale: 0.96, endScale: 1.0 },
      layer: 1,
      priority: 6
    },
    {
      id: `evt_prem_fade_${Math.random().toString(36).substring(2, 8)}`,
      type: 'FADE_IN',
      target,
      startTime,
      duration: Math.min(duration * 0.5, 0.6),
      easing: 'EASE_OUT',
      intensity,
      parameters: { fromOpacity: 0, toOpacity: 1 },
      layer: 1,
      priority: 8
    }
  ]
};

export const DynamicPulsePreset: MotionPreset = {
  name: 'DynamicPulse',
  description: 'High-energy scale pulse with micro bounce for hook moments.',
  createEvents: ({ startTime, duration, target = 'MEDIA', intensity = 'HIGH', easing = 'SPRING' }) => [
    {
      id: `evt_dyn_pulse_${Math.random().toString(36).substring(2, 8)}`,
      type: 'POP',
      target,
      startTime,
      duration: Math.min(duration, 0.8),
      easing,
      intensity,
      parameters: { peakScale: 1.05, returnScale: 1.0 },
      layer: 2,
      priority: 8
    }
  ]
};

export const SubtleDriftPreset: MotionPreset = {
  name: 'SubtleDrift',
  description: 'Continuous gentle drift across the scene duration to prevent static stillness.',
  createEvents: ({ startTime, duration, target = 'BACKGROUND', intensity = 'LOW', easing = 'LINEAR' }) => [
    {
      id: `evt_subtle_drift_${Math.random().toString(36).substring(2, 8)}`,
      type: 'PARALLAX',
      target,
      startTime,
      duration,
      easing,
      intensity,
      parameters: { deltaX: 12, deltaY: -8 },
      layer: 1,
      priority: 3
    }
  ]
};

export const FastHookEntrancePreset: MotionPreset = {
  name: 'FastHookEntrance',
  description: 'Rapid impact reveal designed for 0-2s social hook retention.',
  createEvents: ({ startTime, duration, target = 'MEDIA', intensity = 'HIGH', easing = 'QUAD_OUT' }) => [
    {
      id: `evt_fast_hook_${Math.random().toString(36).substring(2, 8)}`,
      type: 'ZOOM_IN',
      target,
      startTime,
      duration: Math.min(duration, 0.4),
      easing,
      intensity,
      parameters: { initialScale: 1.15, finalScale: 1.0 },
      layer: 2,
      priority: 9
    }
  ]
};

export const MotionPresets = {
  PremiumReveal: PremiumRevealPreset,
  DynamicPulse: DynamicPulsePreset,
  SubtleDrift: SubtleDriftPreset,
  FastHookEntrance: FastHookEntrancePreset
};
