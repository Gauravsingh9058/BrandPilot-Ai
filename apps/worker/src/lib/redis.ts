import { Redis } from 'ioredis';
import { getConfig } from '@vidsnapai/config';

let redisClient: Redis | null = null;

export function getWorkerRedisClient(): Redis {
  if (!redisClient) {
    const config = getConfig();
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        return Math.min(times * 200, 3000);
      }
    });

    redisClient.on('error', (err) => {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[Worker Redis Warning]', err.message);
      }
    });
  }
  return redisClient;
}

export async function closeWorkerRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
