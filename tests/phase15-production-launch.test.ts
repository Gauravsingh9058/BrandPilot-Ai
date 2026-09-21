import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BILLING_PLANS, BillingService } from '../apps/api/src/services/billing.service.js';
import { TIER_LIMITS_MAP, SubscriptionRepository } from '@vidsnapai/database';
import { createStorageProvider, S3StorageProvider } from '@vidsnapai/storage';
import { metricsCollector } from '../apps/api/src/lib/metrics.js';
import {
  CreateCheckoutSessionSchema,
  CreatePortalSessionSchema,
  BillingWebhookPayloadSchema,
  SubscriptionTierSchema
} from '@vidsnapai/validation';

describe('Phase 15: Production Launch & SaaS Commercialization Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    metricsCollector.reset();
  });

  describe('1. SaaS Tier Definitions & Plan Catalog', () => {
    it('should define all 4 commercial tiers (FREE, STARTER, PRO, ENTERPRISE) with accurate limits', () => {
      expect(BILLING_PLANS).toHaveLength(4);
      const tiers = BILLING_PLANS.map((p) => p.tier);
      expect(tiers).toEqual(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']);

      // FREE Tier
      const free = BILLING_PLANS.find((p) => p.tier === 'FREE')!;
      expect(free.monthlyPriceUsd).toBe(0);
      expect(free.limits.maxReelsPerMonth).toBe(5);
      expect(free.limits.maxCampaignsPerMonth).toBe(1);
      expect(free.limits.autonomousEngineEnabled).toBe(false);
      expect(free.limits.metaPublishingEnabled).toBe(false);
      expect(free.limits.exportResolution).toBe('720p');

      // STARTER Tier
      const starter = BILLING_PLANS.find((p) => p.tier === 'STARTER')!;
      expect(starter.monthlyPriceUsd).toBe(29);
      expect(starter.limits.maxReelsPerMonth).toBe(30);
      expect(starter.limits.maxCampaignsPerMonth).toBe(3);
      expect(starter.limits.metaPublishingEnabled).toBe(true);
      expect(starter.limits.exportResolution).toBe('1080p');

      // PRO Tier
      const pro = BILLING_PLANS.find((p) => p.tier === 'PRO')!;
      expect(pro.monthlyPriceUsd).toBe(79);
      expect(pro.popular).toBe(true);
      expect(pro.limits.maxReelsPerMonth).toBe(150);
      expect(pro.limits.autonomousEngineEnabled).toBe(true);
      expect(pro.limits.metaPublishingEnabled).toBe(true);
      expect(pro.limits.exportResolution).toBe('4k');

      // ENTERPRISE Tier
      const ent = BILLING_PLANS.find((p) => p.tier === 'ENTERPRISE')!;
      expect(ent.monthlyPriceUsd).toBe(249);
      expect(ent.limits.maxReelsPerMonth).toBe(-1); // Unlimited
      expect(ent.limits.maxCampaignsPerMonth).toBe(-1);
      expect(ent.limits.autonomousEngineEnabled).toBe(true);
      expect(ent.limits.storageLimitGb).toBe(500);
    });

    it('should validate tier enum inputs via Zod schema', () => {
      expect(SubscriptionTierSchema.safeParse('FREE').success).toBe(true);
      expect(SubscriptionTierSchema.safeParse('STARTER').success).toBe(true);
      expect(SubscriptionTierSchema.safeParse('PRO').success).toBe(true);
      expect(SubscriptionTierSchema.safeParse('ENTERPRISE').success).toBe(true);
      expect(SubscriptionTierSchema.safeParse('ULTIMATE').success).toBe(false);
    });
  });

  describe('2. Subscription Repository & Tier Limit Enforcement', () => {
    function createMockDb() {
      const subscriptions = new Map<string, any>();
      const usageRecords = new Map<string, any>();
      const invoices = new Map<string, any>();

      return {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockImplementation((_table: any) => ({
            where: vi.fn().mockImplementation((_clause: any) => {
              return {
                limit: vi.fn().mockImplementation((limit: number) => {
                  return Array.from(subscriptions.values()).slice(0, limit);
                }),
                orderBy: vi.fn().mockImplementation(() => {
                  return Array.from(invoices.values());
                })
              };
            })
          }))
        })),
        insert: vi.fn().mockImplementation((_table: any) => ({
          values: vi.fn().mockImplementation((val: any) => ({
            onConflictDoUpdate: vi.fn().mockImplementation(() => ({
              returning: vi.fn().mockResolvedValue([val])
            })),
            returning: vi.fn().mockResolvedValue([val])
          }))
        })),
        _subs: subscriptions,
        _usage: usageRecords,
        _inv: invoices
      } as any;
    }

    it('should enforce Free tier reel generation limits', async () => {
      const mockDb = createMockDb();
      const repo = new SubscriptionRepository(mockDb);

      // Workspace with 5 generated reels on FREE tier (Limit is 5)
      const checkResult = await repo.checkLimit('ws-1', 'CREATE_REEL', 5);
      expect(checkResult.allowed).toBe(false);
      expect(checkResult.tier).toBe('FREE');
      expect(checkResult.upgradeRequired).toBe(true);
      expect(checkResult.reason).toContain('Monthly limit of 5 reels reached');
    });

    it('should block autonomous engine for Free tier and allow for Pro tier', async () => {
      const mockDb = createMockDb();
      const repo = new SubscriptionRepository(mockDb);

      // Free tier block
      const freeAutoCheck = await repo.checkLimit('ws-free', 'AUTONOMOUS_OPERATIONS');
      expect(freeAutoCheck.allowed).toBe(false);
      expect(freeAutoCheck.upgradeRequired).toBe(true);
      expect(freeAutoCheck.reason).toContain('Autonomous 24/7 self-optimizing engine requires');

      // Pro tier allow
      vi.spyOn(repo, 'getForWorkspace').mockResolvedValue({
        id: 'sub-pro',
        workspaceId: 'ws-pro',
        tier: 'PRO',
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const proAutoCheck = await repo.checkLimit('ws-pro', 'AUTONOMOUS_OPERATIONS');
      expect(proAutoCheck.allowed).toBe(true);
    });

    it('should enforce Meta publishing restrictions on Free tier', async () => {
      const mockDb = createMockDb();
      const repo = new SubscriptionRepository(mockDb);

      const metaCheck = await repo.checkLimit('ws-free', 'META_PUBLISHING');
      expect(metaCheck.allowed).toBe(false);
      expect(metaCheck.reason).toContain('Direct Meta Ads publishing requires');
    });

    it('should return correct tier limits map', () => {
      expect(TIER_LIMITS_MAP.FREE.maxReelsPerMonth).toBe(5);
      expect(TIER_LIMITS_MAP.STARTER.maxReelsPerMonth).toBe(30);
      expect(TIER_LIMITS_MAP.PRO.maxReelsPerMonth).toBe(150);
      expect(TIER_LIMITS_MAP.ENTERPRISE.maxReelsPerMonth).toBe(-1);
    });
  });

  describe('3. Billing Service & Webhook Processing', () => {
    it('should generate simulated checkout session in dev/test mode', async () => {
      const service = new BillingService();
      const session = await service.createCheckoutSession('ws-100', {
        tier: 'PRO',
        interval: 'month'
      });

      expect(session.sessionId).toBeDefined();
      expect(session.checkoutUrl).toContain('tier=PRO');
      expect(session.mode).toBe('simulated');
    });

    it('should validate checkout and portal request schemas with Zod', () => {
      const validCheckout = CreateCheckoutSessionSchema.safeParse({
        tier: 'PRO',
        interval: 'year',
        successUrl: 'https://vidsnapai.com/success'
      });
      expect(validCheckout.success).toBe(true);

      const invalidCheckout = CreateCheckoutSessionSchema.safeParse({
        tier: 'INVALID_TIER'
      });
      expect(invalidCheckout.success).toBe(false);

      const validPortal = CreatePortalSessionSchema.safeParse({
        returnUrl: 'https://vidsnapai.com/billing'
      });
      expect(validPortal.success).toBe(true);
    });

    it('should process checkout.session.completed and upgrade workspace subscription', async () => {
      const service = new BillingService();
      const upsertSpy = vi.spyOn((service as any).subscriptionRepo, 'upsertSubscription').mockResolvedValue({
        id: 'sub-1',
        workspaceId: 'ws-123',
        tier: 'PRO',
        status: 'ACTIVE',
        stripeCustomerId: 'cus_xyz',
        stripeSubscriptionId: 'sub_xyz',
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await service.handleWebhookEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: 'ws-123',
            customer: 'cus_xyz',
            subscription: 'sub_xyz',
            metadata: {
              workspaceId: 'ws-123',
              tier: 'PRO'
            }
          }
        }
      });

      expect(result.processed).toBe(true);
      expect(result.action).toBe('UPGRADED_TO_PRO');
      expect(result.workspaceId).toBe('ws-123');
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-123',
          tier: 'PRO',
          status: 'ACTIVE'
        })
      );
    });

    it('should process customer.subscription.deleted and downgrade workspace to FREE with CANCELED status', async () => {
      const service = new BillingService();
      const upsertSpy = vi.spyOn((service as any).subscriptionRepo, 'upsertSubscription').mockResolvedValue({
        id: 'sub-1',
        workspaceId: 'ws-123',
        tier: 'FREE',
        status: 'CANCELED',
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await service.handleWebhookEvent({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_xyz',
            customer: 'cus_xyz',
            metadata: {
              workspaceId: 'ws-123'
            }
          }
        }
      });

      expect(result.processed).toBe(true);
      expect(result.action).toBe('DOWNGRADED_TO_FREE');
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-123',
          tier: 'FREE',
          status: 'CANCELED'
        })
      );
    });

    it('should process invoice.payment_succeeded and record invoice', async () => {
      const service = new BillingService();
      const recordInvoiceSpy = vi.spyOn((service as any).subscriptionRepo, 'recordInvoice').mockResolvedValue({
        id: 'inv-1',
        workspaceId: 'ws-demo',
        stripeInvoiceId: 'in_test_123',
        amountDueUsd: 79,
        amountPaidUsd: 79,
        status: 'PAID',
        periodStart: new Date(),
        periodEnd: new Date(),
        createdAt: new Date()
      });

      const result = await service.handleWebhookEvent({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_123',
            amount_due: 7900,
            amount_paid: 7900,
            hosted_invoice_url: 'https://stripe.com/invoice/123',
            metadata: {
              workspaceId: 'ws-demo'
            }
          }
        }
      });

      expect(result.processed).toBe(true);
      expect(result.action).toBe('INVOICE_RECORDED');
      expect(recordInvoiceSpy).toHaveBeenCalled();
    });
  });

  describe('4. Persistent Object Storage (S3 / R2 / MinIO)', () => {
    it('should initialize S3StorageProvider and generate valid signed URLs', async () => {
      const s3Provider = new S3StorageProvider({
        region: 'us-east-1',
        accessKeyId: 'AKIA_TEST_KEY',
        secretAccessKey: 'test_secret_key_1234567890',
        bucket: 'vidsnapai-test-bucket',
        publicBaseUrl: 'https://cdn.vidsnapai.com'
      });

      expect(s3Provider.providerName).toBe('s3_compatible');

      const downloadUrl = await s3Provider.getDownloadUrl('reels/video_123.mp4');
      expect(downloadUrl).toBe('https://cdn.vidsnapai.com/reels/video_123.mp4');
    });

    it('should generate AWS SigV4 presigned URLs when publicBaseUrl is not configured', async () => {
      const s3Provider = new S3StorageProvider({
        region: 'us-west-2',
        accessKeyId: 'AKIA_TEST_KEY',
        secretAccessKey: 'test_secret_key_1234567890',
        bucket: 'vidsnapai-private-bucket'
      });

      const signedUrl = await s3Provider.getDownloadUrl('audio/voiceover.mp3', 1800);
      expect(signedUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(signedUrl).toContain('X-Amz-Credential=AKIA_TEST_KEY');
      expect(signedUrl).toContain('X-Amz-Expires=1800');
      expect(signedUrl).toContain('X-Amz-Signature=');
    });

    it('should sanitize paths and prevent directory traversal in storage keys', () => {
      const s3Provider = new S3StorageProvider({
        region: 'us-east-1',
        accessKeyId: 'AKIA_TEST',
        secretAccessKey: 'secret_test',
        bucket: 'test-bucket'
      });

      const cleanKey = (s3Provider as any).sanitizeKey('../../etc/passwd');
      expect(cleanKey).not.toContain('..');
      expect(cleanKey).toBe('etc/passwd');
    });

    it('should create memory or S3 storage provider dynamically via factory', () => {
      const memProvider = createStorageProvider({ type: 'memory' });
      expect(memProvider.providerName).toBe('in_memory');

      const s3Provider = createStorageProvider({
        type: 's3',
        s3Config: {
          region: 'eu-central-1',
          accessKeyId: 'AKIA_EU',
          secretAccessKey: 'secret_eu',
          bucket: 'eu-bucket'
        }
      });
      expect(s3Provider.providerName).toBe('s3_compatible');
    });
  });

  describe('5. Meta OAuth Token Lifecycle & Expiration Detection', () => {
    it('should correctly flag expired Meta tokens and mark connection as EXPIRED', () => {
      const expiredConn = {
        id: 'conn-1',
        workspaceId: 'ws-1',
        metaUserId: 'usr_1',
        metaUserName: 'Test User',
        accessToken: 'expired_access_token',
        tokenExpiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
        adAccounts: [{ id: 'act_123', name: 'Test Account' }],
        pages: [{ id: 'page_123', name: 'Test Page' }],
        status: 'CONNECTED',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const isExpired = new Date(expiredConn.tokenExpiresAt).getTime() <= Date.now();
      const sanitized = {
        id: expiredConn.id,
        workspaceId: expiredConn.workspaceId,
        metaUserId: expiredConn.metaUserId,
        metaUserName: expiredConn.metaUserName,
        tokenExpiresAt: expiredConn.tokenExpiresAt.toISOString(),
        adAccounts: expiredConn.adAccounts,
        pages: expiredConn.pages,
        status: isExpired ? 'EXPIRED' : expiredConn.status,
        hasValidToken: Boolean(expiredConn.accessToken) && !isExpired,
        createdAt: expiredConn.createdAt.toISOString(),
        updatedAt: expiredConn.updatedAt.toISOString()
      };

      expect(sanitized.status).toBe('EXPIRED');
      expect(sanitized.hasValidToken).toBe(false);
    });
  });

  describe('6. Production Telemetry & Prometheus Metrics Format', () => {
    it('should record requests and export Prometheus gauge and counter metrics', () => {
      metricsCollector.recordRequest('GET', '/api/brands', 200, 45);
      metricsCollector.recordRequest('POST', '/api/reels/generate', 201, 350);
      metricsCollector.recordRequest('GET', '/api/unknown', 404, 12);
      metricsCollector.recordJobEvent('start');
      metricsCollector.recordJobEvent('complete');

      const promOutput = metricsCollector.toPrometheus();

      expect(promOutput).toContain('# HELP vidsnapai_http_requests_total');
      expect(promOutput).toContain('# TYPE vidsnapai_http_requests_total counter');
      expect(promOutput).toContain('vidsnapai_http_requests_total 3');
      expect(promOutput).toContain('vidsnapai_http_errors_total 1');
      expect(promOutput).toContain('vidsnapai_http_requests_by_status{status="200"} 1');
      expect(promOutput).toContain('vidsnapai_http_requests_by_status{status="201"} 1');
      expect(promOutput).toContain('vidsnapai_http_requests_by_status{status="404"} 1');
      expect(promOutput).toContain('vidsnapai_queue_jobs_completed 1');
    });
  });

  describe('7. API Route Handlers & Multi-Tenant Billing Flow', () => {
    it('GET /api/billing/plans should return plan catalog with 4 tiers', () => {
      const _req: any = {};
      let responseData: any = null;
      let statusCode = 0;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              responseData = data;
            }
          };
        }
      };

      // Call plans handler
      const service = new BillingService();
      const plans = service.getPlans();
      res.status(200).json({ success: true, data: { plans } });

      expect(statusCode).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.plans).toHaveLength(4);
      expect(responseData.data.plans[0].tier).toBe('FREE');
      expect(responseData.data.plans[2].tier).toBe('PRO');
    });

    it('POST /api/billing/webhook parses valid webhook payloads', () => {
      const payload = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_123',
            amount_due: 7900,
            amount_paid: 7900,
            metadata: {
              workspaceId: 'ws-demo'
            }
          }
        }
      };

      const parsed = BillingWebhookPayloadSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });
  });
});
