import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { contentPlanRouter } from '../src/routes/content-plan.routes.js';
import { ContentPlannerService, ContentPlanRepository, ContentJobRepository } from '@vidsnapai/content';
import { BrandRepository } from '@vidsnapai/brand';
import { WorkspaceRepository } from '@vidsnapai/database';
import { AuthService } from '../src/services/auth.service.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import type { ContentPlan, ContentJob, ContentPlanOutput, ContentJobOutput } from '@vidsnapai/types';

describe('Phase 4: Content Planner API Routes', () => {
  let app: express.Application;
  let server: Server;
  let baseUrl: string;

  // In-memory data store for route testing
  let brands: any[] = [];
  let plans: ContentPlan[] = [];
  let jobs: ContentJob[] = [];
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

  const generateMock30DayOutput = (): ContentPlanOutput => {
    const outputJobs: ContentJobOutput[] = [];
    const funnelStages: Array<'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION'> = [
      'AWARENESS',
      'CONSIDERATION',
      'CONVERSION',
      'RETENTION'
    ];

    for (let day = 1; day <= 30; day++) {
      outputJobs.push({
        dayNumber: day,
        weekNumber: Math.ceil(day / 7),
        title: `Day ${day}: Workflow Optimization Directive`,
        contentType: 'EDUCATIONAL',
        funnelStage: funnelStages[(day - 1) % funnelStages.length],
        contentPillar: 'RevOps Optimization',
        objective: 'Educate revenue teams on lead velocity',
        audience: 'Enterprise CROs',
        topic: `Lead routing topic ${day}`,
        hook: `How top teams eliminate manual CRM data entry forever (Day ${day})`,
        keyMessage: `OmniFlow coordinates pipeline routing in under 60 seconds.`,
        messagingAngle: `Focus on pipeline velocity and revenue protection`,
        offer: null,
        cta: 'Book an enterprise workflow demo',
        platform: 'INSTAGRAM',
        format: 'SHORT_REEL',
        priority: 'MEDIUM',
        suggestedVisualHook: 'Fast dashboard workflow animation',
        suggestedAudioConcept: 'Confident corporate tech beat',
        keyTakeaway: 'Automated RevOps saves 15 hours per rep weekly.',
        strategicRationale: 'High-intent B2B conversion trigger.'
      });
    }

    return {
      planName: 'OmniFlow AI 30-Day Growth Content Plan',
      objective: 'Generate 100 enterprise demo requests',
      durationDays: 30,
      campaignTheme: 'The Autonomous Revenue Engine',
      executiveSummary: '30 days of structured B2B social content driving pipeline velocity awareness.',
      weeklyNarratives: [
        {
          weekNumber: 1,
          theme: 'The Cost of Slow Pipeline',
          focusObjective: 'Expose Lead Leakage',
          funnelFocus: 'AWARENESS',
          strategicPurpose: 'Highlight response time benchmarks.'
        }
      ],
      diversificationSummary: {
        funnelDistribution: { AWARENESS: 10, CONSIDERATION: 10, CONVERSION: 6, RETENTION: 4 },
        contentTypeDistribution: { EDUCATIONAL: 15, PROBLEM_AGITATION: 10, SOCIAL_PROOF: 5 },
        formatDistribution: { SHORT_REEL: 20, TALKING_HEAD_REEL: 10 },
        pillarDistribution: { 'RevOps Optimization': 30 }
      },
      jobs: outputJobs
    };
  };

  beforeEach(async () => {
    brands = [{ ...sampleBrand }];
    plans = [];
    jobs = [];
    workspaceMembers = [
      { workspaceId: 'ws-api-1', userId: 'user-admin-1', role: 'ADMIN' },
      { workspaceId: 'ws-api-1', userId: 'user-member-1', role: 'MEMBER' }
    ];

    // Mock Repositories & Services
    vi.spyOn(WorkspaceRepository.prototype, 'getUserRole').mockImplementation(async (wsId: string, uId: string) => {
      const member = workspaceMembers.find((m) => m.workspaceId === wsId && m.userId === uId);
      return member ? member.role : null;
    });

    vi.spyOn(BrandRepository.prototype, 'findById').mockImplementation(async (bId: string) => {
      return brands.find((b) => b.id === bId) || null;
    });

    vi.spyOn(BrandRepository.prototype, 'findByIdAndWorkspace').mockImplementation(async (bId: string, wsId: string) => {
      return brands.find((b) => b.id === bId && b.workspaceId === wsId) || null;
    });

    vi.spyOn(ContentPlanRepository.prototype, 'create').mockImplementation(async (bId: string, wsId: string, input: any) => {
      const id = `plan-${plans.length + 1}`;
      const planGroupId = input.planGroupId || `group-${id}`;
      const newPlan: ContentPlan = {
        id,
        brandId: bId,
        workspaceId: wsId,
        campaignId: input.campaignId || null,
        name: input.name,
        objective: input.objective,
        startDate: input.startDate || new Date(),
        endDate: input.endDate || new Date(Date.now() + 30 * 86400000),
        durationDays: input.durationDays || 30,
        status: input.status || 'READY',
        version: input.version || 1,
        planGroupId,
        strategySnapshot: input.strategySnapshot || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      plans.push(newPlan);
      return newPlan;
    });

    vi.spyOn(ContentPlanRepository.prototype, 'findByIdAndBrand').mockImplementation(async (pId: string, bId: string) => {
      return plans.find((p) => p.id === pId && p.brandId === bId) || null;
    });

    vi.spyOn(ContentPlanRepository.prototype, 'listForBrand').mockImplementation(async (bId: string) => {
      return plans.filter((p) => p.brandId === bId);
    });

    vi.spyOn(ContentPlanRepository.prototype, 'findVersions').mockImplementation(async (groupId: string, bId: string) => {
      return plans.filter((p) => p.planGroupId === groupId && p.brandId === bId);
    });

    vi.spyOn(ContentPlanRepository.prototype, 'getLatestVersion').mockImplementation(async (groupId: string, bId: string) => {
      const matched = plans.filter((p) => p.planGroupId === groupId && p.brandId === bId);
      return matched.length > 0 ? Math.max(...matched.map((p) => p.version)) : 0;
    });

    vi.spyOn(ContentPlanRepository.prototype, 'update').mockImplementation(async (pId: string, bId: string, input: any) => {
      const idx = plans.findIndex((p) => p.id === pId && p.brandId === bId);
      if (idx === -1) return null;
      plans[idx] = { ...plans[idx], ...input, updatedAt: new Date() };
      return plans[idx];
    });

    vi.spyOn(ContentPlanRepository.prototype, 'delete').mockImplementation(async (pId: string, bId: string) => {
      const initial = plans.length;
      plans = plans.filter((p) => !(p.id === pId && p.brandId === bId));
      jobs = jobs.filter((j) => j.contentPlanId !== pId);
      return plans.length < initial;
    });

    vi.spyOn(ContentJobRepository.prototype, 'createMany').mockImplementation(async (planId: string, bId: string, wsId: string, inputs: any[]) => {
      const createdJobs: ContentJob[] = inputs.map((inp, idx) => ({
        id: `job-${planId}-${idx + 1}`,
        contentPlanId: planId,
        brandId: bId,
        campaignId: inp.campaignId || null,
        workspaceId: wsId,
        dayNumber: inp.dayNumber,
        scheduledDate: inp.scheduledDate || new Date(),
        title: inp.title,
        contentType: inp.contentType,
        funnelStage: inp.funnelStage,
        contentPillar: inp.contentPillar,
        objective: inp.objective,
        audience: inp.audience,
        topic: inp.topic,
        hook: inp.hook,
        keyMessage: inp.keyMessage,
        messagingAngle: inp.messagingAngle,
        offer: inp.offer || null,
        cta: inp.cta,
        platform: inp.platform,
        format: inp.format,
        priority: inp.priority || 'MEDIUM',
        status: inp.status || 'PLANNED',
        strategy: inp.strategy || {},
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      jobs.push(...createdJobs);
      return createdJobs;
    });

    vi.spyOn(ContentJobRepository.prototype, 'findByIdAndPlan').mockImplementation(async (jId: string, pId: string) => {
      return jobs.find((j) => j.id === jId && j.contentPlanId === pId) || null;
    });

    vi.spyOn(ContentJobRepository.prototype, 'listForPlan').mockImplementation(async (pId: string, filter?: any) => {
      return jobs.filter((j) => {
        if (j.contentPlanId !== pId) return false;
        if (filter?.status && j.status !== filter.status) return false;
        return true;
      });
    });

    vi.spyOn(ContentJobRepository.prototype, 'update').mockImplementation(async (jId: string, pId: string, input: any) => {
      const idx = jobs.findIndex((j) => j.id === jId && j.contentPlanId === pId);
      if (idx === -1) return null;
      jobs[idx] = { ...jobs[idx], ...input, updatedAt: new Date() };
      return jobs[idx];
    });

    vi.spyOn(ContentJobRepository.prototype, 'updateStatus').mockImplementation(async (jId: string, pId: string, status: any) => {
      const idx = jobs.findIndex((j) => j.id === jId && j.contentPlanId === pId);
      if (idx === -1) return null;
      jobs[idx] = { ...jobs[idx], status, updatedAt: new Date() };
      return jobs[idx];
    });

    vi.spyOn(ContentJobRepository.prototype, 'delete').mockImplementation(async (jId: string, pId: string) => {
      const initial = jobs.length;
      jobs = jobs.filter((j) => !(j.id === jId && j.contentPlanId === pId));
      return jobs.length < initial;
    });

    vi.spyOn(ContentPlannerService.prototype, 'generateContentPlan').mockImplementation(async (bId: string, wsId: string, input: any) => {
      const mockOutput = generateMock30DayOutput();
      const planRepo = new ContentPlanRepository({} as any);
      const jobRepo = new ContentJobRepository({} as any);

      let version = 1;
      if (input.regenerate && input.planGroupId) {
        version = (await planRepo.getLatestVersion(input.planGroupId, bId)) + 1;
      }

      const createdPlan = await planRepo.create(bId, wsId, {
        name: input.name || mockOutput.planName,
        objective: input.objective || mockOutput.objective,
        durationDays: input.durationDays || 30,
        version,
        planGroupId: input.planGroupId,
        status: 'READY',
        strategySnapshot: {
          campaignTheme: mockOutput.campaignTheme,
          executiveSummary: mockOutput.executiveSummary,
          weeklyNarratives: mockOutput.weeklyNarratives
        }
      });

      const createdJobs = await jobRepo.createMany(createdPlan.id, bId, wsId, mockOutput.jobs);
      return {
        ...createdPlan,
        jobs: createdJobs
      };
    });

    // Mock Authentication
    vi.spyOn(AuthService.prototype, 'validateSession').mockImplementation(async (token: string) => {
      if (token === 'admin-token') {
        return {
          user: { id: 'user-admin-1', name: 'Admin User', email: 'admin@omniflow.ai', createdAt: new Date() },
          session: { id: 'sess-1', userId: 'user-admin-1', expiresAt: new Date(Date.now() + 3600000) }
        };
      }
      if (token === 'member-token') {
        return {
          user: { id: 'user-member-1', name: 'Member User', email: 'member@omniflow.ai', createdAt: new Date() },
          session: { id: 'sess-2', userId: 'user-member-1', expiresAt: new Date(Date.now() + 3600000) }
        };
      }
      return null;
    });

    // Setup Test Express Server
    app = express();
    app.use(express.json());
    app.use('/api/brands/:brandId', contentPlanRouter);
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('Security & Access Control', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/brands/brand-api-1/content-plans`);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('denies non-member access to brand content plans', async () => {
      const res = await fetch(`${baseUrl}/api/brands/brand-api-1/content-plans`, {
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Plan Generation & Management Endpoints', () => {
    it('POST /content-plans/generate creates full 30-day plan with 30 jobs', async () => {
      const res = await fetch(`${baseUrl}/api/brands/brand-api-1/content-plans/generate`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: 'OmniFlow Q4 Launch Sprint',
          durationDays: 30
        })
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('plan-1');
      expect(json.data.version).toBe(1);
      expect(json.data.jobs).toHaveLength(30);
    });

    it('GET /content-plans lists plans for brand', async () => {
      // Create plan first
      await fetch(`${baseUrl}/api/brands/brand-api-1/content-plans/generate`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ durationDays: 30 })
      });

      const res = await fetch(`${baseUrl}/api/brands/brand-api-1/content-plans`, {
        headers: {
          authorization: 'Bearer member-token'
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe('plan-1');
    });

    it('GET /content-plans/:planId retrieves plan with full jobs schedule', async () => {
      // Create plan
      const genRes = await fetch(`${baseUrl}/api/brands/brand-api-1/content-plans/generate`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ durationDays: 30 })
      });
      const genJson = await genRes.json();
      const planId = genJson.data.id;

      const res = await fetch(`${baseUrl}/api/brands/brand-api-1/content-plans/${planId}`, {
        headers: {
          authorization: 'Bearer member-token'
        }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.jobs).toHaveLength(30);
    });

    it('POST /content-plans/:planId/regenerate creates version v2', async () => {
      // Create plan v1
      const genRes = await fetch(`${baseUrl}/api/brands/brand-api-1/content-plans/generate`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ durationDays: 30 })
      });
      const genJson = await genRes.json();
      const planId = genJson.data.id;

      const regenRes = await fetch(`${baseUrl}/api/brands/brand-api-1/content-plans/${planId}/regenerate`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          preserveApprovedJobs: true,
          customGuidance: 'Focus on enterprise ROI.'
        })
      });

      expect(regenRes.status).toBe(201);
      const regenJson = await regenRes.json();
      expect(regenJson.data.version).toBe(2);
      expect(plans).toHaveLength(2);
    });
  });

  describe('Job Inspection & Editing Endpoints', () => {
    it('PATCH /content-plans/:planId/jobs/:jobId updates job fields', async () => {
      // Create plan
      const genRes = await fetch(`${baseUrl}/api/brands/brand-api-1/content-plans/generate`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ durationDays: 30 })
      });
      const genJson = await genRes.json();
      const planId = genJson.data.id;
      const firstJobId = genJson.data.jobs[0].id;

      const patchRes = await fetch(`${baseUrl}/api/brands/brand-api-1/content-plans/${planId}/jobs/${firstJobId}`, {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Customized Day 1 Title',
          hook: 'The definitive truth about pipeline speed.'
        })
      });

      expect(patchRes.status).toBe(200);
      const patchJson = await patchRes.json();
      expect(patchJson.data.title).toBe('Customized Day 1 Title');
      expect(patchJson.data.hook).toBe('The definitive truth about pipeline speed.');
    });

    it('PATCH /content-plans/:planId/jobs/:jobId/status updates approval status', async () => {
      const genRes = await fetch(`${baseUrl}/api/brands/brand-api-1/content-plans/generate`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ durationDays: 30 })
      });
      const genJson = await genRes.json();
      const planId = genJson.data.id;
      const firstJobId = genJson.data.jobs[0].id;

      const statusRes = await fetch(`${baseUrl}/api/brands/brand-api-1/content-plans/${planId}/jobs/${firstJobId}/status`, {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ status: 'READY' })
      });

      expect(statusRes.status).toBe(200);
      const statusJson = await statusRes.json();
      expect(statusJson.data.status).toBe('READY');
    });
  });
});
