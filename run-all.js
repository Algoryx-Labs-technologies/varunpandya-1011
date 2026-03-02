#!/usr/bin/env node
/**
 * Find a free port, start backend, then frontend (Vite) with VITE_API_PORT set.
 * Usage: node run-all.js
 * From repo root: node run-all.js
 */
import { createServer } from 'http';
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const backendDir = join(root, 'apps', 'backend');
const frontendDir = join(root, 'apps', 'frontend');

function findFreePort(start = 3000, max = 3050) {
  return new Promise((resolve, reject) => {
    function tryPort(p) {
      if (p > max) return reject(new Error('No free port'));
      const s = createServer();
      s.once('error', () => {
        s.close();
        tryPort(p + 1);
      });
      s.listen(p, () => {
        s.close(() => resolve(p));
      });
    }
    tryPort(start);
  });
}

async function main() {
  const port = await findFreePort(3000, 3050);
  console.log('Using port', port);

  // Write frontend .env.local so Vite picks up VITE_API_PORT
  const envLocal = join(frontendDir, '.env.local');
  writeFileSync(envLocal, `VITE_API_PORT=${port}\n`, 'utf8');
  console.log('Wrote', envLocal);

  const backend = spawn('node', ['src/index.js'], {
    cwd: backendDir,
    env: { ...process.env, PORT: String(port) },
    stdio: 'inherit',
  });
  backend.on('error', (err) => {
    console.error('Backend error:', err);
    process.exit(1);
  });

  // Start frontend after a short delay so backend is up
  await new Promise((r) => setTimeout(r, 1500));

  const isWin = process.platform === 'win32';
  const frontend = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    cwd: frontendDir,
    env: { ...process.env, VITE_API_PORT: String(port) },
    stdio: 'inherit',
    shell: isWin,
  });
  frontend.on('error', (err) => {
    console.error('Frontend error:', err);
    backend.kill();
    process.exit(1);
  });

  process.on('SIGINT', () => {
    backend.kill();
    frontend.kill();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
