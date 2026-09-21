import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Database } from '@vidsnapai/database';
import type {
  ReelProductionPlan,
  MetaConnectionRecord,
  MetaAdCampaignRecord,
  MetaAdSetRecord,
  MetaAdCreativeRecord,
  MetaAdRecord,
  MetaAdPublicationRecord
} from '@vidsnapai/types';
import {
  MetaAdsService,
  MetaApiClient,
  LifecycleValidator,
  ApprovalService
} from '@vidsnapai/video';

describe('Phase 10: Meta Ads Integration & Production Campaign Pipeline', () => {
  const reelPlanId = '5acd975d-3fb6-4f1e-8692-324bd4a3fb78';
  const workspaceId = '20928673-358e-4ec1-9b0f-0d3a986c671c';
  const brandId = 'd3e93a53-51c3-40a1-9e07-73097b2fcfe2';
  const foreignWorkspaceId = '00000000-0000-0000-0000-000000000000';

  let reels: ReelProductionPlan[] = [];
  let connections: MetaConnectionRecord[] = [];
  let campaigns: MetaAdCampaignRecord[] = [];
  let adSets: MetaAdSetRecord[] = [];
  let creatives: MetaAdCreativeRecord[] = [];
  let ads: MetaAdRecord[] = [];
  let publications: MetaAdPublicationRecord[] = [];

  let metaService: MetaAdsService;
  let approvalService: ApprovalService;
  let mockReelRepo: any;
  let mockMetaRepo: any;
  let mockMetaClient: MetaApiClient;

  beforeEach(() => {
    reels = [
      {
        id: reelPlanId,
        brandId,
        workspaceId,
        title: 'One8 Official Performance Reel',
        concept: {
          title: 'One8 Performance Reel',
          caption: 'Elevate your performance with One8. Built for champions.',
          hashtags: ['#One8', '#Performance', '#VidSnapAI']
        },
        hook: {
          type: 'QUESTION',
          text: 'Are you ready to push beyond your limits?',
          visualIntent: 'Fast-paced athletic workout cuts',
          deliveryStyle: 'High energy',
          durationSeconds: 3
        },
        cta: {
          type: 'SHOP_NOW',
          text: 'Shop One8 Collection',
          visualTreatment: 'Overlay button with pulse glow',
          placement: 'BOTTOM_CENTER',
          url: 'https://one8.com/shop/performance'
        },
        status: 'COMPLETED',
        outputVideoUrl: '/api/storage/files/rendered-one8-reel.mp4',
        renderOutput: {
          jobId: 'render-job-one8',
          reelPlanId,
          status: 'COMPLETED',
          outputVideoUrl: '/api/storage/files/rendered-one8-reel.mp4',
          durationSeconds: 15,
          fileSizeBytes: 2048000,
          resolution: { width: 1080, height: 1920 },
          fps: 30,
          renderedAt: new Date().toISOString()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      } as unknown as ReelProductionPlan
    ];

    connections = [];
    campaigns = [];
    adSets = [];
    creatives = [];
    ads = [];
    publications = [];

    mockReelRepo = {
      findByIdAndWorkspace: vi.fn().mockImplementation(async (id: string, wsId: string) => {
        return reels.find((r) => r.id === id && r.workspaceId === wsId) || null;
      }),
      findById: vi.fn().mockImplementation(async (id: string) => {
        return reels.find((r) => r.id === id) || null;
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

    mockMetaRepo = {
      findConnection: vi.fn().mockImplementation(async (wsId: string) => {
        return connections.find((c) => c.workspaceId === wsId) || null;
      }),
      upsertConnection: vi.fn().mockImplementation(async (data: any) => {
        const idx = connections.findIndex((c) => c.workspaceId === data.workspaceId);
        if (idx >= 0) {
          connections[idx] = { ...connections[idx], ...data, updatedAt: new Date() };
          return connections[idx];
        }
        const record: MetaConnectionRecord = {
          id: `conn-${connections.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        connections.push(record);
        return record;
      }),
      selectAccount: vi.fn().mockImplementation(async (wsId: string, adAccountId: string, pageId?: string, igActorId?: string) => {
        const conn = connections.find((c) => c.workspaceId === wsId);
        if (!conn) return null;
        conn.selectedAdAccountId = adAccountId;
        if (pageId) conn.selectedPageId = pageId;
        if (igActorId) conn.selectedInstagramActorId = igActorId;
        conn.updatedAt = new Date();
        return conn;
      }),
      deleteConnection: vi.fn().mockImplementation(async (wsId: string) => {
        const idx = connections.findIndex((c) => c.workspaceId === wsId);
        if (idx === -1) return false;
        connections.splice(idx, 1);
        return true;
      }),
      createCampaign: vi.fn().mockImplementation(async (data: any) => {
        const record: MetaAdCampaignRecord = {
          id: `camp-${campaigns.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        campaigns.push(record);
        return record;
      }),
      findCampaignById: vi.fn().mockImplementation(async (id: string, wsId: string) => {
        return campaigns.find((c) => c.id === id && c.workspaceId === wsId) || null;
      }),
      listCampaigns: vi.fn().mockImplementation(async (wsId: string) => {
        return campaigns.filter((c) => c.workspaceId === wsId);
      }),
      createAdSet: vi.fn().mockImplementation(async (data: any) => {
        const record: MetaAdSetRecord = {
          id: `adset-${adSets.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        adSets.push(record);
        return record;
      }),
      findAdSetById: vi.fn().mockImplementation(async (id: string, wsId: string) => {
        return adSets.find((a) => a.id === id && a.workspaceId === wsId) || null;
      }),
      createCreative: vi.fn().mockImplementation(async (data: any) => {
        const record: MetaAdCreativeRecord = {
          id: `crt-${creatives.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        creatives.push(record);
        return record;
      }),
      findCreativeByReel: vi.fn().mockImplementation(async (reelId: string, wsId: string) => {
        return creatives.find((c) => c.reelPlanId === reelId && c.workspaceId === wsId) || null;
      }),
      createAd: vi.fn().mockImplementation(async (data: any) => {
        const record: MetaAdRecord = {
          id: `ad-${ads.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        ads.push(record);
        return record;
      }),
      findAdByReel: vi.fn().mockImplementation(async (reelId: string, wsId: string) => {
        return ads.find((a) => a.reelPlanId === reelId && a.workspaceId === wsId) || null;
      }),
      createPublication: vi.fn().mockImplementation(async (data: any) => {
        const record: MetaAdPublicationRecord = {
          id: `meta-pub-${publications.length + 1}`,
          attemptCount: 1,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        publications.push(record);
        return record;
      }),
      findPublicationByIdempotencyKey: vi.fn().mockImplementation(async (key: string, wsId: string) => {
        return publications.find((p) => p.idempotencyKey === key && p.workspaceId === wsId) || null;
      }),
      updatePublicationStatus: vi.fn().mockImplementation(async (id: string, wsId: string, patch: any) => {
        const pub = publications.find((p) => p.id === id && p.workspaceId === wsId);
        if (!pub) return null;
        Object.assign(pub, patch, { updatedAt: new Date() });
        return pub;
      }),
      listPublicationsByReel: vi.fn().mockImplementation(async (reelId: string, wsId: string) => {
        return publications.filter((p) => p.reelPlanId === reelId && p.workspaceId === wsId);
      })
    };

    const mockDb = {} as Database;
    mockMetaClient = new MetaApiClient();
    approvalService = new ApprovalService(mockDb, { reelRepo: mockReelRepo });
    metaService = new MetaAdsService(mockDb, {
      metaRepo: mockMetaRepo,
      reelRepo: mockReelRepo,
      metaClient: mockMetaClient
    });
  });

  describe('1. Meta OAuth Connection & Token Security', () => {
    it('generates secure OAuth URL with workspace state parameter', () => {
      const url = metaService.getOAuthUrl(workspaceId);
      expect(url).toContain('dialog/oauth');
      expect(url).toContain('client_id=');
      expect(url).toContain('state=');
      expect(url).toContain('scope=ads_management');
    });

    it('exchanges OAuth code, securely stores connection, and sanitizes access tokens in public view', async () => {
      const connection = await metaService.handleOAuthCallback({
        workspaceId,
        code: 'mock_code_test_12345'
      });

      expect(connection).toBeDefined();
      expect(connection.workspaceId).toBe(workspaceId);
      expect(connection.status).toBe('CONNECTED');
      expect(connection.hasValidToken).toBe(true);
      expect(connection.adAccounts.length).toBeGreaterThan(0);
      expect(connection.selectedAdAccountId).toBeDefined();

      // Crucial Security Test: Access token MUST NOT be exposed in sanitized output
      expect((connection as any).accessToken).toBeUndefined();
    });

    it('allows selecting active ad account and page for the workspace', async () => {
      await metaService.handleOAuthCallback({ workspaceId, code: 'mock_code_one8' });

      const updated = await metaService.selectAdAccount({
        workspaceId,
        adAccountId: 'act_2093847582',
        pageId: 'page_98237461',
        instagramActorId: 'ig_actor_837461029'
      });

      expect(updated.selectedAdAccountId).toBe('act_2093847582');
      expect(updated.selectedPageId).toBe('page_98237461');
      expect(updated.selectedInstagramActorId).toBe('ig_actor_837461029');
    });
  });

  describe('2. Multi-Tenant Workspace Isolation', () => {
    it('prevents foreign workspace from viewing connected Meta accounts', async () => {
      await metaService.handleOAuthCallback({ workspaceId, code: 'mock_code_one8' });

      const foreignConn = await metaService.getConnection(foreignWorkspaceId);
      expect(foreignConn).toBeNull();
    });

    it('prevents foreign workspace from publishing ads with another workspace reel', async () => {
      await metaService.handleOAuthCallback({ workspaceId, code: 'mock_code_one8' });

      await expect(
        metaService.publishToMeta({
          reelPlanId,
          workspaceId: foreignWorkspaceId,
          brandId
        })
      ).rejects.toThrow(/not found in workspace/);
    });
  });

  describe('3. Lifecycle & Approval Gate Enforcement', () => {
    it('rejects preparing or launching ads for unapproved reels', async () => {
      // Reel starts as COMPLETED (unapproved)
      expect(reels[0].status).toBe('COMPLETED');

      // Attempting to publish unapproved reel directly throws
      await expect(
        metaService.publishToMeta({
          reelPlanId,
          workspaceId,
          brandId
        })
      ).rejects.toThrow(/It must be APPROVED before launching ads/);
    });

    it('successfully progresses through the authoritative lifecycle: COMPLETED -> APPROVED -> READY_FOR_ADS -> PUBLISHED_TO_META', async () => {
      // Step 1: User approves the reel
      const approvedReel = await approvalService.approveReel({
        reelPlanId,
        workspaceId,
        approvedBy: 'marketing-lead-1',
        notes: 'One8 launch creative approved for Meta Ad campaign'
      });
      expect(approvedReel.status).toBe('APPROVED');

      // Step 2: Prepare reel as Meta Ad Creative (transitions to READY_FOR_ADS)
      const creative = await metaService.prepareReelForAds({
        reelPlanId,
        workspaceId,
        brandId,
        title: 'One8 Official Performance Video Ad',
        destinationUrl: 'https://one8.com/shop/performance'
      });
      expect(creative).toBeDefined();
      expect(creative.reelPlanId).toBe(reelPlanId);
      expect(creative.destinationUrl).toBe('https://one8.com/shop/performance');

      const reelAfterPrep = await mockReelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
      expect(reelAfterPrep!.status).toBe('READY_FOR_ADS');
    });

    it('validates lifecycle state transitions in LifecycleValidator', () => {
      expect(LifecycleValidator.isValidTransition('APPROVED', 'READY_FOR_ADS')).toBe(true);
      expect(LifecycleValidator.isValidTransition('READY_FOR_ADS', 'PUBLISHED_TO_META')).toBe(true);
      expect(LifecycleValidator.isValidTransition('READY_FOR_ADS', 'PUBLISH_FAILED')).toBe(true);
      expect(LifecycleValidator.isValidTransition('DRAFT', 'PUBLISHED_TO_META')).toBe(false);
    });
  });

  describe('4. Full Meta Ads Campaign Hierarchy Creation & Publishing', () => {
    beforeEach(async () => {
      await metaService.handleOAuthCallback({ workspaceId, code: 'mock_code_one8' });
      await approvalService.approveReel({ reelPlanId, workspaceId, approvedBy: 'user-admin' });
    });

    it('creates complete Meta Campaign, Ad Set, Creative, and Ad hierarchy for One8 reel', async () => {
      const result = await metaService.publishToMeta({
        reelPlanId,
        workspaceId,
        brandId,
        metaCampaignName: 'One8 Spring Performance Campaign',
        metaCampaignObjective: 'OUTCOME_SALES',
        dailyBudget: 2500, // $25.00
        headline: 'Experience Peak Performance with One8',
        primaryText: 'Engineered for athletes. Discover the new One8 performance gear.',
        callToActionType: 'SHOP_NOW',
        destinationUrl: 'https://one8.com/shop/performance'
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('PUBLISHED');
      expect(result.campaignId).toBeDefined();
      expect(result.externalCampaignId).toMatch(/^meta_cmp_/);
      expect(result.adSetId).toBeDefined();
      expect(result.externalAdSetId).toMatch(/^meta_adset_/);
      expect(result.creativeId).toBeDefined();
      expect(result.externalCreativeId).toMatch(/^meta_crt_/);
      expect(result.adId).toBeDefined();
      expect(result.externalAdId).toMatch(/^meta_ad_/);
      expect(result.adsManagerUrl).toContain('https://adsmanager.facebook.com');

      // Verify reel status updated to PUBLISHED_TO_META
      const updatedReel = await mockReelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
      expect(updatedReel!.status).toBe('PUBLISHED_TO_META');

      // Verify publication history
      const pubs = await metaService.getPublications(reelPlanId, workspaceId);
      expect(pubs.length).toBeGreaterThan(0);
      expect(pubs[0].status).toBe('PUBLISHED');
      expect(pubs[0].externalCampaignId).toBe(result.externalCampaignId);
    });

    it('enforces idempotency on duplicate publish requests', async () => {
      const idempKey = 'meta_pub_idempotent_test_key_001';

      const initial = await metaService.publishToMeta({
        reelPlanId,
        workspaceId,
        brandId,
        idempotencyKey: idempKey
      });

      expect(initial.success).toBe(true);
      expect(initial.status).toBe('PUBLISHED');
      const initialCampId = initial.externalCampaignId;

      // Repeat request with same idempotency key
      const duplicate = await metaService.publishToMeta({
        reelPlanId,
        workspaceId,
        brandId,
        idempotencyKey: idempKey
      });

      expect(duplicate.success).toBe(true);
      expect(duplicate.status).toBe('PUBLISHED');
      expect(duplicate.externalCampaignId).toBe(initialCampId);
      expect(campaigns.length).toBe(1); // No second campaign created
    });
  });

  describe('5. Failure Handling & Error Resilience', () => {
    it('handles Meta API errors gracefully and marks status as FAILED without unhandled rejection', async () => {
      await metaService.handleOAuthCallback({ workspaceId, code: 'mock_code_one8' });
      await approvalService.approveReel({ reelPlanId, workspaceId, approvedBy: 'user-admin' });

      // Mock createCampaign to simulate rate limit / API rejection
      vi.spyOn(mockMetaClient, 'createCampaign').mockRejectedValueOnce(
        new Error('Meta Graph API Error: (#17) User request limit reached')
      );

      const result = await metaService.publishToMeta({
        reelPlanId,
        workspaceId,
        brandId,
        idempotencyKey: 'meta_pub_fail_test_key'
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('META_PUBLISH_FAILED');
      expect(result.errorMessage).toContain('User request limit reached');

      // Verify reel status updated to PUBLISH_FAILED
      const updatedReel = await mockReelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
      expect(updatedReel!.status).toBe('PUBLISH_FAILED');
    });
  });
});
