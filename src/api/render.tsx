import { renderToPng } from '../renderer/render.ts';
import { CardPage } from '../renderer/templates/Card.tsx';
import { ValidationError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import type { Context } from 'hono';
import { sessionManager } from '../services/session.ts';
import { queryAndAutoSelect } from '../services/gameSelector.ts';
import {
  getSelectedRole,
  queryHomePage,
  queryPeakRank,
  queryGameRecords,
} from '../services/gameRecords.ts';

export async function render(c: Context): Promise<Response> {
  const body = await c.req.json();
  const userId = (body?.userId || c.get('userId')) as string;

  if (!userId) throw new ValidationError('userId is required');

  await sessionManager.assertLoggedIn(userId, 'User must be logged in to render card');

  let role = await getSelectedRole(userId);
  if (!role) {
    logger.info({ userId }, 'No role selected, auto-selecting...');
    await queryAndAutoSelect(userId);
    role = await getSelectedRole(userId);
  }
  if (!role) throw new ValidationError('No game role selected');

  const pageData = await queryHomePage(userId, role.gameUid, role.region);
  await new Promise((r) => setTimeout(r, 500));
  const peakRank = await queryPeakRank(userId, role.gameUid, role.region);
  await new Promise((r) => setTimeout(r, 500));
  const records = await queryGameRecords(userId, role.gameUid, role.region);

  const pngBuffer = await renderToPng(() => (
    <CardPage
      pageInfo={pageData.page_info}
      peakRank={peakRank}
      gameRecords={records}
      gameUid={role.gameUid}
    />
  ));

  logger.info({ userId, gameUid: role.gameUid }, 'Card rendered');

  return new Response(pngBuffer, {
    status: 200,
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' },
  });
}
