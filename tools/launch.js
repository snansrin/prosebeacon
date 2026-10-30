#!/usr/bin/env node
/**
 * ProseBeacon launcher — used by the desktop shortcut.
 * Starts the server, waits until it answers, then opens the browser.
 * Closing this process (or Ctrl+C in a visible console) stops everything.
 */
import { spawn, exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const PORT = Number(process.env.PORT || 3210);
const HOST = '127.0.0.1';
const URL = `http://localhost:${PORT}`;

function openBrowser() {
  const command = process.platform === 'win32'
    ? `start "" "${URL}"`
    : process.platform === 'darwin'
      ? `open "${URL}"`
      : `xdg-open "${URL}"`;
  exec(command, () => {});
}

async function waitReady(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${URL}/api/health`);
      if (response.ok) return true;
    } catch { /* not up yet */ }
    await new Promise(done => setTimeout(done, 250));
  }
  return false;
}

const server = spawn(process.execPath, [resolve(root, 'server.mjs')], {
  cwd: root,
  env: { ...process.env, HOST, PORT: String(PORT) },
  stdio: process.env.PB_DEBUG ? 'inherit' : 'ignore'
});

let opened = false;
const shutdown = code => {
  try { server.kill('SIGTERM'); } catch { /* already gone */ }
  process.exit(code ?? 0);
};
server.on('exit', code => shutdown(code));
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('SIGHUP', () => shutdown(0));

const ready = await waitReady();
if (ready && !opened) {
  opened = true;
  openBrowser();
} else if (!ready) {
  // Keep the console visible when something went wrong so the user can read it.
  console.error('ProseBeacon sunucusu 60 saniye içinde hazır olmadı. Terminalde tekrar deneyin: npm start');
  shutdown(1);
}
