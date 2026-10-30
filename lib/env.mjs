// Minimal, dependency-free .env loader so the app starts on any Node >= 20
// without the `--env-file-if-exists` flag (added only in Node 22.9).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function parseEnv(text) {
  const values = {};
  for (const rawLine of String(text).split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim().replace(/^export\s+/u, '');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) continue;
    let value = line.slice(separator + 1).trim();
    const quoted = value.length > 1 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")));
    if (quoted) value = value.slice(1, -1);
    if (!quoted) value = value.replace(/\s+#.*$/u, '');
    values[key] = value;
  }
  return values;
}

export function loadEnvFile(directory = process.cwd(), filename = '.env') {
  let text;
  try { text = readFileSync(resolve(directory, filename), 'utf8'); } catch { return { path: null, values: {} }; }
  return { path: resolve(directory, filename), values: parseEnv(text) };
}

// Process environment always wins over the file, so a launcher can override.
export function applyEnvFile(target = process.env, directory = process.cwd(), filename = '.env') {
  const loaded = loadEnvFile(directory, filename);
  for (const [key, value] of Object.entries(loaded.values)) if (target[key] === undefined) target[key] = value;
  return loaded;
}
