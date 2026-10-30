import { languagePack } from './lang/index.mjs';
import {
  splitSentences, splitParagraphs, wordTokens, ngrams, syllables, readability,
  standardDeviation, clamp, sigmoid, fold
} from './nlp.mjs';
import { maskProtected } from './proofread.mjs';

// A 26-page report is roughly 90k characters; allow real documents in one piece.
export const MAX_TEXT = 200000;
export { splitSentences, splitParagraphs };

export function validateText(text) {
  if (typeof text !== 'string' || text.trim().length < 20) throw Object.assign(new Error('En az 20 karakter metin girin.'), { status: 400 });
  if (text.length > MAX_TEXT) throw Object.assign(new Error(`Metin en fazla ${MAX_TEXT.toLocaleString('tr')} karakter olabilir.`), { status: 413 });
  if (/\u0000/.test(text)) throw Object.assign(new Error('Metin geçersiz karakter içeriyor.'), { status: 400 });
  return text;
}

// ── Feature extraction ─────────────────────────────────────────────────────
function countMatches(text, pattern) {
  pattern.lastIndex = 0;
  let count = 0, match;
  while ((match = pattern.exec(text)) !== null) { count++; if (match[0].length === 0) pattern.lastIndex++; }
  return count;
}

const TRIPLE_PATTERN_TR = /(?<![\p{L}\p{N}_])[\p{L}]{3,}\s*,\s*[\p{L}]{3,}\s+(?:ve|ile)\s+[\p{L}]{3,}(?![\p{L}\p{N}_])/gu;
const TRIPLE_PATTERN_EN = /(?<![\p{L}\p{N}_])[\p{L}]{3,}\s*,\s*[\p{L}]{3,}\s*,?\s+and\s+[\p{L}]{3,}(?![\p{L}\p{N}_])/giu;
const NUMERIC_PATTERN = /\d+(?:[.,]\d+)*(?:\s*(?:%|°|m²|km²|ha|m|cm|mm|kg|g|mg|ton|Mg|°C|yıl|gün|saat))?(?![\p{L}\p{N}_])/gu;
const PROPER_TR = /(?<![\p{L}\p{N}_])[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}(?![\p{L}\p{N}_])/gu;
const CITATION_PATTERN = /\((?:[^()]{0,120}?(?:19|20)\d{2}[a-z]?)\)|\[(?:\d{1,3})\]|(?<![\p{L}\p{N}_])(?:19|20)\d{2}(?![\p{L}\p{N}_])/gu;
const LATIN_BINOMIAL = /(?<![\p{L}\p{N}_])[A-Z][a-z]{2,}\s+(?:spp?\.|[a-z]{3,})(?![\p{L}\p{N}_])/gu;
const EMDASH = /[—–]/gu;
const LIST_LINE = /^\s*(?:[-*••]|\d+[.)]|(?:[a-zğçşöüı]|[ivx]+)[.)])\s+/gimu;
const HEDGES_TR = /(?<![\p{L}\p{N}_])(?:olabilir|olasıdır|düşünülmektedir|değerlendirilmektedir|görülmektedir|öngörülmektedir|söylenebilir|muhtemeldir|belirtilebilir)(?![\p{L}\p{N}_])/gu;
const HEDGES_EN = /(?<![\p{L}\p{N}_])(?:may|might|could|suggests?|indicates?|appears?|seems?|likely|possibly|probably)(?![\p{L}\p{N}_])/giu;
const PASSIVE_TR = /(?<![\p{L}\p{N}_])\p{L}{3,}(?:ilmektedir|ılmaktadır|ilmektedir|unmaktadır|ünmektedir|anmaktadır|enmektedir|ilmiştir|ılmıştır|ilmiştir|ulmuştur|ünmüştür|anmıştır|enmiştir)(?![\p{L}\p{N}_])/gu;
const PASSIVE_EN = /(?<![\p{L}\p{N}_])(?:is|are|was|were|be|been|being)\s+(?:\w+ed|\w+en)(?![\p{L}\p{N}_])/giu;
const CONNECTIVE_TR = /(?<![\p{L}\p{N}_])(?:ayrıca|ancak|bununla birlikte|öte yandan|diğer taraftan|sonuç olarak|bu nedenle|dolayısıyla|bu bağlamda|bu çerçevede|nitekim|böylece|aynı zamanda|buna karşın|buna göre|kısacası|özellikle|genel olarak)(?![\p{L}\p{N}_])/giu;
const CONNECTIVE_EN = /(?<![\p{L}\p{N}_])(?:however|moreover|furthermore|therefore|thus|consequently|additionally|in addition|nevertheless|overall|in conclusion|for example|for instance|as a result|in contrast)(?![\p{L}\p{N}_])/giu;

export function extractFeatures(text, locale = 'tr') {
  const pack = languagePack(locale);
  const { masked } = maskProtected(text);
  const tokens = wordTokens(text, locale);
  const lower = tokens.map(token => token.lower);
  const words = tokens.length || 1;
  const sentences = splitSentences(text, locale);
  const paragraphs = splitParagraphs(text);
  const sentenceLengths = sentences.map(sentence => wordTokens(sentence.text, locale).length);
  const paragraphLengths = paragraphs.map(paragraph => wordTokens(paragraph.text, locale).length);
  const meanSentence = sentenceLengths.reduce((a, b) => a + b, 0) / Math.max(1, sentenceLengths.length);
  const sdSentence = standardDeviation(sentenceLengths);
  const unique = new Set(lower);
  const once = new Map();
  for (const word of lower) once.set(word, (once.get(word) || 0) + 1);
  const hapax = [...once.values()].filter(value => value === 1).length;

  // Cliché density from the language pack.
  let clicheHits = 0;
  for (const marker of pack.aiMarkers) clicheHits += countMatches(text, marker.re);

  const connectives = countMatches(text, locale === 'tr' ? CONNECTIVE_TR : CONNECTIVE_EN);
  const triples = countMatches(text, locale === 'tr' ? TRIPLE_PATTERN_TR : TRIPLE_PATTERN_EN);
  const passives = countMatches(text, locale === 'tr' ? PASSIVE_TR : PASSIVE_EN);
  const hedges = countMatches(text, locale === 'tr' ? HEDGES_TR : HEDGES_EN);
  const emdashes = countMatches(text, EMDASH);
  const numbers = countMatches(text, NUMERIC_PATTERN);
  const citations = countMatches(text, CITATION_PATTERN);
  const proper = locale === 'tr' ? countMatches(text, PROPER_TR) : 0;
  const binomials = countMatches(text, LATIN_BINOMIAL);
  const listLines = countMatches(text, LIST_LINE);
  const syllableTotal = tokens.reduce((total, token) => total + syllables(token.word, locale), 0);

  // Repeated n-grams beyond the stopword baseline.
  const content = lower.filter(word => !pack.stopwords.has(word) && word.length > 2);
  const four = ngrams(content, 4);
  let repeatedFour = 0, maxRepeat = 1;
  for (const count of four.values()) if (count > 1) { repeatedFour += count - 1; maxRepeat = Math.max(maxRepeat, count); }
  const three = ngrams(content, 3);
  let repeatedThree = 0;
  for (const count of three.values()) if (count > 2) repeatedThree += count - 2;

  // Function-word distribution distance (stylometric baseline).
  const functionCounts = new Map();
  for (const word of lower) if (pack.functionWords.includes(word)) functionCounts.set(word, (functionCounts.get(word) || 0) + 1);
  const expected = 1 / Math.max(1, pack.functionWords.length);
  const observedTotal = [...functionCounts.values()].reduce((a, b) => a + b, 0) || 1;
  let chi = 0;
  for (const word of pack.functionWords) {
    const observed = (functionCounts.get(word) || 0) / observedTotal;
    chi += ((observed - expected) ** 2) / expected;
  }

  const syllablesPerWord = syllableTotal / words;
  const lengthCV = meanSentence ? sdSentence / meanSentence : 0;
  const paragraphCV = (() => {
    const mean = paragraphLengths.reduce((a, b) => a + b, 0) / Math.max(1, paragraphLengths.length);
    return mean ? standardDeviation(paragraphLengths) / mean : 0;
  })();

  return {
    words, sentences: sentences.length, paragraphs: paragraphs.length, characters: text.length,
    meanSentenceLength: meanSentence, sentenceLengthCV: lengthCV, paragraphLengthCV: paragraphCV,
    lexicalDiversity: unique.size / words, hapaxRatio: hapax / Math.max(1, unique.size),
    clichePer1000: clicheHits / words * 1000,
    connectivePer100: connectives / words * 100,
    triplePer1000: triples / words * 1000,
    passiveRatio: passives / Math.max(1, sentences.length),
    hedgePer1000: hedges / words * 1000,
    emdashPer1000: emdashes / words * 1000,
    numberPer1000: numbers / words * 1000,
    citationPer1000: citations / words * 1000,
    properPer1000: proper / words * 1000,
    binomialPer1000: binomials / words * 1000,
    listPer1000: listLines / words * 1000,
    repeatedFourgramPer1000: repeatedFour / words * 1000,
    maxNgramRepeat: maxRepeat,
    repeatedTrigramPer1000: repeatedThree / words * 1000,
    functionWordChi: chi,
    syllablesPerWord,
    readability: readability(text, { words, sentences: sentences.length, syllableTotal }, locale),
    maskedLength: masked.length
  };
}

// ── Ensemble scoring ───────────────────────────────────────────────────────
// Each factor votes on a 0..1 "machine-likeness" scale; weights express how much
// that signal has historically separated formulaic text from human prose in our
// own samples. The model is NOT calibrated on a labelled corpus — the interval
// is reported with the score so the uncertainty stays visible.
const FACTORS = [
  { id: 'cliche', weight: 2.4, label: 'Kalıplaşmış ifade yoğunluğu',
    value: f => clamp(f.clichePer1000 / 6), explain: f => `1.000 kelimede ${f.clichePer1000.toFixed(2)} kalıp ifade` },
  { id: 'burstiness', weight: 1.8, label: 'Cümle uzunluğu dalgalanması (burstiness)',
    value: f => clamp(1 - f.sentenceLengthCV / 0.75), explain: f => `Uzunluk değişim katsayısı ${f.sentenceLengthCV.toFixed(2)} (düşükse makine benzeri)` },
  { id: 'uniformity', weight: 1.1, label: 'Paragraf uzunluğu tekdüzeliği',
    value: f => clamp(1 - f.paragraphLengthCV / 1.2), explain: f => `Paragraf değişim katsayısı ${f.paragraphLengthCV.toFixed(2)}` },
  { id: 'connective', weight: 1.0, label: 'Bağlaç/geçiş sözcüğü sıklığı',
    value: f => clamp((f.connectivePer100 - 1.2) / 3.5), explain: f => `100 kelimede ${f.connectivePer100.toFixed(2)} bağlaç` },
  { id: 'repetition', weight: 1.4, label: 'Yinelenen söz öbekleri',
    value: f => clamp((f.repeatedFourgramPer1000 - 0.4) / 6), explain: f => `1.000 kelimede ${f.repeatedFourgramPer1000.toFixed(2)} tekrarlanan 4'lü öbek` },
  { id: 'specificity', weight: -1.9, label: 'Somut veri yoğunluğu (sayı, atıf, özel ad)',
    value: f => clamp((f.numberPer1000 + f.citationPer1000 + f.properPer1000 + f.binomialPer1000 - 8) / 60),
    explain: f => `1.000 kelimede ${f.numberPer1000.toFixed(1)} sayı, ${f.citationPer1000.toFixed(1)} atıf, ${f.properPer1000.toFixed(1)} özel ad` },
  { id: 'lexical', weight: -0.9, label: 'Sözcük çeşitliliği',
    value: f => clamp((f.lexicalDiversity - 0.35) / 0.4), explain: f => `Farklı sözcük oranı %${(f.lexicalDiversity * 100).toFixed(1)}` },
  { id: 'hapax', weight: -0.6, label: 'Tek kullanımlık sözcük oranı',
    value: f => clamp((f.hapaxRatio - 0.35) / 0.4), explain: f => `Yalnızca bir kez geçen sözcük oranı %${(f.hapaxRatio * 100).toFixed(1)}` },
  { id: 'triple', weight: 0.9, label: 'Üçlü sıralama kalıbı',
    value: f => clamp(f.triplePer1000 / 8), explain: f => `1.000 kelimede ${f.triplePer1000.toFixed(2)} üçlü liste` },
  { id: 'passive', weight: 0.5, label: 'Edilgen/kişisiz anlatım yoğunluğu',
    value: f => clamp((f.passiveRatio - 0.25) / 1.4), explain: f => `Cümle başına ${f.passiveRatio.toFixed(2)} edilgen yapı` },
  { id: 'list', weight: 0.7, label: 'Madde imi/liste tekdüzeliği',
    value: f => clamp(f.listPer1000 / 12), explain: f => `1.000 kelimede ${f.listPer1000.toFixed(2)} liste satırı` },
  { id: 'dash', weight: 0.6, label: 'Uzun çizgi kullanımı',
    value: f => clamp(f.emdashPer1000 / 6), explain: f => `1.000 kelimede ${f.emdashPer1000.toFixed(2)} uzun çizgi` },
  { id: 'functionword', weight: -0.5, label: 'İşlev sözcüğü dağılımı',
    value: f => clamp(1 - f.functionWordChi / 60), explain: f => `Dağılım sapması χ²=${f.functionWordChi.toFixed(1)}` }
];

function scoreFactors(features) {
  let logit = -0.35, weightTotal = 0, votes = [];
  for (const factor of FACTORS) {
    const raw = clamp(factor.value(features));
    const contribution = factor.weight * (raw - 0.5);
    logit += contribution;
    weightTotal += Math.abs(factor.weight);
    votes.push(raw);
  }
  const probability = sigmoid(logit * 1.6);
  const agreement = 1 - standardDeviation(votes);
  const lengthConfidence = clamp(Math.log10(Math.max(10, features.words)) / 3.6);
  return { probability, agreement, confidence: clamp((agreement * 0.5 + lengthConfidence * 0.5)) };
}

function band(probability) {
  if (probability >= 0.75) return 'high';
  if (probability >= 0.45) return 'mixed';
  return 'low';
}

const BAND_LABEL = {
  tr: { high: 'Yüksek makine benzeri üslup', mixed: 'Karışık: bazı bölümler kalıplaşmış', low: 'Düşük makine benzeri üslup' },
  en: { high: 'High machine-like style', mixed: 'Mixed: some formulaic passages', low: 'Low machine-like style' }
};

// ── Per-sentence scoring ───────────────────────────────────────────────────
const SENTENCE_MARKERS = {
  tr: [/günümüz(?:ün)? dünyasında|dijital çağda/iu, /büyük önem|önem arz/iu, /önemli bir rol|kritik bir rol|kilit bir rol/iu,
    /bu bağlamda|bu doğrultuda/iu, /sonuç olarak|netice/iu, /kapsamlı bir şekilde|çeşitli açılardan/iu,
    /yadsınamaz|şüphe götürmez|kuşkusuz/iu, /dikkat çekmektedir|öne çıkmaktadır/iu],
  en: [/(?<![\p{L}\p{N}_])delve/iu, /(?<![\p{L}\p{N}_])tapestry|testament to/iu, /(?<![\p{L}\p{N}_])in today's/iu, /(?<![\p{L}\p{N}_])plays a (crucial|vital|pivotal) role/iu,
    /(?<![\p{L}\p{N}_])it is (important|worth) (to note|noting)/iu, /(?<![\p{L}\p{N}_])furthermore|moreover/iu, /(?<![\p{L}\p{N}_])in conclusion/iu,
    /(?<![\p{L}\p{N}_])seamless|robust|comprehensive|multifaceted/iu]
};

function scoreSentence(sentence, context, locale) {
  const reasons = [];
  let signal = 0;
  const pack = languagePack(locale);
  for (const marker of pack.aiMarkers) {
    marker.re.lastIndex = 0;
    if (marker.re.test(sentence.text)) { signal += marker.weight; reasons.push(marker.label); }
  }
  const tokens = wordTokens(sentence.text, locale);
  const length = tokens.length;
  if (context.uniform && length >= 8) { signal += 14; reasons.push(locale === 'tr' ? 'Metin boyunca benzer cümle uzunluğu' : 'Uniform sentence length across the text'); }
  if (length >= 35) { signal += 10; reasons.push(locale === 'tr' ? 'Uzun ve yoğun cümle' : 'Long, dense sentence'); }
  if (length >= 12) {
    const lowers = tokens.map(token => token.lower);
    if (new Set(lowers).size / lowers.length < 0.65) { signal += 18; reasons.push(locale === 'tr' ? 'Cümle içinde sözcük tekrarı' : 'Word repetition inside the sentence'); }
  }
  if (context.startCounts.get(sentenceStart(sentence, locale)) >= 3) { signal += 20; reasons.push(locale === 'tr' ? 'Tekrarlanan cümle başlangıcı' : 'Repeated sentence opening'); }
  const numbers = (sentence.text.match(NUMERIC_PATTERN) || []).length;
  const citations = (sentence.text.match(/\((?:[^()]{0,120}?(?:19|20)\d{2}[a-z]?)\)|\[\d{1,3}\]/gu) || []).length;
  if (numbers + citations === 0 && length > 14) { signal += 8; reasons.push(locale === 'tr' ? 'Somut veri içermeyen genel ifade' : 'General claim without concrete data'); }
  else signal -= Math.min(14, (numbers + citations) * 4);
  for (const pattern of SENTENCE_MARKERS[locale] || []) if (pattern.test(sentence.text)) signal += 6;
  return { signal: Math.round(clamp(signal, 0, 100)), reasons: [...new Set(reasons)] };
}

const sentenceStart = (sentence, locale) => wordTokens(sentence.text, locale).slice(0, 2).map(token => token.lower).join(' ');

// ── Public API ─────────────────────────────────────────────────────────────
export function analyze(text, locale = 'tr', { proofreadSummary = null } = {}) {
  validateText(text);
  if (!['tr', 'en'].includes(locale)) throw Object.assign(new Error('Desteklenmeyen dil.'), { status: 400 });
  const features = extractFeatures(text, locale);
  const spans = splitSentences(text, locale);
  const counts = spans.map(span => wordTokens(span.text, locale).length);
  const mean = counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.length);
  const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, counts.length);
  const uniform = spans.length >= 4 && mean >= 8 && Math.sqrt(variance) / mean < 0.2;
  const startCounts = new Map();
  for (const span of spans) { const key = sentenceStart(span, locale); startCounts.set(key, (startCounts.get(key) || 0) + 1); }
  const context = { uniform, startCounts };

  const sentences = spans.map((span, index) => {
    const scored = scoreSentence(span, context, locale);
    return {
      ...span, wordCount: counts[index], signal: scored.signal, reasons: scored.reasons,
      aiProbability: scored.signal,
      level: scored.signal >= 45 ? 'high' : scored.signal >= 20 ? 'medium' : 'low'
    };
  });

  const { probability, agreement, confidence } = scoreFactors(features);
  const totalWords = features.words;
  const weightedSignal = sentences.reduce((sum, sentence, index) => sum + sentence.signal * counts[index], 0) / Math.max(1, totalWords);
  const flaggedWords = sentences.reduce((sum, sentence, index) => sum + (sentence.level === 'high' ? counts[index] : 0), 0);
  const errorDensity = proofreadSummary
    ? (proofreadSummary.bySeverity.error || 0) / Math.max(1, totalWords) * 1000
    : null;
  if (errorDensity !== null) {
    // A long text with zero orthography errors is itself unusual for human prose.
    const typoVote = clamp(1 - errorDensity / 2.5);
    const adjusted = sigmoid(Math.log(probability / (1 - probability)) + 0.9 * (typoVote - 0.5));
    return finish(text, locale, sentences, counts, features, adjusted, agreement, confidence, weightedSignal, flaggedWords, totalWords, proofreadSummary, typoVote, errorDensity);
  }
  return finish(text, locale, sentences, counts, features, probability, agreement, confidence, weightedSignal, flaggedWords, totalWords, proofreadSummary, null, null);
}

function finish(text, locale, sentences, counts, features, probability, agreement, confidence, weightedSignal, flaggedWords, totalWords, proofreadSummary, typoVote, errorDensity) {
  const aiProbability = Math.round(probability * 1000) / 10;
  const current = band(probability);
  const factors = FACTORS.map(factor => {
    const value = clamp(factor.value(features));
    return {
      id: factor.id, label: factor.label, weight: factor.weight,
      value: Math.round(value * 100), direction: factor.weight >= 0 ? 'machine-like' : 'human-like',
      contribution: Math.round(factor.weight * (value - 0.5) * 100) / 100,
      detail: factor.explain(features)
    };
  }).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  if (typoVote !== null) {
    factors.unshift({ id: 'typo', label: 'Yazım/noktalama hatası yoğunluğu', weight: 0.9, value: Math.round(typoVote * 100),
      direction: 'machine-like', contribution: Math.round(0.9 * (typoVote - 0.5) * 100) / 100,
      detail: `1.000 kelimede ${errorDensity.toFixed(2)} kesin yazım/noktalama hatası (insan metninde sıfır olması nadirdir)` });
  }
  const interval = Math.max(4, Math.round((1 - confidence) * 35));
  return {
    engine: 'prosebeacon-ensemble-v3',
    calibrated: false,
    locale,
    // The number the user asked for, always present and clearly labelled.
    aiProbability,
    aiProbabilityBand: current,
    aiProbabilityLabel: BAND_LABEL[locale === 'en' ? 'en' : 'tr'][current],
    aiProbabilityInterval: [Math.max(0, Math.round((aiProbability - interval) * 10) / 10), Math.min(100, Math.round((aiProbability + interval) * 10) / 10)],
    confidence: Math.round(confidence * 100),
    agreement: Math.round(agreement * 100),
    score: Math.round(weightedSignal),
    flaggedCoverage: Math.round(flaggedWords / Math.max(1, totalWords) * 1000) / 10,
    factors,
    features: {
      ...features,
      readability: features.readability
    },
    interpretation: locale === 'tr'
      ? 'YZ olasılığı: metnin üslup özelliklerinin yapay zekâ çıktısına benzeme derecesi. Yerel sezgisel bir tahmindir.'
      : 'AI probability: how closely the stylistic evidence matches machine-generated prose. Local heuristic estimate.',
    limitation: locale === 'tr'
      ? 'Etiketli bir veri kümesinde kalibre edilmedi; kesinlik aralığıyla birlikte yorumlanmalıdır. İnsan yazısı da yüksek, yapay zekâ yazısı da düşük puan alabilir. Yazarlık veya ihlal kanıtı olarak kullanmayın.'
      : 'Not calibrated on a labelled corpus; read it with the reported interval. Human text can score high and machine text low. Not proof of authorship.',
    reliability: totalWords < 80 ? 'short-text' : totalWords < 400 ? 'limited' : 'heuristic',
    words: totalWords, characters: text.length, sentenceCount: sentences.length,
    paragraphCount: features.paragraphs,
    readingMinutes: Math.max(1, Math.ceil(totalWords / 200)),
    sentences,
    metrics: {
      averageSentenceWords: Math.round(features.meanSentenceLength * 10) / 10,
      sentenceVariation: features.meanSentenceLength ? Math.round(features.sentenceLengthCV * 100) : 0,
      lexicalDiversity: Math.round(features.lexicalDiversity * 100),
      readabilityScore: features.readability.score,
      readabilityLabel: features.readability.label
    },
    proofread: proofreadSummary ? { issues: proofreadSummary.issueCount, corrected: proofreadSummary.correctedCount, bySeverity: proofreadSummary.bySeverity } : null
  };
}

export { fold };
