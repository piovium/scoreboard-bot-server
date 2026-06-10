import type { Context, Next } from 'hono';
import { logger } from '../lib/logger.ts';

export async function requestLogger(c: Context, next: Next): Promise<void> {
  const start = Date.now();
  const { method } = c.req;
  const url = c.req.url;

  await next();

  const duration = Date.now() - start;
  const { status } = c.res;

  logger.info({ method, url, status, duration: `${duration}ms` }, 'request');
}
