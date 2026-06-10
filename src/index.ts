import 'dotenv/config';
import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { loadEnv } from './config.ts';
import { connectRedis, disconnectRedis } from './lib/redis.ts';
import { closeBrowser } from './renderer/browser.ts';
import { stopAllPollers } from './services/poller.ts';
import { logger } from './lib/logger.ts';

async function main(): Promise<void> {
  loadEnv();

  const app = createApp();

  await connectRedis();

  const port = parseInt(process.env.PORT || '3000', 10);

  const server = serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      logger.info({ port: info.port }, `Server listening on http://localhost:${info.port}`);
    },
  );

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Graceful shutdown initiated');
    stopAllPollers();
    server.close();
    await closeBrowser();
    await disconnectRedis();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
