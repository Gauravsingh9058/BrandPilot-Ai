import { eq, and } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import {
  metaConnections,
  metaAdCampaigns,
  metaAdSets,
  metaAdCreatives,
  metaAds,
  metaAdPublications,
  type MetaConnectionRow,
  type MetaAdCampaignRow,
  type MetaAdSetRow,
  type MetaAdCreativeRow,
  type MetaAdRow,
  type MetaAdPublicationRow
} from '@vidsnapai/database';
import type {
  MetaConnectionRecord,
  MetaAdCampaignRecord,
  MetaAdSetRecord,
  MetaAdCreativeRecord,
  MetaAdRecord,
  MetaAdPublicationRecord,
  MetaAdObjective,
  MetaBuyingType,
  MetaBillingEvent,
  MetaOptimizationGoal,
  MetaAdCallToActionType,
  MetaTargetingSpec,
  MetaAdPublicationStatus
} from '@vidsnapai/types';

export class MetaAdsRepository {
  constructor(private db: Database) {}

  // ==========================================
  // Connection Operations (Workspace-scoped)
  // ==========================================

  async findConnection(workspaceId: string): Promise<MetaConnectionRecord | null> {
    const rows = await this.db
      .select()
      .from(metaConnections)
      .where(eq(metaConnections.workspaceId, workspaceId))
      .limit(1);

    if (!rows || rows.length === 0) return null;
    return this.mapConnectionRow(rows[0]);
  }

  async upsertConnection(data: {
    workspaceId: string;
    metaUserId: string;
    metaUserName: string;
    accessToken?: string;
    tokenExpiresAt?: Date;
    adAccounts?: Array<{ id: string; name: string; accountId: string; currency: string; accountStatus: number; businessName?: string }>;
    pages?: Array<{ id: string; name: string; category?: string; accessToken?: string; instagramActorId?: string }>;
    selectedAdAccountId?: string;
    selectedPageId?: string;
    selectedInstagramActorId?: string;
    status?: 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'ERROR';
  }): Promise<MetaConnectionRecord> {
    const existing = await this.findConnection(data.workspaceId);

    if (existing) {
      const [updated] = await this.db
        .update(metaConnections)
        .set({
          metaUserId: data.metaUserId,
          metaUserName: data.metaUserName,
          accessToken: data.accessToken ?? existing.accessToken,
          tokenExpiresAt: data.tokenExpiresAt ?? existing.tokenExpiresAt,
          adAccounts: data.adAccounts ?? existing.adAccounts,
          pages: data.pages ?? existing.pages,
          selectedAdAccountId: data.selectedAdAccountId ?? existing.selectedAdAccountId,
          selectedPageId: data.selectedPageId ?? existing.selectedPageId,
          selectedInstagramActorId: data.selectedInstagramActorId ?? existing.selectedInstagramActorId,
          status: data.status ?? 'CONNECTED',
          updatedAt: new Date()
        })
        .where(eq(metaConnections.workspaceId, data.workspaceId))
        .returning();

      return this.mapConnectionRow(updated);
    }

    const [created] = await this.db
      .insert(metaConnections)
      .values({
        workspaceId: data.workspaceId,
        metaUserId: data.metaUserId,
        metaUserName: data.metaUserName,
        accessToken: data.accessToken,
        tokenExpiresAt: data.tokenExpiresAt,
        adAccounts: data.adAccounts || [],
        pages: data.pages || [],
        selectedAdAccountId: data.selectedAdAccountId,
        selectedPageId: data.selectedPageId,
        selectedInstagramActorId: data.selectedInstagramActorId,
        status: data.status || 'CONNECTED'
      })
      .returning();

    return this.mapConnectionRow(created);
  }

  async selectAccount(
    workspaceId: string,
    adAccountId: string,
    pageId?: string,
    instagramActorId?: string
  ): Promise<MetaConnectionRecord | null> {
    const [updated] = await this.db
      .update(metaConnections)
      .set({
        selectedAdAccountId: adAccountId,
        ...(pageId ? { selectedPageId: pageId } : {}),
        ...(instagramActorId ? { selectedInstagramActorId: instagramActorId } : {}),
        updatedAt: new Date()
      })
      .where(eq(metaConnections.workspaceId, workspaceId))
      .returning();

    if (!updated) return null;
    return this.mapConnectionRow(updated);
  }

  async deleteConnection(workspaceId: string): Promise<boolean> {
    const res = await this.db
      .delete(metaConnections)
      .where(eq(metaConnections.workspaceId, workspaceId))
      .returning();

    return res.length > 0;
  }

  // ==========================================
  // Meta Campaign Operations
  // ==========================================

  async createCampaign(data: {
    workspaceId: string;
    brandId: string;
    campaignId?: string | null;
    metaAdAccountId: string;
    externalCampaignId: string;
    name: string;
    objective: MetaAdObjective;
    buyingType?: MetaBuyingType;
    status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
    dailyBudget?: number;
    lifetimeBudget?: number;
    specialAdCategories?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<MetaAdCampaignRecord> {
    const [row] = await this.db
      .insert(metaAdCampaigns)
      .values({
        workspaceId: data.workspaceId,
        brandId: data.brandId,
        campaignId: data.campaignId,
        metaAdAccountId: data.metaAdAccountId,
        externalCampaignId: data.externalCampaignId,
        name: data.name,
        objective: data.objective,
        buyingType: data.buyingType || 'AUCTION',
        status: data.status || 'PAUSED',
        dailyBudget: data.dailyBudget,
        lifetimeBudget: data.lifetimeBudget,
        specialAdCategories: data.specialAdCategories || [],
        metadata: data.metadata || {}
      })
      .returning();

    return this.mapCampaignRow(row);
  }

  async findCampaignById(id: string, workspaceId: string): Promise<MetaAdCampaignRecord | null> {
    const rows = await this.db
      .select()
      .from(metaAdCampaigns)
      .where(and(eq(metaAdCampaigns.id, id), eq(metaAdCampaigns.workspaceId, workspaceId)))
      .limit(1);

    if (!rows || rows.length === 0) return null;
    return this.mapCampaignRow(rows[0]);
  }

  async listCampaigns(workspaceId: string, brandId?: string): Promise<MetaAdCampaignRecord[]> {
    const conditions = [eq(metaAdCampaigns.workspaceId, workspaceId)];
    if (brandId) conditions.push(eq(metaAdCampaigns.brandId, brandId));

    const rows = await this.db
      .select()
      .from(metaAdCampaigns)
      .where(and(...conditions));

    return rows.map((r) => this.mapCampaignRow(r));
  }

  // ==========================================
  // Meta Ad Set Operations
  // ==========================================

  async createAdSet(data: {
    workspaceId: string;
    metaAdCampaignId: string;
    externalAdSetId: string;
    name: string;
    status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
    billingEvent?: MetaBillingEvent;
    optimizationGoal?: MetaOptimizationGoal;
    dailyBudget?: number;
    lifetimeBudget?: number;
    targeting?: MetaTargetingSpec;
    startTime?: Date;
    endTime?: Date;
    promotedObject?: Record<string, unknown>;
    bidAmount?: number;
  }): Promise<MetaAdSetRecord> {
    const [row] = await this.db
      .insert(metaAdSets)
      .values({
        workspaceId: data.workspaceId,
        metaAdCampaignId: data.metaAdCampaignId,
        externalAdSetId: data.externalAdSetId,
        name: data.name,
        status: data.status || 'PAUSED',
        billingEvent: data.billingEvent || 'IMPRESSIONS',
        optimizationGoal: data.optimizationGoal || 'LINK_CLICKS',
        dailyBudget: data.dailyBudget,
        lifetimeBudget: data.lifetimeBudget,
        targeting: (data.targeting || {}) as any,
        startTime: data.startTime,
        endTime: data.endTime,
        promotedObject: data.promotedObject || {},
        bidAmount: data.bidAmount
      })
      .returning();

    return this.mapAdSetRow(row);
  }

  async findAdSetById(id: string, workspaceId: string): Promise<MetaAdSetRecord | null> {
    const rows = await this.db
      .select()
      .from(metaAdSets)
      .where(and(eq(metaAdSets.id, id), eq(metaAdSets.workspaceId, workspaceId)))
      .limit(1);

    if (!rows || rows.length === 0) return null;
    return this.mapAdSetRow(rows[0]);
  }

  // ==========================================
  // Meta Creative Operations
  // ==========================================

  async createCreative(data: {
    workspaceId: string;
    brandId: string;
    reelPlanId: string;
    externalCreativeId: string;
    externalVideoId?: string;
    name: string;
    title: string;
    body: string;
    videoUrl: string;
    thumbnailUrl?: string;
    callToActionType?: MetaAdCallToActionType;
    destinationUrl: string;
    linkCaption?: string;
  }): Promise<MetaAdCreativeRecord> {
    const [row] = await this.db
      .insert(metaAdCreatives)
      .values({
        workspaceId: data.workspaceId,
        brandId: data.brandId,
        reelPlanId: data.reelPlanId,
        externalCreativeId: data.externalCreativeId,
        externalVideoId: data.externalVideoId,
        name: data.name,
        title: data.title,
        body: data.body,
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl,
        callToActionType: data.callToActionType || 'LEARN_MORE',
        destinationUrl: data.destinationUrl,
        linkCaption: data.linkCaption
      })
      .returning();

    return this.mapCreativeRow(row);
  }

  async findCreativeByReel(reelPlanId: string, workspaceId: string): Promise<MetaAdCreativeRecord | null> {
    const rows = await this.db
      .select()
      .from(metaAdCreatives)
      .where(and(eq(metaAdCreatives.reelPlanId, reelPlanId), eq(metaAdCreatives.workspaceId, workspaceId)))
      .limit(1);

    if (!rows || rows.length === 0) return null;
    return this.mapCreativeRow(rows[0]);
  }

  // ==========================================
  // Meta Ad Operations
  // ==========================================

  async createAd(data: {
    workspaceId: string;
    metaAdSetId: string;
    metaAdCreativeId: string;
    reelPlanId: string;
    externalAdId: string;
    name: string;
    status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
    trackingSpecs?: Record<string, unknown>;
  }): Promise<MetaAdRecord> {
    const [row] = await this.db
      .insert(metaAds)
      .values({
        workspaceId: data.workspaceId,
        metaAdSetId: data.metaAdSetId,
        metaAdCreativeId: data.metaAdCreativeId,
        reelPlanId: data.reelPlanId,
        externalAdId: data.externalAdId,
        name: data.name,
        status: data.status || 'PAUSED',
        trackingSpecs: data.trackingSpecs || {}
      })
      .returning();

    return this.mapAdRow(row);
  }

  async findAdByReel(reelPlanId: string, workspaceId: string): Promise<MetaAdRecord | null> {
    const rows = await this.db
      .select()
      .from(metaAds)
      .where(and(eq(metaAds.reelPlanId, reelPlanId), eq(metaAds.workspaceId, workspaceId)))
      .limit(1);

    if (!rows || rows.length === 0) return null;
    return this.mapAdRow(rows[0]);
  }

  // ==========================================
  // Meta Publication Log Operations (Idempotency)
  // ==========================================

  async createPublication(data: {
    workspaceId: string;
    brandId: string;
    reelPlanId: string;
    idempotencyKey: string;
    metaCampaignId?: string;
    metaAdSetId?: string;
    metaCreativeId?: string;
    metaAdId?: string;
    status?: MetaAdPublicationStatus;
    metadata?: Record<string, unknown>;
  }): Promise<MetaAdPublicationRecord> {
    const [row] = await this.db
      .insert(metaAdPublications)
      .values({
        workspaceId: data.workspaceId,
        brandId: data.brandId,
        reelPlanId: data.reelPlanId,
        idempotencyKey: data.idempotencyKey,
        metaCampaignId: data.metaCampaignId,
        metaAdSetId: data.metaAdSetId,
        metaCreativeId: data.metaCreativeId,
        metaAdId: data.metaAdId,
        status: data.status || 'PENDING',
        attemptCount: 1,
        metadata: data.metadata || {}
      })
      .returning();

    return this.mapPublicationRow(row);
  }

  async findPublicationById(id: string, workspaceId: string): Promise<MetaAdPublicationRecord | null> {
    const rows = await this.db
      .select()
      .from(metaAdPublications)
      .where(and(eq(metaAdPublications.id, id), eq(metaAdPublications.workspaceId, workspaceId)))
      .limit(1);

    if (!rows || rows.length === 0) return null;
    return this.mapPublicationRow(rows[0]);
  }

  async findPublicationByIdempotencyKey(
    idempotencyKey: string,
    workspaceId: string
  ): Promise<MetaAdPublicationRecord | null> {
    const rows = await this.db
      .select()
      .from(metaAdPublications)
      .where(
        and(
          eq(metaAdPublications.idempotencyKey, idempotencyKey),
          eq(metaAdPublications.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (!rows || rows.length === 0) return null;
    return this.mapPublicationRow(rows[0]);
  }

  async updatePublicationStatus(
    id: string,
    workspaceId: string,
    data: {
      status: MetaAdPublicationStatus;
      metaCampaignId?: string;
      metaAdSetId?: string;
      metaCreativeId?: string;
      metaAdId?: string;
      externalCampaignId?: string;
      externalAdSetId?: string;
      externalCreativeId?: string;
      externalAdId?: string;
      errorCode?: string;
      errorMessage?: string;
      publishedAt?: Date;
      incrementAttempt?: boolean;
    }
  ): Promise<MetaAdPublicationRecord | null> {
    const existing = await this.findPublicationById(id, workspaceId);
    if (!existing) return null;

    const [updated] = await this.db
      .update(metaAdPublications)
      .set({
        status: data.status,
        ...(data.metaCampaignId ? { metaCampaignId: data.metaCampaignId } : {}),
        ...(data.metaAdSetId ? { metaAdSetId: data.metaAdSetId } : {}),
        ...(data.metaCreativeId ? { metaCreativeId: data.metaCreativeId } : {}),
        ...(data.metaAdId ? { metaAdId: data.metaAdId } : {}),
        ...(data.externalCampaignId ? { externalCampaignId: data.externalCampaignId } : {}),
        ...(data.externalAdSetId ? { externalAdSetId: data.externalAdSetId } : {}),
        ...(data.externalCreativeId ? { externalCreativeId: data.externalCreativeId } : {}),
        ...(data.externalAdId ? { externalAdId: data.externalAdId } : {}),
        ...(data.errorCode !== undefined ? { errorCode: data.errorCode } : {}),
        ...(data.errorMessage !== undefined ? { errorMessage: data.errorMessage } : {}),
        ...(data.publishedAt ? { publishedAt: data.publishedAt } : {}),
        ...(data.incrementAttempt ? { attemptCount: existing.attemptCount + 1 } : {}),
        updatedAt: new Date()
      })
      .where(and(eq(metaAdPublications.id, id), eq(metaAdPublications.workspaceId, workspaceId)))
      .returning();

    if (!updated) return null;
    return this.mapPublicationRow(updated);
  }

  async listPublicationsByReel(reelPlanId: string, workspaceId: string): Promise<MetaAdPublicationRecord[]> {
    const rows = await this.db
      .select()
      .from(metaAdPublications)
      .where(
        and(
          eq(metaAdPublications.reelPlanId, reelPlanId),
          eq(metaAdPublications.workspaceId, workspaceId)
        )
      );

    return rows.map((r) => this.mapPublicationRow(r));
  }

  async listPublicationsForBrand(brandId: string, workspaceId: string): Promise<MetaAdPublicationRecord[]> {
    const rows = await this.db
      .select()
      .from(metaAdPublications)
      .where(
        and(
          eq(metaAdPublications.brandId, brandId),
          eq(metaAdPublications.workspaceId, workspaceId)
        )
      );

    return rows.map((r) => this.mapPublicationRow(r));
  }

  async listPublicationsForWorkspace(workspaceId: string): Promise<MetaAdPublicationRecord[]> {
    const rows = await this.db
      .select()
      .from(metaAdPublications)
      .where(eq(metaAdPublications.workspaceId, workspaceId));

    return rows.map((r) => this.mapPublicationRow(r));
  }

  // ==========================================
  // Private Row Mappers
  // ==========================================

  private mapConnectionRow(row: MetaConnectionRow): MetaConnectionRecord {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      metaUserId: row.metaUserId,
      metaUserName: row.metaUserName,
      accessToken: row.accessToken || undefined,
      tokenExpiresAt: row.tokenExpiresAt ? new Date(row.tokenExpiresAt) : undefined,
      adAccounts: (row.adAccounts as any) || [],
      pages: (row.pages as any) || [],
      selectedAdAccountId: row.selectedAdAccountId || undefined,
      selectedPageId: row.selectedPageId || undefined,
      selectedInstagramActorId: row.selectedInstagramActorId || undefined,
      status: (row.status as any) || 'CONNECTED',
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  private mapCampaignRow(row: MetaAdCampaignRow): MetaAdCampaignRecord {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      campaignId: row.campaignId,
      metaAdAccountId: row.metaAdAccountId,
      externalCampaignId: row.externalCampaignId,
      name: row.name,
      objective: row.objective as MetaAdObjective,
      buyingType: (row.buyingType as MetaBuyingType) || 'AUCTION',
      status: row.status as any,
      dailyBudget: row.dailyBudget ?? undefined,
      lifetimeBudget: row.lifetimeBudget ?? undefined,
      specialAdCategories: (row.specialAdCategories as string[]) || [],
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  private mapAdSetRow(row: MetaAdSetRow): MetaAdSetRecord {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      metaAdCampaignId: row.metaAdCampaignId,
      externalAdSetId: row.externalAdSetId,
      name: row.name,
      status: row.status as any,
      billingEvent: (row.billingEvent as MetaBillingEvent) || 'IMPRESSIONS',
      optimizationGoal: (row.optimizationGoal as MetaOptimizationGoal) || 'LINK_CLICKS',
      dailyBudget: row.dailyBudget ?? undefined,
      lifetimeBudget: row.lifetimeBudget ?? undefined,
      targeting: (row.targeting as MetaTargetingSpec) || {},
      startTime: row.startTime ? new Date(row.startTime).toISOString() : undefined,
      endTime: row.endTime ? new Date(row.endTime).toISOString() : undefined,
      promotedObject: (row.promotedObject as Record<string, unknown>) || {},
      bidAmount: row.bidAmount ?? undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  private mapCreativeRow(row: MetaAdCreativeRow): MetaAdCreativeRecord {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      reelPlanId: row.reelPlanId,
      externalCreativeId: row.externalCreativeId,
      externalVideoId: row.externalVideoId || undefined,
      name: row.name,
      title: row.title,
      body: row.body,
      videoUrl: row.videoUrl,
      thumbnailUrl: row.thumbnailUrl || undefined,
      callToActionType: (row.callToActionType as MetaAdCallToActionType) || 'LEARN_MORE',
      destinationUrl: row.destinationUrl,
      linkCaption: row.linkCaption || undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  private mapAdRow(row: MetaAdRow): MetaAdRecord {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      metaAdSetId: row.metaAdSetId,
      metaAdCreativeId: row.metaAdCreativeId,
      reelPlanId: row.reelPlanId,
      externalAdId: row.externalAdId,
      name: row.name,
      status: row.status as any,
      trackingSpecs: (row.trackingSpecs as Record<string, unknown>) || {},
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  private mapPublicationRow(row: MetaAdPublicationRow): MetaAdPublicationRecord {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      reelPlanId: row.reelPlanId,
      metaCampaignId: row.metaCampaignId || undefined,
      metaAdSetId: row.metaAdSetId || undefined,
      metaCreativeId: row.metaCreativeId || undefined,
      metaAdId: row.metaAdId || undefined,
      externalCampaignId: row.externalCampaignId || undefined,
      externalAdSetId: row.externalAdSetId || undefined,
      externalCreativeId: row.externalCreativeId || undefined,
      externalAdId: row.externalAdId || undefined,
      status: row.status as MetaAdPublicationStatus,
      idempotencyKey: row.idempotencyKey,
      attemptCount: row.attemptCount,
      errorCode: row.errorCode || undefined,
      errorMessage: row.errorMessage || undefined,
      publishedAt: row.publishedAt ? new Date(row.publishedAt) : undefined,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }
}
