import type { TransitionPlan, AnimationEasing, AnimationIntensity } from '@vidsnapai/types';

export interface TransitionPreset {
  name: string;
  description: string;
  createTransition: (options: {
    fromScene: number;
    toScene: number;
    duration?: number;
    easing?: AnimationEasing;
    intensity?: AnimationIntensity;
    rationale?: string;
  }) => TransitionPlan;
}

export const DirectCutPreset: TransitionPreset = {
  name: 'DirectCut',
  description: 'Immediate hard cut without artificial blending; ideal for fast rhythm and high-frequency content.',
  createTransition: ({ fromScene, toScene, rationale = 'Hard cut to maintain momentum' }) => ({
    fromScene,
    toScene,
    type: 'CUT',
    duration: 0.05,
    easing: 'LINEAR',
    intensity: 'LOW',
    rationale
  })
};

export const SmoothCrossfadePreset: TransitionPreset = {
  name: 'SmoothCrossfade',
  description: 'Graceful opacity blend across adjacent scenes.',
  createTransition: ({ fromScene, toScene, duration = 0.35, easing = 'CUBIC_IN_OUT', intensity = 'MEDIUM', rationale = 'Smooth visual continuation' }) => ({
    fromScene,
    toScene,
    type: 'CROSSFADE',
    duration,
    easing,
    intensity,
    rationale
  })
};

export const WhipPanPreset: TransitionPreset = {
  name: 'WhipPan',
  description: 'High-speed directional blur transition synced with whoosh SFX.',
  createTransition: ({ fromScene, toScene, duration = 0.25, easing = 'QUAD_IN', intensity = 'HIGH', rationale = 'High-energy spatial sweep' }) => ({
    fromScene,
    toScene,
    type: 'WHIP',
    duration,
    easing,
    intensity,
    rationale
  })
};

export const LightWipePreset: TransitionPreset = {
  name: 'LightWipe',
  description: 'Luminous edge wipe moving horizontally to reveal new scene.',
  createTransition: ({ fromScene, toScene, duration = 0.4, easing = 'CUBIC_OUT', intensity = 'MEDIUM', rationale = 'Luminous solution reveal' }) => ({
    fromScene,
    toScene,
    type: 'LIGHT_WIPE',
    duration,
    easing,
    intensity,
    rationale
  })
};

export const ZoomImpactPreset: TransitionPreset = {
  name: 'ZoomImpact',
  description: 'Rapid forward zoom into the focal subject of the following scene.',
  createTransition: ({ fromScene, toScene, duration = 0.3, easing = 'SPRING', intensity = 'HIGH', rationale = 'Dramatic focal immersion' }) => ({
    fromScene,
    toScene,
    type: 'ZOOM',
    duration,
    easing,
    intensity,
    rationale
  })
};

export const TransitionPresets = {
  DirectCut: DirectCutPreset,
  SmoothCrossfade: SmoothCrossfadePreset,
  WhipPan: WhipPanPreset,
  LightWipe: LightWipePreset,
  ZoomImpact: ZoomImpactPreset
};
