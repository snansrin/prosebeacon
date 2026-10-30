import { fold, splitLines } from './nlp.mjs';

// Reference-list parsing, in-text citation detection, cross-checking and
// citation-table generation (APA 7, APA 7 TR, MLA 9, Chicago, Vancouver, BibTeX).

const BIBLIOGRAPHY_HEADINGS = [
  /^\s*(?:KAYNAKLAR|KAYNAKÇA|KAYNAKCA|KAYNAK\s+LİSTESİ|YARARLANILAN\s+(?:KAYNAKLAR|ESERLER)|KAYNAK\s+DİZİNİ)\s*[:.]?\s*$/u,
  /^\s*(?:Kaynaklar|Kaynakça|Kaynak\s+Listesi)\s*[:.]?\s*$/u,
  /^\s*(?:REFERENCES|BIBLIOGRAPHY|WORKS\s+CITED|CITED\s+WORKS|LITERATURE\s+CITED|SOURCES)\s*[:.]?\s*$/iu
];

const YEAR_RE = /\(?\b((?:19|20)\d{2})[a-z]?\b\)?/u;
const DOI_RE = /\b(?:https?:\/\/(?:dx\.)?doi\.org\/)?(10\.\d{4,9}\/[^\s,;"'”\])}]+)/u;
const URL_RE = /\b(https?:\/\/[^\s,;"'”\])}]+)/u;
const VOLUME_RE = /(\d{1,4})\s*\((\d{1,4})\)\s*,?\s*([\d]+(?:\s*[-–—]\s*[\d]+)?)/u;
const PAGES_RE = /(?:,|\s|:)\s*(\d{1,5}\s*[-–—]\s*\d{1,5})\s*\.?\s*$/u;
const PAGES_INLINE_RE = /(?:^|[,:;\s])\s*(\d{1,5}\s*[-–—]\s*\d{1,5})\s*\.?\s*$/u;

// A bibliography heading is only accepted when the lines that follow actually
// look like reference entries; table columns titled "Kaynak" must not match.
export function findBibliography(text) {
  const lines = splitLines(text);
  const candidates = [];
  for (let index = 0; index < lines.length; index++) {
    if (!BIBLIOGRAPHY_HEADINGS.some(pattern => pattern.test(lines[index].text))) continue;
    const following = lines.slice(index + 1, index + 16).filter(line => line.text.trim());
    const score = following.length ? following.filter(line => looksLikeEntryStart(line.text.trim())).length / following.length : 0;
    if (score >= 0.34 || following.length === 0) candidates.push({ index, score, following: following.length });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || b.index - a.index);
  const chosen = candidates[0];
  const startLine = chosen.index;
  let endLine = lines.length;
  for (let index = startLine + 2; index < lines.length; index++) {
    const value = lines[index].text.trim();
    if (!value) continue;
    const letters = value.replace(/[^\p{L}]/gu, '');
    const isHeading = letters && letters === letters.toLocaleUpperCase('tr') && value.length < 60 && !looksLikeEntryStart(value);
    if (isHeading && !/KAYNAK|REFERENCE|EK\b|APPENDIX|ÖZGEÇMİŞ|CURRICULUM|DİZİN/iu.test(value)) { endLine = index; break; }
  }
  const start = lines[startLine].start;
  const end = endLine < lines.length ? lines[endLine].start : text.length;
  return { start, end, headingLine: startLine, confidence: chosen.score, text: text.slice(start, end), lines: lines.slice(startLine + 1, endLine) };
}

export function looksLikeEntryStart(line) {
  const value = line.trim();
  if (!value || value.length < 12) return false;
  const head = value.slice(0, 90);
  const hasYear = /\(?(?:19|20)\d{2}[a-z]?\)?/u.test(head);
  const hasDoiOrUrl = /10\.\d{4,9}\//u.test(value) || /https?:\/\//u.test(value);
  const startsAuthor = /^[A-ZÇĞİÖŞÜ][\p{L}'’\-\u00C0-\u024F]{1,40}(?:,|\s+[A-ZÇĞİÖŞÜ]\.)/u.test(value);
  const startsOrg = /^[A-ZÇĞİÖŞÜ]{2,}(?:[\s.,&]|$)/u.test(value);
  const startsYear = /^(?:\(?(?:19|20)\d{2}\)?)/u.test(value);
  return (startsAuthor || startsOrg || startsYear) && (hasYear || hasDoiOrUrl);
}

export function splitEntries(sectionText) {
  const entries = [];
  let current = '';
  for (const rawLine of sectionText.split('\n')) {
    const line = rawLine.trim().replace(/\s+/gu, ' ');
    if (!line) { if (current) { entries.push(current); current = ''; } continue; }
    if (!current) { current = line; continue; }
    if (looksLikeEntryStart(line)) { entries.push(current); current = line; }
    else current += ' ' + line;
  }
  if (current) entries.push(current);
  return entries.filter(entry => entry.trim().length >= 12);
}

export function parseReference(entry) {
  const raw = entry.trim().replace(/\s+/gu, ' ');
  const doiMatch = DOI_RE.exec(raw);
  const urlMatch = URL_RE.exec(raw);
  const yearMatch = YEAR_RE.exec(raw);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  let authorPart = yearMatch ? raw.slice(0, yearMatch.index) : raw.slice(0, Math.min(raw.length, 70));
  // Strip only separators: a trailing period may be an initial ("E.").
  authorPart = authorPart.replace(/[\s(),;]+$/u, '').replace(/^\((?:19|20)\d{2}\)\s*/u, '').trim();
  let remainder = yearMatch ? raw.slice(yearMatch.index + yearMatch[0].length) : raw.slice(authorPart.length);
  remainder = remainder.replace(/^[.\s,;:)]+/u, '');
  if (doiMatch) remainder = remainder.replace(doiMatch[0], ' ');
  if (urlMatch) remainder = remainder.replace(urlMatch[0], ' ');
  remainder = remainder.replace(/\s+/gu, ' ').trim();
  const segments = remainder.split(/(?<=\.)\s+(?=[A-ZÇĞİÖŞÜ"'“0-9(])/u).map(part => part.trim()).filter(part => part && part !== '.');
  let title = (segments.shift() || '').replace(/\.$/u, '').replace(/^["“'‘]|["”'’]$/gu, '').trim();
  let source = segments.join(' ').replace(/\.$/u, '').trim();
  const volume = VOLUME_RE.exec(remainder);
  const pages = PAGES_RE.exec(remainder) || PAGES_INLINE_RE.exec(remainder);
  // Do not repeat volume/issue/pages that are already inside the source string.
  if (volume) {
    const volumeText = volume[0].trim();
    source = source.replace(volumeText, '').replace(/\s{2,}/gu, ' ').replace(/[,.]\s*$/u, '').trim();
  } else if (pages) {
    source = source.replace(/[,;:\s]*\d{1,5}\s*[-–—]\s*\d{1,5}\s*\.?\s*$/u, '').trim();
  }
  if (!volume && !pages) {
    const trailingPages = /[,;:\s]*(\d{1,5}\s*[-–—]\s*\d{1,5})\s*\.?\s*$/u.exec(source);
    if (trailingPages) source = source.slice(0, trailingPages.index).trim();
  }
  const authors = parseAuthors(authorPart);
  const type = detectType({ raw, title, source, doi: doiMatch, volume });
  return {
    raw, authors, authorString: authors.length ? authors.map(describeAuthor).join(', ') : authorPart,
    year, title: title || null, source: source || null,
    volume: volume ? volume[1] : null, issue: volume ? volume[2] : null,
    pages: volume ? volume[3] : pages ? pages[1].replace(/\s+/gu, '') : null,
    doi: doiMatch ? doiMatch[1].replace(/[.,;]$/u, '') : null,
    url: urlMatch ? urlMatch[1].replace(/[.,;]$/u, '') : null,
    type, complete: Boolean(yearMatch && title && (doiMatch || volume || source))
  };
}

const describeAuthor = author => (author.initials.length ? `${author.family}, ${author.initials.map(initial => `${initial}.`).join(' ')}` : author.family);

// Handles APA author lists ("Canedoli, C., Ferrè, C."), ampersands, Turkish
// "ve", and "et al./vd." trailing forms.
function parseAuthors(value) {
  const cleaned = value.replace(/\s+/gu, ' ').trim().replace(/[,;]\s*$/u, '');
  if (!cleaned) return [];
  const etAl = /(?:et\s+al\.?|vd\.|ve\s+ark\.?|ve\s+arkadaşları)$/iu.test(cleaned);
  const withoutEtAl = cleaned.replace(/(?:,\s*)?(?:et\s+al\.?|vd\.|ve\s+ark\.?|ve\s+arkadaşları)$/iu, '').trim();
  const pairRe = /([A-ZÇĞİÖŞÜ][\p{L}'’\-\u00C0-\u024F]+)\s*,\s*((?:[A-ZÇĞİÖŞÜ]\.(?:\s*-?\s*[A-ZÇĞİÖŞÜ]\.)*(?:\s*)?)+)/gu;
  const authors = [];
  for (const match of withoutEtAl.matchAll(pairRe)) {
    authors.push({ family: match[1].trim(), rest: '', initials: [...match[2].matchAll(/([A-ZÇĞİÖŞÜ])\./gu)].map(item => item[1]) });
  }
  if (!authors.length) {
    const parts = withoutEtAl
      .split(/\s*(?:,\s*&|\s*&|;|\s+ve\s+|\s+and\s+)\s*/u)
      .map(part => part.trim().replace(/[,]+$/u, ''))
      .filter(part => part && part.length > 1);
    for (const part of parts) {
      const initials = [...part.matchAll(/(?:^|[\s,])([A-ZÇĞİÖŞÜ])\./gu)].map(match => match[1]);
      const family = part.replace(/(?:[A-ZÇĞİÖŞÜ]\.(?:\s*)?)+/gu, '').replace(/[,]+/gu, ' ').trim();
      const words = family.split(/\s+/u).filter(Boolean);
      authors.push({ family: words[0] || part, rest: words.slice(1).join(' '), initials });
    }
  }
  const unique = [];
  const seen = new Set();
  for (const author of authors) {
    const key = `${author.family}|${author.initials.join('')}`.toLocaleLowerCase('tr');
    if (seen.has(key) || !author.family) continue;
    seen.add(key);
    unique.push(author);
  }
  if (etAl) unique.push({ family: unique.length ? 'vd.' : 'et al.', rest: '', initials: [], etAl: true });
  return unique.slice(0, 30);
}

function detectType({ raw, title, source, doi, volume }) {
  if (/(?:tez|thesis|dissertation|yüksek lisans|doktora|sanatta yeterlik)/iu.test(raw)) return 'thesis';
  if (/(?:proceedings|conference|sempozyum|kongre|bildiri)/iu.test(raw)) return 'proceedings';
  if (/(?:report|rapor|guidelines|technical|kılavuz|bulletin|white paper)/iu.test(raw)) return 'report';
  if (/(?:press|yayınevi|yayınları|verlag|books|edition|basım)/iu.test(raw)) return 'book';
  if (doi || volume) return 'journal-article';
  if (/^https?:\/\//u.test(raw) && !source) return 'web';
  return 'other';
}

export function findInTextCitations(text, locale = 'tr') {
  const citations = [];
  const multi = locale === 'tr' ? 'vd' : 'et al';
  const parenthetical = new RegExp(`\\(([^()]{2,160}?(?:19|20)\\d{2}[a-z]?)\\)`, 'gu');
  for (const match of text.matchAll(parenthetical)) {
    const inner = match[1];
    for (const part of inner.split(';')) {
      const yearMatch = /((?:19|20)\d{2})[a-z]?/u.exec(part);
      if (!yearMatch) continue;
      const authorPart = part.slice(0, yearMatch.index).replace(/[,;]\s*$/u, '').trim();
      if (!authorPart) continue;
      // "(299 Nolu Tebliğ, 2017)" / "(5018 sayılı Kanun, 2003)" are document numbers, not citations.
      if (/^\d/u.test(authorPart)) continue;
      if (/\b(?:Nolu|say\u0131l\u0131|tarihli|Tebli\u011f|Kanun|Y\u00f6netmelik|Karar|No)\b/iu.test(authorPart)) continue;
      citations.push({
        kind: 'parenthetical', start: match.index, end: match.index + match[0].length,
        text: match[0], authors: authorPart, year: Number(yearMatch[1]),
        family: firstFamily(authorPart), etAl: new RegExp(`(?:${multi}\\.|ve ark\\.|et al\\.?)`, 'iu').test(authorPart)
      });
    }
  }
  const narrative = new RegExp(`([A-ZÇĞİÖŞÜ][\\p{L}'’\\-]{2,30})(?:\\s+(?:${multi}\\.?|ve\\s+ark\\.?|ve\\s+arkadaşları|et\\s+al\\.?|ve\\s+[A-ZÇĞİÖŞÜ][\\p{L}'’\\-]{2,30}))?\\s*\\(((?:19|20)\\d{2}[a-z]?)\\)`, 'gu');
  // Words that look like surnames but are place names, units or document parts.
  const NOT_SURNAMES = new Set(['etap', 'parki', 'park', 'vadisi', 'vadi', 'meksika', 'iran', 'turkiye', 'türkiye', 'dunya', 'dünya', 'cin', 'çin', 'kore', 'abd', 'ab', 'ankara', 'istanbul', 'bakanligi', 'belediyesi', 'universitesi', 'üniversitesi', 'enstitusu', 'enstitüsü', 'teblig', 'tebliğ', 'worldcover', 'invest', 'ndvi', 'lai', 'tablo', 'sekil', 'şekil', 'bolum', 'bölüm', 'kaynak', 'rapor', 'proje', 'model', 'tur', 'tür', 'alan', 'sayi', 'sayı', 'konu', 'ek', 'olcur', 'kurum', 'genel', 'ozet', 'özet', 'sonuc', 'sonuç', 'yontem', 'yöntem', 'bulgu', 'tartisma', 'tartışma', 'giris', 'giriş', 'sonrasi', 'öncesi', 'oncesi', 'sirasi', 'sırasında', 'boyunca', 'parklari', 'parklarının', 'kent', 'nolu', 'tebligi', 'kanun', 'yasa', 'yonetmelik', 'yönetmelik', 'ilce', 'ilçe', 'il', 'mahalle', 'bolge', 'bölge', 'ulke', 'ülke', 'sehir', 'şehir']);
  for (const match of text.matchAll(narrative)) {
    const start = match.index;
    const familyCandidate = match[1];
    if (familyCandidate.includes("'") || familyCandidate.includes('’')) continue; // Turkish place names take the apostrophe
    if (!/[\p{L}]/u.test(familyCandidate)) continue; // pure numbers (e.g. "299 Nolu Tebliğ") are not authors
    if (NOT_SURNAMES.has(fold(familyCandidate))) continue;
    const before = text.slice(Math.max(0, start - 12), start);
    if (/(?:\d|\bTablo|\bŞekil|\bBölüm|\bEk)\s*$/u.test(before)) continue;
    if (citations.some(item => start >= item.start - 2 && start <= item.end + 2)) continue;
    citations.push({
      kind: 'narrative', start, end: start + match[0].length, text: match[0],
      authors: match[1], year: Number(match[2]), family: firstFamily(match[1]),
      etAl: Boolean(match[0].match(/(?:vd\.|ve ark\.?|et al\.?)/iu))
    });
  }
  const numeric = /\[((?:\d{1,3})(?:\s*[,;]\s*\d{1,3})*)\]/gu;
  for (const match of text.matchAll(numeric)) {
    citations.push({ kind: 'numeric', start: match.index, end: match.index + match[0].length, text: match[0],
      numbers: match[1].split(/[,;]\s*/).map(Number), year: null, authors: '', family: '' });
  }
  return citations.sort((a, b) => a.start - b.start);
}

// Hyphenated, diacritic and "Surname1 and Surname2" forms all have to match.
function findEntryForCitation(entries, family, year) {
  const target = fold(family).split(/[\s\-,]+/u).filter(Boolean)[0] || '';
  if (!target) return null;
  let best = null;
  for (const entry of entries) {
    const yearOk = !year || !entry.year || entry.year === year || Math.abs(entry.year - year) <= 1;
    if (!yearOk) continue;
    for (const author of entry.authors) {
      const parts = fold(`${author.family} ${author.rest}`).split(/[\s\-]+/u).filter(Boolean);
      if (parts.some(part => part === target || part.startsWith(target) || target.startsWith(part))) {
        if (entry.year === year) return entry;
        best ||= entry;
      }
    }
    if (!best) {
      const rawParts = fold(entry.authorString).split(/[\s,;\-]+/u).filter(Boolean);
      if (rawParts.some(part => part === target)) { if (entry.year === year) return entry; best ||= entry; }
    }
  }
  return best;
}

const firstFamily = value => {
  const first = fold(value).split(/[,\s]+/u).filter(Boolean)[0] || '';
  return first;
};

export function formatReference(entry, style = 'apa7') {
  // Accepts both a parsed reference (authors: array) and a citation-table row
  // (authors: display string) without losing information.
  const authors = Array.isArray(entry.authors) ? entry.authors : [];
  const authorFallback = entry.authorString || (typeof entry.authors === 'string' ? entry.authors : '');
  const year = entry.year ? String(entry.year) : 'tarih yok';
  const title = entry.title || '';
  const source = entry.source || '';
  const doi = entry.doi ? ` https://doi.org/${entry.doi}` : '';
  const url = entry.url && !entry.doi ? ` ${entry.url}` : '';
  const volumeIssue = entry.volume ? `, ${entry.volume}${entry.issue ? `(${entry.issue})` : ''}${entry.pages ? `, ${entry.pages}` : ''}` : entry.pages ? `, ${entry.pages}` : '';
  switch (style) {
    case 'apa7':
    case 'apa7-tr': {
      const list = authors.map(author => (author.initials.length ? `${author.family}, ${author.initials.map(initial => `${initial}.`).join(' ')}` : author.family));
      const joined = list.length > 1 ? `${list.slice(0, -1).join(', ')}${style === 'apa7' ? ', &' : ' ve'} ${list.at(-1)}` : (list[0] || authorFallback);
      return `${joined} (${year}). ${title}.${source ? ` ${source}${volumeIssue}.` : ''}${doi}${url}`.replace(/\s+/gu, ' ').trim();
    }
    case 'mla9': {
      const list = authors.map(author => (author.initials.length ? `${author.family}, ${author.initials.map(initial => `${initial}.`).join(' ')}` : author.family));
      if (!list.length && authorFallback) return `${authorFallback} "${(entry.title || '')}." ${source}${volumeIssue ? volumeIssue.replace(/^,\s*/u, ' ') : ''}, ${year}.${doi}${url}`.replace(/\s+/gu, ' ').trim();
      return `${list.join(', ')} "${title}." ${source}${volumeIssue ? volumeIssue.replace(/^,\s*/u, ' ') : ''}, ${year}.${doi}${url}`.replace(/\s+/gu, ' ').trim();
    }
    case 'chicago': {
      const list = authors.map(author => `${author.family}${author.initials.length ? `, ${author.initials.join('.')}` : ''}`);
      return `${list.join(', ')}. "${title}." ${source}${volumeIssue}. ${year}.${doi}${url}`.replace(/\s+/gu, ' ').trim();
    }
    case 'vancouver': {
      const list = authors.map(author => `${author.family} ${author.initials.join('')}`);
      return `${list.join(', ')}. ${title}. ${source}. ${year}${volumeIssue ? `;${entry.volume || ''}${entry.issue ? `(${entry.issue})` : ''}${entry.pages ? `:${entry.pages}` : ''}` : ''}.${doi}${url}`.replace(/\s+/gu, ' ').trim();
    }
    case 'bibtex': {
      const key = `${(authors[0]?.family || 'anon').toLowerCase()}${entry.year || ''}`;
      const type = { 'journal-article': 'article', book: 'book', thesis: 'phdthesis', proceedings: 'inproceedings', report: 'techreport', web: 'misc' }[entry.type] || 'misc';
      const fields = [
        `  author = {${authors.map(author => `${author.family}${author.rest ? `, ${author.rest}` : ''}`).join(' and ') || entry.authorString}}`,
        `  title = {${title}}`,
        entry.year ? `  year = {${entry.year}}` : null,
        source ? `  ${type === 'book' ? 'publisher' : 'journal'} = {${source}}` : null,
        entry.volume ? `  volume = {${entry.volume}}` : null,
        entry.issue ? `  number = {${entry.issue}}` : null,
        entry.pages ? `  pages = {${entry.pages.replace(/–/gu, '--')}}` : null,
        entry.doi ? `  doi = {${entry.doi}}` : null,
        entry.url && !entry.doi ? `  url = {${entry.url}}` : null
      ].filter(Boolean);
      return `@${type}{${key},\n${fields.join(',\n')}\n}`;
    }
    case 'numbered':
      return entry.raw;
    default:
      return entry.raw;
  }
}

/**
 * Cross-check in-text citations against the reference list.
 * Returns the citation table plus consistency problems.
 */
export function citationTable(text, { locale = 'tr', style = 'apa7' } = {}) {
  const section = findBibliography(text);
  const entries = section ? splitEntries(section.text).map(parseReference) : [];
  const inText = findInTextCitations(text, locale);
  const bodyText = section ? text.slice(0, section.start) : text;
  const bodyCitations = inText.filter(item => item.start < (section ? section.start : text.length));
  const usedKeys = new Map();
  for (const citation of bodyCitations) {
    if (citation.kind === 'numeric') continue;
    const family = citation.family;
    const match = findEntryForCitation(entries, family, citation.year);
    const key = match ? entries.indexOf(match) : `unmatched:${family}:${citation.year}`;
    if (!usedKeys.has(key)) usedKeys.set(key, { entry: match || null, citations: [], family, year: citation.year });
    usedKeys.get(key).citations.push(citation);
  }
  const rows = entries.map((entry, index) => {
    const cited = [...usedKeys.values()].some(value => value.entry === entry);
    return {
      id: index + 1,
      authors: entry.authorString, year: entry.year, title: entry.title, source: entry.source,
      volume: entry.volume, issue: entry.issue, pages: entry.pages, doi: entry.doi, url: entry.url,
      type: entry.type, complete: entry.complete, raw: entry.raw,
      cited,
      inText: entry.authors.length ? `${entry.authors[0].family}${entry.authors.length > 1 ? (locale === 'tr' ? ' vd.' : ' et al.') : ''}, ${entry.year}` : '',
      formatted: formatReference(entry, style),
      status: cited ? (entry.complete ? 'ok' : 'incomplete') : 'uncited'
    };
  });
  const unmatched = [...usedKeys.values()].filter(value => !value.entry).map(value => ({
    family: value.family, year: value.year, count: value.citations.length,
    text: value.citations[0].text, start: value.citations[0].start,
    problem: locale === 'tr' ? 'Metin içi atıf kaynak listesinde bulunamadı' : 'In-text citation has no matching reference'
  }));
  return {
    engine: 'prosebeacon-citation-table-v3',
    style, locale,
    bibliographyFound: Boolean(section),
    bibliographyRange: section ? { start: section.start, end: section.end } : null,
    entries: rows,
    inTextCitations: bodyCitations.length,
    unmatched,
    uncited: rows.filter(row => !row.cited).map(row => ({ id: row.id, authors: row.authors, year: row.year, title: row.title })),
    duplicates: findDuplicates(entries),
    summary: {
      references: rows.length,
      cited: rows.filter(row => row.cited).length,
      uncited: rows.filter(row => !row.cited).length,
      unmatched: unmatched.length,
      withDoi: rows.filter(row => row.doi).length
    }
  };
}

function findDuplicates(entries) {
  const seen = new Map();
  const duplicates = [];
  for (const entry of entries) {
    const title = fold(entry.title || '');
    if (title.length < 20) continue;
    const key = `${title.slice(0, 60)}|${entry.year || ''}`;
    if (seen.has(key)) duplicates.push({ title: entry.title, year: entry.year, first: seen.get(key), raw: entry.raw });
    else seen.set(key, entry.raw);
  }
  return duplicates;
}

export const CITATION_STYLES = [
  { id: 'apa7', label: 'APA 7 (İngilizce)' },
  { id: 'apa7-tr', label: 'APA 7 (Türkçe, "ve")' },
  { id: 'mla9', label: 'MLA 9' },
  { id: 'chicago', label: 'Chicago (author-date)' },
  { id: 'vancouver', label: 'Vancouver (sayısal)' },
  { id: 'bibtex', label: 'BibTeX' }
];

export function tableToText(table, style = 'apa7') {
  return table.entries.map((entry, index) => `${index + 1}. ${formatReference(parseReference(entry.raw), style)}`).join('\n');
}

export function tableToCsv(table) {
  const head = ['No', 'Yazarlar', 'Yıl', 'Başlık', 'Kaynak', 'Cilt', 'Sayı', 'Sayfa', 'DOI', 'URL', 'Tür', 'Metin içi atıf', 'Durum'];
  const escape = value => `"${String(value ?? '').replace(/"/gu, '""')}"`;
  const rows = table.entries.map(entry => [entry.id, entry.authors, entry.year, entry.title, entry.source, entry.volume, entry.issue, entry.pages, entry.doi, entry.url, entry.type, entry.inText, entry.status].map(escape).join(','));
  return [head.map(escape).join(','), ...rows].join('\n');
}

export function tableToMarkdown(table, style = 'apa7') {
  const lines = ['| No | Yazar | Yıl | Başlık | Kaynak | DOI/URL | Atıf | Durum |', '|---|---|---|---|---|---|---|---|'];
  for (const entry of table.entries) {
    lines.push(`| ${entry.id} | ${entry.authors} | ${entry.year ?? ''} | ${entry.title} | ${entry.source ?? ''} | ${entry.doi ? `https://doi.org/${entry.doi}` : entry.url ?? ''} | ${entry.cited ? entry.inText : '—'} | ${entry.status} |`);
  }
  return lines.join('\n');
}

export function tableToBibtex(table) {
  return table.entries.map(entry => formatReference(parseReference(entry.raw), 'bibtex')).join('\n\n');
}
