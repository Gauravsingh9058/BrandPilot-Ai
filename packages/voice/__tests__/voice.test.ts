import { describe, it, expect, vi } from 'vitest';
import {
  MockVoiceProvider,
  ConfigurableVoiceProvider,
  VoiceService
} from '../src/index.js';
import { MemoryStorageProvider } from '@vidsnapai/storage';
import type { ReelProductionPlan } from '@vidsnapai/types';

describe('Phase 6: Voice Package Tests', () => {
  describe('MockVoiceProvider & Provider Abstraction', () => {
    it('returns available voice options with accents and genders', async () => {
      const provider = new MockVoiceProvider();
      const voices = await provider.getVoices();

      expect(voices.length).toBeGreaterThanOrEqual(2);
      expect(voices.some((v) => v.gender === 'male')).toBe(true);
      expect(voices.some((v) => v.gender === 'female')).toBe(true);
    });

    it('synthesizes speech and estimates realistic duration based on word count', async () => {
      const provider = new MockVoiceProvider();
      const text = 'Why are music producers still trapped by headphone cables in 2026? Standard Bluetooth introduces 150ms of latency.';
      const result = await provider.synthesizeSpeech(text, {
        voiceId: 'voice-aura-pro-1',
        provider: 'mock_voice',
        pace: 'medium'
      });

      expect(result.durationSeconds).toBeGreaterThan(3);
      expect(result.durationSeconds).toBeLessThan(15);
      expect(result.audioBuffer).toBeDefined();
      expect(result.format).toBe('audio/wav');
    });

    it('gracefully handles configurable provider environment settings without crashing', async () => {
      const provider = new ConfigurableVoiceProvider('unconfigured_vendor');
      expect(provider.providerName).toBe('unconfigured_vendor');
      const voices = await provider.getVoices();
      expect(voices.length).toBeGreaterThan(0);
    });
  });

  describe('VoiceService Workflow', () => {
    const mockReelPlan: ReelProductionPlan = {
      id: 'reel-voice-1',
      contentJobId: 'job-1',
      brandId: 'brand-1',
      contentPlanId: 'plan-1',
      workspaceId: 'ws-1',
      version: 1,
      title: 'Studio Freedom Narration',
      concept: { title: 'Studio Freedom' },
      objective: 'Drive preorders',
      audience: 'Producers',
      funnelStage: 'CONSIDERATION',
      contentPillar: 'Audio',
      durationSeconds: 30,
      aspectRatio: '9:16',
      platform: 'INSTAGRAM',
      format: 'REEL',
      hook: { text: 'Why cables in 2026?' },
      narrative: 'A story of wireless studio monitoring.',
      script: [
        { id: 'seg-1', purpose: 'Hook', text: 'Why cables in 2026?', estimatedDuration: 3 },
        { id: 'seg-2', purpose: 'Body', text: 'AeroGlide gives sub 1ms wireless monitoring.', estimatedDuration: 10 }
      ],
      scenes: [],
      visualDirection: {},
      voiceDirection: {
        style: 'Authoritative',
        tone: 'Empowering',
        genderPreference: 'Male'
      },
      captionDirection: {},
      animationDirection: {},
      audioDirection: {},
      cta: { text: 'Preorder Now' },
      productionMetadata: {},
      status: 'READY',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('synthesizes narration and uploads voice asset to storage provider', async () => {
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

      const voiceService = new VoiceService({} as any, {
        voiceProvider: new MockVoiceProvider(),
        storageProvider: storage,
        reelAssetRepo: mockReelAssetRepo as any
      });

      const voiceAsset = await voiceService.generateVoiceTrack(mockReelPlan, 'ws-1');

      expect(voiceAsset.assetType).toBe('VOICE');
      expect(voiceAsset.sourceType).toBe('GENERATED');
      expect(voiceAsset.status).toBe('READY');
      expect(voiceAsset.sourceUrl).toContain('/api/storage/files/reels/reel-voice-1/voice/');
      expect(voiceAsset.durationSeconds).toBeGreaterThan(0);
    });

    it('attaches local audio file as voice narration with format validation', async () => {
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

      const voiceService = new VoiceService({} as any, {
        storageProvider: storage,
        reelAssetRepo: mockReelAssetRepo as any
      });

      const sampleBuffer = Buffer.from('fake-mp3-audio-data');
      const voiceAsset = await voiceService.uploadLocalVoiceTrack(mockReelPlan, 'ws-1', {
        buffer: sampleBuffer,
        filename: 'my_custom_narration.mp3',
        mimeType: 'audio/mpeg',
        durationSeconds: 28.5
      });

      expect(voiceAsset.sourceType).toBe('LOCAL_GALLERY');
      expect(voiceAsset.filename).toBe('my_custom_narration.mp3');
      expect(voiceAsset.durationSeconds).toBe(28.5);
    });

    it('rejects unsupported audio formats with descriptive error', async () => {
      const voiceService = new VoiceService({} as any, {
        storageProvider: new MemoryStorageProvider(),
        reelAssetRepo: {} as any
      });

      const sampleBuffer = Buffer.from('fake-text-file');
      await expect(
        voiceService.uploadLocalVoiceTrack(mockReelPlan, 'ws-1', {
          buffer: sampleBuffer,
          filename: 'document.pdf',
          mimeType: 'application/pdf'
        })
      ).rejects.toThrow('Unsupported audio format');
    });
  });
});
