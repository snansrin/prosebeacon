import { languagePack } from './lang/index.mjs';
import { splitSentences, splitLines, isHeadingLine, wordTokens } from './nlp.mjs';
import { proofread } from './proofread.mjs';
import { sentenceGuardTokens, preserves } from './preserve.mjs';

// Deterministic, fully local rewriting engine. It never calls a network model,
// so "Yeniden yaz" always answers — with explainable, reversible operations.

const TR_IMPERSONAL = [
  [/(?<![?\p{L}])(?:yaptık|gerçekleştirdik)(?![?\p{L}])/giu, 'yapılmıştır'],
  [/(?<![?\p{L}])belirledik(?![?\p{L}])/giu, 'belirlenmiştir'],
  [/(?<![?\p{L}])gözlemledik(?![?\p{L}])/giu, 'gözlemlenmiştir'],
  [/(?<![?\p{L}])kullandık(?![?\p{L}])/giu, 'kullanılmıştır'],
  [/(?<![?\p{L}])seçtik(?![?\p{L}])/giu, 'seçilmiştir'],
  [/(?<![?\p{L}])ölçtük(?![?\p{L}])/giu, 'ölçülmüştür'],
  [/(?<![?\p{L}])hesapladık(?![?\p{L}])/giu, 'hesaplanmıştır'],
  [/(?<![?\p{L}])değerlendirdik(?![?\p{L}])/giu, 'değerlendirilmiştir'],
  [/(?<![?\p{L}])gördük(?![?\p{L}])/giu, 'görülmüştür'],
  [/(?<![?\p{L}])tespit ettik(?![?\p{L}])/giu, 'tespit edilmiştir'],
  [/(?<![?\p{L}])sonucuna vardık(?![?\p{L}])/giu, 'sonucuna varılmıştır'],
  [/(?<![?\p{L}])düşünüyoruz(?![?\p{L}])/giu, 'düşünülmektedir'],
  [/(?<![?\p{L}])öneriyoruz(?![?\p{L}])/giu, 'önerilmektedir'],
  [/(?<![?\p{L}])söyleyebiliriz(?![?\p{L}])/giu, 'söylenebilir'],
  [/(?<![?\p{L}])elde ettik(?![?\p{L}])/giu, 'elde edilmiştir'],
  [/(?<![?\p{L}])oluşturduk(?![?\p{L}])/giu, 'oluşturulmuştur'],
  [/(?<![?\p{L}])inceledik(?![?\p{L}])/giu, 'incelenmiştir'],
  [/(?<![?\p{L}])çalıştık(?![?\p{L}])/giu, 'çalışılmıştır'],
  [/(?<![?\p{L}])ben(?![?\p{L}])/giu, ''],
  [/(?<![?\p{L}])biz(?![?\p{L}])/giu, '']
];

const TR_HEDGE = [
  [/(?<![?\p{L}])kanıtlamaktadır(?![?\p{L}])/giu, 'göstermektedir'],
  [/(?<![?\p{L}])ispat etmektedir(?![?\p{L}])/giu, 'ortaya koymaktadır'],
  [/(?<![?\p{L}])kanıtlamıştır(?![?\p{L}])/giu, 'göstermiştir'],
  [/(?<![?\p{L}])kesin olarak(?![?\p{L}])/giu, 'büyük ölçüde'],
  [/(?<![?\p{L}])kesinlikle(?![?\p{L}])/giu, 'önemli ölçüde'],
  [/(?<![?\p{L}])her zaman(?![?\p{L}])/giu, 'genellikle'],
  [/(?<![?\p{L}])asla(?![?\p{L}])/giu, 'nadiren'],
  [/(?<![?\p{L}])tamamen(?![?\p{L}])/giu, 'büyük ölçüde'],
  [/(?<![?\p{L}])kuşkusuz(?![?\p{L}])/giu, ''],
  [/(?<![?\p{L}])şüphesiz(?![?\p{L}])/giu, ''],
  [/(?<![?\p{L}])elbette(?![?\p{L}])/giu, '']
];

const TR_FORMAL_VERBS = [
  [/(?<![?\p{L}])oldu(?![?\p{L}])/giu, 'gerçekleşti'],
  [/(?<![?\p{L}])olmuştur(?![?\p{L}])/giu, 'gerçekleşmiştir'],
  [/(?<![?\p{L}])buldu(?![?\p{L}])/giu, 'tespit etti'],
  [/(?<![?\p{L}])bulunmuştur(?![?\p{L}])/giu, 'tespit edilmiştir'],
  [/(?<![?\p{L}])gösterdi(?![?\p{L}])/giu, 'ortaya koydu'],
  [/(?<![?\p{L}])arttı(?![?\p{L}])/giu, 'artış gösterdi'],
  [/(?<![?\p{L}])azaldı(?![?\p{L}])/giu, 'azalış gösterdi'],
  [/(?<![?\p{L}])yaptı(?![?\p{L}])/giu, 'gerçekleştirdi'],
  [/(?<![?\p{L}])verdi(?![?\p{L}])/giu, 'sundu'],
  [/(?<![?\p{L}])baktı(?![?\p{L}])/giu, 'inceledi'],
  [/(?<![?\p{L}])dedi(?![?\p{L}])/giu, 'belirtti']
];

const EN_HEDGE = [
  [/(?<![\p{L}\p{N}_])proves that(?![\p{L}\p{N}_])/gi, 'indicates that'],
  [/(?<![\p{L}\p{N}_])proved(?![\p{L}\p{N}_])/gi, 'demonstrated'],
  [/(?<![\p{L}\p{N}_])obviously(?![\p{L}\p{N}_])/gi, ''],
  [/(?<![\p{L}\p{N}_])clearly(?![\p{L}\p{N}_])/gi, ''],
  [/(?<![\p{L}\p{N}_])undeniably(?![\p{L}\p{N}_])/gi, ''],
  [/(?<![\p{L}\p{N}_])always(?![\p{L}\p{N}_])/gi, 'generally'],
  [/(?<![\p{L}\p{N}_])never(?![\p{L}\p{N}_])/gi, 'rarely'],
  [/(?<![\p{L}\p{N}_])everyone knows(?![\p{L}\p{N}_])/gi, 'it is widely recognised']
];

const EN_IMPERSONAL = [
  [/(?<![\p{L}\p{N}_])I believe that(?![\p{L}\p{N}_])/gi, 'The evidence suggests that'],
  [/(?<![\p{L}\p{N}_])I think(?![\p{L}\p{N}_])/gi, 'It is considered that'],
  [/(?<![\p{L}\p{N}_])in my opinion,?(?![\p{L}\p{N}_])/gi, ''],
  [/(?<![\p{L}\p{N}_])we found that(?![\p{L}\p{N}_])/gi, 'it was found that'],
  [/(?<![\p{L}\p{N}_])we can see(?![\p{L}\p{N}_])/gi, 'it can be seen'],
  [/(?<![\p{L}\p{N}_])you(?![\p{L}\p{N}_])/gi, 'one']
];

const EN_FORMAL = [
  [/(?<![\p{L}\p{N}_])a lot of(?![\p{L}\p{N}_])/gi, 'numerous'],
  [/(?<![\p{L}\p{N}_])lots of(?![\p{L}\p{N}_])/gi, 'numerous'],
  [/(?<![\p{L}\p{N}_])big(?![\p{L}\p{N}_])/gi, 'substantial'],
  [/(?<![\p{L}\p{N}_])huge(?![\p{L}\p{N}_])/gi, 'considerable'],
  [/(?<![\p{L}\p{N}_])get(?![\p{L}\p{N}_])/gi, 'obtain'],
  [/(?<![\p{L}\p{N}_])find out(?![\p{L}\p{N}_])/gi, 'determine'],
  [/(?<![\p{L}\p{N}_])look into(?![\p{L}\p{N}_])/gi, 'examine'],
  [/(?<![\p{L}\p{N}_])go up(?![\p{L}\p{N}_])/gi, 'increase'],
  [/(?<![\p{L}\p{N}_])go down(?![\p{L}\p{N}_])/gi, 'decrease'],
  [/(?<![\p{L}\p{N}_])show(?![\p{L}\p{N}_])/gi, 'demonstrate']
];

const TRANSFORM_TABLES = {
  tr: { impersonal: TR_IMPERSONAL, hedge: TR_HEDGE, formalVerbs: TR_FORMAL_VERBS },
  en: { impersonal: EN_IMPERSONAL, hedge: EN_HEDGE, formalVerbs: EN_FORMAL }
};

const INSTRUCTION_KEYWORDS = [
  { keys: ['kısalt', 'sadeleştir', 'özet', 'shorten', 'concise', 'sade'], effect: 'concise', label: 'cümleleri kısaltma' },
  { keys: ['uzat', 'genişlet', 'ayrıntılandır', 'expand', 'elaborate', 'detaylandır'], effect: 'expand', label: 'ayrıntılandırma' },
  { keys: ['edilgen', 'pasif', 'kişisiz', 'passive', 'impersonal'], effect: 'impersonal', label: 'edilgen/kişisiz anlatım' },
  { keys: ['etken', 'aktif', 'active'], effect: 'active', label: 'etken çatı tercihi' },
  { keys: ['resmî', 'resmi', 'kurumsal', 'official', 'formal'], effect: 'official', label: 'resmî yazışma dili' },
  { keys: ['akademik', 'academic', 'bilimsel', 'scientific'], effect: 'academic', label: 'akademik dil' },
  { keys: ['insansı', 'doğal', 'human', 'natural', 'akıcı', 'fluent'], effect: 'humanise', label: 'insansı ritim' },
  { keys: ['noktalama', 'yazım', 'punctuation', 'spelling', 'grammar', 'dil bilgisi'], effect: 'proofread', label: 'yazım ve noktalama' },
  { keys: ['atıf', 'citation', 'kaynak'], effect: 'citations', label: 'atıf biçimi birliği' }
];

export function parseInstruction(instruction = '') {
  const value = String(instruction || '').toLocaleLowerCase('tr');
  const effects = new Set();
  const applied = [];
  for (const entry of INSTRUCTION_KEYWORDS) {
    if (entry.keys.some(key => value.includes(key))) { effects.add(entry.effect); applied.push(entry.label); }
  }
  return { effects: [...effects], applied };
}

// A line is left untouched when it is a heading, a list item, a table row or a
// label field — rewriting those destroys document structure.
function isProtectedLine(line) {
  const value = line.trim();
  if (!value) return true;
  if (value.length < 24) return true;
  if (isHeadingLine(line)) return true;
  if (/^\s*(?:[-*•]|\d+[.)]|(?:[a-zğçşöüı]|[ivx]+)[.)])\s+/iu.test(line)) return true;
  if ((value.match(/\|/gu) || []).length >= 2) return true;
  // Tab characters and long space runs carry layout (cover pages, label:value
  // forms, manually aligned tables). Rewriting them destroys the document.
  if (/\t/u.test(line)) return true;
  if (/ {3,}/u.test(line)) return true;
  if (/^\s*(?:Sayı|Konu|Tarih|İlgi|Ek|Dağıtım|Muhatap|OLUR|DAĞITIM|EK)\s*:/u.test(line)) return true;
  if (/^\s*(?:Tablo|Şekil|Grafik|Figure|Table|Chart|Ek|EK)[-– ]?\s*\d/iu.test(line)) return true;
  const letters = value.replace(/[^\p{L}]/gu, '');
  if (letters && letters === letters.toLocaleUpperCase('tr')) return true;
  return false;
}

function applyTables(sentence, tables, flags) {
  let output = sentence;
  if (flags.impersonal) for (const [pattern, replacement] of tables.impersonal) output = output.replace(pattern, replacement);
  if (flags.hedge) for (const [pattern, replacement] of tables.hedge) output = output.replace(pattern, replacement);
  if (flags.formalVerbs) for (const [pattern, replacement] of tables.formalVerbs) output = output.replace(pattern, replacement);
  // Spaces only: tab characters carry layout (cover pages, label:value forms,
  // tables) and must survive untouched.
  return output.replace(/ {2,}/gu, ' ').replace(/ +([,.;:!?])/gu, '$1').replace(/^ *, */u, '').replace(/ +$/u, '');
}

// Only a clause that already ends in a finite predicate may be promoted to its own
// sentence; otherwise splitting would produce ungrammatical fragments.
const FINITE_END_TR = /(?:maktad[ıi]r|ilmektedir|maktadır|maktadır|miştir|mıştır|lmıştır|ılmıştır|unmuştur|ünmüştür|anmıştır|enmiştir|[ıi]lmıştır|dır|dir|dur|dür|tır|tir|tur|tür|olmuştur|edilmiştir|yapılmıştır|görülmektedir|bulunmaktadır|kalmaktadır|artmıştır|azalmıştır|ölçülmüştür|hesaplanmıştır|belirlenmiştir|saptanmıştır|değerlendirilmiştir|önerilmektedir|vurgulanmaktadır|belirtilmektedir|ifade edilmektedir|bildirilmiştir|gözlemlenmiştir|göstermektedir|sunulmaktadır|izlenmektedir|kullanılmaktadır|sürdürmektedir|taşımaktadır|kapsamaktadır|sağlamaktadır|vermektedir|almaktadır|gelir|gider|yapar|eder|olur|artar|azalır|gösterir|sağlar|verir|alır|değildir|yoktur|vardır|uygundur|gerekir|beklenir|düşer|çıkar)$/u;
const FINITE_END_EN = /(?:\.|is|are|was|were|been|has|have|had|will|can|could|should|would|may|might|occurs?|occurred|shows?|showed|shown|increases?|increased|decreases?|decreased|measured|determined|observed|reported|found|indicates?|indicated|suggests?|suggested|remains?|remained)$/iu;

function endsFinite(head, locale) {
  const value = head.trim().replace(/[.,;:]$/u, '');
  const last = value.split(/\s+/u).pop() || '';
  return locale === 'tr' ? FINITE_END_TR.test(last) : FINITE_END_EN.test(last);
}

// Split over-long sentences only when the cut produces two grammatical sentences.
function splitLongSentence(sentence, locale, maxWords) {
  const words = wordTokens(sentence, locale).length;
  if (words <= maxWords) return [sentence];
  const semi = sentence.indexOf('; ');
  if (semi > 20 && semi < sentence.length - 20) {
    const head = sentence.slice(0, semi);
    const tail = sentence.slice(semi + 2);
    const tailWords = wordTokens(tail, locale).length;
    if (tailWords >= 10 && (locale !== 'tr' || endsFinite(head, locale))) {
      return [head.trim().replace(/[;]$/u, '') + '.', capitalise(tail, locale)];
    }
  }
  const conjunction = locale === 'tr' ? /(?:,\s+)(?:ve|ancak|ayrıca|bununla birlikte|dolayısıyla|bu nedenle)\s+/iu : /,\s+(?:and|but|however|therefore|thus|while)\s+/iu;
  const match = conjunction.exec(sentence);
  if (match && match.index > 25 && match.index < sentence.length - 25) {
    const head = sentence.slice(0, match.index);
    const tail = sentence.slice(match.index + match[0].length);
    if (wordTokens(tail, locale).length >= 8 && endsFinite(head, locale)) {
      return [head.trim().replace(/,$/u, '') + '.', capitalise(tail, locale)];
    }
  }
  return [sentence];
}

function capitalise(sentence, locale) {
  const value = sentence.replace(/^\s+/u, '');
  if (!value) return value;
  const first = value[0];
  const upper = locale === 'tr' ? (first === 'i' ? 'İ' : first.toLocaleUpperCase('tr')) : first.toLocaleUpperCase('en');
  return upper + value.slice(1);
}

// Rotate repeated connectives so the text does not read like a template.
function varyConnective(sentence, history, pack, locale) {
  for (let group = 0; group < pack.connectiveGroups.length; group++) {
    const options = pack.connectiveGroups[group];
    for (const option of options) {
      if (!sentence.startsWith(option)) continue;
      const recent = history.slice(-3).filter(item => item.group === group);
      if (recent.length < 2) { history.push({ group, option }); return sentence; }
      const used = new Set(history.slice(-4).filter(item => item.group === group).map(item => item.option));
      const alternative = options.find(candidate => !used.has(candidate) && candidate !== option);
      if (!alternative) { history.push({ group, option }); return sentence; }
      history.push({ group, option: alternative });
      const rest = sentence.slice(option.length);
      return alternative + rest;
    }
  }
  history.push({ group: -1, option: '' });
  return sentence;
}

function normaliseCitationStyle(text, style) {
  if (style === 'vd.') {
    return text.replace(/(?<![\p{L}\p{N}_])ve ark\.(?![\p{L}\p{N}_])/gu, 'vd.')
      .replace(/(?<![\p{L}\p{N}_])ve arkadaşları(?![\p{L}\p{N}_])/gu, 'vd.')
      .replace(/(?<![\p{L}\p{N}_])et al\.?(?![\p{L}\p{N}_])/giu, 'vd.');
  }
  if (style === 've ark.') {
    return text.replace(/(?<![\p{L}\p{N}_])vd\.(?![\p{L}\p{N}_])/gu, 've ark.')
      .replace(/(?<![\p{L}\p{N}_])et al\.?(?![\p{L}\p{N}_])/giu, 've ark.');
  }
  return text;
}

export function detectCitationStyle(text) {
  const vd = (text.match(/(?<![\p{L}\p{N}_])vd\.(?![\p{L}\p{N}_])/gu) || []).length;
  const ark = (text.match(/(?<![\p{L}\p{N}_])ve ark\.(?![\p{L}\p{N}_])/gu) || []).length;
  const etAl = (text.match(/(?<![\p{L}\p{N}_])et al\.?(?![\p{L}\p{N}_])/giu) || []).length;
  if (!vd && !ark && !etAl) return null;
  if (ark + etAl > vd) return 've ark.';
  return 'vd.';
}

export function transformText(text, {
  locale = 'tr', style = 'academic', instruction = '', terms = [],
  humanise = true, maxSentenceWords = 42, onProgress = null
} = {}) {
  if (typeof text !== 'string' || text.trim().length < 20) throw Object.assign(new Error('En az 20 karakter metin gerekli.'), { status: 400 });
  const pack = languagePack(locale);
  const register = pack.registers[style] || pack.registers.academic;
  const flags = { ...(register.transformations || {}) };
  const parsed = parseInstruction(instruction);
  for (const effect of parsed.effects) flags[effect] = true;
  if (style === 'proofread') { flags.impersonal = false; flags.hedge = false; flags.formalVerbs = false; flags.removeCliches = false; }
  const tables = TRANSFORM_TABLES[locale] || TRANSFORM_TABLES.tr;
  const citationStyle = detectCitationStyle(text);
  const lines = splitLines(text);
  const connectiveHistory = [];
  const changes = [];
  const output = [];
  const stats = { lines: lines.length, transformed: 0, protectedLines: 0, sentences: 0, changedSentences: 0, reverted: 0, split: 0 };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (onProgress && index % 200 === 0) onProgress('transform', index, lines.length);
    if (isProtectedLine(line.text)) { stats.protectedLines++; output.push(line.text); continue; }

    const spans = splitSentences(line.text, locale);
    let rebuilt = '';
    let lineChanged = false;
    for (const span of spans) {
      stats.sentences++;
      const leading = span.text.match(/^\s*/u)[0];
      const trailing = span.text.slice(leading.length).match(/\s*$/u)[0];
      const core = span.text.slice(leading.length, span.text.length - trailing.length);
      if (!core.trim()) { rebuilt += span.text; continue; }
      const tokens = sentenceGuardTokens(core, terms);
      let candidate = core;
      try {
        const checked = proofread(core, { locale, register: style === 'proofread' ? 'all' : style, autoFix: true, maxIssues: 200 });
        candidate = checked.text.trim();
      } catch { candidate = core; }
      if (!preserves(tokens, candidate)) { candidate = core; stats.reverted++; }

      if (!flags.proofreadOnly) {
        let styled = applyTables(candidate, tables, flags);
        if (citationStyle && flags.citationNormalise !== false) styled = normaliseCitationStyle(styled, citationStyle);
        if (!preserves(tokens, styled)) { styled = candidate; stats.reverted++; }
        const parts = splitLongSentence(styled, locale, maxSentenceWords);
        if (parts.length > 1) stats.split++;
        let sentenceOutput = '';
        for (const [position, part] of parts.entries()) {
          let piece = part;
          if (humanise && position === 0) piece = varyConnective(piece, connectiveHistory, pack, locale);
          if (!preserves(tokens, piece)) { piece = part; stats.reverted++; }
          sentenceOutput += (sentenceOutput ? ' ' : '') + piece;
        }
        candidate = sentenceOutput || candidate;
      }
      if (candidate !== core) {
        stats.changedSentences++;
        lineChanged = true;
        changes.push({ line: index, before: core, after: candidate });
      }
      rebuilt += leading + candidate + trailing;
    }
    if (lineChanged) stats.transformed++;
    output.push(rebuilt);
  }

  let result = output.join('\n');
  if (citationStyle) result = normaliseCitationStyle(result, citationStyle);
  if (locale === 'tr' && style === 'official') result = ensureOfficialClosing(result);

  return {
    engine: 'prosebeacon-local-transform-v3',
    locale, style, styleLabel: register.label,
    instructionApplied: parsed.applied,
    citationStyle,
    text: result,
    changes,
    stats,
    notice: 'Yerel dönüşüm motoru: yazım/noktalama düzeltmeleri, üslup dönüşümleri ve ritim çeşitlendirmesi kural tabanlıdır. Sayılar, atıflar, birimler ve kısaltmalar korundu; korunamayan cümleler otomatik olarak özgün hâline döndürüldü.'
  };
}

// Resmî yazışma: kapanış ibaresi yoksa ve belge resmî yapıdaysa ekle (MADDE 16/12).
function ensureOfficialClosing(text) {
  const isOfficial = /(?:^|\n)\s*(?:Sayı|Konu)\s*:/u.test(text);
  if (!isOfficial) return text;
  if (/(?<![?\p{L}])(?:rica|arz)\s+(?:ve\s+rica\s+)?ederim\.?(?![?\p{L}])/iu.test(text)) return text;
  const lines = text.split('\n');
  let insertAt = lines.length;
  for (let index = lines.length - 1; index >= 0; index--) {
    const value = lines[index].trim();
    if (!value) continue;
    if (/^\s*(?:Ek|Dağıtım|OLUR|Gereği|Bilgi)\s*:/u.test(value)) { insertAt = index; continue; }
    insertAt = index + 1;
    break;
  }
  lines.splice(insertAt, 0, '', 'Gereğini arz ve rica ederim.');
  return lines.join('\n');
}
