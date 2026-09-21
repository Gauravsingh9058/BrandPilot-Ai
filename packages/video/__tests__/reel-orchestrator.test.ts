import { describe, it, expect, vi } from 'vitest';
import type {
  Brand,
  ContentJob,
  AIProvider,
  ReelAIOutput
} from '@vidsnapai/types';
import { validateScenes } from '../src/validators/sceneValidator.js';
import { validateAndSanitizeReel } from '../src/validators/reelValidator.js';
import { buildReelPrompt } from '../src/prompts/reel-orchestration.prompt.js';
import { ReelOrchestrator } from '../src/reelOrchestrator.js';

describe('Phase 5: Reel Orchestrator Unit Tests', () => {
  const mockBrand: Brand = {
    id: '11111111-1111-1111-1111-111111111111',
    workspaceId: '22222222-2222-2222-2222-222222222222',
    name: 'Aura Glow Skincare',
    slug: 'aura-glow',
    description: 'Clean organic vertical skincare for busy professionals.',
    industry: 'Beauty & Skincare',
    brandVoice: 'Empowering, scientific, warm',
    brandPersonality: 'Innovative, transparent',
    brandColors: { primary: '#6366F1', secondary: '#EC4899' },
    typography: { headingFont: 'Outfit', bodyFont: 'Inter' },
    uniqueSellingPoints: ['100% Vegan', 'Dermatologist tested'],
    primaryCta: 'Shop Radiance Serum',
    marketingRules: {
      claimsToAvoid: ['Miracle cure', 'Guaranteed overnight transformation'],
      brandRestrictions: ['No harsh neon backgrounds'],
      complianceRules: ['Must state cruelty-free']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockContentJob: ContentJob = {
    id: '33333333-3333-3333-3333-333333333333',
    contentPlanId: '44444444-4444-4444-4444-444444444444',
    brandId: mockBrand.id,
    workspaceId: mockBrand.workspaceId,
    dayNumber: 3,
    scheduledDate: new Date(),
    title: 'Why your skin feels dull after a 9-to-5',
    contentType: 'EDUCATIONAL',
    funnelStage: 'AWARENESS',
    contentPillar: 'Skin Barrier Education',
    objective: 'Educate audience on blue light fatigue and introduce gentle barrier repair',
    audience: 'Urban working professionals aged 24-38',
    topic: 'Blue light and desk fatigue effect on skin hydration',
    hook: 'Ever wonder why your skin looks exhausted at 5 PM even if you drank 2 liters of water?',
    keyMessage: 'Indoor screen exposure and air conditioning deplete your lipid barrier.',
    messagingAngle: 'Relatable workplace fatigue to barrier protection',
    offer: null,
    cta: 'Follow for daily barrier repair routines',
    platform: 'INSTAGRAM',
    format: 'SHORT_REEL',
    priority: 'HIGH',
    status: 'READY',
    strategy: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('1. Prompt Builder Tests', () => {
    it('constructs prompt with full brand, job, and guardrail context', () => {
      const prompt = buildReelPrompt({
        brand: mockBrand,
        contentJob: mockContentJob,
        input: { durationSeconds: 30 }
      });

      expect(prompt).toContain('Aura Glow Skincare');
      expect(prompt).toContain('Why your skin feels dull after a 9-to-5');
      expect(prompt).toContain('Skin Barrier Education');
      expect(prompt).toContain('Miracle cure');
      expect(prompt).toContain('Target Duration: 30 seconds');
    });
  });

  describe('2. Scene Validator Tests', () => {
    it('passes for structured valid scenes', () => {
      const validScenes = [
        {
          sceneNumber: 1,
          durationSeconds: 3,
          purpose: 'Hook',
          narration: 'Is your skin exhausted by 5 PM?',
          onScreenText: 'EXHAUSTED SKIN?',
          visualType: 'PROBLEM' as const,
          subject: 'Tired office worker',
          environment: 'Modern office',
          composition: 'Close-up',
          camera: 'Push in',
          lighting: 'Fluorescent',
          mood: 'Fatigued',
          transition: 'Whip cut',
          animationIntent: 'Kinetic pop',
          assetRequirement: 'Close up of professional rubbing tired eyes at desk'
        },
        {
          sceneNumber: 2,
          durationSeconds: 27,
          purpose: 'Solution',
          narration: 'Here is how to repair it.',
          onScreenText: 'BARRIER REPAIR',
          visualType: 'SOLUTION' as const,
          subject: 'Glowing skin model',
          environment: 'Clean daylight studio',
          composition: 'Medium portrait',
          camera: 'Slow pan',
          lighting: 'Soft warm daylight',
          mood: 'Refreshed',
          transition: 'Smooth cut',
          animationIntent: 'Subtle glow badge',
          assetRequirement: 'Model smiling with hydrated glowing skin'
        }
      ];

      const res = validateScenes(validScenes);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('flags invalid scene durations and empty purpose', () => {
      const invalidScenes = [
        {
          sceneNumber: 1,
          durationSeconds: 0,
          purpose: '',
          narration: '',
          onScreenText: '',
          visualType: 'PROBLEM' as const,
          subject: '',
          environment: '',
          composition: '',
          camera: '',
          lighting: '',
          mood: '',
          transition: '',
          animationIntent: '',
          assetRequirement: ''
        }
      ];

      const res = validateScenes(invalidScenes);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Scene #1 has an empty purpose');
      expect(res.errors).toContain('Scene #1 is missing an assetRequirement description');
      expect(res.errors).toContain('Scene #1 has an invalid duration (0s)');
    });
  });

  describe('3. Reel Validator & Guardrail Enforcement', () => {
    const validRawAIOutput: ReelAIOutput = {
      title: 'Dull Skin at 5 PM Explained',
      concept: {
        title: 'Dull Skin at 5 PM Explained',
        concept: 'Educating professionals on desk-induced skin fatigue',
        objective: 'Drive brand authority on barrier care',
        targetAudience: 'Professionals 24-38',
        corePromise: 'Restore radiance without greasy residue',
        emotionalAngle: 'From drained to revitalized',
        messagingAngle: 'Scientific barrier support',
        contentPillar: 'Skin Barrier Education',
        funnelStage: 'AWARENESS'
      },
      objective: 'Educate audience on blue light fatigue',
      audience: 'Urban working professionals',
      funnelStage: 'AWARENESS',
      contentPillar: 'Skin Barrier Education',
      durationSeconds: 30,
      aspectRatio: '9:16',
      platform: 'INSTAGRAM',
      format: 'REEL',
      hook: {
        type: 'QUESTION',
        text: 'Ever wonder why your skin looks exhausted at 5 PM?',
        visualIntent: 'Close up looking at screen reflection',
        deliveryStyle: 'Conversational curiosity',
        durationSeconds: 3
      },
      narrative: 'A journey from office skin dehydration to scientific barrier restoration.',
      script: [
        {
          id: 'seg-1',
          purpose: 'Hook',
          text: 'Ever wonder why your skin looks exhausted at 5 PM?',
          estimatedDuration: 3,
          deliveryStyle: 'Engaging',
          emotionalTone: 'Curious'
        },
        {
          id: 'seg-2',
          purpose: 'Context',
          text: 'Office AC and continuous screen light rapidly strip hydration.',
          estimatedDuration: 12,
          deliveryStyle: 'Authoritative',
          emotionalTone: 'Informative'
        },
        {
          id: 'seg-3',
          purpose: 'Solution',
          text: 'Locking moisture with ceramides rebuilds your defense.',
          estimatedDuration: 10,
          deliveryStyle: 'Inspiring',
          emotionalTone: 'Reassuring'
        },
        {
          id: 'seg-4',
          purpose: 'CTA',
          text: 'Follow for daily clean skincare routines.',
          estimatedDuration: 5,
          deliveryStyle: 'Direct',
          emotionalTone: 'Inviting'
        }
      ],
      scenes: [
        {
          sceneNumber: 1,
          durationSeconds: 3.5,
          purpose: 'Hook',
          narration: 'Ever wonder why your skin looks exhausted at 5 PM?',
          onScreenText: 'EXHAUSTED BY 5 PM?',
          visualType: 'PROBLEM',
          subject: 'Office worker checking phone screen reflection',
          environment: 'Office desk with subtle laptop glow',
          composition: 'Vertical close-up',
          camera: 'Subtle push in',
          lighting: 'Office screen glow',
          mood: 'Fatigued',
          transition: 'Quick cut',
          animationIntent: 'Bold kinetic pop text',
          assetRequirement: 'Young professional checking face reflection at office desk'
        },
        {
          sceneNumber: 2,
          durationSeconds: 5.5,
          purpose: 'Mechanism of Action',
          narration: 'Office air conditioning and screen exposure dehydrate your lipid barrier.',
          onScreenText: 'DESK AIR STRIPS HYDRATION',
          visualType: 'EDUCATION',
          subject: '3D animated barrier diagram or model touching skin',
          environment: 'Minimalist studio',
          composition: 'Medium shot',
          camera: 'Slow panning shot',
          lighting: 'Clean high-key lighting',
          mood: 'Educational',
          transition: 'Match cut',
          animationIntent: 'Floating callout text',
          assetRequirement: 'Macro skin texture showing hydration loss diagram'
        },
        {
          sceneNumber: 3,
          durationSeconds: 6.5,
          purpose: 'Barrier Solution',
          narration: 'Locking moisture with vegan ceramides restores natural resilience.',
          onScreenText: 'RESTORE YOUR BARRIER',
          visualType: 'SOLUTION',
          subject: 'Refreshing face application',
          environment: 'Sunlit clean bathroom',
          composition: 'Side profile close-up',
          camera: 'Smooth glide',
          lighting: 'Golden hour soft light',
          mood: 'Uplifting',
          transition: 'Smooth dissolve',
          animationIntent: 'Subtle radiance shimmer',
          assetRequirement: 'Model applying lightweight serum with dewy glowing skin'
        },
        {
          sceneNumber: 4,
          durationSeconds: 10.0,
          purpose: 'Customer Benefit',
          narration: 'Experience all-day hydration and a protected, radiant glow.',
          onScreenText: 'ALL-DAY HYDRATION',
          visualType: 'TRANSFORMATION',
          subject: 'Glowing confident model portrait',
          environment: 'Sunlit studio',
          composition: 'Centered portrait',
          camera: 'Slow orbital push',
          lighting: 'Bright studio illumination',
          mood: 'Empowered',
          transition: 'Match cut',
          animationIntent: 'Radiance wave',
          assetRequirement: 'Dewy radiant skin portrait'
        },
        {
          sceneNumber: 5,
          durationSeconds: 4.5,
          purpose: 'CTA Endcard',
          narration: 'Follow for daily clean skincare routines.',
          onScreenText: 'FOLLOW FOR MORE TIPS',
          visualType: 'CTA',
          subject: 'Brand logo and follow button card',
          environment: 'Branded gradient backdrop',
          composition: 'Centered graphic card',
          camera: 'Static punchy',
          lighting: 'Studio bright',
          mood: 'Inspiring',
          transition: 'Fade to black',
          animationIntent: 'Button pulse with subtle brand sparkle',
          assetRequirement: 'Clean branded endcard layout with follow cursor tap'
        }
      ],
      visualDirection: {
        style: 'Modern clean aesthetic with warm cinematic tones',
        mood: 'Educational, comforting, scientific',
        colorIntent: 'Lavender and soft rose brand tones',
        lightingIntent: 'Soft high-key natural illumination',
        composition: 'Centered vertical 9:16 framing',
        cameraLanguage: 'Fluid handheld and smooth tracking motions',
        pacing: 'Dynamic opening settling into rhythmic educational flow',
        visualHierarchy: 'Hero subject centered with legible bottom-third captions',
        brandIntegration: 'Subtle logo reveal in scene 3, prominent in endcard',
        productEmphasis: 'Botanical barrier serum showcased in natural setting'
      },
      voiceDirection: {
        style: 'Warm, scientific, approachable',
        pace: 'Moderate energetic',
        tone: 'Friendly and knowledgeable',
        genderPreference: 'Female',
        language: 'en-US',
        accents: 'Neutral American'
      },
      captionDirection: {
        style: 'Bold kinetic word-by-word highlight',
        placement: 'Center bottom-third',
        density: '1-3 words per burst',
        fontEmphasis: 'Outfit bold uppercase',
        animation: 'Pop-in with subtle scale up'
      },
      animationDirection: {
        energy: 'Medium-high',
        style: 'Kinetic typography with floating badges',
        textAnimation: 'Word-by-word highlight',
        visualTransitions: 'Quick whip pan to smooth cuts',
        elementMotion: 'Gentle particle sparkle'
      },
      audioDirection: {
        musicMood: 'Warm lo-fi chillhop with gentle rhythm',
        soundEffects: 'Subtle whooshes on screen transitions',
        pacing: '110 BPM synced to cuts',
        mixBalance: 'Voice 100%, Music 25%, SFX 35%'
      },
      cta: {
        type: 'FOLLOW',
        text: 'Follow for daily skin barrier advice',
        visualTreatment: 'High-contrast pill card with follow icon',
        placement: 'Final endcard scene',
        url: null
      }
    };

    it('validates a complete, compliant Reel blueprint successfully', () => {
      const result = validateAndSanitizeReel(validRawAIOutput, {
        targetDurationSeconds: 30,
        brand: mockBrand,
        contentJob: mockContentJob
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.calculatedDuration).toBe(30);
      expect(result.wordCount).toBeGreaterThan(15);
    });

    it('detects and flags forbidden brand guardrails (e.g. Miracle cure)', () => {
      const outputWithViolation = JSON.parse(JSON.stringify(validRawAIOutput));
      outputWithViolation.narrative = 'This miracle cure will fix everything overnight.';

      const result = validateAndSanitizeReel(outputWithViolation, {
        targetDurationSeconds: 30,
        brand: mockBrand,
        contentJob: mockContentJob
      });

      expect(result.complianceNotes.some((n) => n.includes('Miracle cure'))).toBe(true);
      expect(result.warningFlags).toContain('GUARDRAIL_FLAG_MIRACLE_CURE');
    });

    it('replaces unverified pricing and guarantees with [PRODUCT BENEFIT REQUIRED]', () => {
      const outputWithPricing = JSON.parse(JSON.stringify(validRawAIOutput));
      outputWithPricing.scenes[1].narration = 'Get 50% off guaranteed returns today!';
      outputWithPricing.scenes[1].onScreenText = '50% OFF GUARANTEED';

      const result = validateAndSanitizeReel(outputWithPricing, {
        targetDurationSeconds: 30,
        brand: mockBrand,
        products: [], // No pricing provided in product catalog
        contentJob: mockContentJob
      });

      expect(result.warningFlags).toContain('UNSUPPORTED_COMMERCIAL_CLAIM');
      expect(result.sanitizedOutput.scenes[1].narration).toContain('[PRODUCT BENEFIT REQUIRED]');
    });
  });

  describe('4. ReelOrchestrator Service Integration', () => {
    it('successfully calls AI Provider and returns structured ReelProductionPlan blueprint', async () => {
      const mockAIProvider: AIProvider = {
        providerName: 'mock-gemini',
        generateText: vi.fn(),
        generateStructured: vi.fn().mockResolvedValue({
          title: 'Dull Skin at 5 PM Explained',
          concept: {
            title: 'Dull Skin at 5 PM Explained',
            concept: 'Educating professionals on desk-induced skin fatigue',
            objective: 'Drive brand authority on barrier care',
            targetAudience: 'Professionals 24-38',
            corePromise: 'Restore radiance without greasy residue',
            emotionalAngle: 'From drained to revitalized',
            messagingAngle: 'Scientific barrier support',
            contentPillar: 'Skin Barrier Education',
            funnelStage: 'AWARENESS'
          },
          objective: 'Educate audience on blue light fatigue',
          audience: 'Urban working professionals',
          funnelStage: 'AWARENESS',
          contentPillar: 'Skin Barrier Education',
          durationSeconds: 30,
          aspectRatio: '9:16',
          platform: 'INSTAGRAM',
          format: 'REEL',
          hook: {
            type: 'QUESTION',
            text: 'Ever wonder why your skin looks exhausted at 5 PM?',
            visualIntent: 'Close up looking at screen reflection',
            deliveryStyle: 'Conversational curiosity',
            durationSeconds: 3
          },
          narrative: 'A journey from office skin dehydration to scientific barrier restoration.',
          script: [
            {
              id: 'seg-1',
              purpose: 'Hook',
              text: 'Ever wonder why your skin looks exhausted at 5 PM?',
              estimatedDuration: 3,
              deliveryStyle: 'Engaging',
              emotionalTone: 'Curious'
            }
          ],
          scenes: [
            {
              sceneNumber: 1,
              durationSeconds: 4,
              purpose: 'Hook',
              narration: 'Ever wonder why your skin looks exhausted at 5 PM?',
              onScreenText: 'EXHAUSTED BY 5 PM?',
              visualType: 'PROBLEM',
              subject: 'Office worker',
              environment: 'Office desk',
              composition: 'Close-up',
              camera: 'Push in',
              lighting: 'Screen glow',
              mood: 'Fatigued',
              transition: 'Cut',
              animationIntent: 'Pop text',
              assetRequirement: 'Office worker rubbing face'
            },
            {
              sceneNumber: 2,
              durationSeconds: 5,
              purpose: 'Problem Agitation',
              narration: 'Dry indoor air strips away essential moisture.',
              onScreenText: 'DRY INDOOR AIR',
              visualType: 'PROBLEM',
              subject: 'Dry skin texture',
              environment: 'Office desk',
              composition: 'Macro',
              camera: 'Pan',
              lighting: 'Moody',
              mood: 'Frustrated',
              transition: 'Cut',
              animationIntent: 'Text swipe',
              assetRequirement: 'Skin dryness graphic'
            },
            {
              sceneNumber: 3,
              durationSeconds: 6,
              purpose: 'Solution',
              narration: 'Rebuild your barrier with vegan ceramides.',
              onScreenText: 'VEGAN CERAMIDES',
              visualType: 'SOLUTION',
              subject: 'Radiant model',
              environment: 'Daylight studio',
              composition: 'Medium shot',
              camera: 'Slow glide',
              lighting: 'Warm daylight',
              mood: 'Hydrated',
              transition: 'Smooth cut',
              animationIntent: 'Glow badge',
              assetRequirement: 'Dewy skin application shot'
            },
            {
              sceneNumber: 4,
              durationSeconds: 10,
              purpose: 'Benefit',
              narration: 'Restore all-day glow and continuous barrier hydration.',
              onScreenText: 'ALL-DAY GLOW',
              visualType: 'TRANSFORMATION',
              subject: 'Smiling confident model',
              environment: 'Sunlit studio',
              composition: 'Centered portrait',
              camera: 'Slow pedestal',
              lighting: 'Bright natural',
              mood: 'Empowered',
              transition: 'Dissolve',
              animationIntent: 'Radiance wave',
              assetRequirement: 'Smiling model applying serum'
            },
            {
              sceneNumber: 5,
              durationSeconds: 5,
              purpose: 'CTA',
              narration: 'Follow for daily clean skincare routines.',
              onScreenText: 'FOLLOW FOR MORE',
              visualType: 'CTA',
              subject: 'Branded endcard',
              environment: 'Gradient backdrop',
              composition: 'Centered card',
              camera: 'Static',
              lighting: 'Studio bright',
              mood: 'Decisive',
              transition: 'Fade out',
              animationIntent: 'Button pulse',
              assetRequirement: 'Branded endcard'
            }
          ],
          visualDirection: {
            style: 'Clean modern',
            mood: 'Scientific warm',
            colorIntent: 'Lavender rose',
            lightingIntent: 'Daylight',
            composition: 'Vertical 9:16',
            cameraLanguage: 'Smooth motions',
            pacing: 'Dynamic',
            visualHierarchy: 'Centered subject',
            brandIntegration: 'Subtle logo',
            productEmphasis: 'Hero serum'
          },
          voiceDirection: {
            style: 'Warm',
            pace: 'Moderate',
            tone: 'Knowledgeable',
            genderPreference: 'Female',
            language: 'en-US',
            accents: 'Neutral'
          },
          captionDirection: {
            style: 'Bold kinetic',
            placement: 'Bottom center',
            density: '2 words',
            fontEmphasis: 'Bold uppercase',
            animation: 'Pop-in'
          },
          animationDirection: {
            energy: 'Medium',
            style: 'Kinetic',
            textAnimation: 'Highlight',
            visualTransitions: 'Cuts',
            elementMotion: 'Sparkle'
          },
          audioDirection: {
            musicMood: 'Lo-fi chill',
            soundEffects: 'Whoosh',
            pacing: 'Synced',
            mixBalance: 'Balanced'
          },
          cta: {
            type: 'FOLLOW',
            text: 'Follow for daily skin tips',
            visualTreatment: 'Pill button',
            placement: 'Endcard',
            url: null
          }
        })
      };

      const orchestrator = new ReelOrchestrator(mockAIProvider);
      const plan = await orchestrator.generateReelPlan({
        brand: mockBrand,
        contentJob: mockContentJob,
        input: { durationSeconds: 30 }
      });

      expect(plan.title).toBe('Dull Skin at 5 PM Explained');
      expect(plan.contentJobId).toBe(mockContentJob.id);
      expect(plan.brandId).toBe(mockBrand.id);
      expect(plan.scenes).toHaveLength(5);
      expect(plan.hook.type).toBe('QUESTION');
      expect(plan.productionMetadata.totalScenes).toBe(5);
      expect(plan.status).toBe('READY');
    });
  });
});
