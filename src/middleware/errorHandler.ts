import type { Context, Next } from 'hono';
import { AppError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';

export async function errorHandler(err: Error, c: Context): Promise<Response> {
  if (err instanceof AppError) {
    logger.warn({ err, statusCode: err.statusCode }, 'Application error');
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
        },
      },
      err.statusCode as 400 | 401 | 500 | 502,
    );
  }

  logger.error({ err }, 'Unhandled error');
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    },
    500,
  );
}
