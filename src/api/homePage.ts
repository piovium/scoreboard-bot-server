import type { Context } from 'hono';
import { getSelectedRole, queryHomePage } from '../services/gameRecords.ts';
import { sessionManager } from '../services/session.ts';
import { ValidationError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';

export async function homePage(c: Context): Promise<Response> {
  const userId = c.get('userId') as string;

  await sessionManager.assertLoggedIn(userId, 'User must be logged in to query home page');

  const role = await getSelectedRole(userId);
  if (!role) {
    throw new ValidationError(
      'No game role selected. Call POST /api/games/select first, or login to auto-select.',
    );
  }

  const data = await queryHomePage(userId, role.gameUid, role.region);

  logger.info(
    { userId, gameUid: role.gameUid, nickname: data.page_info.nickname },
    'Home page returned',
  );

  return c.json({ userId, gameUid: role.gameUid, ...data });
}
