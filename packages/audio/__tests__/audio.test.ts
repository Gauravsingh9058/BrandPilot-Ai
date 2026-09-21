import { describe, it, expect, vi } from 'vitest';
import {
  MusicService,
  SFXService,
  AudioService
} from '../src/index.js';
import { MemoryStorageProvider } from '@vidsnapai/storage';
import type { ReelProductionPlan } from '@vidsnapai/types';

describe('Phase 6: Audio Package Tests', () => {
  const mockReelPlan: ReelProductionPlan = {
    id: 'reel-audio-1',
    contentJobId: 'job-1',
    brandId: 'brand-1',
    contentPlanId: 'plan-1',
    workspaceId: 'ws-1',
    version: 1,
    title: 'Audio Mix & Ducking Studio',
    concept: { title: 'Audio' },
    objective: 'Drive preorders',
    audience: 'Producers',
    funnelStage: 'CONSIDERATION',
    contentPillar: 'Audio',
    durationSeconds: 30,
    aspectRatio: '9:16',
    platform: 'INSTAGRAM',
    format: 'REEL',
    hook: { text: 'Why cables in 2026?' },
    narrative: 'A journey of wireless freedom',
    script: [],
    scenes: [
      {
        sceneNumber: 1,
        durationSeconds: 4,
        purpose: 'Hook',
        narration: 'Why are producers still trapped by studio cables in 2026?',
        visualType: 'PROBLEM',
        transition: 'Whip pan'
      },
      {
        sceneNumber: 2,
        durationSeconds: 6,
        purpose: 'CTA Endcard',
        narration: 'Pre-order StudioPro X today.',
        visualType: 'CTA'
      }
    ],
    visualDirection: {},
    voiceDirection: {},
    captionDirection: {},
    animationDirection: {},
    audioDirection: {
      musicMood: 'Crisp electronic downtempo beat',
      pacing: 124
    },
    cta: { text: 'Preorder Now' },
    productionMetadata: {},
    status: 'READY',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('MusicService & SFXService', () => {
    it('resolves AI recommended music track matching Reel audioDirection mood', async () => {
      const musicService = new MusicService({} as any, new MemoryStorageProvider());
      const music = await musicService.resolveAiRecommendedMusic(mockReelPlan);

      expect(music.source).toBe('AI_RECOMMENDED');
      expect(music.mood).toContain('electronic');
      expect(music.volume).toBe(0.3);
    });

    it('generates scene-based SFX cues for hook impacts, transitions, and CTAs', async () => {
      const sfxService = new SFXService({} as any, new MemoryStorageProvider());
      const sfxList = await sfxService.resolveAiRecommendedSFX(mockReelPlan);

      expect(sfxList.length).toBeGreaterThanOrEqual(2);
      expect(sfxList.some((s) => s.type === 'WHOOSH')).toBe(true);
      expect(sfxList.some((s) => s.type === 'CHIME')).toBe(true);
    });

    it('validates local music upload format and rejects non-audio files', async () => {
      const storage = new MemoryStorageProvider();
      const inMemoryAssets: any[] = [];
      const mockReelAssetRepo = {
        create: vi.fn().mockImplementation(async (data) => {
          const record = { ...data, id: `asset-${inMemoryAssets.length + 1}`, createdAt: new Date(), updatedAt: new Date() };
          inMemoryAssets.push(record);
          return record;
        }),
        listByReelPlanId: vi.fn().mockImplementation(async () => inMemoryAssets),
        delete: vi.fn().mockImplementation(async () => true)
      };

      const musicService = new MusicService(mockReelAssetRepo as any, storage);

      const validUpload = await musicService.uploadLocalMusic(mockReelPlan, 'ws-1', {
        buffer: Buffer.from('audio-data'),
        filename: 'studio_track.mp3',
        mimeType: 'audio/mp3',
        durationSeconds: 30
      });

      expect(validUpload.musicSelection.source).toBe('LOCAL_GALLERY');
      expect(validUpload.asset.filename).toBe('studio_track.mp3');

      // Reject unsupported
      await expect(
        musicService.uploadLocalMusic(mockReelPlan, 'ws-1', {
          buffer: Buffer.from('exe-data'),
          filename: 'malicious.exe',
          mimeType: 'application/x-msdownload'
        })
      ).rejects.toThrow('Unsupported audio format');
    });
  });

  describe('AudioService & AudioMixPlan', () => {
    it('creates a complete audio mix plan with ducking priority VOICE > SFX > MUSIC', async () => {
      let savedMixPlan: any = null;
      const mockMixRepo = {
        createOrUpdate: vi.fn().mockImplementation(async (data) => {
          savedMixPlan = { ...data, id: 'mix-1', createdAt: new Date(), updatedAt: new Date() };
          return savedMixPlan;
        }),
        findByReelPlanId: vi.fn().mockImplementation(async () => savedMixPlan)
      };

      const audioService = new AudioService({} as any, {
        audioMixRepo: mockMixRepo as any,
        reelAssetRepo: { listByReelPlanId: vi.fn().mockResolvedValue([]) } as any,
        storageProvider: new MemoryStorageProvider()
      });

      const mixPlan = await audioService.resolveAudioPlan(mockReelPlan, 'ws-1');

      expect(mixPlan.id).toBe('mix-1');
      expect(mixPlan.mixSettings.ducking).toBe(true);
      expect(mixPlan.mixSettings.priorityOrder).toEqual(['VOICE', 'SFX', 'MUSIC']);
      expect(mixPlan.mixSettings.duckingLevel).toBe(0.2);
    });
  });
});
