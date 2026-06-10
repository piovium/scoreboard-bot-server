import type { Context } from 'hono';
import { loginRequestSchema, validate } from '../lib/validation.ts';
import { createPassportClient } from '../services/upstream.ts';
import { sessionManager } from '../services/session.ts';
import { startPolling } from '../services/poller.ts';
import { generateQrCode } from '../renderer/qrcode.ts';
import { renderToPng } from '../renderer/render.ts';
import { QrCodePage } from '../renderer/templates/QrCode.tsx';
import { logger } from '../lib/logger.ts';
import type { QRLoginResponse } from '../types.ts';

export async function login(c: Context): Promise<Response> {
  const body = await c.req.json();
  const { userId } = validate(loginRequestSchema, body);

  const deviceId = await sessionManager.getOrCreateDeviceId(userId);

  const passport = createPassportClient();
  const response = await passport.passportRequest<QRLoginResponse>(
    userId,
    '/account/ma-cn-passport/web/createQRLogin',
    { method: 'POST', body: {}, deviceId },
  );

  const { url: qrUrl, ticket: qrTicket } = response.data;

  logger.info({ userId, qrTicket }, 'QR login created');

  await sessionManager.createSession(userId, { qrTicket, qrUrl });
  startPolling(userId, deviceId, qrTicket);

  const qrBase64 = await generateQrCode(qrUrl);
  const pngBuffer = await renderToPng(() => <QrCodePage qrImageBase64={qrBase64} userId={userId} />);

  logger.info({ userId, deviceId }, 'Login initiated, QR code rendered');

  return new Response(pngBuffer, {
    status: 200,
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' },
  });
}
