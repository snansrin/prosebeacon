import test from 'node:test';
import assert from 'node:assert/strict';
import { diffText, diffStats } from '../lib/diff.mjs';
import { citationTable, tableToCsv, tableToMarkdown, formatReference, parseReference } from '../lib/citations.mjs';
import { transformText } from '../lib/transform.mjs';
import { rewrite, configuration, stylePresets } from '../lib/rewrite.mjs';
import { findUncitedClaims, suggestFromBibliography, scanDocument, textSimilarity } from '../lib/source-scan.mjs';
import { proofread } from '../lib/proofread.mjs';
import { analyze } from '../lib/analysis.mjs';

const DOC = `TEZ İZLEME RAPORU

Kent parkları karbon depolama performansı açısından önemlidir (Canedoli, 2020).
Göksu Parkı'nda ortalama 299,57 kg/ağaç karbon depolandığı belirlenmiştir.
Dikmen Vadisi 2. Etap çalışmaları literatürdeki bulgularla uyumludur (Tolunay, 2011; McPherson, 1997).

KAYNAKLAR

Canedoli, C., Ferrè, C., & Padoa-Schioppa, E. (2020). Soil organic carbon stock in different urban land uses. Urban Ecosystems, 23, 159-171. https://doi.org/10.1007/s11252-019-00901-6
Tolunay, A. (2011). Kentsel yeşil alanların karbon yutak kapasitesi. Ormancılık Dergisi, 7(2), 45-60.`;

test('word diff reconstructs both sides exactly and reports usable statistics', () => {
  const left = 'Kent parkları karbon depolar. Bu çok önemlidir.\nİkinci satır 299,57 kg.\n';
  const right = 'Kent parkları karbon depolamaktadır. Bu durum önemlidir.\nİkinci satır 299,57 kg.\n';
  const diff = diffText(left, right);
  assert.equal(diff.ops.map(op => op.left).join(''), left);
  assert.equal(diff.ops.map(op => op.right).join(''), right);
  assert.ok(diff.ops.some(op => op.type === 'del' && op.leftFrom != null && op.leftTo != null));
  assert.ok(diff.ops.some(op => op.type === 'ins' && op.rightFrom != null && op.rightTo != null));
  const stats = diffStats(left, right);
  assert.ok(stats.similarity > 50 && stats.similarity <= 100);
  assert.equal(stats.changes, stats.deletions + stats.insertions);
});

test('diff stays linear and local on large repetitive documents', () => {
  const paragraph = 'Cümle numarası içerir ve uzunluk testidir. '.repeat(20) + '\n';
  const base = paragraph.repeat(200);
  // dense: every token changes -> one delete/insert block is optimal
  const started = Date.now();
  const dense = diffText(base, base.replace(/Cümle/gu, 'Tümce'));
  assert.ok(Date.now() - started < 8000, 'dense diff must stay fast');
  assert.equal(dense.ops.map(op => op.right).join(''), base.replace(/Cümle/gu, 'Tümce'));
  // sparse: five edits in 4000 lines must stay local, not one giant block
  const sparse = base.split('\n').map((line, index) => (index % 40 === 0 ? line.replace('Cümle', 'Tümce') : line)).join('\n');
  const timed = Date.now();
  const diff = diffText(base, sparse);
  assert.ok(Date.now() - timed < 8000, 'sparse diff must stay fast');
  assert.ok(diff.ops.length >= 10 && diff.ops.length <= 40, `expected localised ops, got ${diff.ops.length}`);
  assert.equal(diff.ops.map(op => op.right).join(''), sparse);
  assert.equal(diff.ops.map(op => op.left).join(''), base);
});

test('citation table detects the bibliography, matches in-text citations and formats styles', () => {
  const table = citationTable(DOC, { locale: 'tr', style: 'apa7' });
  assert.equal(table.bibliographyFound, true);
  assert.equal(table.summary.references, 2);
  assert.equal(table.summary.cited, 2);
  assert.equal(table.summary.withDoi, 1);
  const unmatched = table.unmatched.map(item => `${item.family} ${item.year}`);
  assert.ok(unmatched.includes('mcpherson 1997'), `McPherson should be flagged, got ${unmatched}`);
  assert.match(table.entries[0].formatted, /Canedoli, C\., Ferrè, C\., & Padoa-Schioppa, E\. \(2020\)/u);
  assert.match(tableToCsv(table), /Canedoli/u);
  assert.match(tableToMarkdown(table), /\|/u);
  assert.ok(formatReference(parseReference(table.entries[0].raw), 'vancouver').length > 10);
  assert.ok(formatReference(table.entries[0], 'apa7').includes('Canedoli'));
});

test('in-text citations that are document numbers are not treated as references', () => {
  const table = citationTable('Metinde (299 Nolu Tebliğ, 2017) ve (5018 sayılı Kanun, 2003) geçmektedir. Ayrıca (Tolunay, 2011) vardır.\n\nKAYNAKLAR\n\nTolunay, A. (2011). Başlık. Dergi, 1, 2-3.', { locale: 'tr' });
  assert.equal(table.unmatched.length, 0);
  assert.equal(table.summary.cited, 1);
});

test('transform preserves tab-aligned layout lines such as cover pages', () => {
  const cover = 'Tez Danışmanı\t             : Prof. Dr. Dicle OĞUZ\nBu satır normal bir cümledir ve dönüştürülebilir durumdadır çünkü yeterince uzundur.\n';
  const result = transformText(cover, { locale: 'tr', style: 'academic' });
  const coverLine = result.text.split('\n')[0];
  assert.ok(coverLine.includes('\t'), 'tab must survive');
  assert.ok(coverLine.includes('             :'), 'alignment spaces must survive');
});

test('builtin rewrite works offline and returns diff plus citation summary', async () => {
  assert.equal(configuration({}).provider, 'builtin');
  assert.equal(configuration({}).ready, true);
  const result = await rewrite({ text: DOC, style: 'thesis', locale: 'tr' }, { env: {} });
  assert.equal(result.provider, 'builtin');
  assert.ok(result.text.length > 0);
  assert.ok(result.diff && result.diff.ops.length > 0);
  assert.equal(result.citations.summary.references, 2);
  assert.ok(stylePresets('tr').some(style => style.id === 'official'));
  assert.ok(!stylePresets('tr').some(style => style.id === 'aviation'));
});

test('model failure falls back to the builtin engine without leaking diagnostics', async () => {
  const result = await rewrite({ text: DOC, style: 'academic' }, {
    env: { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-secret', OPENAI_MODEL: 'm' },
    fetcher: async () => { throw new Error('sk-secret unreachable'); }
  });
  assert.equal(result.provider, 'builtin');
  assert.ok(!JSON.stringify(result).includes('sk-secret'));
  assert.ok(result.notice);
});

test('uncited claims are extracted and matched against the document bibliography', () => {
  const claims = findUncitedClaims('Laboratuvardan alınan toprak organik madde verileri, literatürde kabul gören dönüşüm katsayıları ile karbon stokuna çevrilmiştir ve bu işlem Van Bemmelen faktörü kullanılarak yapılmıştır.', { locale: 'tr', limit: 5 });
  assert.equal(claims.length, 1);
  const entries = citationTable(DOC, { locale: 'tr' }).entries;
  const suggestion = suggestFromBibliography(claims[0], entries, { locale: 'tr' });
  assert.equal(suggestion?.origin, 'bibliography');
  assert.match(suggestion.citation, /Canedoli/u);
});

test('source scan degrades to a usable offline result when the network is unavailable', async () => {
  const scan = await scanDocument(DOC, {
    locale: 'tr', maxReferences: 2, maxClaims: 0, deadlineMs: 500,
    timeoutMs: 250, signal: AbortSignal.timeout(900)
  });
  assert.equal(scan.engine, 'prosebeacon-source-scan-v3');
  assert.ok(Array.isArray(scan.references));
  assert.ok(typeof scan.summary.checked === 'number');
});

test('similarity helper separates matching and unrelated titles', () => {
  assert.ok(textSimilarity('Soil organic carbon stock in urban parks', 'soil organic carbon stock in urban parks') > 0.9);
  assert.ok(textSimilarity('Karbon depolama', 'DÜNYA DİLLƏRİNDƏ SÖZ SIRASI PROBLEMİ') < 0.2);
});

test('proofread and analysis run on the full document size without chunking', () => {
  const long = DOC.repeat(60);
  assert.ok(long.length > 20000);
  const checked = proofread(long, { locale: 'tr', autoFix: true });
  assert.ok(checked.issueCount >= 0);
  const result = analyze(long, 'tr');
  assert.equal(typeof result.aiProbability, 'number');
  assert.ok(Array.isArray(result.aiProbabilityInterval));
  assert.ok(result.metrics.readabilityScore >= 0);
});
