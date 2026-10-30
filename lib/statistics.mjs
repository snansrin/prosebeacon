// Live word/character counters.
// Regex-based on purpose: Intl.Segmenter allocates one object per word and per
// sentence and exhausts the heap on thesis-length documents (observed OOM at
// ~90k characters). These helpers stream over the text instead.
import { wordTokens, splitSentences, splitParagraphs } from './nlp.mjs';

const codePointCount = value => {
  let count = 0;
  for (const _ of value) count += 1;
  return count;
};

export function wordStatistics(text, locale = 'tr') {
  if (typeof text !== 'string') throw Object.assign(new Error('Metin gerekli.'), { status: 400 });
  const normalized = locale === 'en' ? 'en' : 'tr';
  const tokens = wordTokens(text, normalized);
  const sentences = text.trim() ? splitSentences(text, normalized) : [];
  const paragraphs = text.trim() ? splitParagraphs(text) : [];
  const frequencies = new Map();
  for (const token of tokens) frequencies.set(token.lower, (frequencies.get(token.lower) || 0) + 1);
  const words = tokens.length;
  const sentenceCount = sentences.length;
  return {
    words,
    characters: codePointCount(text),
    charactersWithoutSpaces: codePointCount(text.replace(/\s/gu, '')),
    sentences: sentenceCount,
    paragraphs: paragraphs.length,
    readingSeconds: Math.ceil(words / 200 * 60),
    speakingSeconds: Math.ceil(words / 130 * 60),
    uniqueWords: frequencies.size,
    averageSentenceWords: sentenceCount ? Math.round(words / sentenceCount * 10) / 10 : 0,
    repeatedWords: [...frequencies]
      .filter(([word, count]) => count > 1 && word.length > 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }))
  };
}
