import { spawn } from 'node:child_process';

let child: ReturnType<typeof spawn> | null = null;

function restart() {
  if (child) {
    child.kill('SIGTERM');
    child.on('close', () => {
      child = null;
      startNode();
    });
  } else {
    startNode();
  }
}

function startNode() {
  child = spawn('node', ['dist/server.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  child.on('close', (code) => {
    if (code) console.error(`[dev] server exited: ${code}`);
    child = null;
  });
}

// Use vite CLI for build, which reads vite.config.ts
const buildProc = spawn('npx', ['vite', 'build', '--watch'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, FORCE_COLOR: '1' },
});

buildProc.on('close', (code) => {
  if (child) child.kill();
  process.exit(code ?? 0);
});

// Initial start after a short delay for first build
setTimeout(restart, 3000);

// Restart on file changes (detect via watching dist/index.mjs)
import { watch } from 'node:fs';
let fsWatcher: ReturnType<typeof watch> | null = null;
setTimeout(() => {
  try {
    fsWatcher = watch('dist/server.mjs', () => {
      setTimeout(restart, 500);
    });
  } catch {}
}, 4000);

process.on('SIGTERM', () => {
  if (child) child.kill();
  if (fsWatcher) fsWatcher.close();
  buildProc.kill();
  process.exit(0);
});
process.on('SIGINT', () => {
  if (child) child.kill();
  if (fsWatcher) fsWatcher.close();
  buildProc.kill();
  process.exit(0);
});
