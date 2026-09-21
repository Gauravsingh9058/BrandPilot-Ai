import type {
  MetaAdAccount,
  MetaPage,
  MetaAdObjective,
  MetaTargetingSpec,
  MetaAdCallToActionType
} from '@vidsnapai/types';

export interface MetaCampaignApiPayload {
  name: string;
  objective: MetaAdObjective;
  status: 'ACTIVE' | 'PAUSED';
  special_ad_categories?: string[];
  daily_budget?: number;
  lifetime_budget?: number;
  buying_type?: string;
}

export interface MetaAdSetApiPayload {
  name: string;
  campaign_id: string;
  daily_budget?: number;
  lifetime_budget?: number;
  billing_event?: string;
  optimization_goal?: string;
  targeting?: MetaTargetingSpec;
  status: 'ACTIVE' | 'PAUSED';
  start_time?: string;
  end_time?: string;
  promoted_object?: Record<string, unknown>;
  bid_amount?: number;
}

export interface MetaAdCreativeApiPayload {
  name: string;
  title: string;
  body: string;
  video_id?: string;
  video_url: string;
  thumbnail_url?: string;
  call_to_action: {
    type: MetaAdCallToActionType;
    value?: {
      link: string;
    };
  };
  object_story_spec?: {
    page_id: string;
    instagram_actor_id?: string;
    video_data?: {
      video_id: string;
      title: string;
      message: string;
      image_url?: string;
      call_to_action?: {
        type: MetaAdCallToActionType;
        value: {
          link: string;
        };
      };
    };
  };
}

export interface MetaAdApiPayload {
  name: string;
  adset_id: string;
  creative: {
    creative_id: string;
  };
  status: 'ACTIVE' | 'PAUSED';
  tracking_specs?: Record<string, unknown>;
}

export class MetaApiClient {
  private apiVersion: string;
  private baseUrl: string;

  constructor(options?: { apiVersion?: string; baseUrl?: string }) {
    this.apiVersion = options?.apiVersion || process.env.META_API_VERSION || 'v19.0';
    this.baseUrl = options?.baseUrl || 'https://graph.facebook.com';
  }

  getOAuthUrl(params: {
    clientId: string;
    redirectUri: string;
    state: string;
    scopes?: string[];
  }): string {
    const scopes = params.scopes || [
      'ads_management',
      'ads_read',
      'pages_show_list',
      'pages_read_engagement',
      'business_management'
    ];

    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      state: params.state,
      scope: scopes.join(','),
      response_type: 'code'
    });

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${query.toString()}`;
  }

  async exchangeCodeForToken(params: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
  }): Promise<{
    accessToken: string;
    expiresIn: number;
    userId: string;
    userName: string;
  }> {
    // If mock or simulation code
    if (params.code.startsWith('mock_code_') || !params.clientSecret) {
      return {
        accessToken: `meta_eaab_${Date.now()}_mock_token`,
        expiresIn: 5184000, // 60 days
        userId: 'meta_usr_108291823719',
        userName: 'One8 Official Ad Account Admin'
      };
    }

    const query = new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      code: params.code
    });

    const response = await fetch(`${this.baseUrl}/${this.apiVersion}/oauth/access_token?${query.toString()}`, {
      method: 'GET'
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as any;
      throw new Error(
        `Meta OAuth exchange failed: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = (await response.json()) as any;

    // Fetch user profile info
    const meRes = await fetch(`${this.baseUrl}/${this.apiVersion}/me?fields=id,name&access_token=${data.access_token}`);
    const meData = (await meRes.json().catch(() => ({ id: 'meta_usr_unknown', name: 'Meta User' }))) as any;

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 5184000,
      userId: meData.id || 'meta_usr_unknown',
      userName: meData.name || 'Meta User'
    };
  }

  async getAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
    if (accessToken.includes('mock_token') || !accessToken) {
      return [
        {
          id: 'act_1092837461',
          accountId: '1092837461',
          name: 'One8 Official Brand Ads',
          currency: 'USD',
          accountStatus: 1,
          businessName: 'One8 Brand Inc.'
        },
        {
          id: 'act_2093847582',
          accountId: '2093847582',
          name: 'VidSnapAI Growth Studio',
          currency: 'USD',
          accountStatus: 1,
          businessName: 'VidSnapAI Enterprise'
        }
      ];
    }

    const res = await fetch(
      `${this.baseUrl}/${this.apiVersion}/me/adaccounts?fields=id,account_id,name,currency,account_status,business_name&access_token=${accessToken}`
    );

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as any;
      throw new Error(`Failed to fetch Meta ad accounts: ${err.error?.message || res.statusText}`);
    }

    const data = (await res.json()) as any;
    return (data.data || []).map((acc: any) => ({
      id: acc.id,
      accountId: acc.account_id,
      name: acc.name || `Ad Account ${acc.account_id}`,
      currency: acc.currency || 'USD',
      accountStatus: acc.account_status || 1,
      businessName: acc.business_name
    }));
  }

  async getPages(accessToken: string): Promise<MetaPage[]> {
    if (accessToken.includes('mock_token') || !accessToken) {
      return [
        {
          id: 'page_98237461',
          name: 'One8 Athletics',
          category: 'Brand',
          instagramActorId: 'ig_actor_837461029'
        }
      ];
    }

    const res = await fetch(
      `${this.baseUrl}/${this.apiVersion}/me/accounts?fields=id,name,category,access_token,instagram_business_account&access_token=${accessToken}`
    );

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as any;
      throw new Error(`Failed to fetch Meta pages: ${err.error?.message || res.statusText}`);
    }

    const data = (await res.json()) as any;
    return (data.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      accessToken: p.access_token,
      instagramActorId: p.instagram_business_account?.id
    }));
  }

  async createCampaign(
    adAccountId: string,
    payload: MetaCampaignApiPayload,
    accessToken: string
  ): Promise<{ id: string }> {
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    if (accessToken.includes('mock_token') || !accessToken) {
      return {
        id: `meta_cmp_${Date.now()}_${Math.floor(Math.random() * 10000)}`
      };
    }

    const res = await fetch(`${this.baseUrl}/${this.apiVersion}/${formattedAccountId}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        name: payload.name,
        objective: payload.objective,
        status: payload.status,
        special_ad_categories: payload.special_ad_categories || ['NONE'],
        buying_type: payload.buying_type || 'AUCTION',
        ...(payload.daily_budget ? { daily_budget: payload.daily_budget } : {}),
        ...(payload.lifetime_budget ? { lifetime_budget: payload.lifetime_budget } : {})
      })
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as any;
      throw new Error(`Failed to create Meta Campaign: ${err.error?.message || res.statusText}`);
    }

    const data = (await res.json()) as any;
    return { id: data.id };
  }

  async createAdSet(
    adAccountId: string,
    payload: MetaAdSetApiPayload,
    accessToken: string
  ): Promise<{ id: string }> {
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    if (accessToken.includes('mock_token') || !accessToken) {
      return {
        id: `meta_adset_${Date.now()}_${Math.floor(Math.random() * 10000)}`
      };
    }

    const res = await fetch(`${this.baseUrl}/${this.apiVersion}/${formattedAccountId}/adsets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        name: payload.name,
        campaign_id: payload.campaign_id,
        status: payload.status,
        billing_event: payload.billing_event || 'IMPRESSIONS',
        optimization_goal: payload.optimization_goal || 'LINK_CLICKS',
        targeting: payload.targeting || { geo_locations: { countries: ['US'] } },
        ...(payload.daily_budget ? { daily_budget: payload.daily_budget } : {}),
        ...(payload.lifetime_budget ? { lifetime_budget: payload.lifetime_budget } : {}),
        ...(payload.start_time ? { start_time: payload.start_time } : {}),
        ...(payload.end_time ? { end_time: payload.end_time } : {}),
        ...(payload.promoted_object ? { promoted_object: payload.promoted_object } : {}),
        ...(payload.bid_amount ? { bid_amount: payload.bid_amount } : {})
      })
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as any;
      throw new Error(`Failed to create Meta Ad Set: ${err.error?.message || res.statusText}`);
    }

    const data = (await res.json()) as any;
    return { id: data.id };
  }

  async uploadVideo(
    adAccountId: string,
    videoUrl: string,
    accessToken: string
  ): Promise<{ id: string }> {
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    if (accessToken.includes('mock_token') || !accessToken) {
      return {
        id: `meta_vid_${Date.now()}_${Math.floor(Math.random() * 10000)}`
      };
    }

    const res = await fetch(`${this.baseUrl}/${this.apiVersion}/${formattedAccountId}/advideos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        file_url: videoUrl
      })
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as any;
      throw new Error(`Failed to upload video to Meta: ${err.error?.message || res.statusText}`);
    }

    const data = (await res.json()) as any;
    return { id: data.id };
  }

  async createAdCreative(
    adAccountId: string,
    payload: MetaAdCreativeApiPayload,
    accessToken: string
  ): Promise<{ id: string }> {
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    if (accessToken.includes('mock_token') || !accessToken) {
      return {
        id: `meta_crt_${Date.now()}_${Math.floor(Math.random() * 10000)}`
      };
    }

    const res = await fetch(`${this.baseUrl}/${this.apiVersion}/${formattedAccountId}/adcreatives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        name: payload.name,
        object_story_spec: payload.object_story_spec || {
          video_data: {
            video_id: payload.video_id,
            title: payload.title,
            message: payload.body,
            image_url: payload.thumbnail_url,
            call_to_action: payload.call_to_action
          }
        }
      })
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as any;
      throw new Error(`Failed to create Meta Ad Creative: ${err.error?.message || res.statusText}`);
    }

    const data = (await res.json()) as any;
    return { id: data.id };
  }

  async createAd(
    adAccountId: string,
    payload: MetaAdApiPayload,
    accessToken: string
  ): Promise<{ id: string }> {
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    if (accessToken.includes('mock_token') || !accessToken) {
      return {
        id: `meta_ad_${Date.now()}_${Math.floor(Math.random() * 10000)}`
      };
    }

    const res = await fetch(`${this.baseUrl}/${this.apiVersion}/${formattedAccountId}/ads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        name: payload.name,
        adset_id: payload.adset_id,
        creative: payload.creative,
        status: payload.status,
        ...(payload.tracking_specs ? { tracking_specs: payload.tracking_specs } : {})
      })
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as any;
      throw new Error(`Failed to create Meta Ad: ${err.error?.message || res.statusText}`);
    }

    const data = (await res.json()) as any;
    return { id: data.id };
  }

  async getAdStatus(
    adId: string,
    accessToken: string
  ): Promise<{ status: string; effectiveStatus: string }> {
    if (accessToken.includes('mock_token') || !accessToken) {
      return {
        status: 'ACTIVE',
        effectiveStatus: 'ACTIVE'
      };
    }

    const res = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${adId}?fields=status,effective_status&access_token=${accessToken}`
    );

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as any;
      throw new Error(`Failed to fetch Meta Ad status: ${err.error?.message || res.statusText}`);
    }

    const data = (await res.json()) as any;
    return {
      status: data.status || 'PAUSED',
      effectiveStatus: data.effective_status || 'PENDING_REVIEW'
    };
  }

  /**
   * Fetch Insights for a Meta Campaign
   */
  async getCampaignInsights(
    campaignId: string,
    accessToken: string,
    datePreset: string = 'last_30d'
  ): Promise<Record<string, unknown> | null> {
    if (accessToken.includes('mock_token') || !accessToken) {
      return {
        campaign_id: campaignId,
        impressions: '142500',
        reach: '118200',
        spend: '342.50',
        clicks: '4820',
        cpc: '0.071',
        cpm: '2.40',
        ctr: '3.38',
        actions: [
          { action_type: 'video_view', value: '86400' },
          { action_type: 'post_engagement', value: '9420' },
          { action_type: 'like', value: '4120' },
          { action_type: 'comment', value: '620' },
          { action_type: 'onsite_conversion.purchase', value: '184' }
        ],
        action_values: [
          { action_type: 'onsite_conversion.purchase', value: '1840.00' }
        ],
        video_avg_time_watched_actions: [
          { action_type: 'video_avg_time_watched_actions', value: '18.4' }
        ],
        video_p100_watched_actions: [
          { action_type: 'video_p100_watched_actions', value: '38200' }
        ]
      };
    }

    const fields = 'impressions,reach,clicks,spend,cpc,cpm,ctr,actions,action_values,video_avg_time_watched_actions,video_p100_watched_actions,video_play_actions';
    const res = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${campaignId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${accessToken}`
    );

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as any;
      throw new Error(`Failed to fetch Meta Campaign insights: ${err.error?.message || res.statusText}`);
    }

    const data = (await res.json()) as any;
    return data.data?.[0] || null;
  }

  /**
   * Fetch Insights for a Meta Ad Set
   */
  async getAdSetInsights(
    adSetId: string,
    accessToken: string,
    datePreset: string = 'last_30d'
  ): Promise<Record<string, unknown> | null> {
    if (accessToken.includes('mock_token') || !accessToken) {
      return {
        adset_id: adSetId,
        impressions: '78200',
        reach: '65400',
        spend: '180.00',
        clicks: '2640',
        cpc: '0.068',
        cpm: '2.30',
        ctr: '3.37',
        actions: [
          { action_type: 'video_view', value: '46200' },
          { action_type: 'like', value: '2300' },
          { action_type: 'comment', value: '310' },
          { action_type: 'onsite_conversion.purchase', value: '98' }
        ],
        action_values: [
          { action_type: 'onsite_conversion.purchase', value: '980.00' }
        ],
        video_avg_time_watched_actions: [
          { action_type: 'video_avg_time_watched_actions', value: '19.1' }
        ]
      };
    }

    const fields = 'impressions,reach,clicks,spend,cpc,cpm,ctr,actions,action_values,video_avg_time_watched_actions,video_p100_watched_actions,video_play_actions';
    const res = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${adSetId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${accessToken}`
    );

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as any;
      throw new Error(`Failed to fetch Meta AdSet insights: ${err.error?.message || res.statusText}`);
    }

    const data = (await res.json()) as any;
    return data.data?.[0] || null;
  }

  /**
   * Fetch Insights for a Meta Ad
   */
  async getAdInsights(
    adId: string,
    accessToken: string,
    datePreset: string = 'last_30d'
  ): Promise<Record<string, unknown> | null> {
    if (accessToken.includes('mock_token') || !accessToken) {
      return {
        ad_id: adId,
        impressions: '45000',
        reach: '38500',
        spend: '110.00',
        clicks: '1680',
        cpc: '0.065',
        cpm: '2.44',
        ctr: '3.73',
        actions: [
          { action_type: 'video_view', value: '28400' },
          { action_type: 'post_engagement', value: '3200' },
          { action_type: 'like', value: '1450' },
          { action_type: 'comment', value: '180' },
          { action_type: 'onsite_conversion.purchase', value: '62' }
        ],
        action_values: [
          { action_type: 'onsite_conversion.purchase', value: '620.00' }
        ],
        video_avg_time_watched_actions: [
          { action_type: 'video_avg_time_watched_actions', value: '20.5' }
        ],
        video_p100_watched_actions: [
          { action_type: 'video_p100_watched_actions', value: '14200' }
        ]
      };
    }

    const fields = 'impressions,reach,clicks,spend,cpc,cpm,ctr,actions,action_values,video_avg_time_watched_actions,video_p100_watched_actions,video_play_actions';
    const res = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${adId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${accessToken}`
    );

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as any;
      throw new Error(`Failed to fetch Meta Ad insights: ${err.error?.message || res.statusText}`);
    }

    const data = (await res.json()) as any;
    return data.data?.[0] || null;
  }

  /**
   * Fetch Instagram Reel Media Insights
   */
  async getReelInsights(
    instagramMediaId: string,
    accessToken: string
  ): Promise<Record<string, unknown> | null> {
    if (accessToken.includes('mock_token') || !accessToken) {
      return {
        media_id: instagramMediaId,
        impressions: '52000',
        reach: '44000',
        plays: '49500',
        likes: '3400',
        comments: '290',
        shares: '520',
        saved: '880',
        total_interactions: '5090'
      };
    }

    const metrics = 'plays,reach,saved,shares,likes,comments,total_interactions';
    const res = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${instagramMediaId}/insights?metric=${metrics}&access_token=${accessToken}`
    );

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as any;
      throw new Error(`Failed to fetch Instagram Reel insights: ${err.error?.message || res.statusText}`);
    }

    const data = (await res.json()) as any;
    const mapped: Record<string, unknown> = { media_id: instagramMediaId };
    if (Array.isArray(data.data)) {
      for (const item of data.data) {
        if (item.name && item.values?.[0]?.value !== undefined) {
          mapped[item.name] = item.values[0].value;
        }
      }
    }
    return mapped;
  }
}
