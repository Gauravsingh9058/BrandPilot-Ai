import type { Database } from '@vidsnapai/database';
import type {
  MetaConnectionSanitized,
  PrepareMetaAdCreativeInput,
  PublishMetaAdInput,
  MetaAdPublishResult,
  MetaAdCreativeRecord,
  MetaAdPublicationRecord
} from '@vidsnapai/types';
import { MetaAdsRepository } from '../repositories/meta-ads.repository.js';
import { ReelProductionPlanRepository } from '../repositories/reel-production-plan.repository.js';
import { MetaApiClient } from './metaApiClient.js';
import { LifecycleValidator } from '../workflow/lifecycleValidator.js';

export class MetaAdsService {
  private metaRepo: MetaAdsRepository;
  private reelRepo: ReelProductionPlanRepository;
  private metaClient: MetaApiClient;

  constructor(
    private db: Database,
    options?: {
      metaRepo?: MetaAdsRepository;
      reelRepo?: ReelProductionPlanRepository;
      metaClient?: MetaApiClient;
    }
  ) {
    this.metaRepo = options?.metaRepo || new MetaAdsRepository(db);
    this.reelRepo = options?.reelRepo || new ReelProductionPlanRepository(db);
    this.metaClient = options?.metaClient || new MetaApiClient();
  }

  /**
   * Generate secure Meta OAuth authorization URL.
   */
  getOAuthUrl(workspaceId: string, redirectUri?: string): string {
    const clientId = process.env.META_APP_ID || 'mock_meta_app_id';
    const callbackUri =
      redirectUri || process.env.META_REDIRECT_URI || 'http://localhost:4000/api/meta/auth/callback';

    // State payload carries workspaceId securely
    const statePayload = Buffer.from(
      JSON.stringify({ workspaceId, timestamp: Date.now() })
    ).toString('base64url');

    return this.metaClient.getOAuthUrl({
      clientId,
      redirectUri: callbackUri,
      state: statePayload
    });
  }

  /**
   * Handle OAuth callback & store workspace-level Meta connection.
   */
  async handleOAuthCallback(params: {
    workspaceId: string;
    code: string;
    redirectUri?: string;
  }): Promise<MetaConnectionSanitized> {
    const { workspaceId, code, redirectUri } = params;

    const clientId = process.env.META_APP_ID || 'mock_meta_app_id';
    const clientSecret = process.env.META_APP_SECRET || '';
    const callbackUri =
      redirectUri || process.env.META_REDIRECT_URI || 'http://localhost:4000/api/meta/auth/callback';

    const tokenData = await this.metaClient.exchangeCodeForToken({
      clientId,
      clientSecret,
      redirectUri: callbackUri,
      code
    });

    const [adAccounts, pages] = await Promise.all([
      this.metaClient.getAdAccounts(tokenData.accessToken),
      this.metaClient.getPages(tokenData.accessToken)
    ]);

    const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);

    const record = await this.metaRepo.upsertConnection({
      workspaceId,
      metaUserId: tokenData.userId,
      metaUserName: tokenData.userName,
      accessToken: tokenData.accessToken,
      tokenExpiresAt: expiresAt,
      adAccounts,
      pages,
      selectedAdAccountId: adAccounts[0]?.id,
      selectedPageId: pages[0]?.id,
      selectedInstagramActorId: pages[0]?.instagramActorId,
      status: 'CONNECTED'
    });

    return this.sanitizeConnection(record);
  }

  /**
   * Get sanitized connection record for workspace (never leaking access token).
   */
  async getConnection(workspaceId: string): Promise<MetaConnectionSanitized | null> {
    const conn = await this.metaRepo.findConnection(workspaceId);
    if (!conn) return null;
    return this.sanitizeConnection(conn);
  }

  /**
   * Select active Ad Account and Page for the workspace.
   */
  async selectAdAccount(params: {
    workspaceId: string;
    adAccountId: string;
    pageId?: string;
    instagramActorId?: string;
  }): Promise<MetaConnectionSanitized> {
    const { workspaceId, adAccountId, pageId, instagramActorId } = params;

    const updated = await this.metaRepo.selectAccount(
      workspaceId,
      adAccountId,
      pageId,
      instagramActorId
    );

    if (!updated) {
      throw new Error(`Meta connection not found for workspace "${workspaceId}".`);
    }

    return this.sanitizeConnection(updated);
  }

  /**
   * Disconnect Meta integration for workspace.
   */
  async disconnect(workspaceId: string): Promise<boolean> {
    return this.metaRepo.deleteConnection(workspaceId);
  }

  /**
   * Prepare an approved reel for Meta Ads (Validating approval & creating creative).
   */
  async prepareReelForAds(params: PrepareMetaAdCreativeInput): Promise<MetaAdCreativeRecord> {
    const { reelPlanId, workspaceId, brandId, title, body, callToActionType, destinationUrl, linkCaption } =
      params;

    const reel = await this.reelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
    if (!reel) {
      throw new Error(`Reel "${reelPlanId}" not found in workspace "${workspaceId}".`);
    }

    // Authoritative approval check
    if (reel.status !== 'APPROVED' && reel.status !== 'READY_FOR_ADS' && reel.status !== 'COMPLETED') {
      throw new Error(
        `Cannot prepare reel "${reelPlanId}" for Meta Ads: Reel status is "${reel.status}". Reel must be APPROVED first.`
      );
    }

    // Video render validation
    const videoUrl = reel.outputVideoUrl || reel.renderOutput?.outputVideoUrl;
    if (!videoUrl) {
      throw new Error(
        `Cannot prepare reel "${reelPlanId}" for Meta Ads: Video rendering is not completed.`
      );
    }

    // Lifecycle state transition
    LifecycleValidator.validateTransition(reel.status, 'READY_FOR_ADS');
    await this.reelRepo.updateStatus(reelPlanId, 'READY_FOR_ADS');

    const creativeTitle = title || reel.title || 'VidSnapAI Ad Creative';
    const creativeBody =
      body || (reel.concept as any)?.caption || (reel.hook as any)?.text || reel.title || '';
    const creativeCta = callToActionType || 'LEARN_MORE';
    const creativeDestUrl = destinationUrl || (reel.cta as any)?.url || 'https://vidsnapai.com';

    const existingCreative = await this.metaRepo.findCreativeByReel(reelPlanId, workspaceId);
    if (existingCreative) {
      return existingCreative;
    }

    return this.metaRepo.createCreative({
      workspaceId,
      brandId,
      reelPlanId,
      externalCreativeId: `meta_crt_${reelPlanId.slice(0, 8)}_${Date.now()}`,
      name: `${reel.title} - Ad Creative`,
      title: creativeTitle,
      body: creativeBody,
      videoUrl,
      callToActionType: creativeCta,
      destinationUrl: creativeDestUrl,
      linkCaption
    });
  }

  /**
   * Full Meta Campaign, Ad Set, Creative, and Ad Publishing Flow.
   */
  async publishToMeta(params: PublishMetaAdInput): Promise<MetaAdPublishResult> {
    const {
      reelPlanId,
      workspaceId,
      brandId,
      campaignId,
      metaAdAccountId,
      metaCampaignName,
      metaCampaignObjective = 'OUTCOME_TRAFFIC',
      dailyBudget = 2000, // $20.00 in cents
      lifetimeBudget,
      metaAdSetName,
      targeting,
      primaryText,
      headline,
      callToActionType = 'LEARN_MORE',
      destinationUrl,
      idempotencyKey
    } = params;

    const reel = await this.reelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
    if (!reel) {
      throw new Error(`Reel "${reelPlanId}" not found in workspace "${workspaceId}".`);
    }

    // Fetch Meta Connection
    const connection = await this.metaRepo.findConnection(workspaceId);
    const activeAdAccountId =
      metaAdAccountId || connection?.selectedAdAccountId || (connection?.adAccounts as any)?.[0]?.id || 'act_default';

    // Idempotency check: Return existing published record immediately
    const idempKey = idempotencyKey || `meta_pub_${workspaceId}_${reelPlanId}_${Date.now()}`;
    let publication = await this.metaRepo.findPublicationByIdempotencyKey(idempKey, workspaceId);

    if (publication && publication.status === 'PUBLISHED') {
      return {
        success: true,
        publicationId: publication.id,
        reelPlanId,
        workspaceId,
        campaignId: publication.metaCampaignId,
        externalCampaignId: publication.externalCampaignId,
        adSetId: publication.metaAdSetId,
        externalAdSetId: publication.externalAdSetId,
        creativeId: publication.metaCreativeId,
        externalCreativeId: publication.externalCreativeId,
        adId: publication.metaAdId,
        externalAdId: publication.externalAdId,
        adsManagerUrl: `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${activeAdAccountId.replace(
          'act_',
          ''
        )}`,
        status: 'PUBLISHED',
        publishedAt: publication.publishedAt?.toISOString() || new Date().toISOString()
      };
    }

    // Authoritative approval check
    if (
      reel.status !== 'APPROVED' &&
      reel.status !== 'READY_FOR_ADS' &&
      reel.status !== 'PUBLISHED_TO_META'
    ) {
      throw new Error(
        `Meta Ads publishing rejected: Reel "${reelPlanId}" has status "${reel.status}". It must be APPROVED before launching ads.`
      );
    }

    const videoUrl = reel.outputVideoUrl || reel.renderOutput?.outputVideoUrl;
    if (!videoUrl) {
      throw new Error(
        `Meta Ads publishing rejected: Reel "${reelPlanId}" does not have a rendered video output.`
      );
    }

    if (!activeAdAccountId || activeAdAccountId === 'act_default') {
      if (!connection || (!connection.selectedAdAccountId && (!connection.adAccounts || connection.adAccounts.length === 0))) {
        throw new Error(
          `No active Meta Ad Account configured for workspace "${workspaceId}". Please connect Meta Ads first.`
        );
      }
    }

    const accessToken = connection?.accessToken || process.env.META_ACCESS_TOKEN || 'mock_token';

    if (!publication) {
      publication = await this.metaRepo.createPublication({
        workspaceId,
        brandId,
        reelPlanId,
        idempotencyKey: idempKey,
        status: 'PUBLISHING'
      });
    } else {
      publication = (await this.metaRepo.updatePublicationStatus(publication.id, workspaceId, {
        status: 'PUBLISHING',
        incrementAttempt: true
      }))!;
    }

    try {
      // Step 1: Create Meta Campaign
      const campName = metaCampaignName || `${reel.title} - Ad Campaign`;
      const metaCampaignResult = await this.metaClient.createCampaign(
        activeAdAccountId,
        {
          name: campName,
          objective: metaCampaignObjective,
          status: 'PAUSED',
          daily_budget: dailyBudget,
          lifetime_budget: lifetimeBudget
        },
        accessToken
      );

      const dbCampaign = await this.metaRepo.createCampaign({
        workspaceId,
        brandId,
        campaignId,
        metaAdAccountId: activeAdAccountId,
        externalCampaignId: metaCampaignResult.id,
        name: campName,
        objective: metaCampaignObjective,
        buyingType: 'AUCTION',
        status: 'PAUSED',
        dailyBudget,
        lifetimeBudget
      });

      // Step 2: Create Meta Ad Set
      const adSetName = metaAdSetName || `${reel.title} - Reels Ad Set`;
      const metaAdSetResult = await this.metaClient.createAdSet(
        activeAdAccountId,
        {
          name: adSetName,
          campaign_id: metaCampaignResult.id,
          status: 'PAUSED',
          daily_budget: dailyBudget,
          lifetime_budget: lifetimeBudget,
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'LINK_CLICKS',
          targeting: targeting || {
            geoLocations: { countries: ['US'] },
            publisherPlatforms: ['facebook', 'instagram'],
            facebookPositions: ['facebook_reels'],
            instagramPositions: ['reels']
          }
        },
        accessToken
      );

      const dbAdSet = await this.metaRepo.createAdSet({
        workspaceId,
        metaAdCampaignId: dbCampaign.id,
        externalAdSetId: metaAdSetResult.id,
        name: adSetName,
        status: 'PAUSED',
        billingEvent: 'IMPRESSIONS',
        optimizationGoal: 'LINK_CLICKS',
        dailyBudget,
        lifetimeBudget,
        targeting
      });

      // Step 3: Upload Video / Create Meta Ad Creative
      const finalTitle = headline || reel.title || 'VidSnapAI High-Converting Reel';
      const finalBody =
        primaryText || (reel.concept as any)?.caption || (reel.hook as any)?.text || reel.title || '';
      const finalDestUrl = destinationUrl || (reel.cta as any)?.url || 'https://vidsnapai.com';

      const metaVideoResult = await this.metaClient.uploadVideo(activeAdAccountId, videoUrl, accessToken);

      const metaCreativeResult = await this.metaClient.createAdCreative(
        activeAdAccountId,
        {
          name: `${reel.title} - Creative`,
          title: finalTitle,
          body: finalBody,
          video_id: metaVideoResult.id,
          video_url: videoUrl,
          call_to_action: {
            type: callToActionType,
            value: {
              link: finalDestUrl
            }
          }
        },
        accessToken
      );

      const dbCreative = await this.metaRepo.createCreative({
        workspaceId,
        brandId,
        reelPlanId,
        externalCreativeId: metaCreativeResult.id,
        externalVideoId: metaVideoResult.id,
        name: `${reel.title} - Creative`,
        title: finalTitle,
        body: finalBody,
        videoUrl,
        callToActionType,
        destinationUrl: finalDestUrl
      });

      // Step 4: Create Meta Ad
      const adName = `${reel.title} - Video Ad`;
      const metaAdResult = await this.metaClient.createAd(
        activeAdAccountId,
        {
          name: adName,
          adset_id: metaAdSetResult.id,
          creative: {
            creative_id: metaCreativeResult.id
          },
          status: 'PAUSED'
        },
        accessToken
      );

      const dbAd = await this.metaRepo.createAd({
        workspaceId,
        metaAdSetId: dbAdSet.id,
        metaAdCreativeId: dbCreative.id,
        reelPlanId,
        externalAdId: metaAdResult.id,
        name: adName,
        status: 'PAUSED'
      });

      // Step 5: Update Publication and Reel Status
      const publishedAt = new Date();
      const updatedPublication = await this.metaRepo.updatePublicationStatus(
        publication.id,
        workspaceId,
        {
          status: 'PUBLISHED',
          metaCampaignId: dbCampaign.id,
          metaAdSetId: dbAdSet.id,
          metaCreativeId: dbCreative.id,
          metaAdId: dbAd.id,
          externalCampaignId: metaCampaignResult.id,
          externalAdSetId: metaAdSetResult.id,
          externalCreativeId: metaCreativeResult.id,
          externalAdId: metaAdResult.id,
          publishedAt
        }
      );

      LifecycleValidator.validateTransition(reel.status, 'PUBLISHED_TO_META');
      await this.reelRepo.updateStatus(reelPlanId, 'PUBLISHED_TO_META');

      const adsManagerUrl = `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${activeAdAccountId.replace(
        'act_',
        ''
      )}`;

      return {
        success: true,
        publicationId: updatedPublication!.id,
        reelPlanId,
        workspaceId,
        campaignId: dbCampaign.id,
        externalCampaignId: metaCampaignResult.id,
        adSetId: dbAdSet.id,
        externalAdSetId: metaAdSetResult.id,
        creativeId: dbCreative.id,
        externalCreativeId: metaCreativeResult.id,
        adId: dbAd.id,
        externalAdId: metaAdResult.id,
        adsManagerUrl,
        status: 'PUBLISHED',
        publishedAt: publishedAt.toISOString()
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown Meta Ads publish error';
      await this.metaRepo.updatePublicationStatus(publication.id, workspaceId, {
        status: 'FAILED',
        errorCode: 'META_PUBLISH_FAILED',
        errorMessage: errorMsg
      });

      await this.reelRepo.updateStatus(reelPlanId, 'PUBLISH_FAILED').catch(() => null);

      return {
        success: false,
        publicationId: publication.id,
        reelPlanId,
        workspaceId,
        status: 'FAILED',
        errorCode: 'META_PUBLISH_FAILED',
        errorMessage: errorMsg
      };
    }
  }

  async getPublications(
    reelPlanId: string,
    workspaceId: string
  ): Promise<MetaAdPublicationRecord[]> {
    return this.metaRepo.listPublicationsByReel(reelPlanId, workspaceId);
  }

  private sanitizeConnection(conn: {
    id: string;
    workspaceId: string;
    metaUserId: string;
    metaUserName: string;
    accessToken?: string;
    tokenExpiresAt?: Date;
    adAccounts: any[];
    pages: any[];
    selectedAdAccountId?: string;
    selectedPageId?: string;
    selectedInstagramActorId?: string;
    status: any;
    createdAt: Date;
    updatedAt: Date;
  }): MetaConnectionSanitized {
    const isExpired = conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).getTime() <= Date.now() : false;
    return {
      id: conn.id,
      workspaceId: conn.workspaceId,
      metaUserId: conn.metaUserId,
      metaUserName: conn.metaUserName,
      tokenExpiresAt: conn.tokenExpiresAt ? conn.tokenExpiresAt.toISOString() : undefined,
      adAccounts: conn.adAccounts || [],
      pages: conn.pages || [],
      selectedAdAccountId: conn.selectedAdAccountId,
      selectedPageId: conn.selectedPageId,
      selectedInstagramActorId: conn.selectedInstagramActorId,
      status: isExpired ? 'EXPIRED' : conn.status,
      hasValidToken: Boolean(conn.accessToken) && !isExpired,
      createdAt: conn.createdAt.toISOString(),
      updatedAt: conn.updatedAt.toISOString()
    };
  }
}
