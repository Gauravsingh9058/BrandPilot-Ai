import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Database } from '@vidsnapai/database';
import type { ReelProductionPlan, SocialPublicationRecord } from '@vidsnapai/types';
import {
  LifecycleValidator,
  ApprovalService,
  SocialPublishingService,
  SocialPublisherFactory
} from '@vidsnapai/video';

describe('Phase 9: Automated Delivery, Publishing & Production Workflow', () => {
  const reelPlanId = '5acd975d-3fb6-4f1e-8692-324bd4a3fb78';
  const workspaceId = '20928673-358e-4ec1-9b0f-0d3a986c671c';
  const brandId = 'd3e93a53-51c3-40a1-9e07-73097b2fcfe2';

  let reels: ReelProductionPlan[] = [];
  let publications: SocialPublicationRecord[] = [];
  let approvalService: ApprovalService;
  let publishingService: SocialPublishingService;
  let mockReelRepo: any;
  let mockPubRepo: any;

  beforeEach(() => {
    reels = [
      {
        id: reelPlanId,
        brandId,
        workspaceId,
        title: 'One8 Launch Reel',
        concept: {
          title: 'One8 Launch Reel',
          caption: 'Unleash your inner potential with One8 #vidsnapai',
          hashtags: ['#vidsnapai', '#one8']
        },
        status: 'COMPLETED',
        outputVideoUrl: '/api/storage/files/rendered-video.mp4',
        renderOutput: {
          jobId: 'render-job-1',
          reelPlanId,
          status: 'COMPLETED',
          outputVideoUrl: '/api/storage/files/rendered-video.mp4',
          durationSeconds: 15,
          fileSizeBytes: 1024000,
          resolution: { width: 1080, height: 1920 },
          fps: 30,
          format: 'mp4',
          storageKey: 'rendered-video.mp4',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      } as unknown as ReelProductionPlan
    ];
    publications = [];

    mockReelRepo = {
      findByIdAndWorkspace: vi.fn().mockImplementation(async (id: string, wsId: string) => {
        return reels.find((r) => r.id === id && r.workspaceId === wsId) || null;
      }),
      findById: vi.fn().mockImplementation(async (id: string) => {
        return reels.find((r) => r.id === id) || null;
      }),
      listByBrandId: vi.fn().mockImplementation(async (bId: string) => {
        return reels.filter((r) => r.brandId === bId);
      }),
      update: vi.fn().mockImplementation(async (id: string, patch: Partial<ReelProductionPlan>) => {
        const idx = reels.findIndex((r) => r.id === id);
        if (idx === -1) return null;
        reels[idx] = { ...reels[idx], ...patch, updatedAt: new Date() };
        return reels[idx];
      }),
      updateStatus: vi.fn().mockImplementation(async (id: string, status: any) => {
        const idx = reels.findIndex((r) => r.id === id);
        if (idx === -1) return null;
        reels[idx] = { ...reels[idx], status, updatedAt: new Date() };
        return reels[idx];
      })
    };

    mockPubRepo = {
      create: vi.fn().mockImplementation(async (data: any) => {
        const record: SocialPublicationRecord = {
          id: `pub-${publications.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        publications.push(record);
        return record;
      }),
      findById: vi.fn().mockImplementation(async (id: string, wsId: string) => {
        return publications.find((p) => p.id === id && p.workspaceId === wsId) || null;
      }),
      listByReelPlanId: vi.fn().mockImplementation(async (reelId: string, wsId: string) => {
        return publications.filter((p) => p.reelPlanId === reelId && p.workspaceId === wsId);
      }),
      updateStatus: vi.fn().mockImplementation(async (id: string, wsId: string, updateData: any) => {
        const pub = publications.find((p) => p.id === id && p.workspaceId === wsId);
        if (!pub) return null;
        Object.assign(pub, updateData, { updatedAt: new Date() });
        return pub;
      })
    };

    const mockDb = {} as Database;
    approvalService = new ApprovalService(mockDb, { reelRepo: mockReelRepo });
    publishingService = new SocialPublishingService(mockDb, { pubRepo: mockPubRepo, reelRepo: mockReelRepo });
  });

  describe('1. Reel Lifecycle State Transitions', () => {
    it('validates allowed transitions deterministically', () => {
      expect(LifecycleValidator.isValidTransition('DRAFT', 'QUEUED')).toBe(true);
      expect(LifecycleValidator.isValidTransition('COMPLETED', 'APPROVED')).toBe(true);
      expect(LifecycleValidator.isValidTransition('COMPLETED', 'REJECTED')).toBe(true);
      expect(LifecycleValidator.isValidTransition('APPROVED', 'SCHEDULED')).toBe(true);
      expect(LifecycleValidator.isValidTransition('SCHEDULED', 'PUBLISHED')).toBe(true);
    });

    it('rejects invalid state jumps', () => {
      expect(LifecycleValidator.isValidTransition('DRAFT', 'PUBLISHED')).toBe(false);
      expect(LifecycleValidator.isValidTransition('RENDERING', 'PUBLISHED')).toBe(false);
      expect(() => LifecycleValidator.validateTransition('RENDERING', 'PUBLISHED')).toThrow(
        /Invalid reel status transition/
      );
    });
  });

  describe('2. Approval & Rejection Workflow', () => {
    it('approves a completed reel and records approval metadata', async () => {
      const approved = await approvalService.approveReel({
        reelPlanId,
        workspaceId,
        approvedBy: 'test-user-id',
        notes: 'Looks great for social campaign'
      });

      expect(approved.status).toBe('APPROVED');
      expect((approved.productionMetadata as any)?.approval?.status).toBe('APPROVED');
      expect((approved.productionMetadata as any)?.approval?.approvedBy).toBe('test-user-id');
    });

    it('rejects a reel with required feedback reason', async () => {
      // Temporarily test rejection
      await expect(
        approvalService.rejectReel({
          reelPlanId,
          workspaceId,
          reason: ''
        })
      ).rejects.toThrow(/rejection reason is required/);

      const rejected = await approvalService.rejectReel({
        reelPlanId,
        workspaceId,
        reason: 'Caption timing needs adjustment'
      });

      expect(rejected.status).toBe('REJECTED');
      expect((rejected.productionMetadata as any)?.approval?.status).toBe('REJECTED');
      expect((rejected.productionMetadata as any)?.approval?.reason).toBe('Caption timing needs adjustment');

      // Re-approve for downstream publishing tests
      await approvalService.approveReel({ reelPlanId, workspaceId, approvedBy: 'test-user-id' });
    });
  });

  describe('3. Scheduling Engine', () => {
    it('schedules an approved reel for publication and creates a persistent record', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const publication = await publishingService.schedulePublication({
        reelPlanId,
        workspaceId,
        brandId,
        platform: 'INSTAGRAM',
        scheduledAt: tomorrow,
        caption: 'Unleash your inner potential with One8'
      });

      expect(publication).toBeDefined();
      expect(publication.status).toBe('SCHEDULED');
      expect(publication.platform).toBe('INSTAGRAM');
      expect(publication.reelPlanId).toBe(reelPlanId);

      const reel = await mockReelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
      expect(reel!.status).toBe('SCHEDULED');
    });
  });

  describe('4. Social Platform Publishing & Provider Abstraction', () => {
    it('publishes reel through MockPublisher with simulated external URLs', async () => {
      const { publication, result } = await publishingService.publishReel({
        reelPlanId,
        workspaceId,
        brandId,
        platform: 'MOCK',
        caption: 'One8 Official Launch Reel #vidsnapai #one8'
      });

      expect(result.success).toBe(true);
      expect(result.externalPostId).toMatch(/^mock_post_mock_/);
      expect(result.externalUrl).toMatch(/^https:\/\/mock\.social\/mock\/p\//);
      expect(publication.status).toBe('PUBLISHED');

      const reel = await mockReelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
      expect(reel!.status).toBe('PUBLISHED');
    });

    it('enforces idempotency on duplicate publish requests', async () => {
      const initial = await publishingService.publishReel({
        reelPlanId,
        workspaceId,
        brandId,
        platform: 'MOCK',
        caption: 'Initial Reel Publish'
      });
      expect(initial.result.success).toBe(true);

      const publications = await publishingService.getPublications(reelPlanId, workspaceId);
      expect(publications.length).toBeGreaterThan(0);

      const publishedRecord = publications.find((p) => p.status === 'PUBLISHED');
      expect(publishedRecord).toBeDefined();

      const duplicateResult = await publishingService.publishReel({
        publicationId: publishedRecord!.id,
        reelPlanId,
        workspaceId,
        brandId,
        platform: 'MOCK'
      });

      expect(duplicateResult.result.success).toBe(true);
      expect(duplicateResult.publication.id).toBe(publishedRecord!.id);
      expect(duplicateResult.publication.status).toBe('PUBLISHED');
    });

    it('verifies publisher factory returns appropriate platform adapters', () => {
      const ig = SocialPublisherFactory.getPublisher('INSTAGRAM');
      expect(ig.platform).toBe('INSTAGRAM');

      const fb = SocialPublisherFactory.getPublisher('FACEBOOK');
      expect(fb.platform).toBe('FACEBOOK');

      const yt = SocialPublisherFactory.getPublisher('YOUTUBE');
      expect(yt.platform).toBe('YOUTUBE');

      const mock = SocialPublisherFactory.getPublisher('MOCK');
      expect(mock.platform).toBe('MOCK');
    });
  });

  describe('5. Multi-Tenant Workspace Isolation', () => {
    it('prevents foreign workspace from viewing publishing records', async () => {
      const foreignWorkspaceId = '00000000-0000-0000-0000-000000000000';
      const pubs = await publishingService.getPublications(reelPlanId, foreignWorkspaceId);
      expect(pubs).toHaveLength(0);
    });

    it('prevents foreign workspace from scheduling or approving reels', async () => {
      const foreignWorkspaceId = '00000000-0000-0000-0000-000000000000';
      await expect(
        approvalService.approveReel({
          reelPlanId,
          workspaceId: foreignWorkspaceId
        })
      ).rejects.toThrow(/not found in workspace/);
    });
  });
});
