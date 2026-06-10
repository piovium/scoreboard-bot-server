import { z } from 'zod';
import { logger } from './logger.ts';
import { ValidationError } from './errors.ts';

export const loginRequestSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export const renderRequestSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  dataType: z.string().min(1, 'dataType is required'),
});

export const loginStatusQuerySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten() }, 'Validation failed');
    throw new ValidationError(result.error.issues.map((i) => i.message).join('; '));
  }
  return result.data;
}
