import type { Context } from 'hono';
import { queryGameRoles } from '../services/gameSelector.ts';
import { logger } from '../lib/logger.ts';
import { sessionManager } from '../services/session.ts';

export async function gamesList(c: Context): Promise<Response> {
  const userId = c.get('userId') as string;

  await sessionManager.assertLoggedIn(userId, 'User must be logged in to query game roles');

  const roles = await queryGameRoles(userId);

  logger.info({ userId, count: roles.length }, 'Game roles listed');

  return c.json({ userId, roles });
}
