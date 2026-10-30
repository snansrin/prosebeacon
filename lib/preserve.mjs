// Meaning-preservation guard shared by every rewriting engine.
// A rewrite that loses a number, citation, unit or proper noun is rejected.

const NUMBER_RE = /(?<![\p{L}\p{N}_])\d+(?:[.,:/-]\d+)*(?:\s*%)?/gu;
const UNIT_RE = /(?<![\p{L}\p{N}_])\d+(?:[.,]\d+)?\s*(?:MHz|GHz|kHz|Hz|km²|m²|cm²|mm²|ha|km|cm|mm|nm|ft|feet|knots|kt|kg|mg|ton|Mg|g|kPa|psi|bar|°C|%|USD|TRY|EUR|ppm|ppb|m)\b/giu;
const BRACKET_RE = /\[[^\]\n]{1,80}\]/gu;
const CITATION_RE = /\([^()\n]{0,120}?(?:19|20)\d{2}[a-z]?\)|\((?:19|20)\d{2}[a-z]?\)/gu;
const URL_RE = /https?:\/\/[^\s)]+/giu;
const DOI_RE = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9a-z]+/gu;
const ACRONYM_RE = /(?<![\p{L}\p{N}_])[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9]{1,11}(?:-[A-Z0-9]+)*(?![\p{L}\p{N}_])/gu;
const BINOMIAL_RE = /\b[A-Z][a-z]{2,}\s+(?:spp?\.|subsp\.|var\.|[a-z]{3,})\b/gu;
const QUOTE_RE = /[“"«][^”"»\n]{3,400}[”"»]/gu;

export function protectedTokens(text, terms = []) {
  const found = new Set();
  for (const pattern of [NUMBER_RE, UNIT_RE, BRACKET_RE, CITATION_RE, URL_RE, DOI_RE, ACRONYM_RE, BINOMIAL_RE, QUOTE_RE]) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) found.add(match[0].trim());
  }
  for (const term of terms) if (term) found.add(term);
  return [...found];
}

const collapse = value => String(value).replace(/\s+/gu, '');

export function checkPreservation(original, rewritten, terms = []) {
  const before = protectedTokens(original, terms);
  const flatAfter = collapse(rewritten);
  // A token that only moved or gained/lost surrounding whitespace (for example
  // "2.Etap" becoming "2. Etap") is a formatting fix, not a loss of meaning.
  // Citation groups may be reordered or re-joined by citation-style
  // normalisation ("(A, 2020; B, 2019)" -> "(B, 2019; A, 2020)"). They are
  // preserved when every year and every surname survives.
  const citationSurvives = (token, target) => {
    const years = [...token.matchAll(/(?:19|20)\d{2}[a-z]?/gu)].map(match => match[0]);
    const names = [...token.matchAll(/[\p{L}'’-]{3,}/gu)]
      .map(match => match[0])
      .filter(name => !['vd', 've', 'et', 'al', 'diğ', 'ark'].includes(name.toLocaleLowerCase('tr')));
    return years.every(year => target.includes(year)) && names.every(name => target.includes(name));
  };
  const missing = before.filter(token => !rewritten.includes(token)
    && !flatAfter.includes(collapse(token))
    && !(/^\(/u.test(token) && /(?:19|20)\d{2}/u.test(token) && citationSurvives(token, rewritten)));
  const numbersBefore = new Set(before.map(collapse));
  const flatBefore = collapse(original);
  const addedNumbers = protectedTokens(rewritten)
    .filter(token => /^\d/u.test(token))
    .filter(token => !before.includes(token) && !numbersBefore.has(collapse(token)) && !flatBefore.includes(collapse(token)));
  return { missing, addedNumbers, checked: before.length };
}

// Tokens that must survive a rewrite, per sentence (used to roll back unsafe
// edits). A glossary term only guards the sentences that actually contain it;
// otherwise every sentence in the document would be frozen.
export function sentenceGuardTokens(sentence, terms = []) {
  const tokens = protectedTokens(sentence);
  for (const term of terms) {
    if (term && sentence.includes(term)) tokens.push(term);
  }
  return tokens;
}

export function preserves(tokens, text) {
  return tokens.every(token => text.includes(token));
}
