import type {
  AIProvider,
  BrandDna,
  MarketingStrategy,
  CampaignStrategy,
  ReelProductionPlan,
  ReelProductionPackage,
  AnimationPlan,
  SceneAnimation,
  TransitionPlan,
  TextAnimation,
  CameraMotion,
  ProductAnimation,
  LogoAnimation,
  SyncCue,
  GenerateAnimationPlanInput,
  AnimationLanguage,
  AnimationIntensity
} from '@vidsnapai/types';
import { AnimationAIOutputSchema, type AnimationAIOutput } from '@vidsnapai/validation';
import { buildAnimationIntelligencePrompt } from './prompts/animation-intelligence.prompt.js';
import { MotionPresets } from './presets/motion-presets.js';
import { TextPresets } from './presets/text-presets.js';
import { TransitionPresets } from './presets/transition-presets.js';
import { CameraPresets } from './presets/camera-presets.js';
import { LogoPresets } from './presets/logo-presets.js';
import { ProductPresets } from './presets/product-presets.js';
import { AnimationScorer } from './animationScorer.js';

export class AnimationPlanner {
  constructor(private readonly aiProvider?: AIProvider) {}

  async planAnimation(params: {
    brandDna?: BrandDna | null;
    marketingStrategy?: MarketingStrategy | null;
    campaignStrategy?: CampaignStrategy | null;
    reelPlan: ReelProductionPlan;
    productionPackage: ReelProductionPackage;
    options?: GenerateAnimationPlanInput;
  }): Promise<{ plan: Omit<AnimationPlan, 'id' | 'workspaceId' | 'brandId' | 'reelPlanId' | 'productionPackageId' | 'version' | 'createdAt' | 'updatedAt'>; fallbackUsed: boolean }> {
    const { brandDna, marketingStrategy, campaignStrategy, reelPlan, productionPackage, options } = params;

    const language: AnimationLanguage = options?.animationLanguage || this.deriveLanguageFromBrand(brandDna, campaignStrategy);
    const intensity: AnimationIntensity = options?.intensity || 'MEDIUM';

    if (this.aiProvider) {
      try {
        const prompt = buildAnimationIntelligencePrompt({
          brandDna,
          marketingStrategy,
          campaignStrategy,
          reelPlan,
          productionPackage,
          options: {
            ...options,
            animationLanguage: language,
            intensity
          }
        });

        const aiOutput = await this.aiProvider.generateStructured<AnimationAIOutput>(
          prompt,
          AnimationAIOutputSchema,
          {
            temperature: 0.3,
            systemInstruction: 'You are VidSnapAI Senior Animation Director. Generate deterministic, rhythmically paced vertical motion blueprints.'
          }
        );

        // Normalize and validate
        const normalized = this.normalizeAIPlan(aiOutput, reelPlan, productionPackage, language, intensity);
        const rhythm = AnimationScorer.evaluateRhythm(normalized);

        return {
          plan: {
            ...normalized,
            status: 'READY',
            metadata: {
              generatedBy: 'VidSnapAI Animation Intelligence v7.0 (Gemini Pro)',
              generatedAt: new Date().toISOString(),
              fallbackUsed: false,
              brandDnaVersion: brandDna?.version,
              campaignMode: options?.mode || 'BRAND_PROMOTION',
              targetDurationSeconds: reelPlan.durationSeconds,
              totalEventsCount: this.countTotalEvents(normalized.sceneAnimations),
              rhythm,
              sceneCount: normalized.sceneAnimations.length
            }
          },
          fallbackUsed: false
        };
      } catch (err) {
        console.warn('[AnimationPlanner] AI generation failed, falling back to deterministic preset plan:', err);
      }
    }

    // Deterministic Safe Fallback Generation
    const fallback = this.generateSafeFallbackPlan(reelPlan, productionPackage, language, intensity, options);
    const rhythm = AnimationScorer.evaluateRhythm(fallback);

    return {
      plan: {
        ...fallback,
        status: 'READY',
        metadata: {
          generatedBy: 'VidSnapAI Deterministic Preset Engine v7.0',
          generatedAt: new Date().toISOString(),
          fallbackUsed: true,
          fallbackReason: 'AI_OFFLINE_OR_FALLBACK',
          brandDnaVersion: brandDna?.version,
          campaignMode: options?.mode || 'BRAND_PROMOTION',
          targetDurationSeconds: reelPlan.durationSeconds,
          totalEventsCount: this.countTotalEvents(fallback.sceneAnimations),
          rhythm,
          sceneCount: fallback.sceneAnimations.length
        }
      },
      fallbackUsed: true
    };
  }

  private deriveLanguageFromBrand(brandDna?: BrandDna | null, campaign?: CampaignStrategy | null): AnimationLanguage {
    const tone = (brandDna?.messaging?.tone?.join(' ') || brandDna?.identity?.personality?.join(' ') || '').toLowerCase();
    const objective = (campaign?.objective || '').toLowerCase();

    if (tone.includes('luxury') || tone.includes('elegant') || tone.includes('premium')) return 'LUXURY';
    if (tone.includes('energetic') || tone.includes('fun') || objective.includes('viral')) return 'ENERGETIC';
    if (tone.includes('corporate') || tone.includes('professional')) return 'CORPORATE';
    if (tone.includes('minimal') || tone.includes('clean')) return 'MINIMAL';
    if (tone.includes('tech') || tone.includes('ai') || tone.includes('saas')) return 'TECH';
    if (objective.includes('product') || objective.includes('ecommerce')) return 'PRODUCT_FOCUSED';

    return 'CINEMATIC';
  }

  generateSafeFallbackPlan(
    reelPlan: ReelProductionPlan,
    productionPackage: ReelProductionPackage,
    language: AnimationLanguage,
    intensity: AnimationIntensity,
    options?: GenerateAnimationPlanInput
  ): Omit<AnimationPlan, 'id' | 'workspaceId' | 'brandId' | 'reelPlanId' | 'productionPackageId' | 'version' | 'status' | 'metadata' | 'createdAt' | 'updatedAt'> {
    const scenes = reelPlan.scenes || [];
    const sceneAnimations: SceneAnimation[] = [];
    const transitions: TransitionPlan[] = [];
    const textAnimations: TextAnimation[] = [];
    const cameraMotions: CameraMotion[] = [];
    const productAnimations: ProductAnimation[] = [];
    const logoAnimations: LogoAnimation[] = [];
    const syncPlan: SyncCue[] = [];

    let currentTimelineSeconds = 0;
    const captionCues = (productionPackage as any)?.packagePayload?.captionTrack?.cues || (productionPackage as any)?.captions || [];
    const sfxConfigs = (productionPackage as any)?.packagePayload?.audioMixPlan?.sfxConfigs || [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneNum = scene.sceneNumber || i + 1;
      const duration = scene.durationSeconds || 5;
      const startTime = currentTimelineSeconds;
      const endTime = startTime + duration;
      currentTimelineSeconds = endTime;

      const isFirstScene = i === 0;
      const isLastScene = i === scenes.length - 1;
      const hasProduct = Boolean(scene.productReference || scene.visualType === 'PRODUCT_SHOWCASE');

      // 1. Scene entrance motion
      const entranceEvents = isFirstScene
        ? MotionPresets.FastHookEntrance.createEvents({ startTime, duration, intensity: 'HIGH' })
        : MotionPresets.PremiumReveal.createEvents({ startTime, duration, intensity });

      // 2. Camera motion
      const camera = isFirstScene
        ? CameraPresets.CinematicSlowPush.createMotion({ startTime, duration, intensity })
        : isLastScene
          ? CameraPresets.StaticHeroFocus.createMotion({ startTime, duration })
          : CameraPresets.ParallaxDrift.createMotion({ startTime, duration, intensity: 'LOW' });
      cameraMotions.push(camera);

      // 3. Text & kinetic typography
      const sceneCaptions = captionCues.filter((c: any) => c.startTime >= startTime - 0.1 && c.startTime < endTime);
      const emphasisWords = sceneCaptions
        .filter((c: any) => Boolean(c.emphasis))
        .map((c: any) => c.text);

      const textAnim = isLastScene
        ? TextPresets.CTAEmphasis.createAnimation({
            text: scene.onScreenText || reelPlan.cta?.text || 'Act Now',
            startTime: startTime + 0.3,
            duration: Math.max(1.5, duration - 0.5),
            emphasisWords
          })
        : TextPresets.KineticWordPop.createAnimation({
            text: scene.onScreenText || scene.narration || '',
            startTime: startTime + 0.2,
            duration: Math.max(1.5, duration - 0.4),
            emphasisWords
          });
      textAnimations.push(textAnim);

      // 4. Product reveal
      let sceneProduct: ProductAnimation | undefined;
      if (hasProduct) {
        sceneProduct = isFirstScene
          ? ProductPresets.CleanSlide.createAnimation({ productId: scene.productReference || undefined, startTime: startTime + 0.2, duration: duration - 0.4 })
          : ProductPresets.HeroReveal.createAnimation({ productId: scene.productReference || undefined, startTime: startTime + 0.1, duration: duration - 0.2, isHeroMoment: true });
        productAnimations.push(sceneProduct);
      }

      // 5. Logo placement
      let sceneLogo: LogoAnimation | undefined;
      if (isLastScene || scene.brandElement) {
        sceneLogo = isLastScene
          ? LogoPresets.HeroScaleReveal.createAnimation({ startTime: startTime + 0.5, duration: duration - 0.8, position: 'center' })
          : LogoPresets.MinimalMark.createAnimation({ startTime, duration, position: 'top-right' });
        logoAnimations.push(sceneLogo);
      }

      // 6. Transition out
      let transOut: TransitionPlan | undefined;
      if (i < scenes.length - 1) {
        transOut = isFirstScene
          ? TransitionPresets.LightWipe.createTransition({ fromScene: sceneNum, toScene: sceneNum + 1 })
          : TransitionPresets.SmoothCrossfade.createTransition({ fromScene: sceneNum, toScene: sceneNum + 1 });
        transitions.push(transOut);
      }

      // 7. Audio / SFX sync cues
      const sceneSFX = sfxConfigs.filter((s: any) => s.startTime >= startTime - 0.1 && s.startTime < endTime);
      const sceneSyncCues: SyncCue[] = sceneSFX.map((s: any) => ({
        time: s.startTime,
        source: 'SFX',
        event: 'SFX_HIT',
        target: hasProduct ? 'PRODUCT' : isLastScene ? 'CTA' : 'MEDIA',
        strength: 0.9,
        label: s.name
      }));

      // Add voice cue
      if (sceneCaptions.length > 0) {
        sceneSyncCues.push({
          time: sceneCaptions[0].startTime,
          source: 'VOICE',
          event: 'WORD_START',
          target: 'TEXT',
          strength: 0.85,
          label: sceneCaptions[0].text
        });
      }

      syncPlan.push(...sceneSyncCues);

      // Build scene animation
      sceneAnimations.push({
        sceneNumber: sceneNum,
        startTime,
        endTime,
        animationIntensity: isFirstScene ? 'HIGH' : intensity,
        entranceAnimations: entranceEvents,
        continuousAnimations: [
          ...MotionPresets.SubtleDrift.createEvents({ startTime, duration, target: 'BACKGROUND', intensity: 'LOW' })
        ],
        emphasisAnimations: [],
        exitAnimations: [],
        cameraMotion: [camera],
        textMotion: [textAnim],
        mediaMotion: entranceEvents,
        productMotion: sceneProduct ? [sceneProduct] : [],
        logoMotion: sceneLogo ? [sceneLogo] : [],
        synchronizationCues: sceneSyncCues,
        transitionOut: transOut,
        rationale: isFirstScene
          ? 'Fast kinetic hook to capture audience attention in first 2 seconds.'
          : isLastScene
            ? 'Strong CTA emphasis climax with center-stage brand seal.'
            : hasProduct
              ? 'Hero product reveal with radial lighting separation.'
              : 'Smooth cinematic push with synchronized kinetic text cues.'
      });
    }

    return {
      animationLanguage: language,
      globalSettings: {
        animationLanguage: language,
        intensity,
        pacing: 'dynamic rhythmic',
        smoothness: 0.85,
        defaultEasing: 'CUBIC_OUT',
        defaultTransition: 'CROSSFADE',
        motionBlurIntent: true,
        maxSimultaneousAnimations: 4,
        reducedMotionSupport: Boolean(options?.reducedMotion),
        mode: options?.mode || 'BRAND_PROMOTION'
      },
      sceneAnimations,
      transitionPlan: transitions,
      textAnimationPlan: textAnimations,
      cameraPlan: cameraMotions,
      productAnimationPlan: productAnimations,
      logoAnimationPlan: logoAnimations,
      syncPlan
    };
  }

  private normalizeAIPlan(
    aiOutput: AnimationAIOutput,
    reelPlan: ReelProductionPlan,
    productionPackage: ReelProductionPackage,
    language: AnimationLanguage,
    intensity: AnimationIntensity
  ): Omit<AnimationPlan, 'id' | 'workspaceId' | 'brandId' | 'reelPlanId' | 'productionPackageId' | 'version' | 'status' | 'metadata' | 'createdAt' | 'updatedAt'> {
    // Ensure accurate timestamps aligned with scenes
    const scenes = reelPlan.scenes || [];
    let currentTime = 0;

    const normalizedScenes: SceneAnimation[] = scenes.map((s, idx) => {
      const sceneNum = s.sceneNumber || idx + 1;
      const duration = s.durationSeconds || 5;
      const startTime = currentTime;
      const endTime = startTime + duration;
      currentTime = endTime;

      const aiScene = aiOutput.sceneAnimations.find((as) => as.sceneNumber === sceneNum) || aiOutput.sceneAnimations[idx];

      return {
        sceneNumber: sceneNum,
        startTime,
        endTime,
        animationIntensity: aiScene?.animationIntensity || intensity,
        entranceAnimations: aiScene?.entranceAnimations || [],
        continuousAnimations: aiScene?.continuousAnimations || [],
        emphasisAnimations: aiScene?.emphasisAnimations || [],
        exitAnimations: aiScene?.exitAnimations || [],
        cameraMotion: aiScene?.cameraMotion || [CameraPresets.CinematicSlowPush.createMotion({ startTime, duration })],
        textMotion: aiScene?.textMotion || [TextPresets.KineticWordPop.createAnimation({ text: s.onScreenText || s.narration || '', startTime: startTime + 0.2, duration: duration - 0.4 })],
        mediaMotion: aiScene?.mediaMotion || [],
        productMotion: aiScene?.productMotion || [],
        logoMotion: aiScene?.logoMotion || [],
        synchronizationCues: aiScene?.synchronizationCues || [],
        transitionOut: aiScene?.transitionOut,
        rationale: aiScene?.rationale || aiOutput.creativeRationale || 'Directorial motion intent'
      };
    });

    return {
      animationLanguage: aiOutput.animationLanguage || language,
      globalSettings: aiOutput.globalSettings || {
        animationLanguage: language,
        intensity,
        pacing: 'dynamic rhythmic',
        smoothness: 0.85,
        defaultEasing: 'CUBIC_OUT',
        defaultTransition: 'CROSSFADE',
        motionBlurIntent: true,
        maxSimultaneousAnimations: 4,
        reducedMotionSupport: false
      },
      sceneAnimations: normalizedScenes,
      transitionPlan: aiOutput.transitionPlan || [],
      textAnimationPlan: aiOutput.textAnimationPlan || [],
      cameraPlan: aiOutput.cameraPlan || [],
      productAnimationPlan: aiOutput.productAnimationPlan || [],
      logoAnimationPlan: aiOutput.logoAnimationPlan || [],
      syncPlan: aiOutput.syncPlan || []
    };
  }

  private countTotalEvents(scenes: SceneAnimation[]): number {
    return scenes.reduce((total, s) => {
      return (
        total +
        (s.entranceAnimations?.length || 0) +
        (s.continuousAnimations?.length || 0) +
        (s.emphasisAnimations?.length || 0) +
        (s.exitAnimations?.length || 0) +
        (s.textMotion?.length || 0) +
        (s.cameraMotion?.length || 0) +
        (s.productMotion?.length || 0) +
        (s.logoMotion?.length || 0)
      );
    }, 0);
  }
}
