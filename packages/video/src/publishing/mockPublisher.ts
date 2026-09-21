import type {
  SocialPublisher,
  PublishReelPayload,
  PublishResult,
  PublishingPlatform,
  PublishingStatus
} from '@vidsnapai/types';

export class MockPublisher implements SocialPublisher {
  public readonly platform: PublishingPlatform = 'MOCK';

  async publishReel(payload: PublishReelPayload): Promise<PublishResult> {
    const timestamp = Date.now();
    const mockPostId = `mock_post_${payload.platform.toLowerCase()}_${payload.reelPlanId.slice(0, 8)}_${timestamp}`;
    const mockUrl = `https://mock.social/${payload.platform.toLowerCase()}/p/${mockPostId}`;

    return {
      success: true,
      platform: payload.platform,
      externalPostId: mockPostId,
      externalUrl: mockUrl,
      publishedAt: new Date().toISOString()
    };
  }

  async validateCredentials(_workspaceId: string): Promise<boolean> {
    return true;
  }

  async getPublishingStatus(externalPostId: string): Promise<{ status: PublishingStatus; url?: string }> {
    return {
      status: 'PUBLISHED',
      url: `https://mock.social/p/${externalPostId}`
    };
  }

  async deletePublishedPost(_externalPostId: string): Promise<boolean> {
    return true;
  }
}
