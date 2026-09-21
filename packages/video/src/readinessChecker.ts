import type {
  ReelProductionPlan,
  ReelAsset,
  CaptionTrack,
  AudioMixPlan,
  ProductionReadiness,
  ReadinessBlockerCode,
  ProductionComponentCheck
} from '@vidsnapai/types';

export class ProductionReadinessChecker {
  /**
   * Evaluates production asset completeness and readiness for Phase 7/8 handoff.
   */
  static evaluate(context: {
    reelPlan: ReelProductionPlan;
    assets: ReelAsset[];
    captionTrack?: CaptionTrack | null;
    audioMixPlan?: AudioMixPlan | null;
  }): ProductionReadiness {
    const { reelPlan, assets, captionTrack, audioMixPlan } = context;
    const blockers: ReadinessBlockerCode[] = [];
    const scenes = reelPlan.scenes || [];

    // 1. Media Assets Check (Must be ready and production-eligible, not placeholder/test)
    const sceneAssets = assets.filter((a) => {
      const isPlaceholder = Boolean(
        a.isPlaceholder ||
        (a.metadata as any)?.isPlaceholder ||
        a.provider === 'fallback_placeholder' ||
        (a.sourceType === 'EXTERNAL' && !a.sourceUrl)
      );
      const isTestAsset = Boolean(a.isTestAsset || (a.metadata as any)?.isTestAsset);
      const productionEligible = a.productionEligible !== false && (a.metadata as any)?.productionEligible !== false && !isPlaceholder && !isTestAsset;

      return (
        a.sceneNumber !== null &&
        a.sceneNumber !== undefined &&
        (a.assetType === 'VIDEO' ||
          a.assetType === 'IMAGE' ||
          a.assetType === 'PRODUCT_IMAGE' ||
          a.assetType === 'PRODUCT_VIDEO') &&
        a.status === 'READY' &&
        productionEligible
      );
    });

    const resolvedSceneNumbers = new Set(sceneAssets.map((a) => a.sceneNumber));
    const missingSceneNumbers = scenes
      .map((s) => s.sceneNumber)
      .filter((num) => !resolvedSceneNumbers.has(num));

    let mediaCheck: ProductionComponentCheck;
    if (scenes.length === 0) {
      mediaCheck = { status: 'MISSING', details: 'No scenes defined in Reel plan.' };
      blockers.push('MEDIA_MISSING');
    } else if (missingSceneNumbers.length > 0) {
      mediaCheck = {
        status: 'MISSING',
        details: `Missing media assets for scenes: [${missingSceneNumbers.join(', ')}]`,
        assetCount: sceneAssets.length
      };
      blockers.push('MEDIA_MISSING');
    } else {
      mediaCheck = {
        status: 'READY',
        details: `All ${scenes.length} scenes resolved with visual media assets.`,
        assetCount: sceneAssets.length
      };
    }

    // 2. Voice Track Check
    const voiceAsset = assets.find((a) => a.assetType === 'VOICE' && a.status === 'READY');
    let voiceCheck: ProductionComponentCheck;
    if (!voiceAsset) {
      voiceCheck = { status: 'MISSING', details: 'No voice narration track generated or uploaded.' };
      blockers.push('VOICE_MISSING');
    } else {
      voiceCheck = {
        status: 'READY',
        details: `Voice narration audio ready (${voiceAsset.durationSeconds?.toFixed(1) || '?'}s, provider: ${voiceAsset.provider})`,
        assetCount: 1
      };
    }

    // 3. Captions Track Check
    let captionCheck: ProductionComponentCheck;
    if (!captionTrack || !captionTrack.cues || captionTrack.cues.length === 0) {
      captionCheck = { status: 'MISSING', details: 'No timed captions track generated.' };
      blockers.push('CAPTIONS_MISSING');
    } else {
      captionCheck = {
        status: 'READY',
        details: `${captionTrack.cues.length} timed caption cues ready (style: ${captionTrack.style?.fontFamily || 'Default'})`,
        assetCount: captionTrack.cues.length
      };
    }

    // 4. Music Check
    let musicCheck: ProductionComponentCheck;
    if (!audioMixPlan || !audioMixPlan.musicConfig) {
      musicCheck = { status: 'MISSING', details: 'Music selection is not configured.' };
      blockers.push('AUDIO_MISSING');
    } else {
      musicCheck = {
        status: 'READY',
        details: `Music track selected (${audioMixPlan.musicConfig.title || audioMixPlan.musicConfig.mood || 'AI Track'}, source: ${audioMixPlan.musicConfig.source})`,
        assetCount: 1
      };
    }

    // 5. SFX Check (Optional)
    const sfxCount = audioMixPlan?.sfxConfigs?.length || 0;
    const sfxCheck: ProductionComponentCheck = {
      status: sfxCount > 0 ? 'READY' : 'OPTIONAL',
      details: `${sfxCount} SFX cue(s) configured.`,
      assetCount: sfxCount
    };

    // 6. Brand Assets Check
    const firstPartyAssets = assets.filter((a) => a.sourceType === 'BRAND_LIBRARY');
    const brandAssetsCheck: ProductionComponentCheck = {
      status: 'READY',
      details: `${firstPartyAssets.length} first-party brand/product asset(s) attached.`,
      assetCount: firstPartyAssets.length
    };

    const overallStatus =
      blockers.length === 0 ? 'READY_FOR_ANIMATION' : 'BLOCKED';

    return {
      status: overallStatus,
      checks: {
        media: mediaCheck,
        voice: voiceCheck,
        captions: captionCheck,
        music: musicCheck,
        sfx: sfxCheck,
        brandAssets: brandAssetsCheck
      },
      blockers,
      evaluatedAt: new Date().toISOString()
    };
  }
}
