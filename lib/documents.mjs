import { Worker } from 'node:worker_threads';
import { extname } from 'node:path';
import { MAX_TEXT } from './analysis.mjs';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_TEXT = 500000;
export const MAX_PDF_PAGES = 150;
const extensions = new Set(['.pdf', '.docx', '.txt', '.md']);
let active = 0;
export function documentError(message, status = 422) {
  return Object.assign(new Error(message), { status });
}
export function validateFilename(filename) {
  if (typeof filename !== 'string' || !filename.trim() || filename.length > 255 || /[\u0000-\u001f/\\]/u.test(filename)) {
    throw documentError('Geçerli bir dosya adı gerekli.', 400);
  }
  const extension = extname(filename).toLowerCase();
  if (extension === '.doc') throw documentError('Eski .doc biçimi desteklenmiyor. Word içinde Farklı Kaydet ile .docx olarak kaydedip yükleyin.', 415);
  if (!extensions.has(extension)) throw documentError('PDF, Word (.docx), TXT veya Markdown (.md) dosyası seçin.', 415);
  return extension;
}
export function splitDocument(text, limit = MAX_TEXT) {
  const parts = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + limit, text.length);
    if (end < text.length) {
      const newline = text.lastIndexOf('\n', end - 1);
      const space = text.lastIndexOf(' ', end - 1);
      const boundary = newline >= start + limit / 2 ? newline : space;
      if (boundary >= start + limit / 2) end = boundary + 1;
      // Do not split a Unicode surrogate pair.
      if (/[\uD800-\uDBFF]/u.test(text[end - 1])) end--;
    }
    parts.push({ start, end });
    start = end;
  }
  return parts;
}
export async function extractDocument(buffer, filename, { signal, timeoutMs = 25000 } = {}) {
  const extension = validateFilename(filename);
  if (!buffer.length) throw documentError('Dosya boş.', 400);
  if (buffer.length > MAX_FILE_BYTES) throw documentError('Dosya en fazla 10 MB olabilir.', 413);
  if (signal?.aborted) throw documentError('Dosya okuma iptal edildi.', 499);
  if (active >= 2) throw documentError('İki belge işleniyor. Biraz sonra tekrar deneyin.', 429);
  active++;
  try {
    return await new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./document-worker.mjs', import.meta.url), {
        workerData: { data: new Uint8Array(buffer), extension },
        resourceLimits: { maxOldGenerationSizeMb: 192, stackSizeMb: 4 },
        stdout: true, stderr: true
      });
      worker.stdout.resume();worker.stderr.resume();
      let settled = false;
      const finish = (error, result) => {
        if (settled) return;
        settled = true;clearTimeout(timer);signal?.removeEventListener('abort', abort);
        void worker.terminate();
        if (error) reject(error);
        else resolve({ filename, bytes: buffer.length, ...result, parts: splitDocument(result.text) });
      };
      const abort = () => finish(documentError('Dosya okuma iptal edildi.', 499));
      const timer = setTimeout(() => finish(documentError('Belge zaman sınırı içinde okunamadı. Daha küçük bir dosya deneyin.')), timeoutMs);
      signal?.addEventListener('abort', abort, { once: true });
      worker.once('message', result => {
        if (result.error) finish(documentError(result.error.message, result.error.status));
        else finish(null, result);
      });
      worker.once('error', () => finish(documentError('Belge işlenemedi veya bellek sınırını aştı. Daha küçük bir dosya deneyin.')));
      worker.once('exit', () => finish(documentError('Belge okunamadı. Dosyanın sağlam ve desteklenen biçimde olduğunu kontrol edin.')));
    });
  } finally { active--; }
}
