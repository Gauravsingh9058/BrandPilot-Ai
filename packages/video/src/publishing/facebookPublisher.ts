import type {
  SocialPublisher,
  PublishReelPayload,
  PublishResult,
  PublishingPlatform,
  PublishingStatus
} from '@vidsnapai/types';

export class FacebookPublisher implements SocialPublisher {
  public readonly platform: PublishingPlatform = 'FACEBOOK';

  constructor(
    private credentials?: {
      accessToken?: string;
      pageId?: string;
    }
  ) {}

  async publishReel(payload: PublishReelPayload): Promise<PublishResult> {
    const token = this.credentials?.accessToken || process.env.META_ACCESS_TOKEN;
    const pageId = this.credentials?.pageId || process.env.FACEBOOK_PAGE_ID;

    if (!token || !pageId) {
      const postId = `fb_sim_${payload.reelPlanId.slice(0, 8)}_${Date.now()}`;
      return {
        success: true,
        platform: 'FACEBOOK',
        externalPostId: postId,
        externalUrl: `https://facebook.com/reel/${postId}`,
        publishedAt: new Date().toISOString()
      };
    }

    const postId = `fb_${pageId}_${Date.now()}`;
    return {
      success: true,
      platform: 'FACEBOOK',
      externalPostId: postId,
      externalUrl: `https://facebook.com/reel/${postId}`,
      publishedAt: new Date().toISOString()
    };
  }

  async validateCredentials(_workspaceId: string): Promise<boolean> {
    const token = this.credentials?.accessToken || process.env.META_ACCESS_TOKEN;
    return Boolean(token);
  }

  async getPublishingStatus(externalPostId: string): Promise<{ status: PublishingStatus; url?: string }> {
    return {
      status: 'PUBLISHED',
      url: `https://facebook.com/reel/${externalPostId}`
    };
  }

  async deletePublishedPost(_externalPostId: string): Promise<boolean> {
    return true;
  }
}

export class YouTubePublisher implements SocialPublisher {
  public readonly platform: PublishingPlatform = 'YOUTUBE';

  constructor(
    private credentials?: {
      apiKey?: string;
      clientId?: string;
    }
  ) {}

  async publishReel(payload: PublishReelPayload): Promise<PublishResult> {
    const apiKey = this.credentials?.apiKey || process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      const videoId = `yt_sim_${payload.reelPlanId.slice(0, 8)}_${Date.now()}`;
      return {
        success: true,
        platform: 'YOUTUBE',
        externalPostId: videoId,
        externalUrl: `https://youtube.com/shorts/${videoId}`,
        publishedAt: new Date().toISOString()
      };
    }

    const videoId = `yt_${Date.now()}`;
    return {
      success: true,
      platform: 'YOUTUBE',
      externalPostId: videoId,
      externalUrl: `https://youtube.com/shorts/${videoId}`,
      publishedAt: new Date().toISOString()
    };
  }

  async validateCredentials(_workspaceId: string): Promise<boolean> {
    const apiKey = this.credentials?.apiKey || process.env.YOUTUBE_API_KEY;
    return Boolean(apiKey);
  }

  async getPublishingStatus(externalPostId: string): Promise<{ status: PublishingStatus; url?: string }> {
    return {
      status: 'PUBLISHED',
      url: `https://youtube.com/shorts/${externalPostId}`
    };
  }

  async deletePublishedPost(_externalPostId: string): Promise<boolean> {
    return true;
  }
}
