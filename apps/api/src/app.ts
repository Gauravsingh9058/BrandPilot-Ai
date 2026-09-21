import express, { type Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { getConfig } from '@vidsnapai/config';
import { requestIdMiddleware } from './middleware/request-id.js';
import { requestLoggerMiddleware } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { workspaceRouter } from './routes/workspace.routes.js';
import { brandRouter } from './routes/brand.routes.js';
import { marketingRouter } from './routes/marketing.routes.js';
import { contentPlanRouter } from './routes/content-plan.routes.js';
import { reelRouter, contentJobReelRouter, contentPlanReelRouter, standaloneReelRouter } from './routes/reel.routes.js';
import { mediaRouter } from './routes/media.routes.js';
import { animationRouter } from './routes/animation.routes.js';
import { queueRouter } from './routes/queue.routes.js';
import { metaAdsRouter, reelMetaAdsRouter } from './routes/meta-ads.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { optimizationRouter } from './routes/optimization.routes.js';
import { campaignDirectorRouter } from './routes/campaign-director.routes.js';
import { autonomousRouter } from './routes/autonomous.routes.js';
import { billingRouter } from './routes/billing.routes.js';
import { aiRouter } from './routes/ai.routes.js';

export function createApp(): Express {
  const config = getConfig();
  const app = express();

  // Basic security and parsing middleware
  app.set('trust proxy', 1);

  // Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (config.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
  });

  // CORS configuration
  const allowedOrigins = [
    config.WEB_BASE_URL,
    ...(config.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4000'] : [])
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl/server-to-server) in non-strict modes
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Workspace-Id', 'X-Test-Ratelimit']
    })
  );

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser(config.SESSION_SECRET));

  // Observability & Metrics middleware
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', async () => {
      try {
        const { metricsCollector } = await import('./lib/metrics.js');
        metricsCollector.recordRequest(req.method, req.path, res.statusCode, Date.now() - start);
      } catch {
        // Non-blocking metrics recording
      }
    });
    next();
  });

  // Top-level Health & Metrics Probes (GET /health, GET /health/ready, GET /metrics)
  app.use('/health', healthRouter);
  app.get('/metrics', async (req, res) => {
    const { metricsCollector } = await import('./lib/metrics.js');
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metricsCollector.toPrometheus());
  });

  // API Routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/workspaces', workspaceRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/brands', brandRouter);
  app.use('/api/brands/:brandId', marketingRouter);
  app.use('/api/brands/:brandId', contentPlanRouter);
  app.use('/api/brands/:brandId', reelRouter);
  app.use('/api/content-jobs', contentJobReelRouter);
  app.use('/api/content-plans', contentPlanReelRouter);
  app.use('/api', mediaRouter);
  app.use('/api', animationRouter);
  app.use('/api/reels', standaloneReelRouter);
  app.use('/api/reels', reelMetaAdsRouter);
  app.use('/api/meta', metaAdsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/optimization', optimizationRouter);
  app.use('/api/campaign-director', campaignDirectorRouter);
  app.use('/api/autonomous', autonomousRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/queue', queueRouter);

  // Storage / Media file serving with byte-range and CORS support
  app.get('/api/storage/files/*', (req, res) => {
    const rawKey = (req.params as any)[0] || (req.params as any)[''] || '';
    // Block path traversal attempts
    if (rawKey.includes('..') || rawKey.startsWith('/') || rawKey.includes(':')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid storage path: Path traversal is blocked.',
          requestId: req.id
        }
      });
    }

    const cleanKey = rawKey.replace(/(\.\.[/\\])+/g, '').replace(/^[/\\]+/, '');

    const candidatePaths = [
      path.resolve(process.cwd(), 'uploads', cleanKey),
      path.resolve(process.cwd(), 'apps/api/uploads', cleanKey),
      path.resolve(process.cwd(), '../uploads', cleanKey),
      path.resolve(process.cwd(), '../../uploads', cleanKey)
    ];

    for (const filePath of candidatePaths) {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.sendFile(filePath);
      }
    }

    return res.status(404).json({
      success: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: `Storage file "${cleanKey}" not found.`,
        requestId: req.id
      }
    });
  });

  // 404 & Centralized Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
