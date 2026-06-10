import type { Context } from 'hono';
import { getSelectedRole, queryGameRecords } from '../services/gameRecords.ts';
import { sessionManager } from '../services/session.ts';
import { NotLoggedInError, ValidationError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';

export async function gameRecords(c: Context): Promise<Response> {
  const userId = c.get('userId') as string;

  const loggedIn = await sessionManager.isLoggedIn(userId);
  if (!loggedIn) {
    throw new NotLoggedInError('User must be logged in to query game records');
  }

  const role = await getSelectedRole(userId);
  if (!role) {
    throw new ValidationError(
      'No game role selected. Call POST /api/games/select first, or login to auto-select.',
    );
  }

  const records = await queryGameRecords(userId, role.gameUid, role.region);

  logger.info({ userId, gameUid: role.gameUid, count: records.length }, 'Game records returned');

  return c.json({ userId, gameUid: role.gameUid, records });
}
