#!/usr/bin/env node
/**
 * Run trading bot only (venv). Usage: node run-bot.js   or   npm run run:bot
 * From repo root. Set BACKEND_API_URL in .env or env to match backend port.
 */
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const tradingDir = join(root, 'apps', 'trading');
const isWin = process.platform === 'win32';
const pythonExe = isWin
  ? join(tradingDir, 'venv', 'Scripts', 'python.exe')
  : join(tradingDir, 'venv', 'bin', 'python');

let backendUrl = process.env.BACKEND_API_URL;
if (!backendUrl) {
  const envLocalPath = join(root, 'apps', 'frontend', '.env.local');
  if (existsSync(envLocalPath)) {
    try {
      const m = readFileSync(envLocalPath, 'utf8').match(/VITE_API_PORT=(\d+)/);
      if (m) backendUrl = `http://localhost:${m[1]}`;
    } catch (_) {}
  }
  if (!backendUrl) backendUrl = 'http://localhost:3000';
}

if (!existsSync(pythonExe)) {
  console.error('Venv not found at', pythonExe);
  process.exit(1);
}

const bot = spawn(pythonExe, ['main.py'], {
  cwd: tradingDir,
  stdio: 'inherit',
  shell: false,
  env: { ...process.env, BACKEND_API_URL: backendUrl },
});
bot.on('close', code => process.exit(code ?? 0));
