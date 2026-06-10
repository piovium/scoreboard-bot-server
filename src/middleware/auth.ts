import type { Context, Next } from 'hono';
import { SessionNotFoundError } from '../lib/errors.ts';

export async function authMiddleware(c: Context, next: Next): Promise<void> {
  const userId = c.req.query('userId') || c.req.header('x-user-id');

  if (!userId) {
    throw new SessionNotFoundError(
      'userId is required (query parameter ?userId=xxx or header x-user-id)',
    );
  }

  c.set('userId', userId);
  await next();
}
