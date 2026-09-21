import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { reelRouter, contentJobReelRouter, contentPlanReelRouter, standaloneReelRouter } from '../src/routes/reel.routes.js';
import { ReelPlannerService, ReelProductionPlanRepository } from '@vidsnapai/video';
import { ContentJobRepository, ContentPlanRepository } from '@vidsnapai/content';
import { BrandRepository } from '@vidsnapai/brand';
import { WorkspaceRepository } from '@vidsnapai/database';
import { AuthService } from '../src/services/auth.service.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import type { ReelProductionPlan, ContentJob, ContentPlan, Brand } from '@vidsnapai/types';

describe('Phase 5: Reel Orchestrator API Routes', () => {
  let app: express.Application;
  let server: Server;
  let baseUrl: string;

  let brands: Brand[] = [];
  let plans: ContentPlan[] = [];
  let jobs: ContentJob[] = [];
  let reels: ReelProductionPlan[] = [];
  let workspaceMembers: any[] = [];

  const sampleBrand: Brand = {
    id: 'brand-reel-1',
    workspaceId: 'ws-reel-1',
    name: 'OmniFlow AI',
    slug: 'omniflow-ai',
    description: 'Enterprise workflow automation',
    industry: 'Enterprise SaaS',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const samplePlan: ContentPlan = {
    id: 'plan-reel-1',
    brandId: sampleBrand.id,
    workspaceId: sampleBrand.workspaceId,
    name: '30-Day Pipeline Velocity Plan',
    objective: 'Accelerate qualified pipeline',
    startDate: new Date(),
    endDate: new Date(),
    durationDays: 30,
    status: 'ACTIVE',
    version: 1,
    planGroupId: 'group-reel-1',
    strategySnapshot: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleJob: ContentJob = {
    id: 'job-reel-1',
    contentPlanId: samplePlan.id,
    brandId: sampleBrand.id,
    workspaceId: sampleBrand.workspaceId,
    dayNumber: 1,
    scheduledDate: new Date(),
    title: 'How to Eliminate CRM Friction',
    contentType: 'EDUCATIONAL',
    funnelStage: 'AWARENESS',
    contentPillar: 'RevOps Optimization',
    objective: 'Educate on lead loss',
    audience: 'CROs and VP Sales',
    topic: 'Automated CRM Routing',
    hook: 'Still manually assigning leads in 2026?',
    keyMessage: 'OmniFlow cuts routing time from 4 hours to 30 seconds.',
    messagingAngle: 'Lead velocity directly impacts quota attainment',
    offer: null,
    cta: 'Book a workflow demo',
    platform: 'INSTAGRAM',
    format: 'REEL',
    priority: 'HIGH',
    status: 'READY',
    strategy: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const createSampleReelPlan = (version = 1, status: any = 'READY'): ReelProductionPlan => ({
    id: `reel-plan-${version}`,
    contentJobId: sampleJob.id,
    brandId: sampleBrand.id,
    campaignId: null,
    contentPlanId: samplePlan.id,
    workspaceId: sampleBrand.workspaceId,
    version,
    title: `CRM Friction Breakdown v${version}`,
    concept: {
      title: 'CRM Friction Breakdown',
      concept: 'Highlighting pipeline leakage',
      objective: 'Drive demo bookings',
      targetAudience: 'CROs',
      corePromise: 'Instant lead routing',
      emotionalAngle: 'From frustrating delays to seamless execution',
      messagingAngle: 'Speed to lead',
      contentPillar: 'RevOps Optimization',
      funnelStage: 'AWARENESS'
    },
    objective: 'Drive demo bookings',
    audience: 'CROs',
    funnelStage: 'AWARENESS',
    contentPillar: 'RevOps Optimization',
    durationSeconds: 30,
    aspectRatio: '9:16',
    platform: 'INSTAGRAM',
    format: 'REEL',
    hook: {
      type: 'QUESTION',
      text: 'Still manually assigning leads in 2026?',
      visualIntent: 'Frustrated sales rep staring at spreadsheet',
      deliveryStyle: 'Conversational disbelief',
      durationSeconds: 3
    },
    narrative: 'A journey from slow routing to autonomous instant handoff.',
    script: [
      {
        id: 'seg-1',
        purpose: 'Hook',
        text: 'Still manually assigning leads in 2026?',
        estimatedDuration: 3,
        deliveryStyle: 'Engaging',
        emotionalTone: 'Direct'
      }
    ],
    scenes: [
      {
        sceneNumber: 1,
        durationSeconds: 4,
        purpose: 'Hook',
        narration: 'Still manually assigning leads in 2026?',
        onScreenText: 'MANUAL ROUTING IS DEAD',
        visualType: 'PROBLEM',
        subject: 'Sales rep staring at endless rows',
        environment: 'Modern tech office',
        composition: 'Close-up',
        camera: 'Push in',
        lighting: 'Laptop glow',
        mood: 'Stressed',
        transition: 'Whip pan',
        animationIntent: 'Bold kinetic pop text',
        assetRequirement: 'Sales rep looking frustrated at laptop'
      },
      {
        sceneNumber: 2,
        durationSeconds: 26,
        purpose: 'Solution',
        narration: 'OmniFlow automatically routes inbound leads in 30 seconds.',
        onScreenText: 'INSTANT ROUTING',
        visualType: 'SOLUTION',
        subject: 'Sleek animated workflow diagram',
        environment: 'Dark glassmorphic studio',
        composition: 'Medium shot',
        camera: 'Smooth glide',
        lighting: 'Indigo edge highlights',
        mood: 'Effortless',
        transition: 'Smooth cut',
        animationIntent: 'Pulsing node animation',
        assetRequirement: 'Animated software nodes connecting seamlessly'
      }
    ],
    visualDirection: {
      style: 'Sleek enterprise dark mode',
      mood: 'Professional',
      colorIntent: 'Indigo purple',
      lightingIntent: 'Clean studio',
      composition: 'Vertical 9:16',
      cameraLanguage: 'Fluid motion',
      pacing: 'Dynamic',
      visualHierarchy: 'Centered',
      brandIntegration: 'Endcard logo',
      productEmphasis: 'Workflow interface'
    },
    voiceDirection: {
      style: 'Confident',
      pace: 'Fast-paced',
      tone: 'Authoritative',
      genderPreference: 'Neutral',
      language: 'en-US',
      accents: 'American'
    },
    captionDirection: {
      style: 'Bold kinetic',
      placement: 'Bottom center',
      density: '1-3 words',
      fontEmphasis: 'Bold',
      animation: 'Pop'
    },
    animationDirection: {
      energy: 'High',
      style: 'Kinetic typography',
      textAnimation: 'Highlight',
      visualTransitions: 'Cuts',
      elementMotion: 'Glow'
    },
    audioDirection: {
      musicMood: 'Tech electronic',
      soundEffects: 'Subtle whooshes',
      pacing: '120 BPM',
      mixBalance: 'Voice 100%, Music 25%'
    },
    cta: {
      type: 'LEARN_MORE',
      text: 'Book a demo today',
      visualTreatment: 'High contrast pill button',
      placement: 'Endcard',
      url: null
    },
    productionMetadata: {
      totalScenes: 2,
      estimatedWordCount: 20,
      targetDurationSeconds: 30,
      calculatedDurationSeconds: 30,
      generatedBy: 'VidSnapAI Reel Orchestrator v5.0',
      contentJobId: sampleJob.id,
      generatedAt: new Date().toISOString()
    },
    status,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  beforeEach(async () => {
    brands = [sampleBrand];
    plans = [samplePlan];
    jobs = [sampleJob];
    reels = [createSampleReelPlan(1)];
    workspaceMembers = [
      { workspaceId: 'ws-reel-1', userId: 'user-admin-1', role: 'ADMIN' },
      { workspaceId: 'ws-reel-1', userId: 'user-member-1', role: 'MEMBER' },
      { workspaceId: 'ws-foreign-1', userId: 'user-foreign-1', role: 'ADMIN' }
    ];

    vi.spyOn(AuthService.prototype, 'validateSession').mockImplementation(async (token: string) => {
      if (token === 'admin-token') {
        return { user: { id: 'user-admin-1', email: 'admin@omniflow.com', name: 'Admin User', createdAt: new Date(), updatedAt: new Date() }, session: {} as any };
      }
      if (token === 'member-token') {
        return { user: { id: 'user-member-1', email: 'member@omniflow.com', name: 'Member User', createdAt: new Date(), updatedAt: new Date() }, session: {} as any };
      }
      if (token === 'foreign-token') {
        return { user: { id: 'user-foreign-1', email: 'foreign@other.com', name: 'Foreign User', createdAt: new Date(), updatedAt: new Date() }, session: {} as any };
      }
      return null;
    });

    vi.spyOn(WorkspaceRepository.prototype, 'getUserRole').mockImplementation(async (workspaceId, userId) => {
      const found = workspaceMembers.find((m) => m.workspaceId === workspaceId && m.userId === userId);
      return found ? found.role : null;
    });

    vi.spyOn(BrandRepository.prototype, 'findById').mockImplementation(async (id) => {
      return brands.find((b) => b.id === id) || null;
    });

    vi.spyOn(BrandRepository.prototype, 'findByIdAndWorkspace').mockImplementation(async (id, wsId) => {
      return brands.find((b) => b.id === id && b.workspaceId === wsId) || null;
    });

    vi.spyOn(ContentPlanRepository.prototype, 'findById').mockImplementation(async (id) => {
      return plans.find((p) => p.id === id) || null;
    });

    vi.spyOn(ContentPlanRepository.prototype, 'findByIdAndWorkspace').mockImplementation(async (id, wsId) => {
      return plans.find((p) => p.id === id && p.workspaceId === wsId) || null;
    });

    vi.spyOn(ContentJobRepository.prototype, 'findById').mockImplementation(async (id) => {
      return jobs.find((j) => j.id === id) || null;
    });

    vi.spyOn(ContentJobRepository.prototype, 'listForPlan').mockImplementation(async (planId) => {
      return jobs.filter((j) => j.contentPlanId === planId);
    });

    vi.spyOn(ReelProductionPlanRepository.prototype, 'findLatestByContentJobId').mockImplementation(async (jobId) => {
      const match = reels.filter((r) => r.contentJobId === jobId);
      return match.length > 0 ? match[match.length - 1] : null;
    });

    vi.spyOn(ReelProductionPlanRepository.prototype, 'listByContentJobId').mockImplementation(async (jobId) => {
      return reels.filter((r) => r.contentJobId === jobId);
    });

    vi.spyOn(ReelProductionPlanRepository.prototype, 'listByContentPlanId').mockImplementation(async (planId) => {
      return reels.filter((r) => r.contentPlanId === planId);
    });

    vi.spyOn(ReelProductionPlanRepository.prototype, 'listByBrandId').mockImplementation(async (brandId) => {
      return reels.filter((r) => r.brandId === brandId);
    });

    vi.spyOn(ReelProductionPlanRepository.prototype, 'findById').mockImplementation(async (id) => {
      return reels.find((r) => r.id === id) || null;
    });

    vi.spyOn(ReelProductionPlanRepository.prototype, 'findByIdAndWorkspace').mockImplementation(async (id, wsId) => {
      return reels.find((r) => r.id === id && r.workspaceId === wsId) || null;
    });

    vi.spyOn(ReelPlannerService.prototype, 'generateReelForJob').mockImplementation(async (jobId, _wsId) => {
      const existing = reels.find((r) => r.contentJobId === jobId);
      if (existing) return existing;
      const created = createSampleReelPlan(1);
      reels.push(created);
      return created;
    });

    vi.spyOn(ReelPlannerService.prototype, 'regenerateReelForJob').mockImplementation(async (jobId, _wsId) => {
      const newVersion = reels.filter((r) => r.contentJobId === jobId).length + 1;
      const created = createSampleReelPlan(newVersion);
      reels.push(created);
      return created;
    });

    vi.spyOn(ReelPlannerService.prototype, 'updateReelPlan').mockImplementation(async (id, wsId, input) => {
      const target = reels.find((r) => r.id === id);
      if (!target) throw new Error('Not found');
      if (input.title) target.title = input.title;
      return target;
    });

    vi.spyOn(ReelPlannerService.prototype, 'updateStatus').mockImplementation(async (id, wsId, status) => {
      const target = reels.find((r) => r.id === id);
      if (!target) throw new Error('Not found');
      target.status = status;
      return target;
    });

    vi.spyOn(ReelPlannerService.prototype, 'batchGenerateReelsForPlan').mockImplementation(async (planId) => {
      return {
        planId,
        enqueuedJobs: 1,
        eligibleJobIds: [sampleJob.id],
        skippedJobIds: []
      };
    });

    app = express();
    app.use(express.json());
    app.use('/api/brands/:brandId', reelRouter);
    app.use('/api/content-jobs', contentJobReelRouter);
    app.use('/api/content-plans', contentPlanReelRouter);
    app.use('/api/reels', standaloneReelRouter);
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address !== null) {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('Security & Multi-Tenant Isolation', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await fetch(`${baseUrl}/api/content-jobs/${sampleJob.id}/reel`);
      expect(res.status).toBe(401);
    });

    it('denies access to foreign workspace users with 403', async () => {
      const res = await fetch(`${baseUrl}/api/content-jobs/${sampleJob.id}/reel`, {
        headers: { Authorization: 'Bearer foreign-token' }
      });
      expect(res.status).toBe(403);
    });
  });

  describe('Reel Generation & CRUD Endpoints', () => {
    it('GET /api/content-jobs/:jobId/reel returns latest active blueprint', async () => {
      const res = await fetch(`${baseUrl}/api/content-jobs/${sampleJob.id}/reel`, {
        headers: { Authorization: 'Bearer member-token' }
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toContain('CRM Friction Breakdown');
      expect(json.data.scenes).toHaveLength(2);
    });

    it('POST /api/content-jobs/:jobId/reel/regenerate safely creates version 2', async () => {
      const res = await fetch(`${baseUrl}/api/content-jobs/${sampleJob.id}/reel/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token'
        },
        body: JSON.stringify({ regenerateReason: 'Sharpen opening hook' })
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.version).toBe(2);
    });

    it('GET /api/content-jobs/:jobId/reel/history returns all version history', async () => {
      // First regenerate to have v1 and v2
      await fetch(`${baseUrl}/api/content-jobs/${sampleJob.id}/reel/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token'
        },
        body: JSON.stringify({})
      });

      const res = await fetch(`${baseUrl}/api/content-jobs/${sampleJob.id}/reel/history`, {
        headers: { Authorization: 'Bearer admin-token' }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBeGreaterThanOrEqual(2);
    });

    it('PATCH /api/content-jobs/:jobId/reel updates blueprint title', async () => {
      const res = await fetch(`${baseUrl}/api/content-jobs/${sampleJob.id}/reel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token'
        },
        body: JSON.stringify({ title: 'Manually Updated Blueprint Title' })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.title).toBe('Manually Updated Blueprint Title');
    });

    it('PATCH /api/content-jobs/:jobId/reel/status updates status to APPROVED', async () => {
      const res = await fetch(`${baseUrl}/api/content-jobs/${sampleJob.id}/reel/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token'
        },
        body: JSON.stringify({ status: 'APPROVED' })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('APPROVED');
    });

    it('POST /api/content-plans/:planId/reels/generate triggers batch orchestration', async () => {
      const res = await fetch(`${baseUrl}/api/content-plans/${samplePlan.id}/reels/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token'
        },
        body: JSON.stringify({})
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.enqueuedJobs).toBe(1);
    });

    it('GET /api/content-plans/:planId/reels lists all reel plans in content plan', async () => {
      const res = await fetch(`${baseUrl}/api/content-plans/${samplePlan.id}/reels`, {
        headers: { Authorization: 'Bearer member-token' }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/content-plans/:planId/reels/generate-batch triggers batch orchestration alias', async () => {
      const res = await fetch(`${baseUrl}/api/content-plans/${samplePlan.id}/reels/generate-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token'
        },
        body: JSON.stringify({})
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.enqueuedJobs).toBe(1);
    });

    it('GET /api/content-jobs/:jobId/reel/versions returns version history alias', async () => {
      const res = await fetch(`${baseUrl}/api/content-jobs/${sampleJob.id}/reel/versions`, {
        headers: { Authorization: 'Bearer admin-token' }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/reels/:id fetches standalone reel blueprint', async () => {
      const res = await fetch(`${baseUrl}/api/reels/reel-plan-1`, {
        headers: { Authorization: 'Bearer member-token' }
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe('reel-plan-1');
      expect(json.data.contentJobId).toBe(sampleJob.id);
    });
  });
});
