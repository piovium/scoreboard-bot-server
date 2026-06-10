import { Hono } from 'hono';
import { authMiddleware } from './middleware/auth.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { requestLogger } from './middleware/logger.ts';
import { login } from './api/login.tsx';
import { loginStatus } from './api/loginStatus.ts';
import { render } from './api/render.tsx';
import { health } from './api/health.ts';
import { gamesList } from './api/games.ts';
import { gamesSelect } from './api/gamesSelect.ts';
import { gameRecords } from './api/gameRecords.ts';
import { homePage } from './api/homePage.ts';
import { peakRank } from './api/peakRank.ts';

export function createApp(): Hono {
  const app = new Hono();

  app.onError(errorHandler);
  app.use('*', requestLogger);

  app.get('/api/health', health);

  // Auth-protected routes (userId from query or x-user-id header)
  app.get('/api/login/status', authMiddleware, loginStatus);
  app.post('/api/render', authMiddleware, render);
  app.get('/api/games', authMiddleware, gamesList);
  app.post('/api/games/select', authMiddleware, gamesSelect);
  app.get('/api/game-records', authMiddleware, gameRecords);
  app.get('/api/home-page', authMiddleware, homePage);
  app.get('/api/peak-rank', authMiddleware, peakRank);

  // Login route: no auth middleware — userId comes from POST body
  app.post('/api/login', login);

  return app;
}
