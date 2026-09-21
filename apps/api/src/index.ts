import { createApp } from './app.js';
import { getConfig } from '@vidsnapai/config';
import { checkDatabaseHealth, closeDatabase } from '@vidsnapai/database';
import { checkRedisHealth, closeRedis } from './lib/redis.js';
import { logAIStartupDiagnostics } from '@vidsnapai/ai';

const config = getConfig();
const app = createApp();
const PORT = config.PORT || 4000;

const server = app.listen(PORT, async () => {
  console.log(`[VidSnapAI API] Server listening on http://localhost:${PORT}`);
  console.log(`[VidSnapAI API] Environment: ${config.NODE_ENV}`);

  // AI & Model Diagnostics
  logAIStartupDiagnostics({
    apiKey: config.GEMINI_API_KEY,
    modelName: config.GEMINI_MODEL
  });

  // Initial health check log
  const [dbHealth, redisHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth()
  ]);

  console.log(`[VidSnapAI API] PostgreSQL status: ${dbHealth.status} (${dbHealth.latencyMs}ms)`);
  console.log(`[VidSnapAI API] Redis status: ${redisHealth.status} (${redisHealth.latencyMs}ms)`);
});

// Graceful Shutdown
async function handleShutdown(signal: string) {
  console.log(`\n[VidSnapAI API] Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('[VidSnapAI API] HTTP server closed.');
    await closeDatabase();
    await closeRedis();
    console.log('[VidSnapAI API] All connections closed. Exiting process.');
    process.exit(0);
  });

  // Force close after 10s if stuck
  setTimeout(() => {
    console.error('[VidSnapAI API] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
