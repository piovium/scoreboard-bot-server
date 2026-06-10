import type { JSX } from 'solid-js';

interface LayoutProps {
  children: JSX.Element;
  title?: string;
}

export function Layout(props: LayoutProps) {
  return (
    <>
      {'<!DOCTYPE html>'}
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>{props.title || 'Render'}</title>
          <script src="https://cdn.tailwindcss.com" />
          <style>{`
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          `}</style>
        </head>
        <body class="bg-white">{props.children}</body>
      </html>
    </>
  );
}
