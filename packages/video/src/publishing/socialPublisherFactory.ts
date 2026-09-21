import type { PublishingPlatform, SocialPublisher } from '@vidsnapai/types';
import { MockPublisher } from './mockPublisher.js';
import { InstagramPublisher } from './instagramPublisher.js';
import { FacebookPublisher, YouTubePublisher } from './facebookPublisher.js';

export class SocialPublisherFactory {
  private static publishers: Map<PublishingPlatform, SocialPublisher> = new Map();

  static getPublisher(platform: PublishingPlatform): SocialPublisher {
    if (this.publishers.has(platform)) {
      return this.publishers.get(platform)!;
    }

    let publisher: SocialPublisher;
    switch (platform) {
      case 'INSTAGRAM':
        publisher = new InstagramPublisher();
        break;
      case 'FACEBOOK':
        publisher = new FacebookPublisher();
        break;
      case 'YOUTUBE':
        publisher = new YouTubePublisher();
        break;
      case 'MOCK':
      case 'TIKTOK':
      default:
        publisher = new MockPublisher();
        break;
    }

    this.publishers.set(platform, publisher);
    return publisher;
  }

  static registerPublisher(platform: PublishingPlatform, publisher: SocialPublisher): void {
    this.publishers.set(platform, publisher);
  }
}
