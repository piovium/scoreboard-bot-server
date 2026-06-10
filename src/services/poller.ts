import { sessionManager } from './session.ts';
import { createPassportClient } from './upstream.ts';
import { UpstreamError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import { queryAndAutoSelect } from './gameSelector.ts';
import type { QRStatusResponse } from '../types.ts';
import { QR_EXPIRED_RETCODE } from '../types.ts';
import type { SessionState } from '../types.ts';

interface PollEntry {
  timer: ReturnType<typeof setInterval>;
  startedAt: number;
}

const pollTimers = new Map<string, PollEntry>();

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_DURATION_MS = 120_000;

export function isPolling(userId: string): boolean {
  return pollTimers.has(userId);
}

export function startPolling(userId: string, deviceId: string, qrTicket: string): void {
  if (pollTimers.has(userId)) {
    logger.warn({ userId }, 'Polling already started for user');
    return;
  }

  logger.info({ userId, qrTicket }, 'Starting QR status poller (2s interval, 120s max)');

  const entry: PollEntry = {
    startedAt: Date.now(),
    timer: setInterval(async () => {
      const elapsed = Date.now() - entry.startedAt;

      // Timeout: stop polling after 120 seconds
      if (elapsed >= POLL_MAX_DURATION_MS) {
        stopPolling(userId);
        await sessionManager.updateState(userId, 'QR_EXPIRED');
        logger.warn({ userId, elapsed }, 'Polling timed out after 120s');
        return;
      }

      try {
        const passport = createPassportClient();
        const response = await passport.passportRequest<QRStatusResponse>(
          userId,
          '/account/ma-cn-passport/web/queryQRLoginStatus',
          {
            method: 'POST',
            body: { ticket: qrTicket },
            deviceId,
            retries: 0, // no retry for poll requests
          },
        );

        const upstreamState = mapUpstreamState(response.data.status);

        if (upstreamState !== null) {
          await sessionManager.updateState(userId, upstreamState);

          if (upstreamState === 'LOGGED_IN') {
            stopPolling(userId);
            logger.info(
              { userId, aid: response.data.user_info?.aid },
              'User logged in, poller stopped',
            );
            try {
              await queryAndAutoSelect(userId);
            } catch (err) {
              logger.error({ userId, err }, 'Auto-select game role failed');
            }
          } else if (upstreamState === 'QR_SCANNED') {
            logger.info({ userId }, 'QR code scanned, waiting for confirmation');
          }
        }
      } catch (err) {
        if (err instanceof UpstreamError && err.retcode === QR_EXPIRED_RETCODE) {
          stopPolling(userId);
          await sessionManager.updateState(userId, 'QR_EXPIRED');
          logger.info({ userId }, 'QR code expired (retcode -3501), poller stopped');
        } else {
          logger.warn({ userId, err }, 'QR status polling error, will retry');
        }
      }
    }, POLL_INTERVAL_MS),
  };

  pollTimers.set(userId, entry);
}

export function stopPolling(userId: string): void {
  const entry = pollTimers.get(userId);
  if (entry) {
    clearInterval(entry.timer);
    pollTimers.delete(userId);
    logger.info({ userId }, 'Poller stopped');
  }
}

export function stopAllPollers(): void {
  for (const [userId] of pollTimers) {
    stopPolling(userId);
  }
}

function mapUpstreamState(upstreamState: string): SessionState | null {
  const mapping: Record<string, SessionState> = {
    Created: 'QR_PENDING',
    Scanned: 'QR_SCANNED',
    Confirmed: 'LOGGED_IN',
  };
  return mapping[upstreamState] ?? null;
}
