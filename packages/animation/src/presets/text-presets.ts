import type { TextAnimation, TextEntranceStyle, AnimationEasing } from '@vidsnapai/types';

export interface TextPreset {
  name: string;
  description: string;
  createAnimation: (options: {
    text: string;
    startTime: number;
    duration: number;
    emphasisWords?: string[];
    easing?: AnimationEasing;
    entrance?: TextEntranceStyle;
  }) => TextAnimation;
}

export const KineticWordPopPreset: TextPreset = {
  name: 'KineticWordPop',
  description: 'Individual words burst in rhythmically, synced to speech cues.',
  createAnimation: ({ text, startTime, duration, emphasisWords = [], easing = 'SPRING' }) => ({
    targetText: text,
    startTime,
    duration,
    entrance: 'WORD_POP',
    emphasis: 'SCALE_EMPHASIS',
    exit: 'FADE',
    easing,
    stagger: 0.12,
    emphasisWords
  })
};

export const WordHighlightPreset: TextPreset = {
  name: 'WordHighlight',
  description: 'Clean headline text with real-time word accent lighting on key USPs/benefits.',
  createAnimation: ({ text, startTime, duration, emphasisWords = [], easing = 'CUBIC_OUT' }) => ({
    targetText: text,
    startTime,
    duration,
    entrance: 'WORD_HIGHLIGHT',
    emphasis: 'COLOR_GLOW',
    exit: 'FADE',
    easing,
    stagger: 0.15,
    emphasisWords
  })
};

export const ElegantSlidePreset: TextPreset = {
  name: 'ElegantSlide',
  description: 'Minimalist vertical upward drift with mask reveal for luxury and editorial content.',
  createAnimation: ({ text, startTime, duration, emphasisWords = [], easing = 'QUAD_OUT' }) => ({
    targetText: text,
    startTime,
    duration,
    entrance: 'SLIDE',
    emphasis: 'NONE',
    exit: 'SLIDE',
    easing,
    stagger: 0.08,
    emphasisWords
  })
};

export const TypewriterPreset: TextPreset = {
  name: 'Typewriter',
  description: 'High-focus educational character reveal with subtle cursor pulse.',
  createAnimation: ({ text, startTime, duration, emphasisWords = [], easing = 'LINEAR' }) => ({
    targetText: text,
    startTime,
    duration,
    entrance: 'TYPE_ON',
    emphasis: 'CURSOR_BLINK',
    exit: 'FADE',
    easing,
    stagger: 0.04,
    emphasisWords
  })
};

export const ScaleInPreset: TextPreset = {
  name: 'ScaleIn',
  description: 'Punchy scale entrance from center with explosive spring physics.',
  createAnimation: ({ text, startTime, duration, emphasisWords = [], easing = 'SPRING' }) => ({
    targetText: text,
    startTime,
    duration,
    entrance: 'SCALE',
    emphasis: 'SCALE_EMPHASIS',
    exit: 'FADE',
    easing,
    stagger: 0.08,
    emphasisWords
  })
};

export const HighlightBoxPreset: TextPreset = {
  name: 'HighlightBox',
  description: 'Clean headline enclosed in translucent high-contrast pill backdrop with brand accent border.',
  createAnimation: ({ text, startTime, duration, emphasisWords = [], easing = 'CUBIC_OUT' }) => ({
    targetText: text,
    startTime,
    duration,
    entrance: 'WORD_HIGHLIGHT',
    emphasis: 'COLOR_GLOW',
    exit: 'FADE',
    easing,
    stagger: 0.1,
    emphasisWords
  })
};

export const CtaPulsePreset: TextPreset = {
  name: 'CtaPulse',
  description: 'Pulsing call-to-action button overlay drawing immediate viewer action.',
  createAnimation: ({ text, startTime, duration, emphasisWords = [], easing = 'SPRING' }) => ({
    targetText: text,
    startTime,
    duration,
    entrance: 'EMPHASIS_PULSE',
    emphasis: 'PULSE',
    exit: 'NONE',
    easing,
    stagger: 0.05,
    emphasisWords
  })
};

export const BlurToSharpPreset: TextPreset = {
  name: 'BlurToSharp',
  description: 'Cinematic defocus to razor-sharp typography transition.',
  createAnimation: ({ text, startTime, duration, emphasisWords = [], easing = 'CUBIC_OUT' }) => ({
    targetText: text,
    startTime,
    duration,
    entrance: 'MASK_REVEAL',
    emphasis: 'NONE',
    exit: 'FADE',
    easing,
    stagger: 0.06,
    emphasisWords
  })
};

export const CTAEmphasisPreset: TextPreset = {
  name: 'CTAEmphasis',
  description: 'End-card action button and text with periodic high-visibility pulse.',
  createAnimation: ({ text, startTime, duration, emphasisWords = [], easing = 'SPRING' }) => ({
    targetText: text,
    startTime,
    duration,
    entrance: 'EMPHASIS_PULSE',
    emphasis: 'PULSE',
    exit: 'NONE',
    easing,
    stagger: 0.05,
    emphasisWords
  })
};

export const TextPresets = {
  KineticWordPop: KineticWordPopPreset,
  WordHighlight: WordHighlightPreset,
  ElegantSlide: ElegantSlidePreset,
  Typewriter: TypewriterPreset,
  CTAEmphasis: CTAEmphasisPreset,
  ScaleIn: ScaleInPreset,
  HighlightBox: HighlightBoxPreset,
  CtaPulse: CtaPulsePreset,
  BlurToSharp: BlurToSharpPreset
};

