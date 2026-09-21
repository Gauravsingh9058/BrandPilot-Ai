import type {
  ReelProductionPlan,
  Brand,
  MusicSelection,
  ReelAsset,
  StorageProvider
} from '@vidsnapai/types';
import { ReelAssetRepository } from '@vidsnapai/media';

export interface LocalAudioUploadInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  durationSeconds?: number;
}

export class MusicService {
  constructor(
    private reelAssetRepo: ReelAssetRepository,
    private storageProvider: StorageProvider
  ) {}

  /**
   * Resolves AI recommended music track based on Reel mood, tempo, and brand voice.
   */
  async resolveAiRecommendedMusic(
    reelPlan: ReelProductionPlan,
    _brand?: Brand | null
  ): Promise<MusicSelection> {
    const audioDir = reelPlan.audioDirection || {};
    const mood = audioDir.musicMood || 'Inspiring electronic ambient';
    const bpm = audioDir.pacing || 120;

    // AI recommendation descriptor for Phase 8 audio synthesis / stock library lookup
    return {
      source: 'AI_RECOMMENDED',
      title: `${mood.slice(0, 30)} (AI Beat)`,
      artist: 'VidSnapAI Sound Studio',
      mood,
      genre: 'Cinematic Ambient',
      tempoBpm: typeof bpm === 'number' ? bpm : 120,
      durationSeconds: reelPlan.durationSeconds || 30,
      volume: 0.3,
      licenseMetadata: {
        license: 'Royalty-Free AI Music Track'
      }
    };
  }

  /**
   * Attaches a user-uploaded local music file.
   */
  async uploadLocalMusic(
    reelPlan: ReelProductionPlan,
    workspaceId: string,
    file: LocalAudioUploadInput
  ): Promise<{ musicSelection: MusicSelection; asset: ReelAsset }> {
    const validMimes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/m4a',
      'audio/x-m4a',
      'audio/aac',
      'audio/ogg'
    ];

    if (!validMimes.includes(file.mimeType.toLowerCase()) && !file.filename.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
      throw new Error(`Unsupported audio format: ${file.mimeType}. Supported formats: MP3, WAV, M4A, AAC, OGG.`);
    }

    if (file.buffer.length > 50 * 1024 * 1024) {
      throw new Error(`Audio file exceeds maximum size limit of 50MB.`);
    }

    const storageKey = `reels/${reelPlan.id}/music/local_${Date.now()}_${file.filename}`;
    const upload = await this.storageProvider.uploadBuffer(
      file.buffer,
      storageKey,
      file.mimeType,
      file.filename
    );

    // Delete existing music assets for this reel
    const existingAssets = await this.reelAssetRepo.listByReelPlanId(reelPlan.id);
    const existingMusic = existingAssets.filter((a: ReelAsset) => a.assetType === 'MUSIC');
    for (const em of existingMusic) {
      await this.reelAssetRepo.delete(em.id, workspaceId);
    }

    const asset = await this.reelAssetRepo.create({
      reelPlanId: reelPlan.id,
      workspaceId,
      brandId: reelPlan.brandId,
      sceneNumber: null,
      assetType: 'MUSIC',
      sourceType: 'LOCAL_GALLERY',
      provider: 'local_gallery',
      sourceUrl: upload.url,
      previewUrl: upload.url,
      storageKey,
      filename: file.filename,
      mimeType: file.mimeType,
      durationSeconds: file.durationSeconds || reelPlan.durationSeconds,
      metadata: {
        isLocalUpload: true,
        sizeBytes: file.buffer.length
      },
      licenseMetadata: {
        license: 'User Uploaded Local Music'
      },
      status: 'READY'
    });

    const musicSelection: MusicSelection = {
      source: 'LOCAL_GALLERY',
      assetId: asset.id,
      title: file.filename,
      url: upload.url,
      storageKey,
      durationSeconds: file.durationSeconds || reelPlan.durationSeconds,
      volume: 0.3,
      licenseMetadata: {
        license: 'User Uploaded Local Music'
      }
    };

    return { musicSelection, asset };
  }
}
