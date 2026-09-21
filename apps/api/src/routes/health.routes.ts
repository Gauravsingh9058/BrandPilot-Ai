import { Router, type Request, type Response } from 'express';
import { checkDatabaseHealth } from '@vidsnapai/database';
import { checkRedisHealth } from '../lib/redis.js';
import type { HealthCheckResponse, ApiResponse } from '@vidsnapai/types';

export const healthRouter: Router = Router();

const startTime = Date.now();

// Liveness probe (GET /api/health or GET /health)
healthRouter.get('/', async (req: Request, res: Response) => {
  const [dbHealth, redisHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth()
  ]);

  const isHealthy = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';

  const healthData: HealthCheckResponse = {
    status: isHealthy ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    services: {
      api: {
        status: 'healthy',
        latencyMs: 0
      },
      postgres: {
        status: dbHealth.status,
        latencyMs: dbHealth.latencyMs,
        message: dbHealth.error
      },
      redis: {
        status: redisHealth.status,
        latencyMs: redisHealth.latencyMs,
        message: redisHealth.message
      }
    },
    environment: process.env.NODE_ENV || 'development',
    version: '0.1.0'
  };

  const response: ApiResponse<HealthCheckResponse> = {
    success: isHealthy,
    data: healthData,
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  };

  res.status(isHealthy ? 200 : 503).json(response);
});

// Readiness probe (GET /api/health/ready or GET /health/ready)
healthRouter.get('/ready', async (req: Request, res: Response) => {
  const [dbHealth, redisHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth()
  ]);

  const isReady = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    data: {
      ready: isReady,
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      services: {
        postgres: dbHealth.status,
        redis: redisHealth.status
      }
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  });
});

// Operational metrics endpoint (GET /api/health/metrics or GET /health/metrics or GET /metrics)
healthRouter.get('/metrics', async (req: Request, res: Response) => {
  const { metricsCollector } = await import('../lib/metrics.js');
  const acceptHeader = req.headers['accept'] || '';
  const format = req.query.format as string;

  if (format === 'prometheus' || acceptHeader.includes('text/plain')) {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.send(metricsCollector.toPrometheus());
  }

  const snapshot = metricsCollector.getSnapshot();
  return res.json({
    success: true,
    data: snapshot,
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  });
});

