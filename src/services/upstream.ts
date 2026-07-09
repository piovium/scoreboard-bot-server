import { CookieJar } from 'tough-cookie';
import { getEnv } from '../config.ts';
import { cookieStore } from './cookieStore.ts';
import { sessionManager } from './session.ts';
import { UpstreamError, SessionExpiredError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import type { MHYDeviceHeaders, MHYPassportResponse } from '../types.ts';

export class UpstreamClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async buildCookieHeader(
    userId: string,
    jar: CookieJar,
    url: string,
  ): Promise<Record<string, string>> {
    const cookies = await jar.getCookies(url);
    if (cookies.length === 0) return {};
    return { Cookie: cookies.join('; ') };
  }

  /**
   * Build miHoYo x-rpc-* device headers.
   * _MHYUUID cookie value MUST equal x-rpc-device_id — they are the same UUID.
   */
  buildDeviceHeaders(deviceId: string): MHYDeviceHeaders {
    const env = getEnv();
    return {
      'x-rpc-app_id': env.RPC_APP_ID,
      'x-rpc-client_type': env.RPC_CLIENT_TYPE,
      'x-rpc-device_fp': '',
      'x-rpc-device_id': deviceId,
      'x-rpc-device_model': env.DEVICE_MODEL,
      'x-rpc-device_name': env.DEVICE_NAME,
      'x-rpc-device_os': env.DEVICE_OS,
      'x-rpc-game_biz': env.RPC_GAME_BIZ,
      'x-rpc-lifecycle_id': '',
      'x-rpc-sdk_version': env.RPC_SDK_VERSION,
    };
  }

  async request<T = unknown>(
    userId: string,
    path: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
    } = {},
  ): Promise<{ data: T; headers: Headers; status: number }> {
    const {
      method = 'GET',
      body,
      headers: extraHeaders = {},
      timeout = 15000,
      retries = 3,
    } = options;
    const url = `${this.baseUrl}${path}`;
    const jar = await cookieStore.getJar(userId);
    const cookieHeaders = await this.buildCookieHeader(userId, jar, url);

    const maxAttempts = Math.max(retries, 1);
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...cookieHeaders,
            ...extraHeaders,
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        await cookieStore.applyResponse(userId, jar, response.headers, url);
        await cookieStore.saveJar(userId, jar);

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new UpstreamError(
            `Upstream returned ${response.status}: ${errorText.slice(0, 200)}`,
          );
        }

        const json = (await response.json().catch(() => null)) as MHYPassportResponse<T> | null;

        // Check for MHY biz API retcode errors
        if (json && json.retcode !== 0) {
          const msg = json.message || `retcode ${json.retcode}`;

          if (json.retcode === -100) {
            logger.warn({ userId, url, message: json.message }, 'Session expired (retcode -100)');
            await sessionManager.updateState(userId, 'IDLE');
            throw new SessionExpiredError(`Login expired, please re-login: ${msg}`);
          }

          throw new UpstreamError(`Biz API error: ${msg}`, json.retcode);
        }

        const data = (json?.data as T) ?? (json as unknown as T);
        return { data, headers: response.headers, status: response.status };
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof SessionExpiredError) throw err;
        lastError = err;
        logger.warn(
          { userId, url, attempt, err },
          `Upstream request failed, attempt ${attempt + 1}/${retries}`,
        );
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
        }
      }
    }

    throw new UpstreamError(
      `Upstream request failed after ${maxAttempts} attempts: ${String(lastError)}`,
    );
  }

  /** Call miHoYo passport API with x-rpc device headers */
  async passportRequest<T = unknown>(
    userId: string,
    path: string,
    options: {
      method?: string;
      body?: unknown;
      deviceId: string;
      extraHeaders?: Record<string, string>;
      timeout?: number;
      retries?: number;
    },
  ): Promise<{ data: T; headers: Headers; status: number }> {
    const {
      method = 'GET',
      body,
      deviceId,
      extraHeaders = {},
      timeout = 15000,
      retries = 3,
    } = options;
    const env = getEnv();
    const url = `${env.PASSPORT_API_URL}${path}`;

    const deviceHeaders = this.buildDeviceHeaders(deviceId);

    // Build Cookie header with _MHYUUID=<deviceId>
    const jar = await cookieStore.getJar(userId);
    const cookieHeader = await this.buildCookieHeader(userId, jar, url);
    const mhyCookie = `_MHYUUID=${deviceId}`;
    const existingCookies = cookieHeader.Cookie || '';
    const mergedCookie = existingCookies ? `${existingCookies}; ${mhyCookie}` : mhyCookie;

    const maxAttempts = Math.max(retries, 1);
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: mergedCookie,
            ...deviceHeaders,
            ...extraHeaders,
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        await cookieStore.applyResponse(userId, jar, response.headers, url);
        await cookieStore.saveJar(userId, jar);

        const json = (await response.json().catch(() => null)) as MHYPassportResponse<T> | null;

        if (!response.ok || (json && json.retcode !== 0)) {
          const errorMsg = json?.message || `HTTP ${response.status}`;
          throw new UpstreamError(`Passport API error: ${errorMsg}`, json?.retcode ?? undefined);
        }

        logger.info({ userId, path, retcode: json?.retcode }, 'Passport request success');
        return { data: json!.data as T, headers: response.headers, status: response.status };
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof UpstreamError) throw err;
        if (err instanceof SessionExpiredError) throw err;
        lastError = err;
        logger.warn(
          { userId, url, attempt, err },
          `Passport request failed, attempt ${attempt + 1}/${retries}`,
        );
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
        }
      }
    }

    throw new UpstreamError(
      `Passport request failed after ${retries} retries: ${String(lastError)}`,
    );
  }
}

export function createUpstreamClient(): UpstreamClient {
  const env = getEnv();
  return new UpstreamClient(env.BIZ_API_URL);
}

export function createPassportClient(): UpstreamClient {
  const env = getEnv();
  return new UpstreamClient(env.PASSPORT_API_URL);
}
