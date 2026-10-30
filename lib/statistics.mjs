export function wordStatistics(text, locale = 'tr') {
  if (typeof text !== 'string') throw Object.assign(new Error('Metin gerekli.'), { status: 400 });
  const normalized = locale === 'en' ? 'en' : 'tr';
  const words = [...new Intl.Segmenter(normalized, { granularity: 'word' }).segment(text)].filter(item => item.isWordLike);
  const sentences = text.trim() ? [...new Intl.Segmenter(normalized, { granularity: 'sentence' }).segment(text)].filter(item => item.segment.trim()) : [];
  const paragraphs = text.trim() ? text.trim().split(/\n\s*\n/u).filter(Boolean) : [];
  const frequencies = new Map();
  for (const word of words) { const key=word.segment.toLocaleLowerCase(normalized);frequencies.set(key,(frequencies.get(key)||0)+1); }
  return { words:words.length, characters:[...text].length, charactersWithoutSpaces:[...text.replace(/\s/gu,'')].length,
    sentences:sentences.length, paragraphs:paragraphs.length, readingSeconds:Math.ceil(words.length/200*60), speakingSeconds:Math.ceil(words.length/130*60),
    uniqueWords:frequencies.size, averageSentenceWords:sentences.length?Math.round(words.length/sentences.length*10)/10:0,
    repeatedWords:[...frequencies].filter(([word,count])=>count>1&&word.length>2).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([word,count])=>({word,count})) };
}
