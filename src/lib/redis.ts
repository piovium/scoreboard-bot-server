import Redis from 'ioredis';
import { getEnv } from '../config.ts';
import { logger } from './logger.ts';

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;

  const env = getEnv();
  _redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 200, 3000);
    },
  });

  _redis.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  return _redis;
}

export async function connectRedis(): Promise<void> {
  const redis = getRedis();
  if (redis.status !== 'ready') {
    await redis.connect();
    logger.info('Redis connected');
  }
}

export async function disconnectRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
    logger.info('Redis disconnected');
  }
}
