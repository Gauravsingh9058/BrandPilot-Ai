import { describe, it, expect } from 'vitest';
import { AnimationScorer } from '../src/animationScorer.js';
import { AnimationService } from '../src/animationService.js';
import type { AnimationPlan, ReelProductionPackage, ReelProductionPlan } from '@vidsnapai/types';

describe('Animation Readiness & Render Contract', () => {
  const mockPlan: AnimationPlan = {
    id: 'plan-123',
    workspaceId: 'ws-123',
    brandId: 'brand-123',
    reelPlanId: 'reel-123',
    productionPackageId: 'pkg-123',
    version: 1,
    status: 'READY',
    animationLanguage: 'CINEMATIC',
    globalSettings: {
      animationLanguage: 'CINEMATIC',
      intensity: 'MEDIUM',
      pacing: 'dynamic',
      smoothness: 0.85,
      defaultEasing: 'CUBIC_OUT',
      defaultTransition: 'CROSSFADE',
      motionBlurIntent: true,
      maxSimultaneousAnimations: 4,
      reducedMotionSupport: false
    },
    sceneAnimations: [
      {
        sceneNumber: 1,
        startTime: 0,
        endTime: 5,
        animationIntensity: 'MEDIUM',
        entranceAnimations: [],
        continuousAnimations: [],
        emphasisAnimations: [],
        exitAnimations: [],
        cameraMotion: [{ type: 'SLOW_PUSH', startTime: 0, duration: 5, intensity: 'LOW', scale: 1.05, easing: 'CUBIC_OUT' }],
        textMotion: [{ targetText: 'Headline', startTime: 0.2, duration: 4, entrance: 'WORD_POP', easing: 'SPRING', emphasisWords: ['Headline'] }],
        mediaMotion: [],
        productMotion: [],
        logoMotion: [],
        synchronizationCues: [{ time: 0.2, source: 'VOICE', event: 'WORD_START', target: 'TEXT', strength: 0.8 }],
        transitionOut: { fromScene: 1, toScene: 2, type: 'CROSSFADE', duration: 0.4, easing: 'CUBIC_IN_OUT', intensity: 'MEDIUM' },
        rationale: 'Clean start'
      }
    ],
    transitionPlan: [],
    textAnimationPlan: [],
    cameraPlan: [],
    productAnimationPlan: [],
    logoAnimationPlan: [],
    syncPlan: [{ time: 0.2, source: 'VOICE', event: 'WORD_START', target: 'TEXT', strength: 0.8 }],
    metadata: {
      generatedBy: 'VidSnapAI Engine',
      generatedAt: new Date().toISOString()
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockReelPlan: ReelProductionPlan = {
    id: 'reel-123',
    contentJobId: 'job-123',
    brandId: 'brand-123',
    contentPlanId: 'plan-123',
    workspaceId: 'ws-123',
    version: 1,
    title: 'Test Reel',
    concept: {
      title: 'Test',
      concept: 'Concept',
      objective: 'Conversion',
      targetAudience: 'All',
      corePromise: 'Promise',
      emotionalAngle: 'Angle',
      messagingAngle: 'Angle',
      contentPillar: 'Pillar',
      funnelStage: 'CONVERSION'
    },
    objective: 'Test',
    audience: 'Audience',
    funnelStage: 'CONVERSION',
    contentPillar: 'Pillar',
    durationSeconds: 5,
    aspectRatio: '9:16',
    platform: 'INSTAGRAM',
    format: 'REEL',
    hook: { type: 'PROBLEM', text: 'Hook', visualIntent: 'Intent', deliveryStyle: 'Style', durationSeconds: 2 },
    narrative: 'Narrative',
    script: [],
    scenes: [
      {
        sceneNumber: 1,
        durationSeconds: 5,
        purpose: 'Hook',
        narration: 'Narration',
        onScreenText: 'Text',
        visualType: 'PROBLEM',
        subject: 'Subject',
        environment: 'Env',
        composition: 'Comp',
        camera: 'Cam',
        lighting: 'Light',
        mood: 'Mood',
        transition: 'cut',
        animationIntent: 'Intent',
        assetRequirement: 'Req'
      }
    ],
    visualDirection: {
      style: 'Style',
      mood: 'Mood',
      colorIntent: 'Colors',
      lightingIntent: 'Light',
      composition: 'Comp',
      cameraLanguage: 'Cam',
      pacing: 'Pacing',
      visualHierarchy: 'Hierarchy',
      brandIntegration: 'Logo',
      productEmphasis: 'Hero'
    },
    voiceDirection: { style: 'Style', pace: 'Pace', tone: 'Tone' },
    captionDirection: { style: 'Style', placement: 'Placement', density: 'Density', fontEmphasis: 'Font', animation: 'Anim' },
    animationDirection: { energy: 'Energy', style: 'Style', textAnimation: 'Text', visualTransitions: 'Trans', elementMotion: 'Motion' },
    audioDirection: { musicMood: 'Mood', soundEffects: 'SFX', pacing: 'Pacing', mixBalance: 'Mix' },
    cta: { type: 'SHOP_NOW', text: 'CTA', visualTreatment: 'Treat', placement: 'Place' },
    productionMetadata: {
      totalScenes: 1,
      estimatedWordCount: 10,
      targetDurationSeconds: 5,
      calculatedDurationSeconds: 5,
      generatedBy: 'VidSnapAI',
      contentJobId: 'job-123',
      generatedAt: new Date().toISOString()
    },
    status: 'READY',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockPkg: ReelProductionPackage = {
    id: 'pkg-123',
    reelPlanId: 'reel-123',
    workspaceId: 'ws-123',
    brandId: 'brand-123',
    readiness: {
      status: 'READY_FOR_ANIMATION',
      checks: {
        media: { status: 'READY' },
        voice: { status: 'READY' },
        captions: { status: 'READY' },
        music: { status: 'READY' },
        sfx: { status: 'READY' },
        brandAssets: { status: 'READY' }
      },
      blockers: [],
      evaluatedAt: new Date().toISOString()
    },
    packagePayload: {
      reelPlan: mockReelPlan,
      assets: [],
      captionTrack: {
        id: 'cap-1',
        reelPlanId: 'reel-123',
        workspaceId: 'ws-123',
        brandId: 'brand-123',
        version: 1,
        cues: [{ id: 'c1', startTime: 0.2, endTime: 4.8, text: 'Headline', sceneNumber: 1 }],
        style: { fontFamily: 'Outfit', fontSize: 32 },
        status: 'READY',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      audioMixPlan: {
        id: 'aud-1',
        reelPlanId: 'reel-123',
        workspaceId: 'ws-123',
        brandId: 'brand-123',
        voiceConfig: { voiceId: 'v1', provider: 'mock_voice' },
        musicConfig: { source: 'AI_RECOMMENDED', volume: 0.25 },
        sfxConfigs: [],
        mixSettings: { voiceVolume: 1.0, musicVolume: 0.25, sfxVolume: 0.4, ducking: true, duckingLevel: 0.2, fadeInSeconds: 0.5, fadeOutSeconds: 1.0, priorityOrder: ['VOICE', 'SFX', 'MUSIC'] },
        status: 'READY',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    status: 'READY',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it('calculates a high readiness score when all scenes and sync cues are satisfied', () => {
    const report = AnimationScorer.evaluateReadiness(mockPlan, mockPkg);

    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.status).toBe('READY');
    expect(report.blockers).toHaveLength(0);
    expect(report.sceneCoverage).toBe(100);
  });

  it('compiles a complete Phase 8 AnimationRenderContract', () => {
    const service = new AnimationService();
    const contract = service.buildRenderContract({
      animationPlan: mockPlan,
      productionPackage: mockPkg
    });

    expect(contract.contractVersion).toBe('1.0.0');
    expect(contract.reelPlanId).toBe('reel-123');
    expect(contract.animationPlanId).toBe('plan-123');
    expect(contract.dimensions.width).toBe(1080);
    expect(contract.dimensions.height).toBe(1920);
    expect(contract.scenes).toHaveLength(1);
    expect(contract.scenes[0].camera).toHaveLength(1);
    expect(contract.scenes[0].textAnimations).toHaveLength(1);
  });
});
