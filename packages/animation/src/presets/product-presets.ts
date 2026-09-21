import type { ProductAnimation, ProductRevealType } from '@vidsnapai/types';

export interface ProductPreset {
  name: string;
  description: string;
  createAnimation: (options: {
    productId?: string;
    startTime: number;
    duration: number;
    isHeroMoment?: boolean;
    scaleIntent?: number;
    positionIntent?: string;
    highlightIntent?: boolean;
    revealType?: ProductRevealType;
  }) => ProductAnimation;
}

export const HeroRevealPreset: ProductPreset = {
  name: 'HeroReveal',
  description: 'Dramatic center-stage entrance with background separation and lighting emphasis.',
  createAnimation: ({ productId, startTime, duration, isHeroMoment = true, scaleIntent = 1.15, positionIntent = 'center', highlightIntent = true }) => ({
    productId,
    revealType: 'HERO_REVEAL',
    startTime,
    duration,
    emphasis: true,
    isHeroMoment,
    scaleIntent,
    positionIntent,
    highlightIntent,
    backgroundTreatment: 'RADIAL_DIM'
  })
};

export const CleanSlidePreset: ProductPreset = {
  name: 'CleanSlide',
  description: 'Smooth lateral slide into position with crisp drop-shadow elevation.',
  createAnimation: ({ productId, startTime, duration, isHeroMoment = false, scaleIntent = 1.0, positionIntent = 'center-right', highlightIntent = false }) => ({
    productId,
    revealType: 'SLIDE_REVEAL',
    startTime,
    duration,
    emphasis: false,
    isHeroMoment,
    scaleIntent,
    positionIntent,
    highlightIntent,
    backgroundTreatment: 'NONE'
  })
};

export const FeatureHighlightPreset: ProductPreset = {
  name: 'FeatureHighlight',
  description: 'Micro zoom into a specific product feature or ingredient with pinpoint highlight ring.',
  createAnimation: ({ productId, startTime, duration, isHeroMoment = false, scaleIntent = 1.25, positionIntent = 'center', highlightIntent = true }) => ({
    productId,
    revealType: 'DETAIL_REVEAL',
    startTime,
    duration,
    emphasis: true,
    isHeroMoment,
    scaleIntent,
    positionIntent,
    highlightIntent,
    backgroundTreatment: 'BLUR_VIGNETTE'
  })
};

export const CinematicPushInPreset: ProductPreset = {
  name: 'CinematicPushIn',
  description: 'Slow, dramatic camera push-in keeping the hero product front and center.',
  createAnimation: ({ productId, startTime, duration, isHeroMoment = true, scaleIntent = 1.2, positionIntent = 'center', highlightIntent = true }) => ({
    productId,
    revealType: 'HERO_REVEAL',
    startTime,
    duration,
    emphasis: true,
    isHeroMoment,
    scaleIntent,
    positionIntent,
    highlightIntent,
    backgroundTreatment: 'AMBIENT_BLUR'
  })
};

export const SmoothZoomPreset: ProductPreset = {
  name: 'SmoothZoom',
  description: 'Continuous smooth zoom with cubic easing on product details.',
  createAnimation: ({ productId, startTime, duration, isHeroMoment = false, scaleIntent = 1.1, positionIntent = 'center', highlightIntent = false }) => ({
    productId,
    revealType: 'SCALE_REVEAL',
    startTime,
    duration,
    emphasis: false,
    isHeroMoment,
    scaleIntent,
    positionIntent,
    highlightIntent,
    backgroundTreatment: 'RADIAL_DIM'
  })
};

export const FloatingProductPreset: ProductPreset = {
  name: 'FloatingProduct',
  description: 'Subtle levitation and breathing motion with soft ambient background.',
  createAnimation: ({ productId, startTime, duration, isHeroMoment = true, scaleIntent = 1.05, positionIntent = 'center', highlightIntent = true }) => ({
    productId,
    revealType: 'HERO_REVEAL',
    startTime,
    duration,
    emphasis: true,
    isHeroMoment,
    scaleIntent,
    positionIntent,
    highlightIntent,
    backgroundTreatment: 'AMBIENT_BLUR'
  })
};

export const HorizontalRevealPreset: ProductPreset = {
  name: 'HorizontalReveal',
  description: 'High-energy horizontal entrance gliding into the frame with dynamic easing.',
  createAnimation: ({ productId, startTime, duration, isHeroMoment = false, scaleIntent = 1.0, positionIntent = 'center', highlightIntent = false }) => ({
    productId,
    revealType: 'SLIDE_REVEAL',
    startTime,
    duration,
    emphasis: false,
    isHeroMoment,
    scaleIntent,
    positionIntent,
    highlightIntent,
    backgroundTreatment: 'NONE'
  })
};

export const VerticalRevealPreset: ProductPreset = {
  name: 'VerticalReveal',
  description: 'Upward slide reveal from bottom with slight overshoot and bounce.',
  createAnimation: ({ productId, startTime, duration, isHeroMoment = false, scaleIntent = 1.05, positionIntent = 'center', highlightIntent = false }) => ({
    productId,
    revealType: 'SLIDE_REVEAL',
    startTime,
    duration,
    emphasis: false,
    isHeroMoment,
    scaleIntent,
    positionIntent,
    highlightIntent,
    backgroundTreatment: 'RADIAL_DIM'
  })
};

export const SpotlightRevealPreset: ProductPreset = {
  name: 'SpotlightReveal',
  description: 'Radial lighting focus illuminating the product against dark luxury backdrop.',
  createAnimation: ({ productId, startTime, duration, isHeroMoment = true, scaleIntent = 1.15, positionIntent = 'center', highlightIntent = true }) => ({
    productId,
    revealType: 'LIGHT_REVEAL',
    startTime,
    duration,
    emphasis: true,
    isHeroMoment,
    scaleIntent,
    positionIntent,
    highlightIntent,
    backgroundTreatment: 'SPOTLIGHT'
  })
};

export const ProductToCTAPreset: ProductPreset = {
  name: 'ProductToCTA',
  description: 'Hero product seamlessly elevates to top-half composition allowing prominent CTA button below.',
  createAnimation: ({ productId, startTime, duration, isHeroMoment = true, scaleIntent = 0.9, positionIntent = 'top-center', highlightIntent = true }) => ({
    productId,
    revealType: 'HERO_REVEAL',
    startTime,
    duration,
    emphasis: true,
    isHeroMoment,
    scaleIntent,
    positionIntent,
    highlightIntent,
    backgroundTreatment: 'GRADIENT'
  })
};

export const ProductPresets = {
  HeroReveal: HeroRevealPreset,
  CleanSlide: CleanSlidePreset,
  FeatureHighlight: FeatureHighlightPreset,
  CinematicPushIn: CinematicPushInPreset,
  SmoothZoom: SmoothZoomPreset,
  FloatingProduct: FloatingProductPreset,
  HorizontalReveal: HorizontalRevealPreset,
  VerticalReveal: VerticalRevealPreset,
  SpotlightReveal: SpotlightRevealPreset,
  ProductToCTA: ProductToCTAPreset
};

