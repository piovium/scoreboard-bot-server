import { getRedis } from '../lib/redis.ts';
import { createUpstreamClient } from './upstream.ts';
import { sessionManager } from './session.ts';
import { logger } from '../lib/logger.ts';
import type { GameRole, GameRolesResponse, GameSelectResult } from '../types.ts';

const GAME_BIZ = 'hk4e_cn';
const GAMES_REDIS_KEY = (userId: string) => `games:${userId}`;

/** Query the user's game roles from the biz API */
export async function queryGameRoles(userId: string): Promise<GameRole[]> {
  const upstream = createUpstreamClient();

  const response = await upstream.request<GameRolesResponse>(
    userId,
    `/binding/api/getUserGameRolesByCookieToken?game_biz=${GAME_BIZ}`,
  );
  logger.info({ userId, status: response }, 'Queried game roles from upstream');

  const roles = response.data?.list ?? [];

  // Cache in Redis
  const redis = getRedis();
  await redis.setex(GAMES_REDIS_KEY(userId), 3600, JSON.stringify(roles));

  logger.info({ userId, count: roles.length }, 'Game roles queried');
  return roles;
}

/** Get cached game roles */
export async function getGameRoles(userId: string): Promise<GameRole[]> {
  const redis = getRedis();
  const raw = await redis.get(GAMES_REDIS_KEY(userId));
  return raw ? JSON.parse(raw) : [];
}

/**
 * Auto-select the best game role from the list.
 * Priority: is_chosen → not banned → is_official → higher level → earlier in list
 */
export function pickBestRole(roles: GameRole[]): GameRole | null {
  if (roles.length === 0) return null;
  if (roles.length === 1) return roles[0];

  const sorted = [...roles].sort((a, b) => {
    if (a.is_chosen !== b.is_chosen) return a.is_chosen ? -1 : 1;
    if (a.is_banned !== b.is_banned) return a.is_banned ? 1 : -1;
    if (a.is_official !== b.is_official) return a.is_official ? -1 : 1;
    if (a.level !== b.level) return b.level - a.level;
    return roles.indexOf(a) - roles.indexOf(b);
  });

  return sorted[0];
}

/** Call the select API to bind the chosen game role */
export async function selectGameRole(
  userId: string,
  role: GameRole,
  lang: string = 'zh-cn',
): Promise<GameSelectResult> {
  const upstream = createUpstreamClient();

  const response = await upstream.request<GameSelectResult>(
    userId,
    '/common/badge/v1/login/account',
    {
      method: 'POST',
      body: {
        game_biz: role.game_biz,
        lang,
        region: role.region,
        uid: role.game_uid,
      },
    },
  );

  logger.info({ userId, gameUid: role.game_uid, nickname: role.nickname }, 'Game role selected');
  return response.data!;
}

/**
 * Query roles and auto-select the best one.
 * Called automatically after login is confirmed.
 */
export async function queryAndAutoSelect(userId: string): Promise<GameRole | null> {
  const roles = await queryGameRoles(userId);

  if (roles.length === 0) {
    logger.info({ userId }, 'No game roles found');
    return null;
  }

  const best = pickBestRole(roles);
  if (!best) return null;

  await selectGameRole(userId, best);
  await sessionManager.setSelectedGameUid(userId, best.game_uid);

  logger.info(
    { userId, gameUid: best.game_uid, nickname: best.nickname },
    'Auto-selected game role',
  );
  return best;
}
