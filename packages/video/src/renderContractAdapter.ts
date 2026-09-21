import type {
  AnimationRenderContract,
  CameraMotion,
  TextAnimation,
  ProductAnimation,
  LogoAnimation,
  TransitionPlan,
  SyncCue,
  SceneBackgroundSpec,
  SceneProductMotionSpec,
  SceneLogoMotionSpec,
  SceneTextLayerSpec,
  SceneShapeSpec,
  SceneEffectSpec
} from '@vidsnapai/types';

export interface PreflightValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AdaptedSceneSpec {
  sceneNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  mediaUrl?: string;
  mediaType?: string;
  backgroundColor: string;
  camera: CameraMotion[];
  textAnimations: TextAnimation[];
  productAnimations: ProductAnimation[];
  logoAnimations: LogoAnimation[];
  transitionOut?: TransitionPlan;
  syncCues: SyncCue[];
  background?: SceneBackgroundSpec;
  product?: SceneProductMotionSpec;
  logo?: SceneLogoMotionSpec;
  textLayers?: SceneTextLayerSpec[];
  shapes?: SceneShapeSpec[];
  effects?: SceneEffectSpec[];
}

export interface AdaptedAudioSpec {
  voiceTrackUrl?: string;
  musicTrackUrl?: string;
  sfxTracks: Array<{ url: string; time: number; volume: number }>;
  ducking: {
    enabled: boolean;
    musicAttenuationDb: number;
    attackMs: number;
    releaseMs: number;
  };
}

export interface CompositionSpec {
  width: number;
  height: number;
  fps: number;
  totalDurationSeconds: number;
  aspectRatio: string;
  scenes: AdaptedSceneSpec[];
  audio: AdaptedAudioSpec;
  brand: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    logoUrl?: string;
  };
  reducedMotion: boolean;
}

export class RenderContractAdapter {
  /**
   * Preflight checks to ensure the AnimationRenderContract is physically renderable.
   */
  static validate(contract: AnimationRenderContract): PreflightValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!contract) {
      return { valid: false, errors: ['AnimationRenderContract is null or undefined'], warnings: [] };
    }

    if (!contract.reelPlanId) {
      errors.push('Missing reelPlanId in render contract');
    }

    const duration = contract.totalDurationSeconds;
    if (!duration || duration <= 0) {
      errors.push(`Invalid total duration: ${duration}s. Must be greater than 0.`);
    }

    if (!contract.scenes || contract.scenes.length === 0) {
      errors.push('Contract has no scenes to render');
    } else {
      let expectedStart = 0;
      contract.scenes.forEach((scene, index) => {
        if (scene.duration <= 0) {
          errors.push(`Scene #${scene.sceneNumber || index + 1} has non-positive duration: ${scene.duration}s`);
        }
        if (scene.startTime < 0 || scene.endTime < 0) {
          errors.push(`Scene #${scene.sceneNumber || index + 1} has negative timestamp: start=${scene.startTime}, end=${scene.endTime}`);
        }
        if (scene.startTime >= scene.endTime) {
          errors.push(`Scene #${scene.sceneNumber || index + 1} start time (${scene.startTime}) >= end time (${scene.endTime})`);
        }
        if (Math.abs(scene.startTime - expectedStart) > 0.5 && index > 0) {
          warnings.push(`Scene #${scene.sceneNumber || index + 1} start time (${scene.startTime}s) diverges from prior scene end (${expectedStart}s)`);
        }
        expectedStart = scene.endTime;
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Adapts the raw AnimationRenderContract into a structured CompositionSpec.
   */
  static adapt(contract: AnimationRenderContract): CompositionSpec {
    const validation = this.validate(contract);
    if (!validation.valid) {
      throw new Error(`Invalid AnimationRenderContract: ${validation.errors.join('; ')}`);
    }

    const reducedMotion = Boolean(
      contract.globalSettings?.reducedMotionSupport
    );

    const primaryColor = contract.brand?.primaryColor || '#1E293B';
    const secondaryColor = contract.brand?.secondaryColor || '#3B82F6';
    const accentColor = contract.brand?.accentColor || '#10B981';
    const fontFamily = contract.brand?.fontFamily || 'Outfit, Inter, sans-serif';

    const scenes: AdaptedSceneSpec[] = contract.scenes.map((s) => {
      // Adjust camera motion if reduced motion is enabled
      const camera = (s.camera || []).map((c) => {
        if (reducedMotion) {
          return {
            ...c,
            scale: c.scale ? Math.min(c.scale, 1.05) : 1.02,
            intensity: 'LOW' as const
          };
        }
        return c;
      });

      return {
        sceneNumber: s.sceneNumber,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration || s.endTime - s.startTime,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType || 'VIDEO',
        backgroundColor: primaryColor,
        camera,
        textAnimations: s.textAnimations || [],
        productAnimations: s.productAnimations || [],
        logoAnimations: s.logoAnimations || [],
        transitionOut: s.transitionOut,
        syncCues: s.syncCues || [],
        background: {
          type: 'AMBIENT_BLUR',
          primaryColor,
          secondaryColor
        },
        product: {
          visible: true,
          animationPreset: 'CINEMATIC_PUSH_IN'
        }
      };
    });

    const sfxTracks = (contract.audio?.sfxCues || []).map((cue) => ({
      url: (cue as any).url || '',
      time: (cue as any).timestamp || 0,
      volume: (cue as any).volume || 0.6
    }));

    return {
      width: contract.dimensions?.width || 1080,
      height: contract.dimensions?.height || 1920,
      fps: contract.fps || 30,
      totalDurationSeconds: contract.totalDurationSeconds,
      aspectRatio: contract.dimensions?.aspectRatio || '9:16',
      scenes,
      audio: {
        voiceTrackUrl: contract.audio?.voiceTrackUrl,
        musicTrackUrl: contract.audio?.musicTrackUrl,
        sfxTracks,
        ducking: {
          enabled: Boolean(contract.audio?.voiceTrackUrl),
          musicAttenuationDb: 14,
          attackMs: 200,
          releaseMs: 500
        }
      },
      brand: {
        primaryColor,
        secondaryColor,
        accentColor,
        fontFamily,
        logoUrl: contract.brand?.logoUrl
      },
      reducedMotion
    };
  }

  /**
   * Helper to build deterministic camera zoom/pan filter expressions for FFmpeg.
   */
  static buildCameraFilter(camera: CameraMotion | undefined, width: number, height: number, fps: number, duration: number): string {
    if (!camera || camera.type === 'STATIC') {
      return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},format=yuv420p`;
    }

    const totalFrames = Math.max(1, Math.round(duration * fps));

    switch (camera.type) {
      case 'SLOW_PUSH':
      case 'DYNAMIC_PUSH': {
        const endZoom = camera.type === 'DYNAMIC_PUSH' ? 1.25 : 1.12;
        return `scale=8000:-1,zoompan=z='min(zoom+0.0015,${endZoom})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${width}x${height}:fps=${fps},format=yuv420p`;
      }
      case 'SLOW_PULL':
      case 'DYNAMIC_PULL': {
        const startZoom = camera.type === 'DYNAMIC_PULL' ? 1.25 : 1.12;
        return `scale=8000:-1,zoompan=z='if(lte(on,1),${startZoom},max(1.0,zoom-0.0015))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${width}x${height}:fps=${fps},format=yuv420p`;
      }
      case 'PAN_LEFT': {
        return `scale=8000:-1,zoompan=z='1.15':x='(1-on/${totalFrames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${width}x${height}:fps=${fps},format=yuv420p`;
      }
      case 'PAN_RIGHT': {
        return `scale=8000:-1,zoompan=z='1.15':x='(on/${totalFrames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${width}x${height}:fps=${fps},format=yuv420p`;
      }
      default:
        return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},format=yuv420p`;
    }
  }

  /**
   * Helper to build product animation overlay filter expressions for FFmpeg.
   */
  static buildProductOverlayFilter(options: {
    preset: string;
    width?: number;
    height?: number;
    duration?: number;
  }): { productScaleFilter: string; overlayFilter: string } {
    const { preset } = options;

    // Standard hero product bounded within 780x1080 of the 1080x1920 canvas
    const productScaleFilter = `scale=780:1080:force_original_aspect_ratio=decrease,format=rgba`;

    switch (preset) {
      case 'HERO_REVEAL': {
        // Smooth scale-in reveal with upward easing during opening
        const overlayFilter = `overlay=x=(W-w)/2:y='if(lte(t,0.6),(H-h)/2 + (1-t/0.6)*40,(H-h)/2)'`;
        return { productScaleFilter, overlayFilter };
      }
      case 'FLOATING_PRODUCT': {
        // Vertical breathing oscillation: y = center + 18*sin(t*2.5)
        const overlayFilter = `overlay=x=(W-w)/2:y=(H-h)/2+18*sin(t*2.5)`;
        return { productScaleFilter, overlayFilter };
      }
      case 'PRODUCT_TO_CTA': {
        // Top-half position for end CTA scene (y = H*0.22)
        const overlayFilter = `overlay=x=(W-w)/2:y=H*0.22`;
        return {
          productScaleFilter: `scale=620:720:force_original_aspect_ratio=decrease,format=rgba`,
          overlayFilter
        };
      }
      case 'HORIZONTAL_REVEAL': {
        // Slide in from left during first 0.6s
        const overlayFilter = `overlay=x='if(lte(t,0.6),(t/0.6)*(W-w)/2 - (1-t/0.6)*w,(W-w)/2)':y=(H-h)/2`;
        return { productScaleFilter, overlayFilter };
      }
      case 'VERTICAL_REVEAL': {
        // Slide up from bottom during first 0.6s
        const overlayFilter = `overlay=x=(W-w)/2:y='if(lte(t,0.6),H - (t/0.6)*(H/2 + h/2),(H-h)/2)'`;
        return { productScaleFilter, overlayFilter };
      }
      case 'CINEMATIC_PUSH_IN':
      case 'SMOOTH_ZOOM':
      default: {
        const overlayFilter = `overlay=x=(W-w)/2:y=(H-h)/2`;
        return { productScaleFilter, overlayFilter };
      }
    }
  }
}

