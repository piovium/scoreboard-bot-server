import puppeteer, { type Browser } from 'puppeteer-core';
import { lookup } from 'node:dns/promises';
import { getEnv } from '../config.ts';
import { logger } from '../lib/logger.ts';

let _browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (_browser?.connected) return _browser;

  const env = getEnv();

  if (_browser) {
    try {
      await _browser.close();
    } catch {
      // ignore
    }
    _browser = null;
  }

  if (env.CHROMIUM_WS_ENDPOINT) {
    // Remote mode: connect to existing headless Chromium.
    // Accept either a real WebSocket endpoint (ws://.../devtools/browser/...) or
    // an HTTP DevTools base URL (http://host:9222) which is friendlier for Docker.
    const endpoint = await normalizeChromiumEndpoint(env.CHROMIUM_WS_ENDPOINT);
    const connectOptions = endpoint.startsWith('http')
      ? { browserURL: endpoint }
      : { browserWSEndpoint: endpoint };
    _browser = await puppeteer.connect(connectOptions);
    logger.info({ endpoint }, 'Connected to remote Chromium');
  } else {
    // Local mode: launch installed Chrome/Chromium
    const executablePath = env.CHROME_PATH;
    _browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
    logger.info({ executablePath }, 'Launched local Chrome');
  }

  _browser.on('disconnected', () => {
    logger.warn('Browser disconnected');
    _browser = null;
  });

  return _browser;
}

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    try {
      await _browser.close();
    } catch (err) {
      logger.warn({ err }, 'Error closing browser');
    }
    _browser = null;
    logger.info('Chromium browser closed');
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.close();
    return true;
  } catch {
    return false;
  }
}

async function normalizeChromiumEndpoint(endpoint: string): Promise<string> {
  if (!endpoint.startsWith('http')) return endpoint;

  // Chrome rejects non-localhost Host headers on the DevTools HTTP endpoint.
  // In Docker Compose, resolve service names to IPs first so Puppeteer can fetch /json/version.
  const url = new URL(endpoint);
  if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && !/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
    try {
      const { address } = await lookup(url.hostname, { family: 4 });
      url.hostname = address;
      return url.toString().replace(/\/$/, '');
    } catch (err) {
      logger.warn({ endpoint, err }, 'Failed to resolve Chromium hostname; using original endpoint');
    }
  }
  return endpoint;
}
