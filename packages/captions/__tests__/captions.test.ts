import { describe, it, expect, vi } from 'vitest';
import {
  CaptionGenerator,
  CaptionService
} from '../src/index.js';
import type { ReelProductionPlan } from '@vidsnapai/types';

describe('Phase 6: Captions Package Tests', () => {
  const mockReelPlan: ReelProductionPlan = {
    id: 'reel-caption-1',
    contentJobId: 'job-1',
    brandId: 'brand-1',
    contentPlanId: 'plan-1',
    workspaceId: 'ws-1',
    version: 1,
    title: 'Kinetic Studio Subtitles',
    concept: { title: 'Captions' },
    objective: 'Drive engagement',
    audience: 'Producers',
    funnelStage: 'CONSIDERATION',
    contentPillar: 'Audio',
    durationSeconds: 20,
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
        onScreenText: 'TRAPPED BY CABLES?',
        visualType: 'PROBLEM',
        emphasis: 'cables'
      },
      {
        sceneNumber: 2,
        durationSeconds: 10,
        purpose: 'Solution',
        narration: 'AeroGlide transmits lossless 24-bit audio with sub-1ms latency.',
        onScreenText: 'SUB-1MS LOSSLESS',
        visualType: 'PRODUCT_SHOWCASE',
        emphasis: 'lossless'
      },
      {
        sceneNumber: 3,
        durationSeconds: 6,
        purpose: 'CTA Endcard',
        narration: 'Pre-order StudioPro X today.',
        onScreenText: 'PRE-ORDER NOW',
        visualType: 'CTA'
      }
    ],
    visualDirection: {},
    voiceDirection: {},
    captionDirection: { style: 'Kinetic uppercase pop' },
    animationDirection: {},
    audioDirection: {},
    cta: { text: 'Preorder Now' },
    productionMetadata: {},
    status: 'READY',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('CaptionGenerator', () => {
    it('generates synchronized kinetic bursts across all scenes', () => {
      const cues = CaptionGenerator.generateCues(mockReelPlan, { maxWordsPerLine: 4 });

      expect(cues.length).toBeGreaterThanOrEqual(3);

      // Verify timing bounds
      for (let i = 0; i < cues.length; i++) {
        const cue = cues[i];
        expect(cue.startTime).toBeGreaterThanOrEqual(0);
        expect(cue.endTime).toBeGreaterThan(cue.startTime);

        if (i > 0) {
          expect(cue.startTime).toBeGreaterThanOrEqual(cues[i - 1].startTime);
        }
      }
    });

    it('assigns CTA style to final scene cues and EMPHASIS style to emphasized words', () => {
      const cues = CaptionGenerator.generateCues(mockReelPlan, { maxWordsPerLine: 4 });

      const finalCue = cues[cues.length - 1];
      expect(finalCue.style).toBe('CTA');

      const emphasizedCues = cues.filter((c) => c.style === 'EMPHASIS');
      expect(emphasizedCues.length).toBeGreaterThan(0);
    });

    it('sanitizes cues to ensure no backward time progression or invalid overlaps', () => {
      const unvalidatedCues = [
        { id: '1', startTime: 5, endTime: 3, text: 'Invalid reverse' },
        { id: '2', startTime: 2, endTime: 7, text: 'Overlap' }
      ];

      const sanitized = CaptionGenerator.validateAndSanitizeCues(unvalidatedCues as any, 30);
      expect(sanitized[0].endTime).toBeGreaterThan(sanitized[0].startTime);
      expect(sanitized[1].startTime).toBeGreaterThanOrEqual(sanitized[0].endTime);
    });
  });

  describe('CaptionService', () => {
    it('creates, retrieves, and updates caption track records', async () => {
      let inMemoryTrack: any = null;
      const mockRepo = {
        getNextVersionNumber: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockImplementation(async (data) => {
          inMemoryTrack = { ...data, id: 'track-1', createdAt: new Date(), updatedAt: new Date() };
          return inMemoryTrack;
        }),
        findLatestByReelPlanId: vi.fn().mockImplementation(async () => inMemoryTrack),
        update: vi.fn().mockImplementation(async (_id, _wsId, updates) => {
          inMemoryTrack = { ...inMemoryTrack, ...updates, updatedAt: new Date() };
          return inMemoryTrack;
        })
      };

      const captionService = new CaptionService({} as any, { captionRepo: mockRepo as any });
      const created = await captionService.generateCaptionTrack(mockReelPlan, 'ws-1');

      expect(created.id).toBe('track-1');
      expect(created.cues.length).toBeGreaterThan(0);

      // Update cues in place
      const updated = await captionService.updateCaptionTrack('reel-caption-1', 'ws-1', {
        cues: [{ id: 'cue-edited-1', startTime: 0, endTime: 3, text: 'Custom edited burst', style: 'STANDARD' }]
      });

      expect(updated.cues[0].text).toBe('Custom edited burst');
    });
  });
});
