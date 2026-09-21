import type { Database } from '@vidsnapai/database';
import type {
  ReelProductionPlan,
  AudioMixPlan,
  MusicSelection,
  SFXSelection,
  AudioMixSettings,
  VoiceConfiguration,
  StorageProvider
} from '@vidsnapai/types';
import { ReelAssetRepository } from '@vidsnapai/media';
import { LocalStorageProvider } from '@vidsnapai/storage';
import { AudioMixPlanRepository } from './repositories/audio-mix-plan.repository.js';
import { MusicService, type LocalAudioUploadInput } from './musicService.js';
import { SFXService } from './sfxService.js';

export interface ResolveAudioOptions {
  musicSelection?: MusicSelection;
  sfxSelections?: SFXSelection[];
  mixSettings?: Partial<AudioMixSettings>;
  voiceConfig?: VoiceConfiguration;
}

export class AudioService {
  private audioMixRepo: AudioMixPlanRepository;
  private musicService: MusicService;
  private sfxService: SFXService;

  constructor(
    db: Database,
    options?: {
      audioMixRepo?: AudioMixPlanRepository;
      reelAssetRepo?: ReelAssetRepository;
      storageProvider?: StorageProvider;
    }
  ) {
    const storageProvider = options?.storageProvider || new LocalStorageProvider();
    const reelAssetRepo = options?.reelAssetRepo || new ReelAssetRepository(db);

    this.audioMixRepo = options?.audioMixRepo || new AudioMixPlanRepository(db);
    this.musicService = new MusicService(reelAssetRepo, storageProvider);
    this.sfxService = new SFXService(reelAssetRepo, storageProvider);
  }

  /**
   * Resolves complete audio plan (Music + SFX + Ducking Mix Settings) for a Reel.
   */
  async resolveAudioPlan(
    reelPlan: ReelProductionPlan,
    workspaceId: string,
    options: ResolveAudioOptions = {}
  ): Promise<AudioMixPlan> {
    // 1. Resolve Music Track
    const musicConfig: MusicSelection =
      options.musicSelection || (await this.musicService.resolveAiRecommendedMusic(reelPlan));

    // 2. Resolve SFX Cues
    const sfxConfigs: SFXSelection[] =
      options.sfxSelections || (await this.sfxService.resolveAiRecommendedSFX(reelPlan));

    // 3. Resolve Voice Config
    const voiceConfig: VoiceConfiguration = options.voiceConfig || {
      voiceId: 'voice-aura-pro-1',
      voiceName: 'Marcus (Default)',
      provider: 'mock_voice',
      style: reelPlan.voiceDirection?.style || 'Dynamic',
      tone: reelPlan.voiceDirection?.tone || 'Empowering'
    };

    // 4. Default Mix Settings with Ducking Priority: VOICE > SFX > MUSIC
    const mixSettings: AudioMixSettings = {
      voiceVolume: 1.0,
      musicVolume: 0.3,
      sfxVolume: 0.4,
      ducking: true,
      duckingLevel: 0.2, // Duck music to 20% volume during narration
      fadeInSeconds: 0.5,
      fadeOutSeconds: 1.0,
      priorityOrder: ['VOICE', 'SFX', 'MUSIC'],
      ...options.mixSettings
    };

    // 5. Persist AudioMixPlan
    return this.audioMixRepo.createOrUpdate({
      reelPlanId: reelPlan.id,
      workspaceId,
      brandId: reelPlan.brandId,
      voiceConfig,
      musicConfig,
      sfxConfigs,
      mixSettings,
      status: 'READY'
    });
  }

  /**
   * Uploads and attaches a local music file to the Reel audio mix.
   */
  async uploadLocalMusic(
    reelPlan: ReelProductionPlan,
    workspaceId: string,
    file: LocalAudioUploadInput
  ): Promise<AudioMixPlan> {
    const { musicSelection } = await this.musicService.uploadLocalMusic(reelPlan, workspaceId, file);
    return this.resolveAudioPlan(reelPlan, workspaceId, { musicSelection });
  }

  /**
   * Uploads and attaches a local SFX file to the Reel audio mix.
   */
  async uploadLocalSFX(
    reelPlan: ReelProductionPlan,
    workspaceId: string,
    file: LocalAudioUploadInput,
    sceneNumber?: number
  ): Promise<AudioMixPlan> {
    const { sfx } = await this.sfxService.uploadLocalSFX(reelPlan, workspaceId, file, sceneNumber);
    const existing = await this.audioMixRepo.findByReelPlanId(reelPlan.id);
    const sfxConfigs = existing ? [...existing.sfxConfigs, sfx] : [sfx];

    return this.resolveAudioPlan(reelPlan, workspaceId, {
      musicSelection: existing?.musicConfig,
      sfxSelections: sfxConfigs,
      mixSettings: existing?.mixSettings
    });
  }

  /**
   * Retrieves the current audio mix plan for a Reel plan.
   */
  async getAudioMixPlan(reelPlanId: string): Promise<AudioMixPlan | null> {
    return this.audioMixRepo.findByReelPlanId(reelPlanId);
  }

  /**
   * Updates audio mix plan settings directly.
   */
  async updateAudioMixPlan(
    reelPlanId: string,
    workspaceId: string,
    updates: {
      musicConfig?: MusicSelection;
      sfxConfigs?: SFXSelection[];
      mixSettings?: Partial<AudioMixSettings>;
    }
  ): Promise<AudioMixPlan> {
    const existing = await this.audioMixRepo.findByReelPlanId(reelPlanId);
    if (!existing) {
      throw new Error(`Audio mix plan not found for Reel plan ${reelPlanId}`);
    }

    return this.audioMixRepo.createOrUpdate({
      reelPlanId,
      workspaceId,
      brandId: existing.brandId,
      voiceConfig: existing.voiceConfig,
      musicConfig: updates.musicConfig || existing.musicConfig,
      sfxConfigs: updates.sfxConfigs || existing.sfxConfigs,
      mixSettings: updates.mixSettings
        ? { ...existing.mixSettings, ...updates.mixSettings }
        : existing.mixSettings,
      status: 'READY'
    });
  }
}
