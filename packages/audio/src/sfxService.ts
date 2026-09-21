import type {
  ReelProductionPlan,
  SFXSelection,
  ReelAsset,
  StorageProvider
} from '@vidsnapai/types';
import { ReelAssetRepository } from '@vidsnapai/media';
import type { LocalAudioUploadInput } from './musicService.js';

export class SFXService {
  constructor(
    private reelAssetRepo: ReelAssetRepository,
    private storageProvider: StorageProvider
  ) {}

  /**
   * Resolves AI recommended SFX cues based on scene transitions and visual intents.
   */
  async resolveAiRecommendedSFX(reelPlan: ReelProductionPlan): Promise<SFXSelection[]> {
    const sfxList: SFXSelection[] = [];
    const scenes = reelPlan.scenes || [];
    let currentOffset = 0;

    for (const scene of scenes) {
      const sceneDuration = scene.durationSeconds || 4;

      if (scene.sceneNumber === 1) {
        // Impact whoosh / pop on hook
        sfxList.push({
          id: `sfx-scene-${scene.sceneNumber}-hook`,
          name: 'Impact Whoosh Hook',
          type: 'WHOOSH',
          source: 'AI_RECOMMENDED',
          startTime: currentOffset,
          durationSeconds: 1.0,
          volume: 0.4,
          sceneNumber: scene.sceneNumber
        });
      }

      if (scene.transition && scene.transition.toLowerCase().includes('pan')) {
        sfxList.push({
          id: `sfx-scene-${scene.sceneNumber}-trans`,
          name: 'Quick Whip Pan SFX',
          type: 'TRANSITION',
          source: 'AI_RECOMMENDED',
          startTime: Math.max(0, currentOffset + sceneDuration - 0.5),
          durationSeconds: 0.8,
          volume: 0.35,
          sceneNumber: scene.sceneNumber
        });
      }

      if (scene.visualType === 'CTA') {
        sfxList.push({
          id: `sfx-scene-${scene.sceneNumber}-cta`,
          name: 'Subtle Chime Notification',
          type: 'CHIME',
          source: 'AI_RECOMMENDED',
          startTime: currentOffset + 0.2,
          durationSeconds: 1.2,
          volume: 0.45,
          sceneNumber: scene.sceneNumber
        });
      }

      currentOffset += sceneDuration;
    }

    return sfxList;
  }

  /**
   * Uploads a local sound effect file.
   */
  async uploadLocalSFX(
    reelPlan: ReelProductionPlan,
    workspaceId: string,
    file: LocalAudioUploadInput,
    sceneNumber?: number
  ): Promise<{ sfx: SFXSelection; asset: ReelAsset }> {
    const storageKey = `reels/${reelPlan.id}/sfx/local_${Date.now()}_${file.filename}`;
    const upload = await this.storageProvider.uploadBuffer(
      file.buffer,
      storageKey,
      file.mimeType,
      file.filename
    );

    const asset = await this.reelAssetRepo.create({
      reelPlanId: reelPlan.id,
      workspaceId,
      brandId: reelPlan.brandId,
      sceneNumber: sceneNumber || null,
      assetType: 'SFX',
      sourceType: 'LOCAL_GALLERY',
      provider: 'local_gallery',
      sourceUrl: upload.url,
      previewUrl: upload.url,
      storageKey,
      filename: file.filename,
      mimeType: file.mimeType,
      durationSeconds: file.durationSeconds || 1.5,
      metadata: {
        isLocalUpload: true,
        sizeBytes: file.buffer.length
      },
      licenseMetadata: {
        license: 'User Uploaded Local SFX'
      },
      status: 'READY'
    });

    const sfx: SFXSelection = {
      id: `sfx-local-${asset.id.slice(0, 8)}`,
      assetId: asset.id,
      name: file.filename,
      type: 'CUSTOM',
      source: 'LOCAL_GALLERY',
      url: upload.url,
      storageKey,
      startTime: 0,
      durationSeconds: file.durationSeconds || 1.5,
      volume: 0.4,
      sceneNumber
    };

    return { sfx, asset };
  }
}
