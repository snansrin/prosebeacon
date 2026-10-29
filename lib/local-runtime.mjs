import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

export async function modelStatus(env = process.env, fetcher = fetch) {
  if (env.AI_PROVIDER !== 'ollama') return { connected: null, modelAvailable: null };
  try {
    const response = await fetcher(`${env.OLLAMA_URL || 'http://127.0.0.1:11434'}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return { connected: false, modelAvailable: false };
    const data = await response.json();
    const model = env.OLLAMA_MODEL || '';
    return { connected: true, modelAvailable: Array.isArray(data.models) && data.models.some(m => m.name === model || m.name === `${model}:latest`) };
  } catch { return { connected: false, modelAvailable: false }; }
}

// Only start the explicitly configured executable. Never install or download at launch.
// Existing Ollama services are reused and are never stopped by this application.
export async function startLocalRuntime(env = process.env, { fetcher = fetch, spawnProcess = spawn, wait = delay } = {}) {
  if (env.AI_PROVIDER !== 'ollama' || !env.OLLAMA_EXECUTABLE) return null;
  const url = new URL(env.OLLAMA_URL || 'http://127.0.0.1:11434');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') {
    throw new Error('Otomatik Ollama başlatma yalnızca yerel HTTP adresiyle kullanılabilir.');
  }
  if ((await modelStatus(env, fetcher)).connected) return null;
  const child = spawnProcess(env.OLLAMA_EXECUTABLE, ['serve'], {
    windowsHide: true,
    stdio: 'ignore',
    env: { ...env, OLLAMA_HOST: url.host, OLLAMA_NO_CLOUD: '1', OLLAMA_NUM_PARALLEL: '1', OLLAMA_MAX_LOADED_MODELS: '1', OLLAMA_FLASH_ATTENTION: '1', OLLAMA_KV_CACHE_TYPE: 'q8_0' }
  });
  let failure;
  child.on('error', error => { failure = error; });
  for (let attempt = 0; attempt < 40; attempt++) {
    if (failure || child.exitCode !== null) break;
    if ((await modelStatus(env, fetcher)).connected) return child;
    await wait(500);
  }
  child.kill();
  throw new Error(`Yerel Ollama başlatılamadı. OLLAMA_EXECUTABLE yolunu kontrol edin.${failure ? ` (${failure.code})` : ''}`);
}
