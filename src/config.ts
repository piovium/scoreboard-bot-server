import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // miHoYo passport API (QR login + status polling)
  PASSPORT_API_URL: z.string().url().default('https://passport-api.mihoyo.com'),

  // miHoYo biz API (data query after login)
  BIZ_API_URL: z.string().url().default('https://api-takumi.mihoyo.com'),

  // miHoYo game API (game data queries)
  GAME_API_URL: z.string().url().default('https://hk4e-api.mihoyo.com'),

  // RPC headers for device fingerprinting
  RPC_APP_ID: z.string().default('cie2gjc0sg00'),
  RPC_CLIENT_TYPE: z.string().default('4'),
  RPC_GAME_BIZ: z.string().default('hk4e_cn'),
  RPC_SDK_VERSION: z.string().default('2.53.1'),

  // Device info defaults
  DEVICE_NAME: z.string().default('Chrome'),
  DEVICE_MODEL: z.string().default('Chrome 149.0.0.0'),
  DEVICE_OS: z.string().default('Windows 10 64-bit'),

  REDIS_URL: z.string().default('redis://localhost:6379/0'),

  // Chromium: set CHROMIUM_WS_ENDPOINT to connect to remote (Docker),
  // or leave empty to auto-launch local Chrome
  CHROMIUM_WS_ENDPOINT: z.string().optional().default(''),
  CHROME_PATH: z.string().optional().default(''),

  SESSION_TTL: z.coerce.number().int().positive().default(300),
  COOKIE_TTL: z.coerce
    .number()
    .int()
    .refine((v) => v > 0 || v === -1, 'Must be positive or -1 for no expiry')
    .default(-1),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function loadEnv(): Env {
  if (_env) return _env;
  const raw = {
    PORT: process.env.PORT,
    LOG_LEVEL: process.env.LOG_LEVEL,
    PASSPORT_API_URL: process.env.PASSPORT_API_URL,
    BIZ_API_URL: process.env.BIZ_API_URL,
    GAME_API_URL: process.env.GAME_API_URL,
    RPC_APP_ID: process.env.RPC_APP_ID,
    RPC_CLIENT_TYPE: process.env.RPC_CLIENT_TYPE,
    RPC_GAME_BIZ: process.env.RPC_GAME_BIZ,
    RPC_SDK_VERSION: process.env.RPC_SDK_VERSION,
    DEVICE_NAME: process.env.DEVICE_NAME,
    DEVICE_MODEL: process.env.DEVICE_MODEL,
    DEVICE_OS: process.env.DEVICE_OS,
    REDIS_URL: process.env.REDIS_URL,
    CHROMIUM_WS_ENDPOINT: process.env.CHROMIUM_WS_ENDPOINT,
    CHROME_PATH: process.env.CHROME_PATH,
    SESSION_TTL: process.env.SESSION_TTL,
    COOKIE_TTL: process.env.COOKIE_TTL,
  };
  _env = envSchema.parse(raw);
  return _env;
}

export function getEnv(): Env {
  if (!_env) return loadEnv();
  return _env;
}
