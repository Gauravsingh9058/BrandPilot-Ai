import { describe, it, expect } from 'vitest';
import {
  calculateEngagementRate,
  calculateCtr,
  calculateCompletionRate,
  calculateAverageWatchTime,
  calculateRoas,
  calculateCpa,
  calculateCpc,
  calculateCpm,
  normalizeMetaInsights,
  ContentPerformanceAnalyzer,
  ExperimentationEngine,
  MetaApiClient
} from '@vidsnapai/video';
import { buildMarketingStrategyPrompt } from '../packages/campaign/src/prompts/marketing-strategy.prompt.js';
import { buildReelPrompt } from '../packages/video/src/prompts/reel-orchestration.prompt.js';
import {
  AIOptimizationOutputSchema,
  AnalyticsOverviewQuerySchema,
  AnalyticsSyncRequestSchema,
  CreateExperimentSchema
} from '@vidsnapai/validation';
import type {
  Brand,
  BrandDNA,
  ReelProductionPlan,
  NormalizedPerformanceMetrics,
  ExperimentRecord,
  OptimizationContext
} from '@vidsnapai/types';

describe('Phase 11: Analytics + AI Performance Intelligence + Optimization Engine', () => {
  // Test Fixtures
  const mockBrand: Brand = {
    id: 'b1088888-8888-8888-8888-888888888888',
    workspaceId: 'ws101111-1111-1111-1111-111111111111',
    name: 'One8 by Virat Kohli',
    slug: 'one8',
    description: 'Active lifestyle and premium sportswear brand by Virat Kohli.',
    industry: 'Sports & Activewear',
    primaryCta: 'Shop Activewear',
    contentPillars: ['Athletic Performance', 'Match Day Energy', 'Streetwear Style'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockReelPlan: ReelProductionPlan = {
    id: 'reel-one8-001',
    contentJobId: 'job-001',
    brandId: mockBrand.id,
    contentPlanId: 'plan-001',
    workspaceId: mockBrand.workspaceId,
    version: 1,
    title: 'Match-Ready Activewear Reel',
    concept: {
      title: 'Match-Ready Energy',
      concept: 'Dynamic transitions of athletic wear in action',
      objective: 'Brand Awareness & Sales',
      targetAudience: 'Fitness enthusiasts and youth',
      corePromise: 'Unstoppable agility and breathability',
      emotionalAngle: 'Energetic & Confident',
      messagingAngle: 'High-Performance Comfort',
      contentPillar: 'Athletic Performance',
      funnelStage: 'CONSIDERATION'
    },
    objective: 'Brand Awareness',
    audience: 'Fitness enthusiasts',
    funnelStage: 'CONSIDERATION',
    contentPillar: 'Athletic Performance',
    durationSeconds: 30,
    aspectRatio: '9:16',
    platform: 'INSTAGRAM',
    format: 'REEL',
    hook: {
      type: 'PROBLEM',
      text: 'Still wearing activewear that suffocates your workout?',
      visualIntent: 'Intense close-up of sweat resistance',
      deliveryStyle: 'Urgent, bold',
      durationSeconds: 3
    },
    narrative: 'Showcase breathable fabric in high-intensity training.',
    script: [],
    scenes: [
      {
        sceneNumber: 1,
        durationSeconds: 3,
        purpose: 'Hook',
        narration: 'Still wearing activewear that suffocates your workout?',
        onScreenText: 'NO MORE SWEAT TRAPS',
        visualType: 'PRODUCT_SHOWCASE',
        subject: 'Athlete in motion',
        environment: 'Modern gym',
        composition: 'Macro close-up',
        camera: 'Dynamic tracking',
        lighting: 'High contrast studio',
        mood: 'Intense',
        transition: 'Whip pan',
        animationIntent: 'Kinetic typography snap',
        assetRequirement: 'Athletic training footage'
      }
    ],
    visualDirection: {} as any,
    voiceDirection: {} as any,
    captionDirection: {} as any,
    animationDirection: {} as any,
    audioDirection: {} as any,
    cta: {
      type: 'SHOP_NOW',
      text: 'Shop Activewear Now',
      visualTreatment: 'Pill button with pulsing border',
      placement: 'END_CARD'
    },
    productionMetadata: {} as any,
    status: 'RENDERED',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // 1. Metric Normalization & Missing Metric Handling
  describe('1. Metric Normalization & Safe Calculations', () => {
    it('correctly normalizes raw Meta Graph insights payload into internal metric format', () => {
      const rawMeta = {
        impressions: '100000',
        reach: '80000',
        spend: '250.00',
        clicks: '4000',
        actions: [
          { action_type: 'video_view', value: '60000' },
          { action_type: 'like', value: '3500' },
          { action_type: 'comment', value: '450' },
          { action_type: 'post', value: '250' },
          { action_type: 'onsite_conversion.purchase', value: '120' }
        ],
        action_values: [
          { action_type: 'onsite_conversion.purchase', value: '1800.00' }
        ],
        video_avg_time_watched_actions: [{ value: '16.5' }]
      };

      const normalized = normalizeMetaInsights(rawMeta);

      expect(normalized.impressions).toBe(100000);
      expect(normalized.reach).toBe(80000);
      expect(normalized.spend).toBe(250.0);
      expect(normalized.clicks).toBe(4000);
      expect(normalized.videoViews).toBe(60000);
      expect(normalized.likes).toBe(3500);
      expect(normalized.comments).toBe(450);
      expect(normalized.shares).toBe(250);
      expect(normalized.conversions).toBe(120);
      expect(normalized.revenue).toBe(1800.0);
      expect(normalized.averageWatchTimeSeconds).toBe(16.5);
      expect(normalized.ctr).toBe(4.0); // (4000 / 100000) * 100
      expect(normalized.cpc).toBe(0.06); // 250 / 4000
      expect(normalized.cpm).toBe(2.5); // (250 / 100000) * 1000
      expect(normalized.roas).toBe(7.2); // 1800 / 250
      expect(normalized.cpa).toBe(2.08); // 250 / 120
    });

    it('preserves null/undefined without fabricating zero when metrics are missing from provider', () => {
      const partialPayload = {
        impressions: '5000',
        // reach, spend, revenue, actions are completely missing
      };

      const normalized = normalizeMetaInsights(partialPayload);

      expect(normalized.impressions).toBe(5000);
      expect(normalized.reach).toBeNull();
      expect(normalized.spend).toBeNull();
      expect(normalized.revenue).toBeNull();
      expect(normalized.roas).toBeNull();
      expect(normalized.cpa).toBeNull();
      expect(normalized.videoViews).toBeNull();
    });

    it('calculates deterministic engagement rate with null safety', () => {
      expect(calculateEngagementRate(500, 10000)).toBe(5.0);
      expect(calculateEngagementRate(0, 10000)).toBe(0.0);
      expect(calculateEngagementRate(null, 10000)).toBeNull();
      expect(calculateEngagementRate(500, 0)).toBeNull();
      expect(calculateEngagementRate(500, null)).toBeNull();
    });

    it('calculates deterministic CTR with null safety', () => {
      expect(calculateCtr(250, 10000)).toBe(2.5);
      expect(calculateCtr(0, 10000)).toBe(0.0);
      expect(calculateCtr(250, 0)).toBeNull();
      expect(calculateCtr(null, 5000)).toBeNull();
    });

    it('calculates completion rate and average watch time accurately', () => {
      expect(calculateCompletionRate(1500, 5000)).toBe(30.0);
      expect(calculateCompletionRate(null, 5000)).toBeNull();
      expect(calculateAverageWatchTime(45000, 3000)).toBe(15.0);
      expect(calculateAverageWatchTime(null, 3000)).toBeNull();
    });

    it('calculates ROAS, CPA, CPC, and CPM with division by zero prevention', () => {
      expect(calculateRoas(5000, 1000)).toBe(5.0);
      expect(calculateRoas(5000, 0)).toBeNull();
      expect(calculateCpa(1000, 50)).toBe(20.0);
      expect(calculateCpa(1000, 0)).toBeNull();
      expect(calculateCpc(500, 2500)).toBe(0.2);
      expect(calculateCpc(500, 0)).toBeNull();
      expect(calculateCpm(200, 100000)).toBe(2.0);
      expect(calculateCpm(200, 0)).toBeNull();
    });
  });

  // 2. Content Performance Analyzer
  describe('2. Content Performance Analyzer', () => {
    it('assigns high scores and TIER_1_TOP to high-converting content', () => {
      const analyzer = new ContentPerformanceAnalyzer();
      const topMetrics: NormalizedPerformanceMetrics = {
        impressions: 100000,
        reach: 85000,
        videoViews: 75000,
        videoViews3s: 42000,
        averageWatchTimeSeconds: 24.5,
        likes: 5200,
        comments: 650,
        shares: 800,
        saves: 1200,
        clicks: 4500,
        ctr: 4.5,
        conversions: 180,
        spend: 300,
        revenue: 2700,
        roas: 9.0,
        engagementRate: 9.2
      };

      const result = analyzer.analyze({
        workspaceId: mockBrand.workspaceId,
        brandId: mockBrand.id,
        reelPlan: mockReelPlan,
        metrics: topMetrics
      });

      expect(result.overallScore).toBeGreaterThanOrEqual(75);
      expect(result.performanceTier).toBe('TIER_1_TOP');
      expect(result.hookScore).toBeGreaterThanOrEqual(70);
      expect(result.retentionScore).toBeGreaterThanOrEqual(75);
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.detectedPatterns.hookStyle).toBe('PROBLEM');
      expect(result.detectedPatterns.ctaType).toBe('SHOP_NOW');
    });

    it('assigns TIER_4_UNDERPERFORMING and detects weaknesses when drop-off occurs', () => {
      const analyzer = new ContentPerformanceAnalyzer();
      const poorMetrics: NormalizedPerformanceMetrics = {
        impressions: 50000,
        reach: 40000,
        videoViews: 12000,
        videoViews3s: 4000, // Very low 3s retention
        averageWatchTimeSeconds: 4.2, // Only 4.2s on 30s video
        likes: 120,
        comments: 5,
        clicks: 80,
        ctr: 0.16,
        conversions: 0,
        spend: 200,
        revenue: 0,
        roas: 0,
        engagementRate: 0.4
      };

      const result = analyzer.analyze({
        workspaceId: mockBrand.workspaceId,
        brandId: mockBrand.id,
        reelPlan: mockReelPlan,
        metrics: poorMetrics
      });

      expect(result.overallScore).toBeLessThan(50);
      expect(result.performanceTier).toBe('TIER_4_UNDERPERFORMING');
      expect(result.weaknesses.some((w) => w.toLowerCase().includes('hook') || w.toLowerCase().includes('retention') || w.toLowerCase().includes('drop-off'))).toBe(true);
    });
  });

  // 3. AI Optimization Output Schema Validation
  describe('3. AI Optimization Structured Schema', () => {
    it('validates structured AI optimization output schema accurately', () => {
      const validAIOutput = {
        summary: 'Performance analysis indicates high conversion for activewear problem-solution reels.',
        winningPatterns: [
          {
            type: 'HOOK',
            key: 'PROBLEM_AGITATION',
            evidence: 'Problem-agitation hook captured 42% 3-second retention.',
            metricLift: '+35% watch time'
          }
        ],
        underperformingPatterns: [
          {
            type: 'INTRO',
            key: 'SLOW_LOGO_CRAWL',
            evidence: 'Intro logo animation caused 55% bounce in first 2 seconds.',
            metricDrag: '-55% retention'
          }
        ],
        recommendations: [
          {
            type: 'HOOK',
            priority: 'HIGH',
            title: 'Use High-Curiosity Dynamic Hooks',
            recommendation: 'Open with high-energy movement within first 1.5s.',
            reason: 'Observed +35% retention on problem agitation openings.',
            supportingMetrics: { topHookRetention: '42%' },
            confidence: 0.92,
            expectedImpact: '+30% 3s View Rate',
            implementationGuidance: 'Place athlete in full motion in scene 1.'
          }
        ],
        nextContentGuidance: {
          recommendedHooks: ['PROBLEM_AGITATION', 'HIGH_CONTRAST_BEFORE_AFTER'],
          recommendedMessagingAngles: ['High-Performance Breathability', 'Match Day Endurance'],
          recommendedCTAs: ['Shop Activewear Now', 'Claim Limited Launch Offer'],
          recommendedContentPillars: ['Athletic Performance', 'Match Day Energy'],
          recommendedDurations: [15, 30],
          recommendedFormats: ['REEL', 'STORY'],
          patternsToAvoid: ['Slow text crawl in first 3 seconds', 'Vague multi-message CTAs']
        },
        experimentSuggestions: [
          {
            hypothesis: 'Direct problem hook will beat narrative story in click-through rate.',
            type: 'HOOK',
            variantA: 'Problem Agitation Hook',
            variantB: 'Story Narrative Hook',
            targetMetric: 'ctr',
            expectedOutcome: '+25% CTR for Variant A'
          }
        ]
      };

      const parsed = AIOptimizationOutputSchema.safeParse(validAIOutput);
      expect(parsed.success).toBe(true);
    });
  });

  // 4. Marketing Brain & Reel Orchestrator Optimization Feedback Loops
  describe('4. Marketing Brain & Reel Orchestrator Feedback Loop', () => {
    const optimizationContext: OptimizationContext = {
      winningHooks: ['PROBLEM_AGITATION', 'SPLIT_SCREEN_COMPARISON'],
      winningMessagingAngles: ['Sweat-Proof Technology', 'Match Day Agility'],
      winningCTAs: ['Shop Activewear', 'Explore Collection'],
      winningContentPillars: ['Athletic Performance'],
      patternsToAvoid: ['Static opening shot', 'Generic multi-CTA endings'],
      topInsights: [
        {
          type: 'HOOK',
          title: 'Problem-Solution Openings Dominate',
          recommendation: 'Direct question openings achieved 4.5% CTR.',
          reasoning: 'Empirical data across 12 campaigns confirms 2.4x higher conversion.',
          evidenceText: '+140% ROAS improvement'
        }
      ]
    };

    it('injects optimization intelligence seamlessly into Marketing Brain prompt', () => {
      const mockDna: BrandDNA = {
        id: 'dna-one8',
        brandId: mockBrand.id,
        version: 1,
        generatedBy: 'AI',
        createdAt: new Date(),
        updatedAt: new Date(),
        identity: {
          brandName: mockBrand.name,
          industry: mockBrand.industry,
          story: 'Founded by Virat Kohli to redefine active sportswear.',
          mission: 'Empower athletes and active lifestyle enthusiasts.',
          personality: ['Athletic', 'Bold', 'Relentless']
        },
        messaging: {
          positioning: 'Premium high-performance athleisure',
          coreMessage: 'Built for intense movement',
          valueProposition: 'Uncompromised durability and sweat control',
          tone: ['Energetic', 'Direct', 'Modern'],
          usps: ['Aeroflex fabric', 'Moisture-wicking mesh'],
          proofPoints: ['Worn by world-class athletes'],
          forbiddenMessaging: ['No fake discounts']
        },
        audience: {
          primaryAudience: 'Fitness enthusiasts aged 18-35',
          demographics: ['18-35 years old', 'Urban athletes'],
          painPoints: ['Overheating in conventional fabrics'],
          desires: ['Look sharp while staying dry'],
          buyingMotivations: ['Quality and Virat Kohli style']
        },
        products: [],
        visualIdentity: {
          colors: { primary: '#10B981', secondary: '#3B82F6', accent: '#F59E0B' },
          typography: { headingFont: 'Inter', bodyFont: 'Inter' },
          visualStyle: 'Modern athletic',
          imageStyle: 'High contrast dynamic'
        },
        contentStrategy: {
          contentPillars: ['Athletic Performance', 'Match Day Energy'],
          preferredTopics: ['Workouts', 'Active lifestyle'],
          educationalTopics: ['Sweat-wicking fabrics'],
          promotionalTopics: ['New arrivals'],
          storytellingTopics: ['Athlete journeys']
        },
        promotionRules: {
          primaryCTA: 'Shop Activewear',
          offers: ['Free Shipping over $50'],
          claimsToAvoid: ['100% cure for fatigue'],
          complianceRules: ['Authentic claims only'],
          brandRestrictions: ['No generic discount gimmicks']
        }
      };

      const prompt = buildMarketingStrategyPrompt(
        mockBrand,
        mockDna,
        [],
        [],
        {
          objective: 'Scale Q4 Activewear Sales',
          businessGoal: 'Double conversion volume',
          marketingGoal: 'Maintain ROAS above 4.0'
        },
        optimizationContext
      );

      expect(prompt).toContain('PHASE 11: HISTORICAL PERFORMANCE INTELLIGENCE & OPTIMIZATION CONTEXT');
      expect(prompt).toContain('Winning Hooks: PROBLEM_AGITATION, SPLIT_SCREEN_COMPARISON');
      expect(prompt).toContain('Winning Messaging Angles: Sweat-Proof Technology, Match Day Agility');
      expect(prompt).toContain('Patterns to Avoid: Static opening shot, Generic multi-CTA endings');
      expect(prompt).toContain('+140% ROAS improvement');
    });

    it('injects optimization intelligence into Reel Orchestrator prompt', () => {
      const prompt = buildReelPrompt({
        brand: mockBrand,
        contentJob: {
          id: 'job-101',
          contentPlanId: 'plan-101',
          brandId: mockBrand.id,
          workspaceId: mockBrand.workspaceId,
          dayNumber: 3,
          title: 'Sweat-Proof Aeroflex Test',
          topic: 'High-intensity gym performance',
          contentType: 'PROMOTIONAL',
          objective: 'Drive website clicks',
          audience: 'Gymgoers',
          funnelStage: 'CONSIDERATION',
          contentPillar: 'Athletic Performance',
          hook: 'Does your shirt survive 50 burpees?',
          keyMessage: 'Aeroflex stays light even after max effort.',
          messagingAngle: 'Sweat-Proof Technology',
          cta: 'Shop Activewear',
          format: 'SHORT_REEL',
          priority: 'HIGH',
          status: 'PLANNED',
          strategy: {},
          platform: 'INSTAGRAM',
          scheduledDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        optimizationContext
      });

      expect(prompt).toContain('PHASE 11: PERFORMANCE INTELLIGENCE & OPTIMIZATION GUIDANCE');
      expect(prompt).toContain('Recommended Hook Styles: PROBLEM_AGITATION, SPLIT_SCREEN_COMPARISON');
      expect(prompt).toContain('Recommended Messaging Angles: Sweat-Proof Technology, Match Day Agility');
      expect(prompt).toContain('Content Patterns to Avoid: Static opening shot, Generic multi-CTA endings');
    });
  });

  // 5. A/B Experimentation Engine & Statistical Rigor
  describe('5. Experimentation Engine & Statistical Rigor', () => {
    const engine = new ExperimentationEngine();

    it('returns INCONCLUSIVE when sample size is below minimum threshold (no fake statistical confidence)', () => {
      const underpoweredExp: ExperimentRecord = {
        id: 'exp-001',
        workspaceId: mockBrand.workspaceId,
        brandId: mockBrand.id,
        name: 'Hook A vs Hook B Test',
        experimentType: 'HOOK',
        status: 'RUNNING',
        variantA: {
          label: 'Direct Problem Hook',
          content: {},
          impressions: 15, // Below minimum 30
          conversions: 3
        },
        variantB: {
          label: 'Curiosity Question Hook',
          content: {},
          impressions: 12, // Below minimum 30
          conversions: 1
        },
        targetMetric: 'conversions',
        sampleSizeA: 15,
        sampleSizeB: 12,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = engine.evaluate(underpoweredExp);

      expect(result.status).toBe('INCONCLUSIVE');
      expect(result.winningVariant).toBe('INCONCLUSIVE');
      expect(result.confidenceScore).toBeNull();
      expect(result.resultSummary).toContain('Insufficient sample size');
    });

    it('declares statistically significant winner when sample size and 90%+ confidence threshold are met', () => {
      const robustExp: ExperimentRecord = {
        id: 'exp-002',
        workspaceId: mockBrand.workspaceId,
        brandId: mockBrand.id,
        name: 'CTA Urgency Test',
        experimentType: 'CTA',
        status: 'RUNNING',
        variantA: {
          label: 'Shop Now (Urgent)',
          content: {},
          impressions: 2500,
          conversions: 200 // 8.0% conversion rate
        },
        variantB: {
          label: 'Learn More (Neutral)',
          content: {},
          impressions: 2500,
          conversions: 75 // 3.0% conversion rate
        },
        targetMetric: 'conversions',
        sampleSizeA: 2500,
        sampleSizeB: 2500,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = engine.evaluate(robustExp);

      expect(result.status).toBe('COMPLETED');
      expect(result.winningVariant).toBe('A');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.95);
      expect(result.resultSummary).toContain('Variant A won');
      expect(result.resultSummary).toContain('lift');
    });
  });

  // 6. Meta API Client Insights Methods & Mock Mode
  describe('6. Meta API Client Insights', () => {
    it('returns simulated insights safely in mock mode without throwing', async () => {
      const client = new MetaApiClient();
      const mockToken = 'meta_eaab_mock_token_12345';

      const campaignInsights = await client.getCampaignInsights('1202081928371', mockToken);
      expect(campaignInsights).toBeDefined();
      expect(campaignInsights?.impressions).toBe('142500');

      const adSetInsights = await client.getAdSetInsights('1202081928372', mockToken);
      expect(adSetInsights).toBeDefined();
      expect(adSetInsights?.spend).toBe('180.00');

      const adInsights = await client.getAdInsights('1202081928373', mockToken);
      expect(adInsights).toBeDefined();
      expect(adInsights?.clicks).toBe('1680');

      const reelInsights = await client.getReelInsights('1789201928371', mockToken);
      expect(reelInsights).toBeDefined();
      expect(reelInsights?.plays).toBe('49500');
    });
  });

  // 7. Validation Schemas
  describe('7. API Request Validation Schemas', () => {
    it('validates AnalyticsOverviewQuerySchema parameters correctly', () => {
      const validQuery = {
        brandId: 'b1088888-8888-8888-8888-888888888888',
        timeRange: '30D',
        platform: 'META'
      };
      const parsed = AnalyticsOverviewQuerySchema.safeParse(validQuery);
      expect(parsed.success).toBe(true);
    });

    it('validates AnalyticsSyncRequestSchema parameters correctly', () => {
      const validSync = {
        brandId: 'b1088888-8888-8888-8888-888888888888',
        platform: 'META'
      };
      const parsed = AnalyticsSyncRequestSchema.safeParse(validSync);
      expect(parsed.success).toBe(true);
    });

    it('validates CreateExperimentSchema properly', () => {
      const validExp = {
        brandId: 'b1088888-8888-8888-8888-888888888888',
        name: 'Hook Agitation vs Curiosity',
        experimentType: 'HOOK',
        variantA: { label: 'Variant A', impressions: 0, conversions: 0 },
        variantB: { label: 'Variant B', impressions: 0, conversions: 0 },
        targetMetric: 'conversionRate'
      };
      const parsed = CreateExperimentSchema.safeParse(validExp);
      expect(parsed.success).toBe(true);
    });
  });
});
