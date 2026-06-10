import type { Context } from 'hono';
import { getGameRoles, selectGameRole } from '../services/gameSelector.ts';
import { sessionManager } from '../services/session.ts';
import { ValidationError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';

export async function gamesSelect(c: Context): Promise<Response> {
  const userId = c.get('userId') as string;
  const body = await c.req.json();
  const { game_uid: gameUid } = body as { game_uid?: string };

  if (!gameUid) {
    throw new ValidationError('game_uid is required');
  }

  const roles = await getGameRoles(userId);
  const role = roles.find((r) => r.game_uid === gameUid);

  if (!role) {
    throw new ValidationError(`Game role with uid ${gameUid} not found`);
  }

  const result = await selectGameRole(userId, role);
  await sessionManager.setSelectedGameUid(userId, gameUid);

  logger.info({ userId, gameUid, nickname: role.nickname }, 'Game role selected');

  return c.json({ userId, selected: result });
}
