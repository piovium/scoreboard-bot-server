import { getEnv } from '../config.ts';
import { cookieStore } from './cookieStore.ts';
import { getGameRoles } from './gameSelector.ts';
import { sessionManager } from './session.ts';
import { UpstreamError, SessionExpiredError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import type {
  GameRecord,
  GameRecordsData,
  HomePageData,
  PeakRankData,
  MHYPassportResponse,
} from '../types.ts';

const GAME_BIZ = 'hk4e_cn';

/** Get the selected game role's uid and region for a user */
export async function getSelectedRole(
  userId: string,
): Promise<{ gameUid: string; region: string } | null> {
  const session = await sessionManager.getSession(userId);
  if (!session?.selectedGameUid) return null;

  const roles = await getGameRoles(userId);
  const selected = roles.find((r) => r.game_uid === session.selectedGameUid);
  if (!selected) return null;

  return { gameUid: selected.game_uid, region: selected.region };
}

/** Low-level GET request to the game API with cookie + retcode handling */
async function gameApiGet<T>(
  userId: string,
  path: string,
  gameUid: string,
  region: string,
  lang: string = 'zh-cn',
): Promise<T> {
  const env = getEnv();
  const baseUrl = env.GAME_API_URL.replace(/\/$/, '');
  const query = new URLSearchParams({
    badge_uid: gameUid,
    badge_region: region,
    game_biz: GAME_BIZ,
    lang,
  }).toString();
  const url = `${baseUrl}${path}?${query}`;

  const jar = await cookieStore.getJar(userId);
  const cookies = await jar.getCookies(url);
  const cookieHeader = cookies.length > 0 ? cookies.join('; ') : '';

  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Cookie: cookieHeader,
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      await cookieStore.applyResponse(userId, jar, response.headers, url);
      await cookieStore.saveJar(userId, jar);

      const json = (await response.json().catch(() => null)) as MHYPassportResponse<T> | null;

      if (json && json.retcode !== 0) {
        const msg = json.message || `retcode ${json.retcode}`;

        if (json.retcode === -100) {
          logger.warn({ userId, url, message: json.message }, 'Session expired (retcode -100)');
          await sessionManager.updateState(userId, 'IDLE');
          throw new SessionExpiredError(`Login expired, please re-login: ${msg}`);
        }

        // Rate limit: retry with backoff instead of failing
        if (json.retcode === -500004 && attempt < 2) {
          const delay = (attempt + 1) * 2000;
          logger.warn({ userId, url, attempt }, `Rate limited, retrying in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw new UpstreamError(`Game API error: ${msg}`, json.retcode);
      }

      return json!.data as T;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof UpstreamError || err instanceof SessionExpiredError) throw err;
      lastError = err;
      logger.warn(
        { userId, url, attempt, err },
        `Game API request failed, attempt ${attempt + 1}/3`,
      );
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
      }
    }
  }

  throw new UpstreamError(`Game API request failed after 3 attempts: ${String(lastError)}`);
}

/** Query game records */
export async function queryGameRecords(
  userId: string,
  gameUid: string,
  region: string,
  lang: string = 'zh-cn',
): Promise<GameRecord[]> {
  const data = await gameApiGet<GameRecordsData>(
    userId,
    '/event/geniusinvokationtcg/get_game_records',
    gameUid,
    region,
    lang,
  );
  logger.info({ userId, gameUid, count: data.game_records.length }, 'Game records queried');
  return data.game_records;
}

/** Query home page info */
export async function queryHomePage(
  userId: string,
  gameUid: string,
  region: string,
  lang: string = 'zh-cn',
): Promise<HomePageData> {
  const data = await gameApiGet<HomePageData>(
    userId,
    '/event/geniusinvokationtcg/my_home_page',
    gameUid,
    region,
    lang,
  );
  logger.info({ userId, gameUid, nickname: data.page_info.nickname }, 'Home page queried');
  return data;
}

/** Query peak rank */
export async function queryPeakRank(
  userId: string,
  gameUid: string,
  region: string,
  lang: string = 'zh-cn',
): Promise<PeakRankData> {
  const data = await gameApiGet<PeakRankData>(
    userId,
    '/event/geniusinvokationtcg/peak_rank',
    gameUid,
    region,
    lang,
  );
  logger.info({ userId, gameUid, rankCount: data.rank_infos.length }, 'Peak rank queried');
  return data;
}
