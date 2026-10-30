import { languagePack } from './lang/index.mjs';
import { splitLines, splitSentences, wordTokens, fold } from './nlp.mjs';
import { MAX_TEXT } from './analysis.mjs';

const MASK = '\u0001';
const PROTECTED = [
  /https?:\/\/\S+/giu,
  /(?:doi|DOI)\s*:\s*10\.\S+/gu,
  /(?<![\p{L}\p{N}_])10\.\d{4,9}\/[-._;()/:A-Z0-9a-z]+/gu,
  /[\w.+-]+@[\w-]+\.[\w.]+/gu,
  /(?<![\p{L}\p{N}_])(?:InVEST|NDVI|LAI|RVI|i-Tree|Qwen|ChatGPT|OpenAI|Ollama)(?![\p{L}\p{N}_])/gu,
  /`[^`\n]*`/gu
];

// Mask URLs/DOIs/emails and scientific names so rules never corrupt them.
export function maskProtected(text) {
  const characters = [...text];
  const spans = [];
  for (const pattern of PROTECTED) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!match[0].length) { pattern.lastIndex++; continue; }
      spans.push([match.index, match.index + match[0].length]);
      if (pattern.lastIndex === match.index) pattern.lastIndex++;
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  for (const [start, end] of spans) for (let index = start; index < end; index++) characters[index] = MASK;
  return { masked: characters.join(''), spans };
}

function matchesRegister(rule, register) {
  if (rule.register === 'all') return true;
  if (Array.isArray(rule.register)) return rule.register.includes(register);
  return rule.register === register;
}

function applyFix(match, fix) {
  if (fix === null || fix === undefined) return null;
  if (typeof fix === 'function') return fix(...match);
  // Expand $1..$9 / $& without re-running the pattern: patterns may use
  // lookarounds whose context is not part of match[0].
  return String(fix).replace(/\$(\d|&)/gu, (_, key) => (key === '&' ? match[0] : (match[Number(key)] ?? '')));
}

/**
 * Rule-based proofreading for Turkish and English.
 * Returns the corrected text plus an explainable, authority-linked issue list.
 */
export function proofread(text, { locale = 'tr', register = 'academic', autoFix = true, maxIssues = 4000 } = {}) {
  if (typeof text !== 'string' || !text.trim()) throw Object.assign(new Error('Metin gerekli.'), { status: 400 });
  if (/\u0000/.test(text)) throw Object.assign(new Error('Metin geçersiz karakter içeriyor.'), { status: 400 });
  const pack = languagePack(locale);
  const issues = [];
  if (text.length > MAX_TEXT) throw Object.assign(new Error(`Metin en fazla ${MAX_TEXT.toLocaleString('tr')} karakter olabilir.`), { status: 413 });

  const { masked } = maskProtected(text);
  const lines = splitLines(text);
  const lineIndex = offset => {
    let low = 0, high = lines.length - 1;
    while (low < high) { const middle = (low + high) >> 1; if (lines[middle].end <= offset) low = middle + 1; else high = middle; }
    return lines[low] || { start: 0, end: text.length, text };
  };

  const seen = new Set();
  const push = issue => {
    if (issues.length >= maxIssues) return;
    const key = `${issue.ruleId}:${issue.start}:${issue.end}:${issue.suggestion ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    const line = lineIndex(issue.start);
    if (issue.lineGuard && issue.lineGuard.test(line.text)) return;
    issues.push({ ...issue, line: { start: line.start, end: line.end }, authority: issue.authority });
  };

  for (const rule of pack.rules) {
    if (!matchesRegister(rule, register)) continue;
    for (const [pattern, fix] of rule.patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(masked)) !== null) {
        if (!match[0].length) { pattern.lastIndex++; continue; }
        if (match[0].includes(MASK)) continue;
        const excerpt = text.slice(match.index, match.index + match[0].length);
        let suggestion = autoFix && rule.autoFix ? applyFix(match, fix) : null;
        if (typeof suggestion === 'string' && suggestion === excerpt) suggestion = null;
        if (typeof suggestion !== 'string' && typeof fix === 'string') suggestion = null;
        push({
          ruleId: rule.id, category: rule.category, severity: rule.severity, title: rule.title,
          authority: rule.authority, lineGuard: rule.lineGuard,
          start: match.index, end: match.index + match[0].length, excerpt,
          message: rule.title, suggestion, fixable: Boolean(typeof suggestion === 'string' && suggestion !== excerpt)
        });
        if (pattern.lastIndex === match.index) pattern.lastIndex++;
      }
    }
  }

  for (const issue of structuralChecks(text, { locale, register, pack })) push(issue);

  issues.sort((a, b) => a.start - b.start || a.end - b.end);
  const corrected = autoFix ? applyIssues(text, issues) : text;
  return summarise(text, corrected, issues, { locale, register, pack });
}

// Apply fixes left to right; the earliest and longest fix wins a contested span,
// and replacements inherit the capitalisation of the text they replace.
export function applyIssues(text, issues) {
  const fixes = issues
    .filter(issue => issue.fixable && typeof issue.suggestion === 'string')
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const used = new Set();
  const pieces = [];
  let cursor = 0;
  for (const fix of fixes) {
    if (fix.start < cursor) continue;
    const key = `${fix.start}:${fix.end}`;
    if (used.has(key)) continue;
    used.add(key);
    pieces.push(text.slice(cursor, fix.start), matchCase(text.slice(fix.start, fix.end), fix.suggestion));
    cursor = fix.end;
  }
  pieces.push(text.slice(cursor));
  return pieces.join('');
}

const TR_LOWER = { 'İ': 'i', 'I': 'ı', 'Ş': 'ş', 'Ğ': 'ğ', 'Ü': 'ü', 'Ö': 'ö', 'Ç': 'ç' };
const TR_UPPER = { i: 'İ', ı: 'I', ş: 'Ş', ğ: 'Ğ', ü: 'Ü', ö: 'Ö', ç: 'Ç' };

export function matchCase(original, replacement) {
  if (typeof replacement !== 'string' || !replacement || !original) return replacement;
  const firstOriginal = [...original].find(character => /\p{L}/u.test(character));
  const firstReplacement = [...replacement].find(character => /\p{L}/u.test(character));
  if (!firstOriginal || !firstReplacement) return replacement;
  const upperOriginal = firstOriginal === firstOriginal.toLocaleUpperCase('tr') && firstOriginal !== firstOriginal.toLocaleLowerCase('tr');
  const upperReplacement = firstReplacement === firstReplacement.toLocaleUpperCase('tr') && firstReplacement !== firstReplacement.toLocaleLowerCase('tr');
  if (upperOriginal === upperReplacement) return replacement;
  const index = replacement.indexOf(firstReplacement);
  const head = replacement.slice(0, index);
  const rest = replacement.slice(index);
  if (upperOriginal) {
    const letter = rest[0];
    return head + (TR_UPPER[letter] || letter.toLocaleUpperCase('tr')) + rest.slice(1);
  }
  const letter = rest[0];
  return head + (TR_LOWER[letter] || letter.toLocaleLowerCase('tr')) + rest.slice(1);
}

// ── Structural checks that need context, not a single pattern ──────────────
function structuralChecks(text, { locale, register, pack }) {
  const issues = [];
  const push = issue => issues.push({ fixable: false, severity: 'info', ...issue });

  // 1. Abbreviations must be expanded at first use (Resmî Yazışma MADDE 16/11).
  const abbreviationUse = new Map();
  const SKIP_ABBREVIATIONS = new Set(['T.C', 'ABD', 'AB', 'TC', 'APA', 'MLA', 'TDK', 'YÖK', 'BM', 'NATO', 'DNA', 'RNA', 'TÜBİTAK', 'MEB', 'TBMM', 'KKTC', 'SSCB', 'AB']);
  const lines = splitLines(text);
  const allCapsLineStarts = new Set();
  for (const line of lines) {
    const value = line.text.trim();
    const letters = value.replace(/[^\p{L}]/gu, '');
    if (letters && value.length < 90 && letters === letters.toLocaleUpperCase(locale)) allCapsLineStarts.add(line.start);
  }
  const lineOf = offset => {
    let low = 0, high = lines.length - 1;
    while (low < high) { const middle = (low + high) >> 1; if (lines[middle].end <= offset) low = middle + 1; else high = middle; }
    return lines[low] || { start: 0, end: text.length, text };
  };
  const ABBREV_RE = /(?<![\p{L}\p{N}_])([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9]{1,11}(?:-[A-Z0-9]+)*)(?![\p{L}\p{N}_])/gu;
  for (const match of text.matchAll(ABBREV_RE)) {
    const token = match[1];
    if (SKIP_ABBREVIATIONS.has(token)) continue;
    const line = lineOf(match.index);
    if (allCapsLineStarts.has(line.start)) continue;               // title page / all-caps heading
    if (line.text.trim().split(/\s+/u).length < 4) continue;       // table cell, label or heading
    const before = text.slice(Math.max(0, match.index - 30), match.index);
    if (/(?:Prof|Dr|Doç|Yrd|Arş|Uzm|Öğr|Sayın)\.?\s*$/u.test(before)) continue;      // personal title
    if (/(?:^|[\s,;:(])[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}\s+$/u.test(before)) continue;     // surname after a given name
    if (/(?<![\p{L}\p{N}_])[A-ZÇĞİÖŞÜ]{2,}\s+$/u.test(before)) continue;            // second all-caps token of a name
    if (!abbreviationUse.has(token)) abbreviationUse.set(token, []);
    abbreviationUse.get(token).push(match.index);
  }
  const expandedForms = new Set();
  for (const match of text.matchAll(/([A-ZÇĞİÖŞÜ][\p{L}]+(?:\s+[A-Za-zÇĞİÖŞÜçğıöşü]+){0,7})\s*\(([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9-]{2,})\)/gu)) {
    expandedForms.add(match[2]);
  }
  for (const [token, positions] of abbreviationUse) {
    if (expandedForms.has(token)) continue;
    const first = positions[0];
    push({ ruleId: 'RG-016-11', category: 'kısaltma', severity: 'warning', authority: 'RG-31151',
      title: 'Kısaltma ilk kullanımda açık biçimiyle verilmeli (MADDE 16/11)',
      start: first, end: first + token.length, excerpt: token,
      message: `"${token}" kısaltmasının açık biçimi metinde bulunamadı. İlk kullanımda "Açık Biçim (${token})" yazın.`,
      suggestion: null });
  }

  // 2. Foreign words without a Turkish gloss in official writing (MADDE 16/8).
  if (locale === 'tr' && register === 'official') {
    const lower = text.toLocaleLowerCase('tr');
    for (const [foreign, turkish] of pack.foreignTerms) {
      const index = lower.indexOf(foreign);
      if (index < 0) continue;
      const context = text.slice(index, index + foreign.length + 60);
      if (new RegExp(`\\(${turkish}|${turkish}\\s*\\(`, 'iu').test(context)) continue;
      push({ ruleId: 'RG-016-8', category: 'yabancı söz', severity: 'warning', authority: 'RG-31151',
        title: 'Yabancı kelimenin Türkçe karşılığı parantez içinde verilmeli (MADDE 16/8)',
        start: index, end: index + foreign.length, excerpt: text.slice(index, index + foreign.length),
        message: `"${foreign}" yerine "${turkish}" kullanılabilir ya da parantez içinde karşılığı verilmelidir.`,
        suggestion: turkish });
    }
  }

  // 3. Overlong sentences hurt official and academic clarity.
  const sentences = splitSentences(text, locale);
  for (const sentence of sentences) {
    const words = wordTokens(sentence.text, locale).length;
    if (words < 45) continue;
    push({ ruleId: locale === 'tr' ? 'AKA-007' : 'EN-STR-001', category: 'yapı', severity: 'warning',
      authority: locale === 'tr' ? 'YOK-TEZ' : 'PLAIN',
      title: locale === 'tr' ? 'Çok uzun cümle bölünmeli' : 'Sentence is longer than 40 words',
      start: sentence.start, end: sentence.end, excerpt: sentence.text.slice(0, 120) + '…',
      message: `${words} kelimelik cümle. Anlaşılırlık için iki veya üç cümleye bölün.`, suggestion: null });
  }

  // 4. Repeated sentence openings and consecutive passive formulae.
  const openings = new Map();
  const openingIssues = [];
  let passiveRun = 0, passiveRunStart = -1;
  const passivePattern = locale === 'tr' ? /(?<![\p{L}\p{N}_])\p{L}+(?:ilmektedir|ılmaktadır|ilmektedir|unmaktadır|ünmektedir|anmaktadır|enmektedir)(?![\p{L}\p{N}_])/u : /(?<![\p{L}\p{N}_])(?:is|are|was|were|been|being)\s+\w+(?:ed|en)(?![\p{L}\p{N}_])/u;
  for (const sentence of sentences) {
    const words = wordTokens(sentence.text, locale).slice(0, 3).map(token => token.lower).join(' ');
    if (words) {
      if (!openings.has(words)) openings.set(words, []);
      openings.get(words).push(sentence);
    }
    if (passivePattern.test(sentence.text)) {
      if (passiveRun === 0) passiveRunStart = sentence.start;
      passiveRun++;
      if (passiveRun === 5) {
        push({ ruleId: locale === 'tr' ? 'AKA-004' : 'EN-STY-004', category: 'üslup', severity: 'warning',
          authority: locale === 'tr' ? 'YOK-TEZ' : 'APA7',
          title: locale === 'tr' ? 'Arka arkaya edilgen kalıp kullanımı' : 'Passive formula repeated five times in a row',
          start: passiveRunStart, end: sentence.end, excerpt: text.slice(passiveRunStart, sentence.end).slice(0, 140) + '…',
          message: locale === 'tr' ? 'Beş cümle üst üste "-ilmektedir" kalıbı kullanılmış. Etken ve edilgen yapıları dönüşümlü kullanın.' : 'Vary active and passive constructions to keep the rhythm human.',
          suggestion: null });
      }
    } else { passiveRun = 0; passiveRunStart = -1; }
  }

  // 5. Repeated sentence openings (a strong machine-writing signal).
  for (const [key, list] of openings) {
    if (list.length < 4) continue;
    const sentence = list[3];
    push({ ruleId: locale === 'tr' ? 'AKA-008' : 'EN-STY-005', category: 'üslup', severity: 'warning',
      authority: locale === 'tr' ? 'YOK-TEZ' : 'PLAIN',
      title: locale === 'tr' ? 'Aynı cümle başlangıcı tekrarlanıyor' : 'Repeated sentence opening',
      start: sentence.start, end: sentence.end, excerpt: sentence.text.slice(0, 120),
      message: locale === 'tr'
        ? `"${key}…" başlangıcı ${list.length} cümlede kullanılmış. Bağlaç ve girişleri çeşitlendirin.`
        : `"${key}…" opens ${list.length} sentences. Vary the openings.`,
      suggestion: null });
    if (openingIssues.length > 40) break;
  }

  // 6. Official document blocks (only meaningful for resmî yazışma).
  if (locale === 'tr' && register === 'official') {
    const checks = [
      [/^\s*Sayı\s*:\s*\S+/imu, 'RG-011', 'Belgede "Sayı:" satırı bulunamadı (MADDE 11).'],
      [/^\s*Konu\s*:\s*\S+/imu, 'RG-013', 'Belgede "Konu:" satırı bulunamadı (MADDE 13).'],
      [/(?<![\p{L}\p{N}_])\d{2}\.\d{2}\.\d{4}(?![\p{L}\p{N}_])/u, 'RG-012', 'Tarih gün.ay.yıl biçiminde yazılmalı (MADDE 12).'],
      [/^\s*İlgi\s*:/imu, 'RG-015', 'İlgili belge varsa "İlgi:" bölümü eklenmeli (MADDE 15).'],
      [/(?<![\p{L}\p{N}_])(?:rica|arz)\s+(?:ve\s+rica\s+)?ederim(?![\p{L}\p{N}_])/iu, 'RG-016-12', 'Kapanış "… rica ederim." / "… arz ederim." olmalı (MADDE 16/12).'],
      [/(?<![\p{L}\p{N}_])(?:Ek|EK)\s*:/u, 'RG-018', 'Ek varsa "Ek:" bölümü imzadan sonra yer almalı (MADDE 18).']
    ];
    for (const [pattern, ruleId, message] of checks) {
      if (pattern.test(text)) continue;
      push({ ruleId, category: 'resmî', severity: 'warning', authority: 'RG-31151', title: message,
        start: 0, end: Math.min(80, text.length), excerpt: text.slice(0, 80), message, suggestion: null });
    }
    const konu = /^\s*Konu\s*:\s*(.+)$/imu.exec(text);
    if (konu && /[.!?]$/.test(konu[1].trim())) {
      push({ ruleId: 'RG-013', category: 'resmî', severity: 'error', authority: 'RG-31151',
        title: 'Konu satırının sonuna noktalama işareti konulmaz (MADDE 13)',
        start: konu.index + konu[0].length - 1, end: konu.index + konu[0].length, excerpt: konu[1].trim(),
        message: 'Konu satırının sonundaki noktalama işaretini kaldırın.', suggestion: konu[1].trim().replace(/[.!?]+$/u, '') });
    }
  }

  return issues;
}

function summarise(text, corrected, issues, { locale, register }) {
  const bySeverity = { error: 0, warning: 0, info: 0 };
  const byCategory = new Map();
  for (const issue of issues) {
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    byCategory.set(issue.category, (byCategory.get(issue.category) || 0) + 1);
  }
  const authorities = [...new Set(issues.map(issue => issue.authority).filter(Boolean))];
  return {
    engine: 'language-pack-proofreader-v3',
    locale, register,
    original: text,
    text: corrected,
    changed: corrected !== text,
    issueCount: issues.length,
    correctedCount: issues.filter(issue => issue.fixable).length,
    bySeverity,
    byCategory: [...byCategory].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
    authorities,
    issues: issues.map(({ lineGuard, ...issue }) => issue),
    words: wordTokens(text, locale).length,
    notice: locale === 'tr'
      ? 'Düzeltmeler TDK Yazım Kılavuzu ve Resmî Yazışmalarda Uygulanacak Usul ve Esaslar Hakkında Yönetmelik (RG 10.06.2020/31151) hükümlerine göre yapılır.'
      : 'Corrections follow APA 7, Chicago, and plain-language guidance.'
  };
}
