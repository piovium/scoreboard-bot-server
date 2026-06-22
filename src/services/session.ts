import { getRedis } from '../lib/redis.ts';
import { getEnv } from '../config.ts';
import { logger } from '../lib/logger.ts';
import type { SessionState, SessionData } from '../types.ts';
import { randomUUID } from 'node:crypto';

export class SessionManager {
  private redisKey(userId: string): string {
    return `session:${userId}`;
  }

  private getTtl(state: SessionState): number {
    if (state === 'LOGGED_IN') return -1;
    return getEnv().SESSION_TTL;
  }

  /** Generate or retrieve the device UUID for this user.
   *  This UUID is used as both _MHYUUID cookie and x-rpc-device_id header. */
  async getOrCreateDeviceId(userId: string): Promise<string> {
    const redis = getRedis();
    const deviceKey = `device:${userId}`;
    let deviceId = await redis.get(deviceKey);
    if (!deviceId) {
      deviceId = randomUUID();
      await redis.set(deviceKey, deviceId);
      logger.info({ userId, deviceId }, 'Created new device UUID');
    }
    return deviceId;
  }

  async createSession(
    userId: string,
    data: Partial<Pick<SessionData, 'qrTicket' | 'qrUrl'>> = {},
  ): Promise<SessionData> {
    const redis = getRedis();
    const deviceId = await this.getOrCreateDeviceId(userId);
    const session: SessionData = {
      userId,
      state: 'QR_PENDING',
      qrTicket: data.qrTicket ?? null,
      qrUrl: data.qrUrl ?? null,
      deviceId,
      selectedGameUid: null,
      createdAt: Date.now(),
    };

    const ttl = this.getTtl('QR_PENDING');
    const key = this.redisKey(userId);
    await redis.multi().hset(key, this.sessionToHash(session)).expire(key, ttl).exec();

    logger.info({ userId, deviceId, state: session.state }, 'Session created');
    return session;
  }

  async getSession(userId: string): Promise<SessionData | null> {
    const redis = getRedis();
    const hash = await redis.hgetall(this.redisKey(userId));
    if (!hash || Object.keys(hash).length === 0) return null;
    return this.hashToSession(userId, hash);
  }

  async updateState(userId: string, state: SessionState): Promise<void> {
    const redis = getRedis();
    const key = this.redisKey(userId);
    const ttl = this.getTtl(state);
    const multi = redis.multi().hset(key, 'state', state);
    if (ttl > 0) multi.expire(key, ttl);
    else multi.persist(key);
    await multi.exec();

    logger.info({ userId, state }, 'Session state updated');
  }

  async setSelectedGameUid(userId: string, gameUid: string): Promise<void> {
    const redis = getRedis();
    await redis.hset(this.redisKey(userId), 'selectedGameUid', gameUid);
    logger.info({ userId, gameUid }, 'Selected game UID updated');
  }

  async deleteSession(userId: string): Promise<void> {
    const redis = getRedis();
    await redis.del(this.redisKey(userId));
    logger.info({ userId }, 'Session deleted');
  }

  async isLoggedIn(userId: string): Promise<boolean> {
    const session = await this.getSession(userId);
    return session?.state === 'LOGGED_IN';
  }

  private sessionToHash(session: SessionData): Record<string, string> {
    return {
      state: session.state,
      qrTicket: session.qrTicket ?? '',
      qrUrl: session.qrUrl ?? '',
      deviceId: session.deviceId ?? '',
      selectedGameUid: session.selectedGameUid ?? '',
      createdAt: String(session.createdAt),
    };
  }

  private hashToSession(userId: string, hash: Record<string, string>): SessionData {
    return {
      userId,
      state: hash.state as SessionState,
      qrTicket: hash.qrTicket || null,
      qrUrl: hash.qrUrl || null,
      deviceId: hash.deviceId || null,
      selectedGameUid: hash.selectedGameUid || null,
      createdAt: Number(hash.createdAt) || 0,
    };
  }
}

export const sessionManager = new SessionManager();
