// ProseBeacon — source verification and citation suggestion.
// Dependency-free. Uses Crossref and OpenAlex public APIs, both of which allow
// anonymous access with a descriptive User-Agent. Every network call is
// soft-failing: if the sandbox/offline machine cannot reach them the scan still
// returns a usable result with `offline: true` and a human readable notice.

import { splitSentences } from './nlp.mjs';

const USER_AGENT = 'ProseBeacon/0.3 (academic writing assistant; mailto:prosebeacon@example.org)';
const REQUEST_TIMEOUT_MS = 9000;
const SCAN_DEADLINE_MS = 60000;
const MIN_VERIFIED_SIMILARITY = 0.52;
const MIN_SUGGESTED_SIMILARITY = 0.34;

export const PROVIDERS = [
  { id: 'crossref', label: 'Crossref', url: 'https://api.crossref.org' },
  { id: 'openalex', label: 'OpenAlex', url: 'https://api.openalex.org' }
];

const STOPWORDS = new Set(('a an and the of for in on at to from with by is are was were be been being ' +
  've ile veya ya da ki de da bir bu şu o olarak göre kadar için üzerine altındaki ' +
  'study studies analysis assessment based using use effect effects case').split(' '));

const fold = value => String(value || '')
  .toLocaleLowerCase('tr')
  .replace(/[\u2018\u2019\u201B\u02BC']/gu, '')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const tokens = value => fold(value).split(' ').filter(token => token.length > 2 && !STOPWORDS.has(token));

/** Jaccard-ish token overlap, tolerant of word order. */
export function textSimilarity(a, b) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  let hits = 0;
  const usedLeft = new Set();
  for (const token of left) {
    if (rightSet.has(token) && !usedLeft.has(token)) { hits += 1; usedLeft.add(token); }
  }
  return hits / Math.max(Math.min(left.length, right.length), 1);
}

async function getJson(url, { timeoutMs = REQUEST_TIMEOUT_MS, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) { clearTimeout(timer); throw new Error('aborted'); }
    signal.addEventListener('abort', onAbort, { once: true });
  }
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, status: response.status, data: await response.json() };
  } catch (error) {
    return { ok: false, status: 0, error: error.name === 'AbortError' ? 'timeout' : error.message };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

function normaliseCrossref(item) {
  if (!item) return null;
  const title = Array.isArray(item.title) ? item.title[0] : item.title || '';
  const year = Number(
    (item.issued?.['date-parts']?.[0]?.[0]) ||
    (item.published?.['date-parts']?.[0]?.[0]) ||
    (item['published-print']?.['date-parts']?.[0]?.[0]) ||
    (item['published-online']?.['date-parts']?.[0]?.[0]) || 0
  ) || null;
  const authors = (item.author || [])
    .map(author => ({
      family: author.family || author.name || '',
      rest: author.given ? author.given.split(/\s+/)[0] : '',
      initials: author.given ? author.given.split(/[\s.]+/).filter(Boolean).map(part => part[0].toUpperCase()) : []
    }))
    .filter(author => author.family);
  return {
    provider: 'crossref',
    id: item.DOI || null,
    doi: item.DOI || null,
    url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : null),
    title: String(title).replace(/<[^>]+>/gu, '').trim(),
    source: item['container-title']?.[0] || item.publisher || '',
    authors,
    authorString: authors.map(author => (author.initials.length ? `${author.family}, ${author.initials.map(initial => `${initial}.`).join(' ')}` : author.family)).join(', '),
    year,
    volume: item.volume || null,
    issue: item.issue || null,
    pages: item.page || null,
    type: item.type || null,
    publisher: item.publisher || null
  };
}

function normaliseOpenAlex(work) {
  if (!work) return null;
  const title = (work.title || work.display_name || '').replace(/<[^>]+>/gu, '').trim();
  const authors = (work.authorships || [])
    .map(ship => {
      const name = ship.author?.display_name || '';
      const parts = name.split(/\s+/);
      const family = parts.length > 1 ? parts[parts.length - 1] : name;
      return { family, rest: parts.length > 1 ? parts[0] : '', initials: parts.length > 1 ? [parts[0][0].toUpperCase()] : [] };
    })
    .filter(author => author.family);
  const location = work.primary_location?.source?.display_name || work.host_venue?.display_name || '';
  return {
    provider: 'openalex',
    id: work.id || null,
    doi: work.doi ? work.doi.replace(/^https?:\/\/doi\.org\//u, '') : null,
    url: work.doi || work.id || null,
    title,
    source: location,
    authors,
    authorString: authors.map(author => (author.initials.length ? `${author.family}, ${author.initials[0]}.` : author.family)).join(', '),
    year: work.publication_year || null,
    volume: work.biblio?.volume || null,
    issue: work.biblio?.issue || null,
    pages: work.biblio?.first_page && work.biblio?.last_page ? `${work.biblio.first_page}-${work.biblio.last_page}` : null,
    type: work.type || null,
    publisher: work.primary_location?.source?.host_organization_name || null,
    citedBy: work.cited_by_count ?? null
  };
}

/** Convert a normalised work into the entry shape used by lib/citations.mjs. */
export function workToReference(work) {
  return {
    raw: '',
    authors: work.authors || [],
    authorString: work.authorString || '',
    year: work.year,
    title: work.title,
    source: work.source,
    volume: work.volume,
    issue: work.issue,
    pages: work.pages,
    doi: work.doi,
    url: work.url,
    type: work.type || 'other',
    complete: true
  };
}

const buildQuery = (title, authorString, year) => {
  const parts = [];
  if (title) parts.push(title);
  const firstAuthor = (authorString || '').split(/[,;]/)[0];
  if (firstAuthor) parts.push(firstAuthor.split(/\s+/).slice(0, 2).join(' '));
  if (year) parts.push(String(year));
  return parts.join(' ').slice(0, 220);
};

export async function searchWorks(query, { rows = 5, timeoutMs = REQUEST_TIMEOUT_MS, signal, year = null } = {}) {
  const results = [];
  const crossrefUrl = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=${rows}&select=DOI,title,author,issued,published,container-title,volume,issue,page,type,publisher,URL`;
  const crossref = await getJson(crossrefUrl, { timeoutMs, signal });
  if (crossref.ok) {
    for (const item of crossref.data?.message?.items || []) {
      const work = normaliseCrossref(item);
      if (work) results.push(work);
    }
  }
  if (results.length < 2) {
    const openAlexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${rows}&select=id,doi,title,display_name,authorships,publication_year,biblio,type,primary_location,host_venue,cited_by_count`;
    const openAlex = await getJson(openAlexUrl, { timeoutMs, signal });
    if (openAlex.ok) {
      for (const item of openAlex.data?.results || []) {
        const work = normaliseOpenAlex(item);
        if (work && !results.some(existing => existing.doi && existing.doi === work.doi)) results.push(work);
      }
    }
  }
  if (year) {
    results.sort((a, b) => (Math.abs((a.year || 0) - year) - Math.abs((b.year || 0) - year)) || scoreWork(b, query, year) - scoreWork(a, query, year));
  }
  return { results, offline: !crossref.ok && results.length === 0, error: crossref.error || null };
}

function scoreWork(work, query, year) {
  const titleSimilarity = textSimilarity(work.title, query);
  const yearPenalty = year && work.year ? (work.year === year ? 0.12 : Math.abs(work.year - year) <= 1 ? 0.04 : -0.1) : 0;
  return titleSimilarity + yearPenalty;
}

export async function lookupDoi(doi, { timeoutMs = REQUEST_TIMEOUT_MS, signal } = {}) {
  const response = await getJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { timeoutMs, signal });
  if (!response.ok) return { ok: false, status: response.status, error: response.error };
  return { ok: true, work: normaliseCrossref(response.data?.message) };
}

/**
 * Verify one bibliography entry against the scholarly record.
 * status: verified | corrected | not-found | unchecked
 */
export async function verifyReference(entry, { timeoutMs = REQUEST_TIMEOUT_MS, signal } = {}) {
  const base = {
    id: entry.id, year: entry.year, authors: entry.authors || entry.authorString || '',
    title: entry.title, doi: entry.doi, status: 'unchecked', similarity: 0, work: null, note: null
  };
  if (entry.doi) {
    const byDoi = await lookupDoi(entry.doi, { timeoutMs, signal });
    if (byDoi.ok && byDoi.work) {
      const similarity = textSimilarity(byDoi.work.title, entry.title || '');
      const yearOk = !entry.year || !byDoi.work.year || Math.abs(entry.year - byDoi.work.year) <= 1;
      return {
        ...base,
        status: similarity >= MIN_VERIFIED_SIMILARITY && yearOk ? 'verified' : 'corrected',
        similarity: Number(similarity.toFixed(3)),
        work: byDoi.work,
        note: similarity >= MIN_VERIFIED_SIMILARITY && yearOk
          ? null
          : 'DOI resolves, but title/year differ from the entry — check for a typo or a preprint version.'
      };
    }
    if (byDoi.status === 404) {
      return { ...base, status: 'not-found', note: `DOI ${entry.doi} does not resolve in Crossref.` };
    }
    if (byDoi.status === 0) return { ...base, status: 'unchecked', note: 'Network unavailable.' };
  }
  const query = buildQuery(entry.title || entry.raw, entry.authors || entry.authorString, entry.year);
  if (fold(query).length < 12) return { ...base, status: 'unchecked', note: 'Not enough metadata to search.' };
  const { results, offline } = await searchWorks(query, { rows: 5, timeoutMs, signal, year: entry.year });
  if (offline || !results.length) return { ...base, status: offline ? 'unchecked' : 'not-found', note: offline ? 'Network unavailable.' : 'No matching record found.' };
  let best = null;
  for (const work of results) {
    const titleScore = textSimilarity(work.title, entry.title || '');
    const authorScore = textSimilarity(work.authorString || '', entry.authors || entry.authorString || '') * 0.5;
    const yearScore = entry.year && work.year ? (work.year === entry.year ? 0.18 : Math.abs(work.year - entry.year) <= 1 ? 0.06 : -0.12) : 0;
    const total = titleScore + authorScore + yearScore;
    if (!best || total > best.total) best = { work, total, titleScore };
  }
  const similarity = Number(best.titleScore.toFixed(3));
  if (similarity >= MIN_VERIFIED_SIMILARITY) {
    return { ...base, status: 'verified', similarity, work: best.work, note: null };
  }
  if (similarity >= MIN_SUGGESTED_SIMILARITY) {
    return { ...base, status: 'corrected', similarity, work: best.work, note: 'Close match found — the published title differs slightly.' };
  }
  return { ...base, status: 'not-found', similarity, work: best.work, note: 'No confident match in Crossref/OpenAlex.' };
}

/**
 * Find sentences that assert measurable facts without any citation and suggest
 * a supporting published source for each.
 */
export function findUncitedClaims(text, { locale = 'tr', limit = 40 } = {}) {
  const citations = [];
  const citationRe = /\([^()]{0,120}?(?:19|20)\d{2}[a-z]?\)|[A-ZÇĞİÖŞÜ][\p{L}'’-]{2,30}\s*\((?:19|20)\d{2}[a-z]?\)|\[\d{1,3}(?:\s*[,;]\s*\d{1,3})*\]/gu;
  for (const match of text.matchAll(citationRe)) citations.push({ start: match.index, end: match.index + match[0].length });
  const hasCitation = index => citations.some(item => index >= item.start - 140 && index <= item.end + 40);

  const measurementRe = /\d+[.,]?\d*\s*(?:%|ton|kg|gr|mg|g\/|ha|m²|m3|m³|cm|mm|km|°C|ppm|ppb|yıl|sene|ay|gün|saat|kat|birim|Tg|Mg|Gg|acre|percent)/iu;
  const statisticalRe = /\b(?:p\s*[<>=≤≥]\s*0[.,]\d+|R²|R2|korelasyon|regresyon|anlaml[ıi]|ortalama|standart sapma|güven aral[ıi]ğ[ıi]|varyans)\b/iu;
  const claimLeadRe = locale === 'tr'
    ? /\b(?:Araştırmalara göre|Literatürde|Çalışmalar|Yapılan çalışmalara göre|Buna göre|Önceki çalışmalar|Bilindiği üzere|Genel olarak kabul|Sonuçlar göstermektedir|Veriler)\b/iu
    : /\b(?:According to|Studies show|Research indicates|It is generally accepted|Previous work|Literature suggests|Results show)\b/iu;

  const claims = [];
  const sentences = splitSentences(text, locale);
  for (const span of sentences) {
    const sentence = span.text.trim();
    if (sentence.length < 70 || sentence.length > 420) continue;
    if (tokens(sentence).length < 11) continue;
    if (hasCitation(span.start)) continue;
    if (/^\s*(?:Tablo|Şekil|Figure|Table|Kaynak|Not|Ek)\b/iu.test(sentence)) continue;
    if (/^[A-ZÇĞİÖŞÜ\s.,:;'’\-]{3,}$/.test(sentence)) continue;
    const measured = measurementRe.test(sentence);
    const statistical = statisticalRe.test(sentence);
    const lead = claimLeadRe.test(sentence);
    if (!measured && !statistical && !lead) continue;
    // Prioritise sentences that explicitly lean on the literature.
    claims.push({
      text: sentence, start: span.start, end: span.end,
      kind: lead ? 'assertion' : measured ? 'measurement' : 'statistical',
      confidence: lead ? 0.9 : measured ? 0.7 : statistical ? 0.6 : 0.4
    });
  }
  claims.sort((a, b) => b.confidence - a.confidence);
  return claims.slice(0, limit);
}

// Academic filler words that carry no topical signal.
const FILLER = new Set(('dunya dünya genel toplam ortalama oran alan calisma çalışma çalışmalar arastirma araştırma ' +
  'sonuc sonuç veri veriler yil yıl yillar yıllar arasinda arasında gore göre literatur literatür kabul donusum dönüşüm ' +
  'katsayi katsayılar deger değer miktar seviye düzey sekil şekilde yontem yöntem kullanilan kullanılan elde edilen ' +
  'oldugu olduğu belirlenmis belirlenmiş tespit edilmis edilmiş gosterir göstermektedir bulunmaktadir bulunmaktadır ' +
  'world general overall average total rate area results data between according used using found determined ' +
  'birim yuzey yüzey alanda parkta parki parkının kent kentsel').split(/\s+/u));

// Compact TR<->EN academic term lexicon. Used only to canonicalise tokens for
// cross-matching (never for rewriting), so a Turkish claim can be matched
// against an English-language reference title.
const SYNONYM_GROUPS = [
  ['karbon', 'carbon'], ['toprak', 'soil'], ['kent', 'kentsel', 'urban', 'city', 'cities', 'sehir', 'şehir'],
  ['park', 'parks', 'parklar', 'parkı', 'parkının'], ['agac', 'ağaç', 'tree', 'trees', 'woody', 'agaclar', 'ağaçlar'],
  ['arazi', 'land'], ['kullanim', 'kullanımı', 'use', 'usage'], ['ortu', 'örtü', 'cover'],
  ['depolama', 'sequestration', 'storage', 'sink'], ['stok', 'stock', 'stocks'], ['yutak', 'sink'],
  ['biyokutle', 'biyokütle', 'biomass'], ['organik', 'organic'], ['madde', 'matter'], ['humus', 'humus'],
  ['zemin', 'surface', 'surfaces', 'pavement'], ['gecirimsiz', 'geçirimsiz', 'impervious', 'impermeable'],
  ['sertlestirme', 'sealing', 'sealed', 'seal'], ['iklim', 'climate'], ['degisiklik', 'değişiklik', 'change'],
  ['sicaklik', 'sıcaklık', 'temperature', 'heat', 'ısı'], ['yagis', 'yağış', 'precipitation', 'rainfall'],
  ['bitki', 'vegetation', 'vegetative', 'flora', 'plants', 'bitkisel'], ['ortusu', 'örtüsü'],
  ['tur', 'tür', 'species', 'turler', 'türler'], ['analiz', 'analysis', 'analyses'],
  ['degerlendirme', 'değerlendirme', 'assessment', 'evaluation'], ['yontem', 'yöntem', 'method', 'methodology', 'methods'],
  ['ornek', 'örnek', 'sample', 'samples', 'sampling', 'ornekleme'], ['harita', 'map', 'maps', 'mapping', 'haritalama'],
  ['uzaktan', 'remote'], ['algilama', 'sensing'], ['uydu', 'satellite', 'satellites'],
  ['model', 'models', 'modelleme', 'modelling', 'modeling', 'simulation', 'simulasyon', 'simülasyon'],
  ['istatistik', 'statistical', 'statistics', 'istatistiksel'], ['korelasyon', 'correlation'], ['regresyon', 'regression'],
  ['yogunluk', 'yoğunluk', 'density'], ['hacim', 'volume', 'bulk'], ['su', 'water'], ['havuz', 'pond', 'ponds'],
  ['gol', 'göl', 'lake'], ['hava', 'air'], ['atmosfer', 'atmosphere', 'atmospheric'], ['kalite', 'quality'],
  ['kirlilik', 'pollution', 'pollutant'], ['emisyon', 'emission', 'emissions'],
  ['peyzaj', 'landscape'], ['mimari', 'architecture', 'architectural'], ['mimarlik', 'mimarlık'],
  ['ekosistem', 'ecosystem', 'ecosystems'], ['hizmet', 'hizmetleri', 'service', 'services'],
  ['biyocesitlilik', 'biyoçeşitlilik', 'biodiversity'], ['orman', 'forest', 'forests', 'woodland'],
  ['tarim', 'tarım', 'agriculture', 'agricultural', 'tarimsal', 'tarımsal'],
  ['ekonomik', 'economic', 'economics'], ['maliyet', 'cost', 'costs'],
  ['sosyal', 'social'], ['toplumsal', 'recreation', 'recreational', 'rekreasyon', 'rekreasyonel'],
  ['saglik', 'sağlık', 'health'], ['enerji', 'energy'], ['yonetim', 'yönetim', 'management'],
  ['planlama', 'planning', 'plan'], ['politika', 'policy', 'policies'], ['strateji', 'strategy'],
  ['ogrenci', 'öğrenci', 'student', 'students'], ['egitim', 'eğitim', 'education', 'educational'],
  ['veri', 'data', 'dataset', 'veriler', 'verileri'], ['indeks', 'index', 'indikator', 'indikatör', 'indicator'],
  ['olcum', 'ölçüm', 'measurement', 'measurements', 'measuring'], ['tahmin', 'estimation', 'estimate'],
  ['dagiim', 'dagilim', 'dağılım', 'distribution'], ['kuresel', 'küresel', 'global', 'world', 'dunya', 'dünya'],
  ['bolge', 'bölge', 'region', 'regional', 'bolgesel', 'bölgesel'], ['yerel', 'local'],
  ['yesil', 'yeşil', 'green'], ['alan', 'area', 'areas', 'space', 'spaces'],
  ['artma', 'artış', 'increase', 'decrease', 'azalis', 'azalış'], ['etki', 'effect', 'effects', 'impact', 'impacts'],
  ['iliski', 'ilişki', 'relationship'], ['fark', 'difference', 'differences'],
  ['bemmelen', 'bemmelen'], ['donusum', 'dönüşüm', 'conversion', 'factor', 'faktor', 'faktör'],
  ['katsayi', 'katsayı', 'coefficient'], ['kapasite', 'capacity'], ['performans', 'performance'],
  ['tespit', 'detection', 'detecting'], ['izleme', 'monitoring', 'monitor'], ['degisim', 'değişim', 'dynamics']
];

const CANONICAL = new Map();
SYNONYM_GROUPS.forEach((group, index) => {
  for (const member of group) {
    const key = member.toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}]/gu, '');
    if (!CANONICAL.has(key)) CANONICAL.set(key, `g${index}`);
  }
});

/** Fold + map synonyms to canonical ids so TR and EN text can be compared. */
export function canonicalTokens(value) {
  const set = new Set();
  for (const token of tokens(value)) {
    const key = token.replace(/[^\p{L}\p{N}]/gu, '');
    if (key.length < 3) continue;
    set.add(CANONICAL.get(key) || key);
  }
  return set;
}

const MIN_SUGGESTION_HITS = 3;
const MIN_SUGGESTION_SCORE = 0.32;

/**
 * Prefer sources the document already lists: an uncited claim is usually
 * covered by a reference the author simply forgot to attach.
 */
export function suggestFromBibliography(claim, entries, { locale = 'tr' } = {}) {
  const claimSet = canonicalTokens(claim.text.replace(/[\d.,]+/gu, ' '));
  if (claimSet.size < 5) return null;
  let best = null;
  for (const entry of entries) {
    const entrySet = canonicalTokens(`${entry.title || ''} ${entry.source || ''}`.slice(0, 300));
    if (entrySet.size < 4) continue;
    let hits = 0;
    for (const token of entrySet) if (claimSet.has(token)) hits += 1;
    if (hits < 3) continue;
    const score = hits / Math.min(claimSet.size, entrySet.size);
    if (score >= 0.26 && (!best || score > best.score)) best = { entry, score: Number(score.toFixed(3)), hits };
  }
  if (!best) return null;
  const entry = best.entry;
  return {
    origin: 'bibliography',
    similarity: best.score,
    work: {
      provider: 'bibliography', title: entry.title || '', authorString: entry.authors || '',
      year: entry.year, source: entry.source || '', doi: entry.doi || null, url: entry.url || null, authors: []
    },
    citation: entry.formatted || `${entry.authors || ''} (${entry.year || ''})`
  };
}

export async function suggestSourceForClaim(claim, { timeoutMs = REQUEST_TIMEOUT_MS, signal, rows = 6 } = {}) {
  // Keep the informative core of the sentence; drop numbers, units and filler.
  const queryText = claim.text
    .replace(/\([^)]*\)/gu, ' ')
    .replace(/[\d.,]+\s*(?:%|ton|kg|gr|mg|ha|m²|m3|m³|cm|mm|km|°C|ppm|ppb|yıl|sene|ay|gün|saat|kat)?/giu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  const keywordList = tokens(queryText).filter(token => token.length >= 5 && !FILLER.has(token)).slice(0, 12);
  if (keywordList.length < 4) return null;
  const keywords = keywordList.join(' ');
  const { results, offline } = await searchWorks(keywords, { rows, timeoutMs, signal });
  if (offline || !results.length) return null;
  let best = null;
  for (const work of results) {
    if (!work.title) continue;
    const titleTokens = canonicalTokens(`${work.title} ${work.source || ''}`);
    const claimTokens = canonicalTokens(queryText);
    let hits = 0;
    for (const token of titleTokens) if (claimTokens.has(token)) hits += 1;
    const score = hits / Math.min(claimTokens.size, Math.max(titleTokens.size, 1)) + (work.citedBy ? Math.min(work.citedBy / 500, 0.1) : 0);
    if (!best || score > best.score) best = { work, score, hits };
  }
  if (!best || best.hits < MIN_SUGGESTION_HITS || best.score < MIN_SUGGESTION_SCORE) return null;
  return { origin: best.work.provider, work: best.work, similarity: Number(Math.min(best.score, 1).toFixed(3)) };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Full document scan: verify every reference in the bibliography and suggest
 * sources for the strongest uncited claims. Never throws.
 */
export async function scanDocument(text, {
  locale = 'tr',
  style = 'apa7',
  maxReferences = 24,
  maxClaims = 10,
  timeoutMs = REQUEST_TIMEOUT_MS,
  deadlineMs = SCAN_DEADLINE_MS,
  signal,
  onProgress
} = {}) {
  const started = Date.now();
  const citationsModule = await import('./citations.mjs');
  const table = citationsModule.citationTable(text, { locale, style });
  const results = {
    engine: 'prosebeacon-source-scan-v3',
    locale, style,
    startedAt: new Date(started).toISOString(),
    offline: false,
    partial: false,
    references: [],
    claims: [],
    unmatchedCitations: table.unmatched,
    summary: { checked: 0, verified: 0, corrected: 0, notFound: 0, unchecked: 0, claims: 0, suggestions: 0 },
    providers: PROVIDERS,
    notice: null
  };

  const deadline = started + deadlineMs;
  const isTimedOut = () => Date.now() > deadline || Boolean(signal?.aborted);
  const report = (stage, done, total, detail) => {
    if (typeof onProgress === 'function') onProgress({ stage, done, total, detail, elapsedMs: Date.now() - started });
  };

  // --- 1. verify bibliography entries -------------------------------------
  const entries = table.entries.slice(0, maxReferences);
  let index = 0;
  for (const entry of entries) {
    index += 1;
    report('references', index - 1, entries.length, entry.title || entry.authors);
    if (isTimedOut()) { results.partial = true; break; }
    let result;
    try {
      result = await verifyReference(entry, { timeoutMs, signal });
    } catch {
      result = { id: entry.id, status: 'unchecked', similarity: 0, note: 'Lookup failed.' };
    }
    if (result.status === 'unchecked' && /network/i.test(result.note || '')) results.offline = true;
    results.references.push({ ...entry, verification: result });
    await sleep(140);
  }
  report('references', entries.length, entries.length, null);

  // --- 2. suggest sources for uncited claims --------------------------------
  if (!results.offline) {
    const claims = findUncitedClaims(text, { locale, limit: maxClaims * 3 });
    let claimIndex = 0;
    for (const claim of claims) {
      if (results.claims.length >= maxClaims) break;
      claimIndex += 1;
      report('claims', claimIndex - 1, Math.min(claims.length, maxClaims), claim.text.slice(0, 70));
      if (isTimedOut()) { results.partial = true; break; }
      let suggestion = suggestFromBibliography(claim, table.entries, { locale });
      if (!suggestion) {
        try {
          suggestion = await suggestSourceForClaim(claim, { timeoutMs, signal });
        } catch {
          suggestion = null;
        }
      }
      const formatted = suggestion && suggestion.origin !== 'bibliography'
        ? citationsModule.formatReference(workToReference(suggestion.work), style)
        : null;
      results.claims.push({
        text: claim.text, start: claim.start, end: claim.end, kind: claim.kind,
        note: suggestion ? null : (locale === 'tr' ? 'Güvenilir bir kaynak eşleşmesi bulunamadı' : 'No confident source match'),
        suggestion: suggestion ? {
          title: suggestion.work.title, authors: suggestion.work.authorString, year: suggestion.work.year,
          source: suggestion.work.source, doi: suggestion.work.doi, url: suggestion.work.url,
          provider: suggestion.work.provider, origin: suggestion.origin, similarity: suggestion.similarity,
          citation: formatted || suggestion.citation || `(${suggestion.work.authorString}, ${suggestion.work.year})`
        } : null
      });
      await sleep(160);
    }
  }

  for (const item of results.references) {
    const status = item.verification?.status || 'unchecked';
    results.summary.checked += status === 'unchecked' ? 0 : 1;
    if (status === 'verified') results.summary.verified += 1;
    else if (status === 'corrected') results.summary.corrected += 1;
    else if (status === 'not-found') results.summary.notFound += 1;
    else results.summary.unchecked += 1;
  }
  results.summary.claims = results.claims.length;
  results.summary.suggestions = results.claims.filter(claim => claim.suggestion).length;
  results.elapsedMs = Date.now() - started;
  results.notice = results.offline
    ? (locale === 'tr'
      ? 'Kaynak doğrulama çevrimdışı: Crossref/OpenAlex sunucularına ulaşılamadı. Yerel kaynak tablosu yine de oluşturuldu.'
      : 'Source verification is offline: Crossref/OpenAlex could not be reached. The local citation table was still produced.')
    : results.partial
      ? (locale === 'tr' ? 'Tarama zaman aşımına uğradı; sonuçlar kısmidir.' : 'The scan hit its time limit; results are partial.')
      : null;
  report('done', 1, 1, null);
  return results;
}

/** Human-readable summary for the report/markdown export. */
export function scanToMarkdown(scan, { locale = 'tr' } = {}) {
  const lines = [];
  lines.push(locale === 'tr' ? '## Kaynak Doğrulama Raporu' : '## Source verification report');
  lines.push('');
  lines.push(`- ${locale === 'tr' ? 'Kontrol edilen kaynak' : 'References checked'}: ${scan.summary.checked}`);
  lines.push(`- ${locale === 'tr' ? 'Doğrulanan' : 'Verified'}: ${scan.summary.verified}`);
  lines.push(`- ${locale === 'tr' ? 'Düzeltilmesi önerilen' : 'Needs correction'}: ${scan.summary.corrected}`);
  lines.push(`- ${locale === 'tr' ? 'Bulunamayan' : 'Not found'}: ${scan.summary.notFound}`);
  lines.push(`- ${locale === 'tr' ? 'Atıfsız iddia' : 'Uncited claims checked'}: ${scan.summary.claims}`);
  lines.push(`- ${locale === 'tr' ? 'Önerilen kaynak' : 'Suggested sources'}: ${scan.summary.suggestions}`);
  if (scan.notice) { lines.push(''); lines.push(`> ${scan.notice}`); }
  const problems = scan.references.filter(item => item.verification?.status === 'not-found' || item.verification?.status === 'corrected');
  if (problems.length) {
    lines.push('');
    lines.push(locale === 'tr' ? '### Sorunlu kaynaklar' : '### Problematic references');
    lines.push('');
    for (const item of problems) {
      lines.push(`- [${item.id}] ${item.authors || ''} (${item.year || '?'}) ${item.title || ''} — ${item.verification.note || item.verification.status}`);
      if (item.verification.work?.title) lines.push(`  - ${locale === 'tr' ? 'Kayıt' : 'Record'}: ${item.verification.work.title} (${item.verification.work.year || '?'}) ${item.verification.work.doi ? `doi:${item.verification.work.doi}` : ''}`);
    }
  }
  const suggestions = scan.claims.filter(claim => claim.suggestion);
  if (suggestions.length) {
    lines.push('');
    lines.push(locale === 'tr' ? '### Atıfsız iddialar için kaynak önerileri' : '### Suggested sources for uncited claims');
    lines.push('');
    for (const claim of suggestions) {
      lines.push(`- “${claim.text.slice(0, 150)}${claim.text.length > 150 ? '…' : ''}”`);
      lines.push(`  - ${locale === 'tr' ? 'Öneri' : 'Suggestion'} (${Math.round(claim.suggestion.similarity * 100)}%): ${claim.suggestion.authors || ''} (${claim.suggestion.year || '?'}). ${claim.suggestion.title}. ${claim.suggestion.doi ? `https://doi.org/${claim.suggestion.doi}` : claim.suggestion.url || ''}`);
    }
  }
  return lines.join('\n');
}
