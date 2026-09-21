import type {
  AIProvider,
  BrandDna,
  MarketingStrategy,
  CampaignStrategy,
  ReelProductionPlan,
  ReelProductionPackage,
  AnimationPlan,
  AnimationStatus,
  AnimationReadinessReport,
  AnimationRenderContract,
  GenerateAnimationPlanInput,
  RegenerateAnimationPlanInput,
  UpdateAnimationPlanInput,
  RegenerateSceneAnimationInput,
  SceneAnimation
} from '@vidsnapai/types';
import { AnimationPlanRepository } from './repositories/animation-plan.repository.js';
import { AnimationPlanner } from './animationPlanner.js';
import { AnimationScorer } from './animationScorer.js';
import { MotionPresets } from './presets/motion-presets.js';
import { TextPresets } from './presets/text-presets.js';
import { CameraPresets } from './presets/camera-presets.js';
import { TransitionPresets } from './presets/transition-presets.js';

export class AnimationService {
  private repo: AnimationPlanRepository;
  private planner: AnimationPlanner;

  constructor(aiProvider?: AIProvider, repo?: AnimationPlanRepository) {
    this.repo = repo || new AnimationPlanRepository();
    this.planner = new AnimationPlanner(aiProvider);
  }

  async generateAnimationPlan(params: {
    workspaceId: string;
    brandId: string;
    reelPlan: ReelProductionPlan;
    productionPackage: ReelProductionPackage;
    brandDna?: BrandDna | null;
    marketingStrategy?: MarketingStrategy | null;
    campaignStrategy?: CampaignStrategy | null;
    input?: GenerateAnimationPlanInput | RegenerateAnimationPlanInput;
  }): Promise<{ animationPlan: AnimationPlan; readiness: AnimationReadinessReport; fallbackUsed: boolean }> {
    const { workspaceId, brandId, reelPlan, productionPackage, brandDna, marketingStrategy, campaignStrategy, input } = params;

    const { plan, fallbackUsed } = await this.planner.planAnimation({
      brandDna,
      marketingStrategy,
      campaignStrategy,
      reelPlan,
      productionPackage,
      options: input
    });

    const savedPlan = await this.repo.createVersion(
      reelPlan.id,
      workspaceId,
      brandId,
      productionPackage.id,
      {
        status: plan.status || 'READY',
        animationLanguage: plan.animationLanguage,
        globalSettings: plan.globalSettings as any,
        sceneAnimations: plan.sceneAnimations as any,
        transitionPlan: plan.transitionPlan as any,
        textAnimationPlan: plan.textAnimationPlan as any,
        cameraPlan: plan.cameraPlan as any,
        productAnimationPlan: plan.productAnimationPlan as any,
        logoAnimationPlan: plan.logoAnimationPlan as any,
        syncPlan: plan.syncPlan as any,
        metadata: plan.metadata as any
      }
    );

    const readiness = AnimationScorer.evaluateReadiness(savedPlan, productionPackage);

    return {
      animationPlan: savedPlan,
      readiness,
      fallbackUsed
    };
  }

  async regenerateSceneAnimation(params: {
    workspaceId: string;
    reelPlanId: string;
    sceneNumber: number;
    productionPackage: ReelProductionPackage;
    input?: RegenerateSceneAnimationInput;
  }): Promise<AnimationPlan | null> {
    const { workspaceId, reelPlanId, sceneNumber, productionPackage, input } = params;

    const currentPlan = await this.repo.getLatestByReelPlanId(reelPlanId, workspaceId);
    if (!currentPlan) return null;

    const scene = productionPackage.packagePayload.reelPlan.scenes.find((s) => s.sceneNumber === sceneNumber);
    if (!scene) return null;

    const existingSceneAnim = currentPlan.sceneAnimations.find((s) => s.sceneNumber === sceneNumber);
    const startTime = existingSceneAnim ? existingSceneAnim.startTime : (sceneNumber - 1) * (scene.durationSeconds || 5);
    const duration = scene.durationSeconds || 5;
    const endTime = startTime + duration;
    const intensity = input?.intensity || currentPlan.globalSettings.intensity || 'MEDIUM';

    const isFirstScene = sceneNumber === 1;
    const isLastScene = sceneNumber === productionPackage.packagePayload.reelPlan.scenes.length;

    const entranceEvents = isFirstScene
      ? MotionPresets.FastHookEntrance.createEvents({ startTime, duration, intensity: 'HIGH' })
      : MotionPresets.PremiumReveal.createEvents({ startTime, duration, intensity });

    const camera = isFirstScene
      ? CameraPresets.CinematicSlowPush.createMotion({ startTime, duration, intensity })
      : isLastScene
        ? CameraPresets.StaticHeroFocus.createMotion({ startTime, duration })
        : CameraPresets.ParallaxDrift.createMotion({ startTime, duration, intensity: 'LOW' });

    const textAnim = isLastScene
      ? TextPresets.CTAEmphasis.createAnimation({
          text: scene.onScreenText || 'Learn More',
          startTime: startTime + 0.2,
          duration: duration - 0.4
        })
      : TextPresets.KineticWordPop.createAnimation({
          text: scene.onScreenText || scene.narration || '',
          startTime: startTime + 0.2,
          duration: duration - 0.4
        });

    const updatedScene: SceneAnimation = {
      sceneNumber,
      startTime,
      endTime,
      animationIntensity: intensity,
      entranceAnimations: entranceEvents,
      continuousAnimations: MotionPresets.SubtleDrift.createEvents({ startTime, duration, target: 'BACKGROUND', intensity: 'LOW' }),
      emphasisAnimations: [],
      exitAnimations: [],
      cameraMotion: [camera],
      textMotion: [textAnim],
      mediaMotion: entranceEvents,
      productMotion: scene.productReference ? existingSceneAnim?.productMotion || [] : [],
      logoMotion: existingSceneAnim?.logoMotion || [],
      synchronizationCues: existingSceneAnim?.synchronizationCues || [],
      transitionOut: existingSceneAnim?.transitionOut || (isLastScene ? undefined : TransitionPresets.SmoothCrossfade.createTransition({ fromScene: sceneNumber, toScene: sceneNumber + 1 })),
      rationale: input?.customGuidance
        ? `Regenerated with custom direction: ${input.customGuidance}`
        : 'Regenerated scene animation motion.'
    };

    return this.repo.replaceScene(currentPlan.id, workspaceId, sceneNumber, updatedScene);
  }

  async getLatestPlan(reelPlanId: string, workspaceId: string): Promise<AnimationPlan | null> {
    return this.repo.getLatestByReelPlanId(reelPlanId, workspaceId);
  }

  async getPlanById(id: string, workspaceId: string): Promise<AnimationPlan | null> {
    return this.repo.getById(id, workspaceId);
  }

  async getHistory(reelPlanId: string, workspaceId: string): Promise<AnimationPlan[]> {
    return this.repo.getHistoryByReelPlanId(reelPlanId, workspaceId);
  }

  async updatePlan(id: string, workspaceId: string, input: UpdateAnimationPlanInput): Promise<AnimationPlan | null> {
    return this.repo.update(id, workspaceId, input as any);
  }

  async updateStatus(id: string, workspaceId: string, status: AnimationStatus): Promise<AnimationPlan | null> {
    return this.repo.updateStatus(id, workspaceId, status);
  }

  async getReadinessReport(
    reelPlanId: string,
    workspaceId: string,
    pkg?: ReelProductionPackage | null
  ): Promise<AnimationReadinessReport | null> {
    const plan = await this.repo.getLatestByReelPlanId(reelPlanId, workspaceId);
    if (!plan) return null;

    return AnimationScorer.evaluateReadiness(plan, pkg);
  }

  buildRenderContract(params: {
    animationPlan: AnimationPlan;
    productionPackage: ReelProductionPackage;
    brandDna?: BrandDna | null;
  }): AnimationRenderContract {
    const { animationPlan, productionPackage, brandDna } = params;
    const reelPlan = productionPackage.packagePayload.reelPlan;
    const assets = productionPackage.packagePayload.assets || [];
    const captionTrack = productionPackage.packagePayload.captionTrack;
    const audioMix = productionPackage.packagePayload.audioMixPlan;

    const brandColors = brandDna?.visualIdentity?.colors || {};
    const brandFonts = brandDna?.visualIdentity?.typography || {};

    const scenes = animationPlan.sceneAnimations.map((sa) => {
      const sceneAsset = assets.find((a) => a.sceneNumber === sa.sceneNumber);
      return {
        sceneNumber: sa.sceneNumber,
        startTime: sa.startTime,
        endTime: sa.endTime,
        duration: sa.endTime - sa.startTime,
        mediaUrl: sceneAsset?.sourceUrl || sceneAsset?.previewUrl || undefined,
        mediaType: sceneAsset?.assetType || 'VIDEO',
        camera: sa.cameraMotion,
        animations: [
          ...sa.entranceAnimations,
          ...sa.continuousAnimations,
          ...sa.emphasisAnimations,
          ...sa.exitAnimations
        ],
        textAnimations: sa.textMotion,
        productAnimations: sa.productMotion,
        logoAnimations: sa.logoMotion,
        transitionOut: sa.transitionOut,
        syncCues: sa.synchronizationCues
      };
    });

    const voiceAsset = productionPackage.packagePayload.voiceAsset;
    const voiceTrackUrl = voiceAsset?.sourceUrl || voiceAsset?.previewUrl || undefined;
    const musicTrackUrl = audioMix?.musicConfig?.url || undefined;
    const sfxCues = audioMix?.sfxConfigs || [];

    return {
      contractVersion: '1.0.0',
      reelPlanId: reelPlan.id,
      productionPackageId: productionPackage.id,
      animationPlanId: animationPlan.id,
      dimensions: {
        width: 1080,
        height: 1920,
        aspectRatio: reelPlan.aspectRatio || '9:16'
      },
      fps: 30,
      totalDurationSeconds: reelPlan.durationSeconds,
      scenes,
      audio: {
        voiceTrackUrl,
        musicTrackUrl,
        sfxCues,
        duckingConfig: audioMix?.mixSettings
      },
      captions: {
        trackId: captionTrack?.id,
        cuesCount: captionTrack?.cues?.length || 0,
        style: captionTrack?.style || { fontFamily: 'Outfit', fontSize: 32 }
      },
      brand: {
        primaryColor: brandColors.primary || '#6366F1',
        secondaryColor: brandColors.secondary || '#EC4899',
        accentColor: brandColors.accent || '#3B82F6',
        fontFamily: brandFonts.bodyFont || brandFonts.headingFont || 'Outfit',
        logoUrl: assets.find((a) => a.assetType === 'LOGO')?.sourceUrl || undefined
      },
      globalSettings: animationPlan.globalSettings
    };
  }
}
