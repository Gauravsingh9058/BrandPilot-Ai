import { Redis } from 'ioredis';
import { getConfig } from '@vidsnapai/config';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const config = getConfig();
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        // Linear backoff capped at 3 seconds
        return Math.min(times * 200, 3000);
      }
    });

    redisClient.on('error', (err) => {
      // Avoid crashing process on redis disconnects
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[Redis Warning]', err.message);
      }
    });
  }
  return redisClient;
}

export async function checkRedisHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  message?: string;
}> {
  const start = Date.now();
  try {
    const client = getRedisClient();
    if (client.status !== 'ready' && client.status !== 'connecting' && client.status !== 'connect') {
      await client.connect();
    }
    const pong = await client.ping();
    const latencyMs = Date.now() - start;
    if (pong === 'PONG') {
      return { status: 'healthy', latencyMs };
    }
    return { status: 'unhealthy', latencyMs, message: `Unexpected response: ${pong}` };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'unhealthy', latencyMs, message };
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
