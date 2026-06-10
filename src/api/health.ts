import type { Context } from 'hono';
import { getRedis } from '../lib/redis.ts';
import { healthCheck as chromiumHealth } from '../renderer/browser.ts';
import { getEnv } from '../config.ts';
import type { HealthStatus } from '../types.ts';

export async function health(c: Context): Promise<Response> {
  const env = getEnv();

  let redisStatus: HealthStatus['redis'] = 'ok';
  try {
    const redis = getRedis();
    if (redis.status === 'ready') {
      await redis.ping();
    } else {
      redisStatus = 'error';
    }
  } catch {
    redisStatus = 'error';
  }

  let upstreamStatus: HealthStatus['upstream'] = 'ok';
  try {
    const res = await fetch(`${env.PASSPORT_API_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) upstreamStatus = 'error';
  } catch {
    upstreamStatus = 'error';
  }

  const chromiumOk = await chromiumHealth();
  const chromiumStatus: HealthStatus['chromium'] = chromiumOk ? 'ok' : 'error';

  const status: HealthStatus = {
    redis: redisStatus,
    upstream: upstreamStatus,
    chromium: chromiumStatus,
  };

  const allOk = Object.values(status).every((v) => v === 'ok');
  const httpStatus = allOk ? 200 : 503;

  return c.json(status, httpStatus);
}
