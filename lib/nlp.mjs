// Core text engine shared by the analysis, proofreading and rewriting modules.
// Regex based on purpose: Intl.Segmenter allocates one object per word and
// runs out of memory on long reports (a 90k character thesis report OOMs it).

export const WORD_RE = /[\p{L}\p{N}]+(?:['’ʼ][\p{L}\p{N}]+)*/gu;
const TOKEN_RE = /[\p{L}\p{N}]+(?:['’ʼ][\p{L}\p{N}]+)*|\s+|[^\s\p{L}\p{N}]+/gu;
const TERMINATORS = /[.!?…]/u;

const ABBREVIATIONS = {
  tr: new Set(['vd', 'ark', 'vb', 'vs', 'prof', 'dr', 'doç', 'yar', 'yrd', 'araş', 'gör', 'no', 'nr', 'say', 'şek', 'tab', 'grf', 'alm', 'ing', 'fr', 'ör', 'bkz', 'km', 'cm', 'mm', 'm', 'mg', 'kg', 'gr', 'lt', 'dk', 'sa', 'yy', 'b', 'c', 's', 'sf', 'md', 'mad', 'sn', 'tel', 'faks', 'e', 'z', 'o', 'sp', 'spp', 'subsp', 'var', 'cv', 'l', 'ed', 'çev', 'hzl', 'der', 'yay', 'ank', 'ist', 'iz', 'ab', 'abd', 't', 'tc', 'bk', 'dip', 'ayn', 'krş', 'n', 'p', 'r', 'a', 'i', 'g', 'k', 'm', 't', 'y', 'ş', 'd', 's', 'f', 'h', 'l', 'v', 'b']),
  en: new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'e.g', 'i.e', 'cf', 'fig', 'figs', 'pp', 'p', 'vol', 'vols', 'no', 'nos', 'ed', 'eds', 'trans', 'inc', 'ltd', 'co', 'corp', 'dept', 'univ', 'approx', 'esp', 'et al', 'sp', 'spp', 'subsp', 'var', 'mt', 'ave', 'blvd', 'gen', 'gov', 'hon', 'rev', 'sec', 'sen', 'rep', 'al', 'op', 'cit', 'l', 's', 'p'])
};

const SENTENCE_START_HINTS = /^(\s*)(?:\d+(?:[.,]\d+)*\.?\s+|[IVXLCDM]+[.)]\s+|[a-zğçşöüı])\)\s+|^\s*(?:MADDE|Madde|EK|Ek|Tablo|TABLO|Şekil|ŞEKİL|Grafik|GRAFİK|Figure|Fig|Table|Chart|KAYNAKLAR|Kaynaklar|REFERENCES|References|ÖZET|Abstract|ABSTRACT|SONUÇ|GİRİŞ|DAĞITIM|Dağıtım|Sayı|Konu|Tarih|İlgi|Muhatap|Ek)(?![\p{L}\p{N}_])/u;

export function isHeadingLine(line) {
  const value = line.trim();
  if (!value || value.length > 140) return false;
  if (SENTENCE_START_HINTS.test(line)) return true;
  if (/[.!?…]$/u.test(value)) return false;
  const words = value.split(/\s+/u).filter(Boolean);
  if (words.length > 14) return false;
  const letters = value.replace(/[^\p{L}]/gu, '');
  if (letters && letters === letters.toLocaleUpperCase('tr')) return true;
  return words.every(word => /^[A-ZÇĞİÖŞÜ0-9IVX(\['’".,/&*-]/u.test(word));
}

function abbreviationAt(text, index, locale) {
  let start = index;
  while (start > 0 && /[\p{L}\p{N}.]/u.test(text[start - 1])) start--;
  const candidate = text.slice(start, index).toLocaleLowerCase(locale);
  if (!candidate) return false;
  const set = ABBREVIATIONS[locale] || ABBREVIATIONS.tr;
  if (set.has(candidate)) return true;
  if (/^[a-zçğıöşü]$/u.test(candidate)) return true; // initials: "C." "L."
  if (/^\d+$/u.test(candidate)) return true; // decimals and numbering
  if (/^(?:e\.g|i\.e|et\.?\s*al|op\.\s*cit)$/u.test(candidate)) return true;
  return false;
}

/**
 * Split text into sentence spans that exactly partition the source:
 * spans.map(s => text.slice(s.start, s.end)).join('') === text
 */
export function splitSentences(text, locale = 'tr') {
  const normalisedLocale = locale === 'en' ? 'en' : 'tr';
  const bounds = [];
  let lineStart = 0;
  for (let index = 0; index <= text.length; index++) {
    const atEnd = index === text.length;
    if (!atEnd && text[index] !== '\n') continue;
    const lineEnd = atEnd ? text.length : index + 1;
    const line = text.slice(lineStart, lineEnd);
    if (!line.trim()) { lineStart = lineEnd; continue; }
    if (isHeadingLine(line)) { bounds.push(lineEnd); lineStart = lineEnd; continue; }
    let boundary = -1;
    for (let cursor = lineStart; cursor < lineEnd; cursor++) {
      const character = text[cursor];
      if (!TERMINATORS.test(character)) continue;
      if (character === '.' && abbreviationAt(text, cursor, normalisedLocale)) continue;
      if (character === '.' && text[cursor + 1] === '.') continue; // ellipsis handled at last dot
      let end = cursor + 1;
      while (end < lineEnd && /["'”’)\]]/u.test(text[end])) end++;
      // A lowercase continuation means this dot was not a sentence end.
      const next = text[end] === ' ' ? text[end + 1] : text[end];
      if (next && /\p{Ll}/u.test(next)) continue; // lowercase continuation: not a sentence end
      if (end < lineEnd && text[end] !== '\n' && text[end] !== ' ') continue;
      boundary = end;
      bounds.push(end);
      cursor = end - 1;
    }
    if (boundary !== lineEnd && bounds.at(-1) !== lineEnd) bounds.push(lineEnd);
    lineStart = lineEnd;
  }
  const sorted = [...new Set(bounds)].filter(value => value > 0 && value <= text.length).sort((a, b) => a - b);
  if (sorted.at(-1) !== text.length) sorted.push(text.length);
  const raw = [];
  let start = 0;
  for (const end of sorted) { if (end > start) raw.push({ start, end }); start = end; }
  // Fold whitespace-only fragments into their neighbour so every span has text.
  const spans = [];
  for (const span of raw) {
    if (!text.slice(span.start, span.end).trim()) {
      if (spans.length) { const last = spans.at(-1); last.end = span.end; last.text = text.slice(last.start, span.end); continue; }
      spans.push({ id: 0, ...span, text: text.slice(span.start, span.end) });
      continue;
    }
    if (spans.length && !spans.at(-1).text.trim()) {
      const first = spans.pop();
      spans.push({ id: spans.length, start: first.start, end: span.end, text: text.slice(first.start, span.end) });
      continue;
    }
    spans.push({ id: spans.length, ...span, text: text.slice(span.start, span.end) });
  }
  return spans.map((span, index) => ({ ...span, id: index }));
}

export function splitParagraphs(text) {
  const spans = [];
  const lines = splitLines(text);
  let previous = null;
  for (const line of lines) {
    const last = spans.at(-1);
    if (!line.text.trim()) { if (last) { last.end = line.end; last.open = false; } previous = null; continue; }
    const trimmed = line.text.trim();
    const startsNew = !last || !last.open
      || (previous !== null && /[.!?…]\s*$/u.test(previous))
      || (previous !== null && previous.length >= 200)
      || (previous !== null && isHeadingLine(previous))
      || isHeadingLine(line.text);
    if (startsNew) spans.push({ start: line.start, end: line.end, open: true });
    else { last.end = line.end; }
    previous = trimmed;
  }
  return spans.map(span => ({ start: span.start, end: span.end, text: text.slice(span.start, span.end) }))
    .filter(span => span.text.trim())
    .map((span, index) => ({ ...span, id: index }));
}

export function splitLines(text) {
  const spans = [];
  let start = 0;
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index++) {
    const end = start + lines[index].length + (index === lines.length - 1 ? 0 : 1);
    spans.push({ start, end, text: text.slice(start, end) });
    start = end;
  }
  return spans;
}

export function wordTokens(text, locale = 'tr') {
  WORD_RE.lastIndex = 0;
  const tokens = [];
  for (const match of text.matchAll(WORD_RE)) {
    tokens.push({ word: match[0], lower: match[0].toLocaleLowerCase(locale), start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

/** Lexemes that exactly tile the text: words, whitespace runs, punctuation runs. */
export function lexTokens(text) {
  TOKEN_RE.lastIndex = 0;
  const tokens = [];
  for (const match of text.matchAll(TOKEN_RE)) {
    const value = match[0];
    tokens.push({ value, kind: /^\s/u.test(value) ? 'space' : /^[\p{L}\p{N}]/u.test(value) ? 'word' : 'punct', start: match.index, end: match.index + value.length });
  }
  return tokens;
}

export function wordList(text, locale = 'tr') { return wordTokens(text, locale).map(token => token.lower); }
export function wordCount(text) { let count = 0; WORD_RE.lastIndex = 0; for (const _ of text.matchAll(WORD_RE)) count++; return count; }
export function uniqueWords(text, locale = 'tr') { const set = new Set(); for (const token of wordTokens(text, locale)) set.add(token.lower); return set; }

export function ngrams(words, size) {
  const counts = new Map();
  for (let index = 0; index + size <= words.length; index++) {
    const key = words.slice(index, index + size).join('\u0001');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

const TR_VOWELS = 'aeıioöuüâîû';
export function syllables(word, locale = 'tr') {
  if (locale !== 'tr') {
    const groups = word.toLowerCase().match(/[aeiouy]+/g) || [];
    let count = groups.length || 1;
    if (/e$/u.test(word) && count > 1 && !/[aeiouy][^aeiouy]e$/u.test(word.toLowerCase())) count--;
    return Math.max(1, count);
  }
  let count = 0;
  for (const character of word.toLowerCase()) if (TR_VOWELS.includes(character)) count++;
  return Math.max(1, count);
}

// EN: Flesch Reading Ease (206.835 - 1.015*ASL - 84.6*ASW).
// TR: Ateşman (1997) Turkish adaptation, x1 = syllables per word, x2 = words per
// sentence: 198.825 - 40.175*x1 - 2.610*x2. Bands follow Ateşman's scale.
export function readability(text, { words, sentences, syllableTotal }, locale = 'tr') {
  if (!sentences || !words) return { score: 0, label: 'unknown', formula: 'none', asl: 0, asw: 0 };
  const asl = words / sentences;
  const asw = syllableTotal / words;
  if (locale === 'tr') {
    const score = 198.825 - 40.175 * asw - 2.61 * asl;
    return { score: Math.round(clamp(score, 0, 100)), label: trBand(score), formula: 'atesman-1997',
      asl: Math.round(asl * 10) / 10, asw: Math.round(asw * 100) / 100 };
  }
  const score = 206.835 - 1.015 * asl - 84.6 * asw;
  return { score: Math.round(clamp(score, 0, 100)), label: enBand(score), formula: 'flesch-reading-ease',
    asl: Math.round(asl * 10) / 10, asw: Math.round(asw * 100) / 100 };
}

const trBand = score => (score >= 71 ? 'çok kolay' : score >= 51 ? 'kolay' : score >= 31 ? 'zor' : 'çok zor');
const enBand = score => (score >= 90 ? 'very easy' : score >= 70 ? 'easy' : score >= 50 ? 'fairly difficult' : score >= 30 ? 'difficult' : 'very difficult');

export function standardDeviation(values) {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

export const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
export const round1 = value => Math.round(value * 10) / 10;
export const round2 = value => Math.round(value * 100) / 100;
export function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

/** Normalise away diacritics/case for fuzzy matching without mutating input. */
export function fold(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/gu, '').replace(/[ıİ]/gu, 'i').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function detectLocale(text) {
  const sample = text.slice(0, 20000);
  const turkish = (sample.match(/[ğışİĞŞöçÖÇ]/gu) || []).length;
  const words = wordList(sample, 'tr');
  const trMarkers = words.filter(word => /^(?:ve|bir|bu|için|ile|değil|daha|çok|gibi|kadar|ancak|ayrıca|sonuç|üzerine|olarak|edilmiştir|yapılmıştır|bulunmaktadır)$/.test(word)).length;
  const enMarkers = words.filter(word => /^(?:the|and|of|for|with|this|that|from|have|been|which|their|about)$/.test(word)).length;
  if (turkish >= 3 && trMarkers >= enMarkers) return 'tr';
  if (enMarkers > trMarkers) return 'en';
  return trMarkers ? 'tr' : 'en';
}
