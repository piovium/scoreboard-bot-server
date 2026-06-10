import type { Context } from 'hono';
import { sessionManager } from '../services/session.ts';
import { isPolling } from '../services/poller.ts';
import { logger } from '../lib/logger.ts';

export async function loginStatus(c: Context): Promise<Response> {
  const userId = c.get('userId') as string;

  const session = await sessionManager.getSession(userId);
  if (!session) {
    return c.json({ userId, state: 'IDLE' as const });
  }

  const polling = isPolling(userId);

  logger.info({ userId, state: session.state, polling }, 'Login status checked');

  return c.json({
    userId,
    state: session.state,
    qrUrl: session.qrUrl,
    polling,
  });
}
