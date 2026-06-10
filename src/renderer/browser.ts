import puppeteer, { type Browser } from 'puppeteer-core';
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
    // Remote mode: connect to existing headless Chromium (Docker chromedp/headless-shell)
    _browser = await puppeteer.connect({
      browserWSEndpoint: env.CHROMIUM_WS_ENDPOINT,
    });
    logger.info({ endpoint: env.CHROMIUM_WS_ENDPOINT }, 'Connected to remote Chromium');
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
