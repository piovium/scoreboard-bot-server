import { renderToString } from 'solid-js/web';
import { getBrowser } from './browser.ts';
import { RenderError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';

export async function renderToPng(fn: () => unknown): Promise<Buffer> {
  const html = `<!DOCTYPE html>${renderToString(fn)}`;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1600, height: 1600 });
    await page.setContent(html, { waitUntil: 'load', timeout: 15000 });

    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        }),
      );
    });

    const clip = await page.evaluate(() => {
      const el = document.getElementById('capture');
      if (!el) return null;
      const { left, top, width, height } = el.getBoundingClientRect();
      return { x: left, y: top, width, height };
    });

    if (!clip) throw new RenderError('Capture element not found');

    const buffer = await page.screenshot({ type: 'png', clip });
    return Buffer.from(buffer);
  } catch (err) {
    logger.error({ err }, 'Render failed');
    throw new RenderError(`Render failed: ${String(err)}`);
  } finally {
    await page.close().catch(() => {});
  }
}
