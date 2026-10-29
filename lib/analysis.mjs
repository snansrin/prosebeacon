export const MAX_TEXT = 20000;
export function validateText(text) {
  if (typeof text !== 'string' || text.trim().length < 20) throw Object.assign(new Error('En az 20 karakter metin girin.'), { status: 400 });
  if (text.length > MAX_TEXT) throw Object.assign(new Error('Metin en fazla 20.000 karakter olabilir.'), { status: 413 });
  if (/\u0000/.test(text)) throw Object.assign(new Error('Metin geçersiz karakter içeriyor.'), { status: 400 });
  return text;
}
const words = s => s.toLocaleLowerCase('tr').match(/[\p{L}\p{N}]+/gu) || [];
const patterns = [
  [/\b(in conclusion|moreover|furthermore|it is important to note|in today's world|in the ever.evolving|delve into|plays a crucial role)\b/iu, 'Kalıplaşmış geçiş veya giriş', 28],
  [/(sonuç olarak|bununla birlikte|günümüz dünyasında|günümüzün hızla|önemli bir rol oyna|büyük önem taşı|göz önünde bulundur|yadsınamaz bir gerçek)/iu, 'Kalıplaşmış geçiş veya giriş', 28],
  [/(kapsamlı bir şekilde|çeşitli açılardan|bu bağlamda|bu doğrultuda|in this context|comprehensive approach|multifaceted|a testament to)/iu, 'Genel ve soyut ifade', 18]
];
export function splitSentences(text, locale = 'tr') {
  const result = []; let leadingStart = 0;
  for (const { segment, index } of new Intl.Segmenter(locale, { granularity: 'sentence' }).segment(text)) {
    if (!segment.trim()) {
      if (result.length) { const last=result.at(-1);last.text+=segment;last.end=index+segment.length; }
      continue;
    }
    const start=result.length ? index : leadingStart;
    result.push({id:result.length,text:text.slice(start,index+segment.length),start,end:index+segment.length});
  }
  return result;
}
export function analyze(text, locale = 'tr') {
  validateText(text);
  if (!['tr', 'en'].includes(locale)) throw Object.assign(new Error('Desteklenmeyen dil.'), { status: 400 });
  const spans = splitSentences(text, locale);
  const counts = spans.map(s => words(s.text).length);
  const mean = counts.reduce((a,b) => a+b,0) / Math.max(counts.length,1);
  const variance = counts.reduce((a,b) => a+(b-mean)**2,0) / Math.max(counts.length,1);
  const uniform = spans.length >= 4 && mean >= 8 && Math.sqrt(variance)/mean < .2;
  const starts = spans.map(s => words(s.text).slice(0,2).join(' '));
  const sentences = spans.map((s,i) => {
    const ws = words(s.text); let signal = 0; const reasons = [];
    for (const [pattern, reason, weight] of patterns) if (pattern.test(s.text)) { signal += weight; reasons.push(reason); }
    if (uniform) { signal += 16; reasons.push('Metin boyunca benzer cümle uzunluğu'); }
    if (ws.length >= 12 && new Set(ws).size/ws.length < .65) { signal += 20; reasons.push('Cümle içinde sözcük tekrarı'); }
    if (starts[i] && starts.filter(x=>x===starts[i]).length >= 3) { signal += 24; reasons.push('Tekrarlanan cümle başlangıcı'); }
    if (ws.length >= 35) { signal += 12; reasons.push('Uzun ve yoğun cümle'); }
    return { ...s, signal: Math.min(100,signal), reasons, level: signal >= 45 ? 'high' : signal >= 20 ? 'medium' : 'low' };
  });
  const totalWords = words(text).length;
  const weighted = sentences.reduce((sum,s,i)=>sum+s.signal*counts[i],0)/Math.max(1,totalWords);
  return {
    engine: 'local-style-signals-v1', calibrated: false, locale, score: Math.round(weighted),
    interpretation: 'Üslup sinyali endeksi; yapay zekâ yazarlığı olasılığı değildir.',
    limitation: 'İnsan yazısı bu örüntüleri taşıyabilir; yapay zekâ yazısı taşımayabilir. Yazarlık veya ihlal kanıtı olarak kullanmayın.',
    reliability: totalWords < 80 ? 'short-text' : 'uncalibrated',
    words: totalWords, characters: text.length, sentenceCount: sentences.length,
    readingMinutes: Math.max(1,Math.ceil(totalWords/200)), sentences,
    metrics: { averageSentenceWords: Math.round(mean*10)/10, sentenceVariation: mean ? Math.round(Math.sqrt(variance)/mean*100) : 0,
      lexicalDiversity: totalWords ? Math.round(new Set(words(text)).size/totalWords*100) : 0 }
  };
}
