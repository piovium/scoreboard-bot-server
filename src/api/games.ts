import type { Context } from 'hono';
import { getGameRoles, queryGameRoles } from '../services/gameSelector.ts';
import { logger } from '../lib/logger.ts';

export async function gamesList(c: Context): Promise<Response> {
  const userId = c.get('userId') as string;

  const roles = await queryGameRoles(userId);

  logger.info({ userId, count: roles.length }, 'Game roles listed');

  return c.json({ userId, roles });
}
