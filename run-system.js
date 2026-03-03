#!/usr/bin/env node
/**
 * Run entire system: backend + frontend, then trading bot (in this terminal).
 * Usage: node run-system.js   or   npm run run:system
 * From repo root. Bot uses BACKEND_API_URL from apps/frontend/.env.local (port from run-all).
 */
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const tradingDir = join(root, 'apps', 'trading');
const isWin = process.platform === 'win32';
const pythonExe = isWin
  ? join(tradingDir, 'venv', 'Scripts', 'python.exe')
  : join(tradingDir, 'venv', 'bin', 'python');

async function main() {
  if (!existsSync(join(root, 'node_modules'))) {
    console.log('Installing node_modules...');
    const npm = spawn(isWin ? 'npm.cmd' : 'npm', ['install'], { cwd: root, stdio: 'inherit', shell: false });
    await new Promise((res, rej) => { npm.on('close', c => (c === 0 ? res() : rej(new Error('npm install failed')))); });
  }

  const runAll = spawn('node', ['run-all.js'], { cwd: root, stdio: 'inherit', detached: true });
  runAll.unref();

  await new Promise(r => setTimeout(r, 5000));

  let backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
  const envLocalPath = join(root, 'apps', 'frontend', '.env.local');
  if (existsSync(envLocalPath)) {
    try {
      const content = readFileSync(envLocalPath, 'utf8');
      const m = content.match(/VITE_API_PORT=(\d+)/);
      if (m) {
        backendUrl = `http://localhost:${m[1]}`;
        console.log('Backend port', m[1], '-> BACKEND_API_URL=' + backendUrl);
      }
    } catch (_) {}
  }

  if (!existsSync(pythonExe)) {
    console.error('Trading venv not found at', pythonExe, '- create it with: cd apps/trading && python -m venv venv && venv/Scripts/pip install -r requirements-venv.txt');
    process.exit(1);
  }

  const bot = spawn(pythonExe, ['main.py'], {
    cwd: tradingDir,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, BACKEND_API_URL: backendUrl },
  });
  bot.on('close', code => process.exit(code ?? 0));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
