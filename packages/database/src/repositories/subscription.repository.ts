import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '../client.js';
import {
  workspaceSubscriptions,
  workspaceUsageRecords,
  billingInvoices,
  type WorkspaceSubscriptionRow,
  type WorkspaceUsageRecordRow,
  type BillingInvoiceRow,
  type NewWorkspaceSubscriptionRow,
  type NewWorkspaceUsageRecordRow,
  type NewBillingInvoiceRow
} from '../schema/index.js';
import type {
  WorkspaceSubscription,
  WorkspaceUsageRecord,
  BillingInvoice,
  SubscriptionTier,
  SubscriptionStatus,
  TierLimits,
  TierLimitCheckResult
} from '@vidsnapai/types';

export const TIER_LIMITS_MAP: Record<SubscriptionTier, TierLimits> = {
  FREE: {
    maxReelsPerMonth: 5,
    maxBrands: 1,
    maxTeamMembers: 1,
    maxCampaignsPerMonth: 1,
    maxDailyAdSpend: 0,
    autonomousEngineEnabled: false,
    metaPublishingEnabled: false,
    exportResolution: '720p',
    storageLimitGb: 1,
    supportLevel: 'community'
  },
  STARTER: {
    maxReelsPerMonth: 30,
    maxBrands: 2,
    maxTeamMembers: 3,
    maxCampaignsPerMonth: 3,
    maxDailyAdSpend: 50,
    autonomousEngineEnabled: false,
    metaPublishingEnabled: true,
    exportResolution: '1080p',
    storageLimitGb: 10,
    supportLevel: 'standard'
  },
  PRO: {
    maxReelsPerMonth: 150,
    maxBrands: 10,
    maxTeamMembers: 10,
    maxCampaignsPerMonth: 15,
    maxDailyAdSpend: 500,
    autonomousEngineEnabled: true,
    metaPublishingEnabled: true,
    exportResolution: '4k',
    storageLimitGb: 50,
    supportLevel: 'priority'
  },
  ENTERPRISE: {
    maxReelsPerMonth: -1,
    maxBrands: -1,
    maxTeamMembers: -1,
    maxCampaignsPerMonth: -1,
    maxDailyAdSpend: 5000,
    autonomousEngineEnabled: true,
    metaPublishingEnabled: true,
    exportResolution: '4k',
    storageLimitGb: 500,
    supportLevel: 'dedicated'
  }
};

export function getCurrentPeriodMonth(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function mapSubscriptionRow(row: WorkspaceSubscriptionRow): WorkspaceSubscription {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    tier: row.tier as SubscriptionTier,
    status: row.status as SubscriptionStatus,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    stripePriceId: row.stripePriceId,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    metadata: row.metadata || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function mapUsageRow(row: WorkspaceUsageRecordRow): WorkspaceUsageRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    periodMonth: row.periodMonth,
    reelsGenerated: row.reelsGenerated,
    reelsRendered: row.reelsRendered,
    reelsPublished: row.reelsPublished,
    campaignsCreated: row.campaignsCreated,
    storageUsedBytes: row.storageUsedBytes,
    metaAdsSpend: row.metaAdsSpend,
    aiTokensUsed: row.aiTokensUsed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function mapInvoiceRow(row: BillingInvoiceRow): BillingInvoice {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    stripeInvoiceId: row.stripeInvoiceId,
    amountDueUsd: row.amountDueUsd,
    amountPaidUsd: row.amountPaidUsd,
    status: row.status as any,
    invoiceUrl: row.invoiceUrl,
    pdfUrl: row.pdfUrl,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    paidAt: row.paidAt,
    createdAt: row.createdAt
  };
}

export class SubscriptionRepository {
  constructor(private db: Database) {}

  async getForWorkspace(workspaceId: string): Promise<WorkspaceSubscription> {
    const [found] = await this.db
      .select()
      .from(workspaceSubscriptions)
      .where(eq(workspaceSubscriptions.workspaceId, workspaceId))
      .limit(1);

    if (found) {
      return mapSubscriptionRow(found);
    }

    // Default to FREE active subscription
    const values: NewWorkspaceSubscriptionRow = {
      workspaceId,
      tier: 'FREE',
      status: 'ACTIVE',
      cancelAtPeriodEnd: false
    };

    const [created] = await this.db.insert(workspaceSubscriptions).values(values).returning();
    return mapSubscriptionRow(created);
  }

  async upsertSubscription(data: Partial<NewWorkspaceSubscriptionRow> & { workspaceId: string }): Promise<WorkspaceSubscription> {
    const existing = await this.db
      .select()
      .from(workspaceSubscriptions)
      .where(eq(workspaceSubscriptions.workspaceId, data.workspaceId))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await this.db
        .update(workspaceSubscriptions)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(workspaceSubscriptions.workspaceId, data.workspaceId))
        .returning();
      return mapSubscriptionRow(updated);
    }

    const [inserted] = await this.db
      .insert(workspaceSubscriptions)
      .values({
        workspaceId: data.workspaceId,
        tier: data.tier || 'FREE',
        status: data.status || 'ACTIVE',
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripePriceId: data.stripePriceId,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        metadata: data.metadata || {}
      })
      .returning();

    return mapSubscriptionRow(inserted);
  }

  async getUsage(workspaceId: string, periodMonth = getCurrentPeriodMonth()): Promise<WorkspaceUsageRecord> {
    const [found] = await this.db
      .select()
      .from(workspaceUsageRecords)
      .where(
        and(
          eq(workspaceUsageRecords.workspaceId, workspaceId),
          eq(workspaceUsageRecords.periodMonth, periodMonth)
        )
      )
      .limit(1);

    if (found) {
      return mapUsageRow(found);
    }

    const values: NewWorkspaceUsageRecordRow = {
      workspaceId,
      periodMonth,
      reelsGenerated: 0,
      reelsRendered: 0,
      reelsPublished: 0,
      campaignsCreated: 0,
      storageUsedBytes: 0,
      metaAdsSpend: 0,
      aiTokensUsed: 0
    };

    const [created] = await this.db.insert(workspaceUsageRecords).values(values).returning();
    return mapUsageRow(created);
  }

  async incrementUsage(
    workspaceId: string,
    field: 'reelsGenerated' | 'reelsRendered' | 'reelsPublished' | 'campaignsCreated' | 'aiTokensUsed',
    amount = 1,
    periodMonth = getCurrentPeriodMonth()
  ): Promise<WorkspaceUsageRecord> {
    const current = await this.getUsage(workspaceId, periodMonth);
    const updatedValue = (current[field] || 0) + amount;

    const [updated] = await this.db
      .update(workspaceUsageRecords)
      .set({
        [field]: updatedValue,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(workspaceUsageRecords.workspaceId, workspaceId),
          eq(workspaceUsageRecords.periodMonth, periodMonth)
        )
      )
      .returning();

    return mapUsageRow(updated);
  }

  async checkLimit(
    workspaceId: string,
    action: 'CREATE_REEL' | 'CREATE_CAMPAIGN' | 'AUTONOMOUS_OPERATIONS' | 'META_PUBLISHING',
    currentUsageOverride?: number
  ): Promise<TierLimitCheckResult> {
    const sub = await this.getForWorkspace(workspaceId);
    const tier = sub.tier;
    const limits = TIER_LIMITS_MAP[tier] || TIER_LIMITS_MAP.FREE;
    const usage = await this.getUsage(workspaceId);

    if (action === 'CREATE_REEL') {
      const currentUsage = currentUsageOverride !== undefined ? currentUsageOverride : usage.reelsGenerated;
      const allowed = limits.maxReelsPerMonth === -1 || currentUsage < limits.maxReelsPerMonth;
      return {
        allowed,
        tier,
        feature: 'Monthly Reel Generation',
        currentUsage,
        limit: limits.maxReelsPerMonth,
        reason: allowed
          ? undefined
          : `Monthly limit of ${limits.maxReelsPerMonth} reels reached for ${tier} tier. Upgrade your plan to continue generating.`,
        upgradeRequired: !allowed
      };
    }

    if (action === 'CREATE_CAMPAIGN') {
      const currentUsage = currentUsageOverride !== undefined ? currentUsageOverride : usage.campaignsCreated;
      const allowed = limits.maxCampaignsPerMonth === -1 || currentUsage < limits.maxCampaignsPerMonth;
      return {
        allowed,
        tier,
        feature: 'Monthly Campaign Creation',
        currentUsage,
        limit: limits.maxCampaignsPerMonth,
        reason: allowed
          ? undefined
          : `Monthly campaign creation limit (${limits.maxCampaignsPerMonth}) reached for ${tier} tier.`,
        upgradeRequired: !allowed
      };
    }

    if (action === 'AUTONOMOUS_OPERATIONS') {
      const allowed = limits.autonomousEngineEnabled;
      return {
        allowed,
        tier,
        feature: 'Autonomous Self-Optimizing Engine',
        currentUsage: allowed ? 1 : 0,
        limit: allowed ? 1 : 0,
        reason: allowed ? undefined : `Autonomous 24/7 self-optimizing engine requires a Pro or Enterprise plan. Upgrade to unlock full automation.`,
        upgradeRequired: !allowed
      };
    }

    if (action === 'META_PUBLISHING') {
      const allowed = limits.metaPublishingEnabled;
      return {
        allowed,
        tier,
        feature: 'Direct Meta Ads Publishing',
        currentUsage: allowed ? 1 : 0,
        limit: allowed ? 1 : 0,
        reason: allowed ? undefined : `Direct Meta Ads publishing requires a Starter, Pro, or Enterprise plan.`,
        upgradeRequired: !allowed
      };
    }

    return {
      allowed: true,
      tier,
      feature: action,
      currentUsage: 0,
      limit: 1000
    };
  }

  async listInvoices(workspaceId: string): Promise<BillingInvoice[]> {
    const rows = await this.db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.workspaceId, workspaceId))
      .orderBy(desc(billingInvoices.createdAt));
    return rows.map(mapInvoiceRow);
  }

  async recordInvoice(data: NewBillingInvoiceRow): Promise<BillingInvoice> {
    const [inserted] = await this.db.insert(billingInvoices).values(data).returning();
    return mapInvoiceRow(inserted);
  }
}
