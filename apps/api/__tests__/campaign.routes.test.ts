import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { marketingRouter } from '../src/routes/marketing.routes.js';
import { MarketingBrainService, CampaignService, CampaignRepository } from '@vidsnapai/campaign';
import { BrandRepository } from '@vidsnapai/brand';
import { WorkspaceRepository } from '@vidsnapai/database';
import { AuthService } from '../src/services/auth.service.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import type { Campaign, MarketingStrategy } from '@vidsnapai/types';

describe('Marketing Brain & Campaign Engine API Routes', () => {
  let app: express.Application;
  let server: Server;
  let baseUrl: string;

  // In-memory data store for testing route integration
  let brands: any[] = [];
  let strategies: MarketingStrategy[] = [];
  let campaigns: Campaign[] = [];
  let workspaceMembers: any[] = [];

  const sampleBrand = {
    id: 'brand-api-1',
    workspaceId: 'ws-api-1',
    name: 'OmniFlow AI',
    slug: 'omniflow-ai',
    description: 'Enterprise workflow automation for modern revenue teams',
    industry: 'Enterprise SaaS',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleMarketingStrategy: MarketingStrategy = {
    id: 'strat-1',
    brandId: 'brand-api-1',
    version: 1,
    objective: 'CUSTOMER_ACQUISITION',
    businessGoal: 'Accelerate qualified pipeline',
    marketingGoal: 'Generate 100 enterprise demo requests',
    targetAudience: {
      primarySegments: ['Enterprise CROs'],
      psychographics: ['Efficiency focused'],
      buyingTriggers: ['Missed pipeline targets'],
      objectionsToOvercome: ['Integration complexity']
    },
    positioning: {
      marketCategory: 'Autonomous Revenue Operations',
      competitiveMoat: 'Deep bidirectional CRM synchronization',
      valuePropositionStatement: 'Eliminate 90% of manual sales admin with autonomous workflows.',
      differentiators: ['Instant lead routing']
    },
    messagingStrategy: {
      brandNarrativeHook: 'Stop losing high-intent enterprise pipeline.',
      keyThemes: ['Sales Velocity', 'Autonomous RevOps'],
      primaryAngles: ['The Cost of Slow Response'],
      voiceGuidance: 'Polished, authoritative, data-backed'
    },
    contentStrategy: {
      pillars: [
        {
          name: 'RevOps Optimization',
          purpose: 'Educate on pipeline velocity',
          audienceNeed: 'Benchmark data',
          messagingAngle: 'How top unicorns route inbound',
          recommendedFormats: ['Breakdown carousels']
        }
      ],
      contentMix: [
        { type: 'Educational', percentage: 40, purpose: 'Pipeline optimization', funnelStage: 'AWARENESS' },
        { type: 'Product Deep-dive', percentage: 30, purpose: 'Showcase routing engine', funnelStage: 'CONSIDERATION' },
        { type: 'Customer Stories', percentage: 20, purpose: 'CRO testimonials', funnelStage: 'CONSIDERATION' },
        { type: 'Direct Pilot Offer', percentage: 10, purpose: 'VIP onboarding tier', funnelStage: 'CONVERSION' }
      ],
      educationalThemes: ['Lead enrichment strategies'],
      promotionalThemes: ['Q3 Pipeline accelerator pilot'],
      storytellingThemes: ['The founding story of OmniFlow'],
      socialProofThemes: ['Customer revenue lift case studies'],
      engagementThemes: ['Sales operations benchmarking polls']
    },
    funnelStrategy: {
      stages: [
        {
          stage: 'AWARENESS',
          audienceState: 'Experiencing lead leakage',
          objective: 'Hook with workflow latency comparison',
          messageFocus: 'How much revenue leaks from your sales funnel every single day?',
          contentRole: 'Viral comparison clips',
          ctaBehavior: 'Learn more'
        },
        {
          stage: 'CONSIDERATION',
          audienceState: 'Evaluating revenue automation platforms',
          objective: 'Prove speed and data reliability',
          messageFocus: 'OmniFlow routes, enriches, and books qualified leads in under 60 seconds.',
          contentRole: 'Product screencasts',
          ctaBehavior: 'Explore workflow recipes'
        },
        {
          stage: 'CONVERSION',
          audienceState: 'Ready for enterprise pilot',
          objective: 'Book private executive demo',
          messageFocus: 'Claim your 30-Day VIP Pilot with white-glove migration.',
          contentRole: 'Direct invitation cards',
          ctaBehavior: 'Book Enterprise Demo'
        },
        {
          stage: 'RETENTION',
          audienceState: 'Active customer',
          objective: 'Expand seat footprint',
          messageFocus: 'Unlock multi-team routing intelligence.',
          contentRole: 'Feature announcement videos',
          ctaBehavior: 'Upgrade to Global Tier'
        }
      ]
    },
    channelStrategy: {
      recommendedChannels: ['LINKEDIN', 'YOUTUBE_SHORTS'],
      channelGuidance: [
        {
          channel: 'LinkedIn',
          role: 'Executive B2B decision-maker reach',
          contentApproach: 'Data benchmarks and customer win stories',
          formatGuidance: 'High-contrast video snippets and carousel slides',
          ctaStrategy: 'Pinned comment demo link'
        }
      ]
    },
    offerStrategy: {
      recommendedOffers: ['30-Day Enterprise VIP Pilot with dedicated engineer support'],
      urgencyMechanisms: ['Limited to 25 accounts this quarter'],
      riskReversals: ['Full data portability guarantee']
    },
    kpiStrategy: {
      primaryKPIs: ['Demo Bookings', 'Video Completion Rate'],
      secondaryKPIs: ['Website Click-Throughs'],
      awarenessKPIs: ['Impressions'],
      considerationKPIs: ['Page dwell time'],
      conversionKPIs: ['Pilot Applications']
    },
    risksAndGuardrails: {
      claimsToAvoid: ['Instant 10x revenue guarantee'],
      restrictedTopics: ['Competitor disparagement'],
      brandRestrictions: ['Do not claim to replace sales managers'],
      toneRestrictions: ['Never use aggressive pushy sales tactics'],
      complianceNotes: ['SOC-2 compliance badges required']
    },
    generatedBy: 'gemini',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleCampaign: Campaign = {
    id: 'camp-1',
    brandId: 'brand-api-1',
    workspaceId: 'ws-api-1',
    name: 'Q3 Enterprise Pipeline Surge',
    description: 'Targeted drive for enterprise CROs',
    status: 'DRAFT',
    objective: 'CUSTOMER_ACQUISITION',
    channels: ['LINKEDIN', 'YOUTUBE_SHORTS'],
    coreMessage: null,
    offer: null,
    primaryCta: 'Claim VIP Pilot',
    campaignStrategy: null,
    strategyVersion: 0,
    startDate: null,
    endDate: null,
    targetAudience: {},
    contentPillars: [],
    kpis: {},
    guardrails: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    brands = [sampleBrand];
    strategies = [sampleMarketingStrategy];
    campaigns = [{ ...sampleCampaign }];
    workspaceMembers = [
      { workspaceId: 'ws-api-1', userId: 'user-admin', role: 'ADMIN' },
      { workspaceId: 'ws-api-1', userId: 'user-viewer', role: 'VIEWER' },
      { workspaceId: 'ws-other', userId: 'user-other', role: 'OWNER' }
    ];

    // Mock AuthService validateSession
    vi.spyOn(AuthService.prototype, 'validateSession').mockImplementation(async (token: string) => {
      if (token === 'viewer-token') {
        return {
          user: { id: 'user-viewer', email: 'viewer@omniflow.ai', name: 'Viewer User', createdAt: new Date(), updatedAt: new Date() },
          session: {} as any
        };
      }
      if (token === 'other-token') {
        return {
          user: { id: 'user-other', email: 'other@foreign.com', name: 'Foreign User', createdAt: new Date(), updatedAt: new Date() },
          session: {} as any
        };
      }
      return {
        user: { id: 'user-admin', email: 'admin@omniflow.ai', name: 'Admin User', createdAt: new Date(), updatedAt: new Date() },
        session: {} as any
      };
    });

    // Mock BrandRepository
    vi.spyOn(BrandRepository.prototype, 'findById').mockImplementation(async (bId) => {
      return brands.find((b) => b.id === bId) || null;
    });

    vi.spyOn(BrandRepository.prototype, 'findByIdAndWorkspace').mockImplementation(async (bId, wsId) => {
      return brands.find((b) => b.id === bId && b.workspaceId === wsId) || null;
    });

    // Mock WorkspaceRepository getUserRole
    vi.spyOn(WorkspaceRepository.prototype, 'getUserRole').mockImplementation(async (wsId, uId) => {
      const mem = workspaceMembers.find((m) => m.workspaceId === wsId && m.userId === uId);
      return mem ? mem.role : null;
    });

    // Mock CampaignRepository
    vi.spyOn(CampaignRepository.prototype, 'findByIdAndBrand').mockImplementation(async (cId, bId) => {
      return campaigns.find((c) => c.id === cId && c.brandId === bId) || null;
    });

    // Mock MarketingBrainService methods
    vi.spyOn(MarketingBrainService.prototype, 'generateStrategy').mockImplementation(async (bId, _wsId, input) => {
      const rec: MarketingStrategy = {
        ...sampleMarketingStrategy,
        id: `strat-${Math.random().toString(36).substring(2, 7)}`,
        brandId: bId,
        version: strategies.length + 1,
        objective: input.objective as any,
        businessGoal: input.businessGoal,
        marketingGoal: input.marketingGoal
      };
      strategies.push(rec);
      return rec;
    });

    vi.spyOn(MarketingBrainService.prototype, 'getLatestStrategy').mockImplementation(async (bId) => {
      const list = strategies.filter((s) => s.brandId === bId).sort((a, b) => b.version - a.version);
      return list[0] || null;
    });

    vi.spyOn(MarketingBrainService.prototype, 'getStrategyHistory').mockImplementation(async (bId) => {
      return strategies.filter((s) => s.brandId === bId).sort((a, b) => b.version - a.version);
    });

    vi.spyOn(MarketingBrainService.prototype, 'updateStrategy').mockImplementation(async (bId, _wsId, updates) => {
      const latest = strategies.filter((s) => s.brandId === bId).sort((a, b) => b.version - a.version)[0];
      if (!latest) throw new Error('Not found');
      Object.assign(latest, updates, { updatedAt: new Date() });
      return latest;
    });

    // Mock CampaignService methods
    vi.spyOn(CampaignService.prototype, 'createCampaign').mockImplementation(async (bId, wsId, input) => {
      const camp: Campaign = {
        id: `camp-${Math.random().toString(36).substring(2, 7)}`,
        brandId: bId,
        workspaceId: wsId,
        name: input.name,
        description: input.description,
        status: input.status || 'DRAFT',
        objective: input.objective,
        channels: input.channels || [],
        coreMessage: input.coreMessage || null,
        offer: input.offer || null,
        primaryCta: input.primaryCta || null,
        campaignStrategy: null,
        strategyVersion: 0,
        startDate: null,
        endDate: null,
        targetAudience: {},
        contentPillars: [],
        kpis: {},
        guardrails: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      campaigns.push(camp);
      return camp;
    });

    vi.spyOn(CampaignService.prototype, 'listCampaigns').mockImplementation(async (bId) => {
      return campaigns.filter((c) => c.brandId === bId);
    });

    vi.spyOn(CampaignService.prototype, 'getCampaignById').mockImplementation(async (cId, bId) => {
      return campaigns.find((c) => c.id === cId && c.brandId === bId) || null;
    });

    vi.spyOn(CampaignService.prototype, 'updateCampaign').mockImplementation(async (cId, bId, _wsId, updates) => {
      const camp = campaigns.find((c) => c.id === cId && c.brandId === bId);
      if (!camp) return null;
      Object.assign(camp, updates, { updatedAt: new Date() });
      return camp;
    });

    vi.spyOn(CampaignService.prototype, 'generateCampaignStrategy').mockImplementation(async (cId, bId) => {
      const camp = campaigns.find((c) => c.id === cId && c.brandId === bId);
      if (!camp) throw new Error('Not found');
      camp.strategyVersion = (camp.strategyVersion || 0) + 1;
      camp.status = 'READY';
      camp.campaignStrategy = {
        objective: camp.objective,
        audience: { primary: 'CROs', painPoints: ['Lag'], desires: ['Speed'], motivations: ['Win'] },
        positioning: 'Leading RevOps',
        corePromise: 'Automate lead qualification and routing in under 60 seconds.',
        keyMessages: ['Stop losing pipeline'],
        messagingAngles: ['The hidden cost of slow response'],
        contentPillars: ['Pipeline Speed'],
        contentMix: [{ type: 'Demo', percentage: 100, purpose: 'Showcase', funnelStage: 'AWARENESS' }],
        funnel: {
          awareness: { message: 'Hook', formatGuidance: 'Video', cta: 'Watch' },
          consideration: { message: 'Deep dive', formatGuidance: 'Video', cta: 'Read' },
          conversion: { message: 'Offer', formatGuidance: 'Video', cta: 'Claim' }
        },
        offerStrategy: 'VIP Pilot',
        ctaStrategy: 'Claim Pilot',
        channelStrategy: [{ channel: 'LinkedIn', role: 'B2B', contentApproach: 'Video', formatGuidance: '9:16', ctaStrategy: 'Link' }],
        kpis: { primary: ['Conversions'], targets: ['50'] },
        guardrails: { claimsToAvoid: ['None'], restrictions: ['Tone'] }
      };
      return camp;
    });

    app = express();
    app.use(express.json());
    app.use('/api/brands/:brandId', marketingRouter);
    app.use(errorHandler);

    // Start HTTP server on dynamic port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  const authHeader = {
    Authorization: 'Bearer admin-token'
  };

  // =======================================================
  // 1. MARKETING STRATEGY ENDPOINTS
  // =======================================================
  describe('Marketing Strategy Routes', () => {
    it('POST /marketing/strategy/generate creates Marketing Strategy', async () => {
      const res = await fetch(`${baseUrl}/api/brands/brand-api-1/marketing/strategy/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          objective: 'CUSTOMER_ACQUISITION',
          businessGoal: 'Accelerate qualified pipeline',
          marketingGoal: 'Generate 100 enterprise demo requests'
        })
      });

      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.version).toBe(2);
      expect(body.data.positioning.valuePropositionStatement).toBe(
        'Eliminate 90% of manual sales admin with autonomous workflows.'
      );
    });

    it('GET /marketing/strategy retrieves the active strategy', async () => {
      const res = await fetch(`${baseUrl}/api/brands/brand-api-1/marketing/strategy`, {
        headers: authHeader
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.version).toBe(1);
    });

    it('PATCH /marketing/strategy updates strategy fields', async () => {
      const res = await fetch(`${baseUrl}/api/brands/brand-api-1/marketing/strategy`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          positioning: {
            marketCategory: 'Autonomous Revenue Operations',
            competitiveMoat: 'Deep bidirectional CRM synchronization',
            valuePropositionStatement: 'Custom Human-Edited Value Proposition Statement',
            differentiators: ['Instant lead routing']
          }
        })
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.positioning.valuePropositionStatement).toBe(
        'Custom Human-Edited Value Proposition Statement'
      );
    });

    it('Enforces RBAC: VIEWER cannot generate strategy (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/brands/brand-api-1/marketing/strategy/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer viewer-token'
        },
        body: JSON.stringify({
          objective: 'CUSTOMER_ACQUISITION',
          businessGoal: 'Accelerate qualified pipeline',
          marketingGoal: 'Generate 100 enterprise demo requests'
        })
      });

      const body = await res.json();
      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
    });
  });

  // =======================================================
  // 2. CAMPAIGN ENDPOINTS
  // =======================================================
  describe('Campaign CRUD & Strategy Routes', () => {
    it('POST /campaigns creates a new campaign and GET /campaigns lists it', async () => {
      const createRes = await fetch(`${baseUrl}/api/brands/brand-api-1/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          name: 'Q3 Enterprise Pipeline Surge 2',
          description: 'Targeted drive for enterprise CROs',
          objective: 'CUSTOMER_ACQUISITION',
          channels: ['LINKEDIN', 'YOUTUBE_SHORTS'],
          primaryCta: 'Claim VIP Pilot'
        })
      });

      const createBody = await createRes.json();
      expect(createRes.status).toBe(201);
      expect(createBody.success).toBe(true);
      expect(createBody.data.name).toBe('Q3 Enterprise Pipeline Surge 2');
      expect(createBody.data.status).toBe('DRAFT');

      const campaignId = createBody.data.id;

      // List campaigns
      const listRes = await fetch(`${baseUrl}/api/brands/brand-api-1/campaigns`, {
        headers: authHeader
      });
      const listBody = await listRes.json();

      expect(listRes.status).toBe(200);
      expect(listBody.success).toBe(true);
      expect(listBody.data.length).toBeGreaterThanOrEqual(2);
      expect(listBody.data.some((c: any) => c.id === campaignId)).toBe(true);
    });

    it('POST /campaigns/:campaignId/generate-strategy synthesizes campaign strategy', async () => {
      const stratRes = await fetch(
        `${baseUrl}/api/brands/brand-api-1/campaigns/camp-1/generate-strategy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader
          },
          body: JSON.stringify({
            campaignGoal: 'Book 50 qualified enterprise CRO calls'
          })
        }
      );

      const stratBody = await stratRes.json();
      expect(stratRes.status).toBe(200);
      expect(stratBody.success).toBe(true);
      expect(stratBody.data.strategyVersion).toBe(1);
      expect(stratBody.data.status).toBe('READY');
      expect(stratBody.data.campaignStrategy.corePromise).toBe(
        'Automate lead qualification and routing in under 60 seconds.'
      );
    });

    it('PATCH /campaigns/:campaignId updates campaign settings', async () => {
      const updateRes = await fetch(`${baseUrl}/api/brands/brand-api-1/campaigns/camp-1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          name: 'Updated Enterprise Surge Name',
          status: 'ACTIVE'
        })
      });

      const updateBody = await updateRes.json();
      expect(updateRes.status).toBe(200);
      expect(updateBody.success).toBe(true);
      expect(updateBody.data.name).toBe('Updated Enterprise Surge Name');
      expect(updateBody.data.status).toBe('ACTIVE');
    });

    it('Enforces multi-tenant workspace isolation across campaigns', async () => {
      // Foreign workspace user tries to access campaign in ws-api-1
      const foreignRes = await fetch(`${baseUrl}/api/brands/brand-api-1/campaigns/camp-1`, {
        headers: {
          Authorization: 'Bearer other-token'
        }
      });

      expect(foreignRes.status).toBe(403);
    });
  });
});
