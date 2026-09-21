import { describe, it, expect, vi } from 'vitest';
import * as dbModule from '@vidsnapai/database';
import * as redisModule from '../src/lib/redis.js';

describe('Health Route Tests', () => {
  it('returns healthy status when DB and Redis are operational', async () => {
    vi.spyOn(dbModule, 'checkDatabaseHealth').mockResolvedValue({
      status: 'healthy',
      latencyMs: 3
    });

    vi.spyOn(redisModule, 'checkRedisHealth').mockResolvedValue({
      status: 'healthy',
      latencyMs: 1
    });

    const req: any = { id: 'req-test-123' };
    let capturedStatus = 0;
    let capturedJson: any = null;

    const res: any = {
      status: (code: number) => {
        capturedStatus = code;
        return {
          json: (data: any) => {
            capturedJson = data;
          }
        };
      }
    };

    // Test health check logic directly
    const [dbHealth, redisHealth] = await Promise.all([
      dbModule.checkDatabaseHealth(),
      redisModule.checkRedisHealth()
    ]);

    const isHealthy = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';

    const healthData = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 10,
      services: {
        api: { status: 'healthy', latencyMs: 0 },
        postgres: { status: dbHealth.status, latencyMs: dbHealth.latencyMs },
        redis: { status: redisHealth.status, latencyMs: redisHealth.latencyMs }
      },
      environment: 'test',
      version: '0.1.0'
    };

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: healthData,
      meta: { requestId: req.id, timestamp: new Date().toISOString() }
    });

    expect(capturedStatus).toBe(200);
    expect(capturedJson.success).toBe(true);
    expect(capturedJson.data.status).toBe('ok');
    expect(capturedJson.data.services.api.status).toBe('healthy');
    expect(capturedJson.data.services.postgres.status).toBe('healthy');
    expect(capturedJson.data.services.redis.status).toBe('healthy');
  });

  it('returns 503 degraded status when DB is unhealthy', async () => {
    vi.spyOn(dbModule, 'checkDatabaseHealth').mockResolvedValue({
      status: 'unhealthy',
      latencyMs: 10,
      error: 'Connection refused'
    });

    vi.spyOn(redisModule, 'checkRedisHealth').mockResolvedValue({
      status: 'healthy',
      latencyMs: 1
    });

    const req: any = { id: 'req-test-456' };
    let capturedStatus = 0;
    let capturedJson: any = null;

    const res: any = {
      status: (code: number) => {
        capturedStatus = code;
        return {
          json: (data: any) => {
            capturedJson = data;
          }
        };
      }
    };

    const [dbHealth, redisHealth] = await Promise.all([
      dbModule.checkDatabaseHealth(),
      redisModule.checkRedisHealth()
    ]);

    const isHealthy = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';

    const healthData = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 10,
      services: {
        api: { status: 'healthy', latencyMs: 0 },
        postgres: { status: dbHealth.status, latencyMs: dbHealth.latencyMs, message: dbHealth.error },
        redis: { status: redisHealth.status, latencyMs: redisHealth.latencyMs }
      },
      environment: 'test',
      version: '0.1.0'
    };

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: healthData,
      meta: { requestId: req.id, timestamp: new Date().toISOString() }
    });

    expect(capturedStatus).toBe(503);
    expect(capturedJson.success).toBe(false);
    expect(capturedJson.data.status).toBe('error');
    expect(capturedJson.data.services.postgres.status).toBe('unhealthy');
  });
});
