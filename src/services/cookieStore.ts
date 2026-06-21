import { CookieJar } from 'tough-cookie';
import { getRedis } from '../lib/redis.ts';
import { getEnv } from '../config.ts';
import { logger } from '../lib/logger.ts';

export class CookieStore {
  private redisKey(userId: string): string {
    return `cookie:${userId}`;
  }

  async getJar(userId: string): Promise<CookieJar> {
    const redis = getRedis();
    const raw = await redis.get(this.redisKey(userId));
    if (raw) {
      try {
        const jar = CookieJar.deserialize(JSON.parse(raw));
        logger.debug({ userId }, 'Cookie jar loaded from Redis');
        return jar;
      } catch (err) {
        logger.warn({ userId, err }, 'Failed to deserialize cookie jar, creating new');
      }
    }
    return new CookieJar();
  }

  async saveJar(userId: string, jar: CookieJar): Promise<void> {
    const redis = getRedis();
    const serialized = await jar.serialize();
    const ttl = getEnv().COOKIE_TTL;
    if (ttl > 0) {
      await redis.setex(this.redisKey(userId), ttl, JSON.stringify(serialized));
    } else {
      await redis.set(this.redisKey(userId), JSON.stringify(serialized));
    }
    logger.debug({ userId }, 'Cookie jar saved to Redis');
  }

  async applyResponse(
    userId: string,
    jar: CookieJar,
    headers: Headers,
    url: string,
  ): Promise<void> {
    // getSetCookie() returns ALL Set-Cookie headers as an array (Node 18+)
    const cookies =
      typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie()
        : ([headers.get('set-cookie')].filter(Boolean) as string[]);

    if (cookies.length === 0) return;

    for (const cookie of cookies) {
      await jar.setCookie(cookie, url);
    }

    logger.debug({ userId, url, count: cookies.length }, 'Applied Set-Cookies to jar');
  }

  async deleteJar(userId: string): Promise<void> {
    const redis = getRedis();
    await redis.del(this.redisKey(userId));
    logger.debug({ userId }, 'Cookie jar deleted from Redis');
  }
}

export const cookieStore = new CookieStore();
