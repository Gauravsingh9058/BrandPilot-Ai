import { describe, it, expect } from 'vitest';
import { AnimationPlanner } from '../src/animationPlanner.js';
import type {
  BrandDna,
  MarketingStrategy,
  ReelProductionPlan,
  ReelProductionPackage
} from '@vidsnapai/types';

describe('AnimationPlanner', () => {
  const mockBrandDna: BrandDna = {
    id: '11111111-1111-1111-1111-111111111111',
    brandId: '22222222-2222-2222-2222-222222222222',
    version: 1,
    identity: {
      brandName: 'Aura Glow Skincare',
      industry: 'Beauty & Cosmetics',
      story: 'Clean botanical skincare backed by clinical science.',
      mission: 'Bring natural radiance to every skin type.',
      personality: ['Radiant', 'Modern', 'Cinematic', 'Clean']
    },
    audience: {
      primaryAudience: 'Women 22-38 interested in clean skincare',
      demographics: ['22-38', 'Urban professionals'],
      painPoints: ['Dull skin', 'Harsh chemicals'],
      desires: ['Natural glow', 'Simple routine'],
      buyingMotivations: ['Clean ingredients', 'Visible results']
    },
    messaging: {
      positioning: 'Clean botanical skincare that actually delivers glowing skin.',
      coreMessage: 'Transform your skin with botanical peptides.',
      valueProposition: '7-day glow without harsh chemicals.',
      usps: ['100% Vegan', 'Clinical Peptides', 'Recyclable Glass'],
      proofPoints: ['94% saw radiance in 7 days'],
      tone: ['Elegant', 'Modern', 'Cinematic'],
      forbiddenMessaging: ['guaranteed miracle', 'cure all']
    },
    products: [
      {
        name: 'Radiance Glow Serum',
        benefits: ['Hydrates deeply', 'Restores barrier'],
        features: ['Niacinamide 5%', 'Hyaluronic Acid'],
        usps: ['Lightweight formula'],
        price: 48
      }
    ],
    visualIdentity: {
      colors: { primary: '#EC4899', secondary: '#F472B6', accent: '#6366F1' },
      typography: { headingFont: 'Outfit', bodyFont: 'Inter' },
      visualStyle: 'Modern luxury with clean lighting',
      imageStyle: 'Warm botanical aesthetic'
    },
    contentStrategy: {
      contentPillars: ['Education', 'Product Showcase', 'Customer Proof'],
      preferredTopics: ['Skincare routines', 'Ingredient spotlights'],
      educationalTopics: ['How peptides work'],
      promotionalTopics: ['Serum launch promo'],
      storytellingTopics: ['Founder journey']
    },
    promotionRules: {
      primaryCTA: 'Get Your Glow Today',
      offers: ['Free Shipping on orders $50+'],
      claimsToAvoid: ['100% cure', 'instant permanent fix'],
      complianceRules: ['Include disclaimer on results'],
      brandRestrictions: ['No neon colors', 'No distorted typography']
    },
    generatedBy: 'VidSnapAI Brand Brain v2.0',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockMarketingStrategy: MarketingStrategy = {
    id: '33333333-3333-3333-3333-333333333333',
    brandId: '22222222-2222-2222-2222-222222222222',
    version: 1,
    objective: 'ACQUISITION',
    businessGoal: 'Increase serum sales by 40%',
    marketingGoal: 'Drive high-converting social reel traffic',
    targetAudience: { primary: 'Skincare enthusiasts' },
    positioning: { statement: 'The definitive daily glow serum' },
    messagingStrategy: { core: 'Glow naturally' },
    contentStrategy: { pillars: ['Education', 'Transformation'] },
    funnelStrategy: { top: 'Hook', mid: 'Demo', bottom: 'CTA' },
    channelStrategy: { primary: 'Instagram Reels' },
    offerStrategy: { main: '15% off first order' },
    kpiStrategy: { primary: 'ROAS' },
    risksAndGuardrails: { claims: ['No medical promises'] },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockReelPlan: ReelProductionPlan = {
    id: '44444444-4444-4444-4444-444444444444',
    contentJobId: '55555555-5555-5555-5555-555555555555',
    brandId: '22222222-2222-2222-2222-222222222222',
    contentPlanId: '66666666-6666-6666-6666-666666666666',
    workspaceId: '77777777-7777-7777-7777-777777777777',
    version: 1,
    title: 'Transform Dull Skin in 7 Days',
    concept: {
      title: '7-Day Radiance Transformation',
      concept: 'Before and after transformation journey',
      objective: 'Conversion',
      targetAudience: 'Skincare lovers',
      corePromise: 'Noticeable glow in 7 days',
      emotionalAngle: 'Confidence boost',
      messagingAngle: 'Clinical results meet botanical calm',
      contentPillar: 'Product Showcase',
      funnelStage: 'CONVERSION'
    },
    objective: 'Drive Serum Conversions',
    audience: 'Women 22-38',
    funnelStage: 'CONVERSION',
    contentPillar: 'Product Showcase',
    durationSeconds: 15,
    aspectRatio: '9:16',
    platform: 'INSTAGRAM',
    format: 'REEL',
    hook: {
      type: 'PROBLEM',
      text: 'Still struggling with dull skin after trying everything?',
      visualIntent: 'Extreme close up of tired skin',
      deliveryStyle: 'Empathic and urgent',
      durationSeconds: 3
    },
    narrative: 'Hook on dull skin -> introduce peptide solution -> show glowing result -> CTA.',
    script: [
      {
        id: 's1',
        purpose: 'Hook',
        text: 'Still struggling with dull skin?',
        estimatedDuration: 3,
        deliveryStyle: 'Empathic',
        emotionalTone: 'Frustrated'
      },
      {
        id: 's2',
        purpose: 'Solution',
        text: 'Meet Radiance Glow Serum, packed with 5% niacinamide.',
        estimatedDuration: 6,
        deliveryStyle: 'Confident',
        emotionalTone: 'Excited'
      },
      {
        id: 's3',
        purpose: 'CTA',
        text: 'Shop now and get 15% off your first bottle.',
        estimatedDuration: 6,
        deliveryStyle: 'Uplifting',
        emotionalTone: 'Inspiring'
      }
    ],
    scenes: [
      {
        sceneNumber: 1,
        durationSeconds: 3,
        purpose: 'Hook',
        narration: 'Still struggling with dull skin?',
        onScreenText: 'Dull Skin Solved',
        visualType: 'PROBLEM',
        subject: 'Woman touching tired skin',
        environment: 'Morning bathroom',
        composition: 'Close-up centered',
        camera: 'Slight zoom in',
        lighting: 'Dim natural',
        mood: 'Somber',
        transition: 'Light wipe',
        animationIntent: 'Fast hook pop',
        assetRequirement: 'Woman in bathroom mirror'
      },
      {
        sceneNumber: 2,
        durationSeconds: 6,
        purpose: 'Product Reveal',
        narration: 'Meet Radiance Glow Serum with botanical peptides.',
        onScreenText: '5% Niacinamide + Botanical Peptides',
        visualType: 'PRODUCT_SHOWCASE',
        subject: 'Amber glass serum bottle dropper',
        environment: 'Clean botanical marble pedestal',
        composition: 'Hero product centered',
        camera: 'Slow cinematic push',
        lighting: 'Luminous studio',
        mood: 'Radiant',
        transition: 'Smooth crossfade',
        animationIntent: 'Hero reveal with light sweep',
        assetRequirement: 'Serum bottle hero footage',
        productReference: 'Radiance Glow Serum'
      },
      {
        sceneNumber: 3,
        durationSeconds: 6,
        purpose: 'CTA Climax',
        narration: 'Shop now and get 15% off your first bottle.',
        onScreenText: 'Get 15% Off | Link in Bio',
        visualType: 'CTA',
        subject: 'Smiling glowing woman with product in hand',
        environment: 'Sunny outdoor lifestyle',
        composition: 'Medium portrait with CTA card',
        camera: 'Static locked focus',
        lighting: 'Golden hour',
        mood: 'Empowering',
        transition: 'None',
        animationIntent: 'CTA button pulse',
        assetRequirement: 'Lifestyle beauty shot',
        brandElement: 'Logo'
      }
    ],
    visualDirection: {
      style: 'Modern luxury cinematic',
      mood: 'Radiant',
      colorIntent: 'Rose gold and botanical green',
      lightingIntent: 'Luminous',
      composition: 'Vertical 9:16 centered',
      cameraLanguage: 'Slow push and hero focus',
      pacing: 'Dynamic',
      visualHierarchy: 'Subject -> Text -> Product',
      brandIntegration: 'Subtle corner mark',
      productEmphasis: 'High'
    },
    voiceDirection: {
      style: 'Warm, confident, inspiring',
      pace: 'Medium dynamic',
      tone: 'Friendly expert',
      language: 'en-US'
    },
    captionDirection: {
      style: 'Kinetic Word Pop with pink highlight',
      placement: 'Center bottom',
      density: '2-3 words',
      fontEmphasis: 'Outfit Bold',
      animation: 'Scale pop'
    },
    animationDirection: {
      energy: 'Medium-High',
      style: 'Cinematic Modern',
      textAnimation: 'Word-by-word burst',
      visualTransitions: 'Light wipe and crossfade',
      elementMotion: 'Parallax background drift'
    },
    audioDirection: {
      musicMood: 'Upbeat electronic lo-fi',
      soundEffects: 'Subtle whooshes, click on text triggers',
      pacing: 'Synced with visual transitions',
      mixBalance: 'voice 100%, background music 25%, SFX 40%'
    },
    cta: {
      type: 'SHOP_NOW',
      text: 'Shop Now & Glow',
      visualTreatment: 'High contrast rose button',
      placement: 'Bottom third end card'
    },
    productionMetadata: {
      totalScenes: 3,
      estimatedWordCount: 30,
      targetDurationSeconds: 15,
      calculatedDurationSeconds: 15,
      generatedBy: 'VidSnapAI Reel Orchestrator v5.0',
      contentJobId: '55555555-5555-5555-5555-555555555555',
      generatedAt: new Date().toISOString()
    },
    status: 'READY',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockProductionPackage: ReelProductionPackage = {
    id: '88888888-8888-8888-8888-888888888888',
    reelPlanId: mockReelPlan.id,
    workspaceId: mockReelPlan.workspaceId,
    brandId: mockReelPlan.brandId,
    readiness: {
      status: 'READY_FOR_ANIMATION',
      checks: {
        media: { status: 'READY', assetCount: 3 },
        voice: { status: 'READY', assetCount: 1 },
        captions: { status: 'READY', assetCount: 1 },
        music: { status: 'READY', assetCount: 1 },
        sfx: { status: 'READY', assetCount: 2 },
        brandAssets: { status: 'READY', assetCount: 1 }
      },
      blockers: [],
      evaluatedAt: new Date().toISOString()
    },
    packagePayload: {
      reelPlan: mockReelPlan,
      assets: [
        {
          id: 'asset-1',
          reelPlanId: mockReelPlan.id,
          workspaceId: mockReelPlan.workspaceId,
          brandId: mockReelPlan.brandId,
          sceneNumber: 1,
          assetType: 'VIDEO',
          sourceType: 'PEXELS',
          provider: 'pexels',
          sourceUrl: 'https://example.com/scene1.mp4',
          previewUrl: 'https://example.com/scene1.jpg',
          metadata: {},
          licenseMetadata: {},
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'asset-2',
          reelPlanId: mockReelPlan.id,
          workspaceId: mockReelPlan.workspaceId,
          brandId: mockReelPlan.brandId,
          sceneNumber: 2,
          assetType: 'PRODUCT_VIDEO',
          sourceType: 'BRAND_LIBRARY',
          provider: 'brand_library',
          sourceUrl: 'https://example.com/serum_hero.mp4',
          previewUrl: 'https://example.com/serum_hero.jpg',
          metadata: {},
          licenseMetadata: {},
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'asset-3',
          reelPlanId: mockReelPlan.id,
          workspaceId: mockReelPlan.workspaceId,
          brandId: mockReelPlan.brandId,
          sceneNumber: 3,
          assetType: 'VIDEO',
          sourceType: 'PEXELS',
          provider: 'pexels',
          sourceUrl: 'https://example.com/scene3.mp4',
          previewUrl: 'https://example.com/scene3.jpg',
          metadata: {},
          licenseMetadata: {},
          status: 'READY',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      voiceAsset: {
        id: 'voice-asset-1',
        reelPlanId: mockReelPlan.id,
        workspaceId: mockReelPlan.workspaceId,
        brandId: mockReelPlan.brandId,
        assetType: 'VOICE',
        sourceType: 'GENERATED',
        provider: 'mock_voice',
        sourceUrl: 'https://example.com/narration.mp3',
        metadata: {},
        licenseMetadata: {},
        status: 'READY',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      captionTrack: {
        id: 'cap-track-1',
        reelPlanId: mockReelPlan.id,
        workspaceId: mockReelPlan.workspaceId,
        brandId: mockReelPlan.brandId,
        version: 1,
        cues: [
          { id: 'c1', startTime: 0.2, endTime: 2.8, text: 'Still struggling with dull skin?', emphasis: 'dull skin', sceneNumber: 1 },
          { id: 'c2', startTime: 3.2, endTime: 8.8, text: 'Meet Radiance Glow Serum with peptides.', emphasis: 'Radiance Glow Serum', sceneNumber: 2 },
          { id: 'c3', startTime: 9.2, endTime: 14.8, text: 'Shop now and get 15% off.', emphasis: '15% off', sceneNumber: 3 }
        ],
        style: { fontFamily: 'Outfit', fontSize: 32, primaryColor: '#FFFFFF', highlightColor: '#EC4899' },
        status: 'READY',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      audioMixPlan: {
        id: 'audio-mix-1',
        reelPlanId: mockReelPlan.id,
        workspaceId: mockReelPlan.workspaceId,
        brandId: mockReelPlan.brandId,
        voiceConfig: { voiceId: 'en-female-1', provider: 'mock_voice' },
        musicConfig: { source: 'AI_RECOMMENDED', title: 'Upbeat Lo-Fi Ambient', volume: 0.25, url: 'https://example.com/music.mp3' },
        sfxConfigs: [
          { id: 'sfx-1', name: 'Whoosh Transition', type: 'WHOOSH', source: 'AI_RECOMMENDED', startTime: 2.9, durationSeconds: 0.4, volume: 0.4 },
          { id: 'sfx-2', name: 'Product Shimmer Impact', type: 'IMPACT', source: 'AI_RECOMMENDED', startTime: 3.2, durationSeconds: 0.5, volume: 0.5 }
        ],
        mixSettings: { voiceVolume: 1.0, musicVolume: 0.25, sfxVolume: 0.4, ducking: true, duckingLevel: 0.15, fadeInSeconds: 0.5, fadeOutSeconds: 1.0, priorityOrder: ['VOICE', 'SFX', 'MUSIC'] },
        status: 'READY',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    status: 'READY',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it('generates a deterministic safe fallback animation plan when AI is not configured', async () => {
    const planner = new AnimationPlanner(); // no AI provider, triggers deterministic engine

    const result = await planner.planAnimation({
      brandDna: mockBrandDna,
      marketingStrategy: mockMarketingStrategy,
      reelPlan: mockReelPlan,
      productionPackage: mockProductionPackage,
      options: { animationLanguage: 'LUXURY', intensity: 'MEDIUM' }
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.plan).toBeDefined();
    expect(result.plan.animationLanguage).toBe('LUXURY');
    expect(result.plan.globalSettings.intensity).toBe('MEDIUM');
    expect(result.plan.sceneAnimations).toHaveLength(3);

    // Verify Scene 1 (Hook)
    const scene1 = result.plan.sceneAnimations[0];
    expect(scene1.sceneNumber).toBe(1);
    expect(scene1.startTime).toBe(0);
    expect(scene1.endTime).toBe(3);
    expect(scene1.cameraMotion).toHaveLength(1);
    expect(scene1.textMotion).toHaveLength(1);
    expect(scene1.transitionOut).toBeDefined();

    // Verify Scene 2 (Product Hero)
    const scene2 = result.plan.sceneAnimations[1];
    expect(scene2.sceneNumber).toBe(2);
    expect(scene2.startTime).toBe(3);
    expect(scene2.endTime).toBe(9);
    expect(scene2.productMotion).toHaveLength(1);
    expect(scene2.productMotion[0].isHeroMoment).toBe(true);
    expect(scene2.productMotion[0].revealType).toBe('HERO_REVEAL');

    // Verify Scene 3 (CTA Climax)
    const scene3 = result.plan.sceneAnimations[2];
    expect(scene3.sceneNumber).toBe(3);
    expect(scene3.startTime).toBe(9);
    expect(scene3.endTime).toBe(15);
    expect(scene3.logoMotion).toHaveLength(1);
    expect(scene3.textMotion[0].entrance).toBe('EMPHASIS_PULSE');
  });

  it('synchronizes voice caption timings and SFX markers into syncPlan', async () => {
    const planner = new AnimationPlanner();

    const result = await planner.planAnimation({
      brandDna: mockBrandDna,
      marketingStrategy: mockMarketingStrategy,
      reelPlan: mockReelPlan,
      productionPackage: mockProductionPackage
    });

    expect(result.plan.syncPlan).toBeDefined();
    expect(result.plan.syncPlan.length).toBeGreaterThanOrEqual(3);

    const sfxCues = result.plan.syncPlan.filter((c) => c.source === 'SFX');
    expect(sfxCues.length).toBeGreaterThanOrEqual(1);

    const voiceCues = result.plan.syncPlan.filter((c) => c.source === 'VOICE');
    expect(voiceCues.length).toBeGreaterThanOrEqual(1);
  });
});
