import { describe, it, expect } from 'vitest';
import { RenderContractAdapter } from '../src/renderContractAdapter.js';
import type { AnimationRenderContract } from '@vidsnapai/types';

describe('Phase 8: RenderContractAdapter', () => {
  const createMockContract = (overrides?: Partial<AnimationRenderContract>): AnimationRenderContract => ({
    contractVersion: '1.0.0',
    reelPlanId: 'reel-test-123',
    productionPackageId: 'pkg-test-123',
    animationPlanId: 'anim-test-123',
    dimensions: {
      width: 1080,
      height: 1920,
      aspectRatio: '9:16'
    },
    fps: 30,
    totalDurationSeconds: 15,
    scenes: [
      {
        sceneNumber: 1,
        startTime: 0,
        endTime: 5,
        duration: 5,
        camera: [
          {
            type: 'SLOW_PUSH',
            startTime: 0,
            duration: 5,
            intensity: 'MEDIUM',
            scale: 1.15,
            easing: 'EASE_IN_OUT'
          }
        ],
        animations: [],
        textAnimations: [
          {
            targetText: 'Ignite Your Journey',
            startTime: 0.5,
            duration: 3,
            entrance: 'WORD_POP',
            easing: 'EASE_OUT',
            emphasisWords: ['Ignite']
          }
        ],
        productAnimations: [
          {
            revealType: 'HERO_REVEAL',
            startTime: 1.0,
            duration: 4.0,
            emphasis: true
          }
        ],
        logoAnimations: [
          {
            style: 'MINIMAL_MARK',
            startTime: 0,
            duration: 5,
            position: 'top-right',
            easing: 'LINEAR'
          }
        ],
        syncCues: [
          {
            time: 0.5,
            source: 'VOICE',
            event: 'WORD_START',
            target: 'TEXT',
            strength: 0.8
          }
        ]
      },
      {
        sceneNumber: 2,
        startTime: 5,
        endTime: 15,
        duration: 10,
        camera: [
          {
            type: 'DYNAMIC_PULL',
            startTime: 5,
            duration: 10,
            intensity: 'HIGH',
            easing: 'EASE_OUT'
          }
        ],
        animations: [],
        textAnimations: [],
        productAnimations: [],
        logoAnimations: [],
        syncCues: []
      }
    ],
    audio: {
      voiceTrackUrl: '/api/storage/files/workspace-1/voice.mp3',
      musicTrackUrl: '/api/storage/files/workspace-1/bg_music.mp3',
      sfxCues: []
    },
    captions: {
      trackId: 'cap-1',
      cuesCount: 5,
      style: {
        fontFamily: 'Outfit',
        fontSize: 36
      }
    },
    brand: {
      primaryColor: '#1E293B',
      secondaryColor: '#3B82F6',
      accentColor: '#10B981',
      fontFamily: 'Outfit'
    },
    globalSettings: {
      animationLanguage: 'CINEMATIC',
      intensity: 'BALANCED',
      pacing: 'DYNAMIC',
      smoothness: 0.9,
      defaultEasing: 'EASE_IN_OUT',
      defaultTransition: 'CROSSFADE',
      motionBlurIntent: false,
      maxSimultaneousAnimations: 3,
      reducedMotionSupport: false
    },
    ...overrides
  });

  describe('Preflight Validation', () => {
    it('passes for a valid contract', () => {
      const contract = createMockContract();
      const result = RenderContractAdapter.validate(contract);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects null or undefined contracts', () => {
      const result = RenderContractAdapter.validate(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('AnimationRenderContract is null or undefined');
    });

    it('rejects contract missing reelPlanId', () => {
      const contract = createMockContract({ reelPlanId: '' });
      const result = RenderContractAdapter.validate(contract);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing reelPlanId in render contract');
    });

    it('rejects contract with non-positive duration', () => {
      const contract = createMockContract({ totalDurationSeconds: 0 });
      const result = RenderContractAdapter.validate(contract);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid total duration/);
    });

    it('rejects contract with empty scenes', () => {
      const contract = createMockContract({ scenes: [] });
      const result = RenderContractAdapter.validate(contract);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract has no scenes to render');
    });

    it('rejects scenes with invalid start/end timestamps', () => {
      const contract = createMockContract({
        scenes: [
          {
            sceneNumber: 1,
            startTime: 5,
            endTime: 2,
            duration: -3,
            camera: [],
            animations: [],
            textAnimations: [],
            productAnimations: [],
            logoAnimations: [],
            syncCues: []
          }
        ]
      });
      const result = RenderContractAdapter.validate(contract);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('start time (5) >= end time (2)'))).toBe(true);
    });
  });

  describe('Contract Adaptation', () => {
    it('adapts contract into CompositionSpec preserving dimensions, fps, brand colors, and scenes', () => {
      const contract = createMockContract();
      const spec = RenderContractAdapter.adapt(contract);

      expect(spec.width).toBe(1080);
      expect(spec.height).toBe(1920);
      expect(spec.fps).toBe(30);
      expect(spec.totalDurationSeconds).toBe(15);
      expect(spec.brand.primaryColor).toBe('#1E293B');
      expect(spec.brand.accentColor).toBe('#10B981');
      expect(spec.scenes).toHaveLength(2);
      expect(spec.audio.ducking.enabled).toBe(true);
      expect(spec.audio.ducking.musicAttenuationDb).toBe(14);
    });

    it('adapts camera motion to bounded motion when reducedMotionSupport is true', () => {
      const contract = createMockContract({
        globalSettings: {
          animationLanguage: 'MINIMAL',
          intensity: 'SUBTLE',
          pacing: 'GENTLE',
          smoothness: 1.0,
          defaultEasing: 'EASE_IN_OUT',
          defaultTransition: 'CUT',
          motionBlurIntent: false,
          maxSimultaneousAnimations: 1,
          reducedMotionSupport: true
        }
      });
      const spec = RenderContractAdapter.adapt(contract);

      expect(spec.reducedMotion).toBe(true);
      const scene1Camera = spec.scenes[0].camera[0];
      expect(scene1Camera.scale).toBeLessThanOrEqual(1.05);
      expect(scene1Camera.intensity).toBe('LOW');
    });
  });

  describe('FFmpeg Camera Filter Generator', () => {
    it('builds standard scaling filter for STATIC camera', () => {
      const filter = RenderContractAdapter.buildCameraFilter({ type: 'STATIC' } as any, 1080, 1920, 30, 5);
      expect(filter).toContain('scale=1080:1920:force_original_aspect_ratio=increase');
      expect(filter).toContain('crop=1080:1920');
    });

    it('builds zoompan filter for SLOW_PUSH camera', () => {
      const filter = RenderContractAdapter.buildCameraFilter({ type: 'SLOW_PUSH' } as any, 1080, 1920, 30, 5);
      expect(filter).toContain('zoompan=z=');
      expect(filter).toContain('min(zoom+0.0015,1.12)');
      expect(filter).toContain('s=1080x1920');
      expect(filter).toContain('fps=30');
    });

    it('builds zoompan filter for DYNAMIC_PULL camera', () => {
      const filter = RenderContractAdapter.buildCameraFilter({ type: 'DYNAMIC_PULL' } as any, 1080, 1920, 30, 5);
      expect(filter).toContain('zoompan=z=');
      expect(filter).toContain('1.25');
      expect(filter).toContain('s=1080x1920');
    });

    it('builds zoompan horizontal filter for PAN_LEFT and PAN_RIGHT', () => {
      const filterLeft = RenderContractAdapter.buildCameraFilter({ type: 'PAN_LEFT' } as any, 1080, 1920, 30, 5);
      expect(filterLeft).toContain('zoompan=z=');
      expect(filterLeft).toContain('(1-on/');

      const filterRight = RenderContractAdapter.buildCameraFilter({ type: 'PAN_RIGHT' } as any, 1080, 1920, 30, 5);
      expect(filterRight).toContain('zoompan=z=');
      expect(filterRight).toContain('(on/');
    });
  });
});
