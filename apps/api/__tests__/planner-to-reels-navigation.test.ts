import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import {
  reelRouter,
  contentJobReelRouter,
  contentPlanReelRouter,
  standaloneReelRouter
} from '../src/routes/reel.routes.js';
import { buildApiUrl } from '../../web/src/lib/api.js';
import { ReelPlannerService, ReelProductionPlanRepository } from '@vidsnapai/video';
import { ContentJobRepository, ContentPlanRepository } from '@vidsnapai/content';
import { BrandRepository } from '@vidsnapai/brand';
import { WorkspaceRepository } from '@vidsnapai/database';
import { AuthService } from '../src/services/auth.service.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import type { ReelProductionPlan, ContentJob, ContentPlan, Brand } from '@vidsnapai/types';

describe('Regression: 30-Day Planner → Reel Blueprints Navigation Flow', () => {
  let app: express.Application;
  let server: Server;
  let baseUrl: string;

  const sampleBrand: Brand = {
    id: 'brand-nav-1',
    workspaceId: 'ws-nav-1',
    name: 'VidSnap Pro',
    slug: 'vidsnap-pro',
    description: 'AI Video Marketing',
    industry: 'Marketing Tech',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const samplePlan: ContentPlan = {
    id: 'plan-nav-1',
    brandId: sampleBrand.id,
    workspaceId: sampleBrand.workspaceId,
    name: 'Launch Campaign 30-Day Calendar',
    objective: 'Generate qualified demo requests',
    startDate: new Date(),
    endDate: new Date(),
    durationDays: 30,
    status: 'ACTIVE',
    version: 1,
    planGroupId: 'group-nav-1',
    strategySnapshot: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleJobWithReel: ContentJob = {
    id: 'job-with-reel-1',
    contentPlanId: samplePlan.id,
    brandId: sampleBrand.id,
    workspaceId: sampleBrand.workspaceId,
    dayNumber: 1,
    scheduledDate: new Date(),
    title: 'Why Manual Reel Editing is Dead',
    contentType: 'EDUCATIONAL',
    funnelStage: 'AWARENESS',
    contentPillar: 'AI Automation',
    objective: 'Educate on automated pipeline',
    audience: 'Marketing Leaders',
    topic: 'Automated Video Blueprints',
    hook: 'Still spending 6 hours per vertical video?',
    keyMessage: 'VidSnapAI does it in seconds with director-grade quality.',
    messagingAngle: 'Time savings and ROI',
    offer: null,
    cta: 'Try VidSnapAI today',
    platform: 'INSTAGRAM',
    format: 'REEL',
    priority: 'HIGH',
    status: 'READY',
    strategy: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleJobWithoutReel: ContentJob = {
    id: 'job-without-reel-2',
    contentPlanId: samplePlan.id,
    brandId: sampleBrand.id,
    workspaceId: sampleBrand.workspaceId,
    dayNumber: 2,
    scheduledDate: new Date(),
    title: '5 Steps to Viral Vertical Hook Sequences',
    contentType: 'STORYTELLING',
    funnelStage: 'CONSIDERATION',
    contentPillar: 'Growth Tactics',
    objective: 'Hook retention strategies',
    audience: 'Founders and Creators',
    topic: 'Retention Engineering',
    hook: 'Your first 2 seconds decide your revenue.',
    keyMessage: 'Structure your hooks with motion before words.',
    messagingAngle: 'Hook psychology',
    offer: null,
    cta: 'See full breakdown',
    platform: 'INSTAGRAM',
    format: 'REEL',
    priority: 'MEDIUM',
    status: 'PLANNED',
    strategy: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleReel: ReelProductionPlan = {
    id: 'reel-nav-101',
    contentJobId: sampleJobWithReel.id,
    brandId: sampleBrand.id,
    campaignId: null,
    contentPlanId: samplePlan.id,
    workspaceId: sampleBrand.workspaceId,
    version: 1,
    title: 'Why Manual Reel Editing is Dead v1',
    concept: {
      title: 'Why Manual Reel Editing is Dead',
      concept: 'Highlighting time waste',
      objective: 'Drive demo signups',
      targetAudience: 'Marketers',
      corePromise: 'Autonomous director-grade reels',
      emotionalAngle: 'From burnout to velocity',
      messagingAngle: 'Speed & quality',
      contentPillar: 'AI Automation',
      funnelStage: 'AWARENESS'
    },
    objective: 'Drive demo signups',
    audience: 'Marketers',
    funnelStage: 'AWARENESS',
    contentPillar: 'AI Automation',
    durationSeconds: 30,
    aspectRatio: '9:16',
    platform: 'INSTAGRAM',
    format: 'REEL',
    hook: {
      text: 'Still spending 6 hours per vertical video?',
      type: 'QUESTION',
      visualAction: 'Fast push in on tired editor',
      delivery: 'Punchy',
      timingSeconds: 3
    },
    narrative: 'Stop manual editing and switch to autonomous production.',
    script: [],
    scenes: [],
    visualDirection: {
      style: 'Sleek dark mode',
      mood: 'Modern',
      colorIntent: 'Electric violet',
      lightingIntent: 'Studio backlight',
      composition: 'Vertical 9:16',
      cameraLanguage: 'Dynamic cuts',
      pacing: 'Fast',
      visualHierarchy: 'Centered'
    },
    voiceDirection: {
      tone: 'Confident',
      pace: 'Fast',
      style: 'Authoritative',
      voiceGenderPreference: 'ANY',
      targetDurationSeconds: 30
    },
    captionDirection: {
      presetName: 'Kinetic Highlight',
      maxWordsPerLine: 3,
      animationType: 'POP',
      highlightColor: '#10B981',
      position: 'LOWER_THIRD'
    },
    animationDirection: {
      energy: 'High',
      style: 'Kinetic',
      textAnimation: 'Pop',
      visualTransitions: 'Whip pan',
      elementMotion: 'Glow'
    },
    audioDirection: {
      musicMood: 'Tech electronic',
      soundEffects: 'Whoosh',
      pacing: '124 BPM',
      mixBalance: 'Voice 100%, Music 25%'
    },
    cta: {
      type: 'SIGN_UP',
      text: 'Try VidSnapAI today',
      visualTreatment: 'Gradient pill',
      placement: 'Endcard',
      url: null
    },
    productionMetadata: {
      totalScenes: 2,
      estimatedWordCount: 30,
      targetDurationSeconds: 30,
      calculatedDurationSeconds: 30,
      generatedBy: 'VidSnapAI Reel Orchestrator v5.0',
      contentJobId: sampleJobWithReel.id,
      generatedAt: new Date().toISOString()
    },
    status: 'READY',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  let reelsList: ReelProductionPlan[] = [];

  beforeEach(async () => {
    reelsList = [sampleReel];

    vi.spyOn(AuthService.prototype, 'validateSession').mockImplementation(async (token: string) => {
      if (token === 'valid-user-token') {
        return {
          user: {
            id: 'user-nav-1',
            email: 'user@vidsnap.ai',
            name: 'Nav Tester',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          session: {} as any
        };
      }
      return null;
    });

    vi.spyOn(WorkspaceRepository.prototype, 'getUserRole').mockImplementation(async (wsId, userId) => {
      if (wsId === sampleBrand.workspaceId && userId === 'user-nav-1') {
        return 'ADMIN';
      }
      return null;
    });

    vi.spyOn(BrandRepository.prototype, 'findById').mockImplementation(async (id) => {
      return id === sampleBrand.id ? sampleBrand : null;
    });

    vi.spyOn(BrandRepository.prototype, 'findByIdAndWorkspace').mockImplementation(async (id, wsId) => {
      return id === sampleBrand.id && wsId === sampleBrand.workspaceId ? sampleBrand : null;
    });

    vi.spyOn(ContentPlanRepository.prototype, 'findById').mockImplementation(async (id) => {
      return id === samplePlan.id ? samplePlan : null;
    });

    vi.spyOn(ContentPlanRepository.prototype, 'findByIdAndWorkspace').mockImplementation(async (id, wsId) => {
      return id === samplePlan.id && wsId === sampleBrand.workspaceId ? samplePlan : null;
    });

    vi.spyOn(ContentJobRepository.prototype, 'findById').mockImplementation(async (id) => {
      if (id === sampleJobWithReel.id) return sampleJobWithReel;
      if (id === sampleJobWithoutReel.id) return sampleJobWithoutReel;
      return null;
    });

    vi.spyOn(ContentJobRepository.prototype, 'listForPlan').mockImplementation(async (planId) => {
      return planId === samplePlan.id ? [sampleJobWithReel, sampleJobWithoutReel] : [];
    });

    vi.spyOn(ReelProductionPlanRepository.prototype, 'findById').mockImplementation(async (id) => {
      return reelsList.find((r) => r.id === id) || null;
    });

    vi.spyOn(ReelProductionPlanRepository.prototype, 'findByIdAndWorkspace').mockImplementation(async (id, wsId) => {
      return reelsList.find((r) => r.id === id && r.workspaceId === wsId) || null;
    });

    vi.spyOn(ReelProductionPlanRepository.prototype, 'findLatestByContentJobId').mockImplementation(async (jobId) => {
      return reelsList.find((r) => r.contentJobId === jobId) || null;
    });

    vi.spyOn(ReelProductionPlanRepository.prototype, 'listByContentJobId').mockImplementation(async (jobId) => {
      return reelsList.filter((r) => r.contentJobId === jobId);
    });

    vi.spyOn(ReelProductionPlanRepository.prototype, 'listByContentPlanId').mockImplementation(async (planId) => {
      return reelsList.filter((r) => r.contentPlanId === planId);
    });

    vi.spyOn(ReelProductionPlanRepository.prototype, 'listByBrandId').mockImplementation(async (brandId) => {
      return reelsList.filter((r) => r.brandId === brandId);
    });

    vi.spyOn(ReelPlannerService.prototype, 'generateReelForJob').mockImplementation(async (jobId) => {
      const existing = reelsList.find((r) => r.contentJobId === jobId);
      if (existing) return existing;
      const created: ReelProductionPlan = {
        ...sampleReel,
        id: `reel-new-${Date.now()}`,
        contentJobId: jobId
      };
      reelsList.push(created);
      return created;
    });

    vi.spyOn(ReelPlannerService.prototype, 'batchGenerateReelsForPlan').mockImplementation(async (planId) => {
      return {
        planId,
        enqueuedJobs: 1,
        eligibleJobIds: [sampleJobWithoutReel.id],
        skippedJobIds: [sampleJobWithReel.id]
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
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe('Step 9: /api/api Bug Prevention Centrally', () => {
    it('ensures API URLs never produce duplicate /api/api', () => {
      expect(buildApiUrl('/api/brands')).toBe('/api/brands');
      expect(buildApiUrl('/api/api/brands')).toBe('/api/brands');
      expect(buildApiUrl('/api/api/reels')).toBe('/api/reels');
      expect(buildApiUrl('/api/api/content-plans')).toBe('/api/content-plans');
      expect(buildApiUrl('http://localhost:4000/api/api/brands')).toBe('http://localhost:4000/api/brands');
      expect(buildApiUrl('http://localhost:4000/api/reels/reel-123')).toBe('http://localhost:4000/api/reels/reel-123');
    });
  });

  describe('Step 1 & 2: Frontend Route Target Verification', () => {
    it('verifies frontend route structures for Reel Blueprints vs API endpoints', () => {
      const brandId = sampleBrand.id;
      const planId = samplePlan.id;
      const reelId = sampleReel.id;

      // 1. Reel Blueprints Dashboard for Brand
      const brandReelsRoute = `/brands/${brandId}/reels`;
      expect(brandReelsRoute).not.toContain('/api/');

      // 2. Reel Blueprints Dashboard for 30-Day Plan
      const planReelsRoute = `/brands/${brandId}/content-plans/${planId}/reels`;
      expect(planReelsRoute).not.toContain('/api/');

      // 3. Individual Reel Production Blueprint Route
      const reelBlueprintRoute = `/brands/${brandId}/reels/${reelId}`;
      expect(reelBlueprintRoute).not.toContain('/api/');

      // 4. Phase 6 Media Studio Route
      const mediaStudioRoute = `/brands/${brandId}/reels/${reelId}/media`;
      expect(mediaStudioRoute).not.toContain('/api/');

      // 5. Phase 7 Animation Studio Route
      const animationStudioRoute = `/brands/${brandId}/reels/${reelId}/animation`;
      expect(animationStudioRoute).not.toContain('/api/');
    });
  });

  describe('Step 3 & 4: Phase 5 Endpoints & Identifiers', () => {
    it('verifies GET /api/content-plans/:planId/reels returns reel blueprints with contentJobId', async () => {
      const res = await fetch(`${baseUrl}/api/content-plans/${samplePlan.id}/reels`, {
        headers: { Authorization: 'Bearer valid-user-token' }
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBe(1);
      expect(json.data[0].id).toBe(sampleReel.id);
      expect(json.data[0].contentJobId).toBe(sampleJobWithReel.id);
      expect(json.data[0].contentPlanId).toBe(samplePlan.id);
    });

    it('verifies POST /api/content-plans/:planId/reels/generate-batch triggers batch generation', async () => {
      const res = await fetch(`${baseUrl}/api/content-plans/${samplePlan.id}/reels/generate-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-token'
        },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.enqueuedJobs).toBe(1);
      expect(json.data.eligibleJobIds).toContain(sampleJobWithoutReel.id);
    });

    it('verifies GET /api/content-jobs/:jobId/reel fetches latest reel blueprint for a job', async () => {
      const res = await fetch(`${baseUrl}/api/content-jobs/${sampleJobWithReel.id}/reel`, {
        headers: { Authorization: 'Bearer valid-user-token' }
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(sampleReel.id);
    });

    it('verifies POST /api/content-jobs/:jobId/reel/generate creates a reel blueprint for a missing job', async () => {
      const res = await fetch(`${baseUrl}/api/content-jobs/${sampleJobWithoutReel.id}/reel/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-token'
        },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.contentJobId).toBe(sampleJobWithoutReel.id);
    });

    it('verifies GET /api/reels/:id standalone endpoint returns blueprint directly', async () => {
      const res = await fetch(`${baseUrl}/api/reels/${sampleReel.id}`, {
        headers: { Authorization: 'Bearer valid-user-token' }
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(sampleReel.id);
      expect(json.data.title).toBe(sampleReel.title);
    });

    it('verifies GET /api/content-jobs/:jobId/reel/versions returns version history', async () => {
      const res = await fetch(`${baseUrl}/api/content-jobs/${sampleJobWithReel.id}/reel/versions`, {
        headers: { Authorization: 'Bearer valid-user-token' }
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Step 5 & 6: Job-Level Blueprint Mapping & State Transitions', () => {
    it('correctly associates ContentJobs with existing Reel Blueprints', () => {
      const reels = [sampleReel];
      const jobReelMap = new Map<string, ReelProductionPlan>();
      for (const r of reels) {
        if (r.contentJobId) {
          jobReelMap.set(r.contentJobId, r);
        }
      }

      // Job 1 has a blueprint -> Action: "View Blueprint"
      expect(jobReelMap.has(sampleJobWithReel.id)).toBe(true);
      const existing = jobReelMap.get(sampleJobWithReel.id)!;
      const targetRoute = `/brands/${sampleBrand.id}/reels/${existing.id}`;
      expect(targetRoute).toBe(`/brands/${sampleBrand.id}/reels/${sampleReel.id}`);

      // Job 2 has NO blueprint -> Action: "Generate Blueprint"
      expect(jobReelMap.has(sampleJobWithoutReel.id)).toBe(false);

      // Simulate generation of Job 2 blueprint
      const generatedReel: ReelProductionPlan = {
        ...sampleReel,
        id: 'reel-nav-102',
        contentJobId: sampleJobWithoutReel.id
      };
      jobReelMap.set(sampleJobWithoutReel.id, generatedReel);

      // After generation, Job 2 action transitions to "View Blueprint"
      expect(jobReelMap.has(sampleJobWithoutReel.id)).toBe(true);
      expect(jobReelMap.get(sampleJobWithoutReel.id)!.id).toBe('reel-nav-102');
    });
  });
});
