import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { analyze, validateText, MAX_TEXT } from './lib/analysis.mjs';
import { configuration, rewrite, stylePresets } from './lib/rewrite.mjs';
import { modelStatus, startLocalRuntime } from './lib/local-runtime.mjs';
import { extractDocument, validateFilename, MAX_FILE_BYTES } from './lib/documents.mjs';
import { compareSources } from './lib/similarity.mjs';
import { wordStatistics } from './lib/statistics.mjs';
import { classifyText, classifierConfiguration } from './lib/classifier.mjs';
import { reviewWriting } from './lib/model-review.mjs';
import { exportDocument } from './lib/export.mjs';
import { readProfile, updateProfile, profileContext } from './lib/profile.mjs';
import { searchSources, searchConfiguration } from './lib/web-sources.mjs';
import { proofread } from './lib/proofread.mjs';
import { transformText } from './lib/transform.mjs';
import { diffText, diffStats } from './lib/diff.mjs';
import { citationTable, tableToCsv, tableToMarkdown, tableToBibtex, tableToText, CITATION_STYLES } from './lib/citations.mjs';
import { scanDocument, scanToMarkdown } from './lib/source-scan.mjs';
import { packSummary, authorities } from './lib/lang/index.mjs';

const publicDir = new URL('./public/', import.meta.url);
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/advanced.js', ['advanced.js', 'text/javascript; charset=utf-8']],
  ['/import.css', ['import.css', 'text/css; charset=utf-8']],
  ['/tools.js', ['tools.js', 'text/javascript; charset=utf-8']],
  ['/tools.css', ['tools.css', 'text/css; charset=utf-8']],
  ['/print.html', ['print.html', 'text/html; charset=utf-8']],
  ['/print.js', ['print.js', 'text/javascript; charset=utf-8']],
  ['/print.css', ['print.css', 'text/css; charset=utf-8']],
  ['/statistics.js', ['../lib/statistics.mjs', 'text/javascript; charset=utf-8']],
  ['/report.js', ['../lib/report.mjs', 'text/javascript; charset=utf-8']]
]);

const TEXT_LIMIT = Math.max(MAX_TEXT, 2000000);
const POST_ROUTES = new Set([
  '/api/analyze', '/api/rewrite', '/api/import', '/api/similarity', '/api/statistics',
  '/api/classify', '/api/review', '/api/export', '/api/profile', '/api/search',
  '/api/proofread', '/api/transform', '/api/compare', '/api/citations', '/api/sources', '/api/report'
]);

function equal(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function requireText(body, limit = TEXT_LIMIT) {
  if (typeof body.text !== 'string' || !body.text.trim()) {
    throw Object.assign(new Error('Metin gerekli.'), { status: 400 });
  }
  if (body.text.length > limit) {
    throw Object.assign(new Error(`Metin en fazla ${limit.toLocaleString('tr-TR')} karakter olabilir.`), { status: 413 });
  }
  return body.text;
}

export function createApp(env = process.env, fetcher = fetch) {
  const windows = new Map();
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('Cache-Control', 'no-store');
    const send = (status, data) => {
      if (status >= 400) req.resume();
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && routes.has(url.pathname)) {
        const [file, type] = routes.get(url.pathname);
        const content = await readFile(new URL(file, publicDir));
        res.writeHead(200, { 'Content-Type': type });
        res.end(content);
        return;
      }
      if (!url.pathname.startsWith('/api/')) return send(404, { error: 'Bulunamadı.' });
      if (env.APP_PASSWORD && !equal(req.headers['x-app-password'] || '', env.APP_PASSWORD)) return send(401, { error: 'Uygulama parolası gerekli veya hatalı.' });

      if (req.method === 'GET' && url.pathname === '/api/health') {
        const config = configuration(env);
        return send(200, {
          ok: true,
          version: '0.3.0',
          ...config,
          ...await modelStatus(env, fetcher),
          classifier: classifierConfiguration(env),
          search: searchConfiguration(env),
          analysis: 'local; no external transmission',
          engines: {
            proofread: 'prosebeacon-proofread-v3',
            transform: 'prosebeacon-local-transform-v3',
            analysis: 'prosebeacon-ensemble-v3',
            diff: 'prosebeacon-word-diff-v3',
            citations: 'prosebeacon-citation-table-v3',
            sources: 'prosebeacon-source-scan-v3'
          },
          languagePacks: packSummary(),
          authorities: authorities('tr'),
          styles: stylePresets('tr'),
          citationStyles: CITATION_STYLES,
          maxCharacters: MAX_TEXT,
          maxDocumentCharacters: TEXT_LIMIT,
          maxFileBytes: MAX_FILE_BYTES,
          wholeDocument: true
        });
      }
      if (req.method === 'GET' && url.pathname === '/api/profile') return send(200, await readProfile(env));
      if (req.method !== 'POST') return send(405, { error: 'Yöntem desteklenmiyor.' });
      if (!POST_ROUTES.has(url.pathname)) return send(404, { error: 'Bulunamadı.' });
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return send(403, { error: 'Farklı kaynaktan istek reddedildi.' });

      const importing = url.pathname === '/api/import';
      if (!(req.headers['content-type'] || '').startsWith(importing ? 'application/octet-stream' : 'application/json')) return send(415, { error: importing ? 'Dosya içeriği gerekli.' : 'JSON içerik gerekli.' });

      const now = Date.now();
      for (const [k, v] of windows) if (v.until < now) windows.delete(k);
      const key = req.socket.remoteAddress;
      const slot = windows.get(key) || { until: now + 60000, count: 0, active: 0 };
      if (++slot.count > 120) return send(429, { error: 'Çok fazla istek. Bir dakika sonra deneyin.' });
      windows.set(key, slot);

      let filename;
      if (importing) {
        try { filename = decodeURIComponent(req.headers['x-file-name'] || ''); } catch { return send(400, { error: 'Geçersiz dosya adı.' }); }
        validateFilename(filename);
      }
      // 50 MB for files, ~8 MB of JSON for whole-document text payloads.
      const limit = importing ? MAX_FILE_BYTES : 8 * 1024 * 1024;
      if (Number(req.headers['content-length']) > limit) return send(413, { error: importing ? 'Dosya en fazla 50 MB olabilir.' : 'İstek çok büyük.' });
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req.iterator({ destroyOnReturn: false })) {
        bytes += chunk.length;
        if (bytes > limit) return send(413, { error: importing ? 'Dosya en fazla 50 MB olabilir.' : 'İstek çok büyük.' });
        chunks.push(chunk);
      }

      if (importing) {
        const abort = new AbortController();
        const disconnect = () => { if (!res.writableEnded) abort.abort(); };
        res.once('close', disconnect);
        try { return send(200, await extractDocument(Buffer.concat(chunks), filename, { signal: abort.signal })); }
        finally { res.removeListener('close', disconnect); }
      }

      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { error: 'Geçersiz JSON.' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400, { error: 'JSON nesnesi gerekli.' });
      const locale = body.locale === 'en' ? 'en' : 'tr';

      if (url.pathname === '/api/profile') return send(200, await updateProfile(body, env));
      if (url.pathname === '/api/statistics') return send(200, wordStatistics(typeof body.text === 'string' ? body.text : '', locale));
      if (url.pathname === '/api/similarity') return send(200, compareSources(body));

      // --- engines that do not need validateText's minimum length -----------
      if (url.pathname === '/api/proofread') {
        const text = requireText(body);
        return send(200, proofread(text, {
          locale,
          register: typeof body.register === 'string' ? body.register : 'all',
          autoFix: body.autoFix !== false,
          maxIssues: Number.isFinite(body.maxIssues) ? Math.min(Math.max(body.maxIssues, 1), 20000) : 5000
        }));
      }
      if (url.pathname === '/api/transform') {
        const text = requireText(body);
        return send(200, transformText(text, {
          locale,
          style: typeof body.style === 'string' ? body.style : 'academic',
          instruction: typeof body.instruction === 'string' ? body.instruction.slice(0, 1000) : '',
          terms: Array.isArray(body.terms) ? body.terms.slice(0, 60).map(String) : [],
          humanise: body.humanise !== false,
          maxSentenceWords: Number.isFinite(body.maxSentenceWords) ? Math.min(Math.max(body.maxSentenceWords, 12), 90) : 42
        }));
      }
      if (url.pathname === '/api/compare') {
        const left = requireText(body, TEXT_LIMIT);
        const right = typeof body.revised === 'string' ? body.revised : '';
        if (right.length > TEXT_LIMIT) throw Object.assign(new Error('İkinci metin çok uzun.'), { status: 413 });
        const diff = diffText(left, right);
        return send(200, { engine: diff.engine, ...diffStats(left, right), ops: diff.ops, left: diff.left, right: diff.right, leftFrom: diff.leftFrom, leftTo: diff.leftTo, rightFrom: diff.rightFrom, rightTo: diff.rightTo });
      }
      if (url.pathname === '/api/citations') {
        const text = requireText(body);
        const style = typeof body.style === 'string' ? body.style : 'apa7';
        const table = citationTable(text, { locale, style });
        const format = body.format;
        if (format === 'csv' || format === 'markdown' || format === 'bibtex' || format === 'text') {
          const payload = format === 'csv' ? tableToCsv(table) : format === 'markdown' ? tableToMarkdown(table, style) : format === 'bibtex' ? tableToBibtex(table) : tableToText(table, style);
          const mime = format === 'csv' ? 'text/csv' : format === 'bibtex' ? 'application/x-bibtex' : 'text/plain';
          res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8`, 'Content-Disposition': `attachment; filename="prosebeacon-citations.${format === 'markdown' ? 'md' : format === 'bibtex' ? 'bib' : format}"` });
          res.end(payload);
          return;
        }
        return send(200, table);
      }

      // --- source scan with server-sent progress ---------------------------
      if (url.pathname === '/api/sources') {
        const text = requireText(body);
        const wantsStream = body.stream !== false && (req.headers.accept || '').includes('text/event-stream');
        const controller = new AbortController();
        const disconnect = () => controller.abort();
        res.once('close', disconnect);
        const onProgress = wantsStream
          ? progress => {
            if (res.writableEnded) return;
            res.write(`event: progress\ndata: ${JSON.stringify(progress)}\n\n`);
          }
          : null;
        if (wantsStream) {
          res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
          res.write(': open\n\n');
        }
        try {
          const scan = await scanDocument(text, {
            locale,
            style: typeof body.style === 'string' ? body.style : 'apa7',
            maxReferences: Number.isFinite(body.maxReferences) ? Math.min(Math.max(body.maxReferences, 1), 60) : 24,
            maxClaims: Number.isFinite(body.maxClaims) ? Math.min(Math.max(body.maxClaims, 0), 30) : 10,
            signal: controller.signal,
            onProgress
          });
          if (wantsStream) {
            res.write(`event: result\ndata: ${JSON.stringify(scan)}\n\n`);
            res.end();
          } else {
            return send(200, scan);
          }
        } finally {
          res.removeListener('close', disconnect);
        }
        return;
      }

      validateText(body.text);

      if (url.pathname === '/api/export') {
        const result = await exportDocument(body);
        res.writeHead(200, { 'Content-Type': result.mime, 'Content-Disposition': `attachment; filename="prosebeacon-document.${result.extension}"` });
        return res.end(result.bytes);
      }
      if (url.pathname === '/api/search') return send(200, await searchSources(body, { env, fetcher }));
      if (url.pathname === '/api/analyze') return send(200, analyze(body.text, locale));
      if (url.pathname === '/api/classify') return send(200, await classifyText(body.text, locale, { env }));
      if (url.pathname === '/api/report') {
        const text = requireText(body);
        const table = citationTable(text, { locale, style: body.style || 'apa7' });
        const markdown = [
          `# ProseBeacon raporu — ${new Date().toLocaleString('tr-TR')}`,
          '',
          `Karakter: ${text.length.toLocaleString('tr-TR')}`,
          '',
          '## Kaynak tablosu',
          '',
          tableToMarkdown(table, body.style || 'apa7'),
          '',
          body.scan ? scanToMarkdown(body.scan, { locale }) : ''
        ].join('\n');
        res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': 'attachment; filename="prosebeacon-report.md"' });
        res.end(markdown);
        return;
      }

      if (slot.active >= 2) return send(429, { error: 'Devam eden düzenlemeyi bekleyin.' });
      slot.active++;
      try {
        if (url.pathname === '/api/review') return send(200, await reviewWriting(body.text, locale, { env, fetcher }));
        const wantsStream = (req.headers.accept || '').includes('text/event-stream');
        const controller = new AbortController();
        res.once('close', () => controller.abort());
        if (wantsStream) {
          res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
          res.write(': open\n\n');
        }
        const result = await rewrite(body, {
          env,
          fetcher,
          signal: controller.signal,
          learningContext: body.useProfile === true ? profileContext(await readProfile(env), body.text) : null,
          onProgress: wantsStream ? progress => { if (!res.writableEnded) res.write(`event: progress\ndata: ${JSON.stringify(progress)}\n\n`); } : null
        });
        if (wantsStream) { res.write(`event: result\ndata: ${JSON.stringify(result)}\n\n`); res.end(); return; }
        return send(200, result);
      } finally { slot.active--; }
    } catch (error) {
      if (!res.headersSent) send(error.status || 500, { error: error.status ? error.message : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' });
      else res.end();
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const host = process.env.HOST || '127.0.0.1';
  if (!['127.0.0.1', 'localhost', '::1', '0.0.0.0'].includes(host) && !process.env.APP_PASSWORD) throw new Error('Ağa açmak için APP_PASSWORD ayarlayın.');
  const runtime = await startLocalRuntime();
  const server = createApp();
  server.requestTimeout = 600000;
  server.headersTimeout = 610000;
  const shutdown = () => { server.closeAllConnections(); server.close(); runtime?.kill(); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  server.once('error', error => { runtime?.kill(); console.error(error.message); process.exitCode = 1; });
  const port = Number(process.env.PORT || 3210);
  server.listen(port, host, () => {
    const shown = host === '0.0.0.0' ? 'localhost' : host;
    console.log('');
    console.log('  ProseBeacon v0.3 — yerel akademik yazı motoru');
    console.log(`  → http://${shown}:${port}`);
    console.log('  Kapatmak için: Ctrl+C');
    console.log('');
  });
}
